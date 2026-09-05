import { createHash, randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { z } from 'zod';
import {
  fetchPddeInfoSchoolHtml,
  type PddeInfoHttpResult,
} from '../adapters/pddeinfo-http';
import {
  parsePddeInfoSchoolHtml,
  type PddeInfoExpectedSchool,
  type PddeInfoRawSchool,
} from '../adapters/pddeinfo-html';
import { normalizePddeInfoSchools } from '../adapters/pddeinfo-normalizer';
import {
  collectSigefPublicAccount,
  type SigefAccountResult,
  type SigefMovementClass,
} from '../adapters/sigef-public-statement';
import { canonicalAccount, canonicalText } from '../core/normalization';
import type { BankAccount } from '../core/schemas';
import type { EvidenceEventInput, EvidenceSource } from '../core/evidence';
import { buildMonitoringSourceObservations } from '../core/source-observation';
import type {
  ArtifactKind,
  ArtifactStore,
  PreservedArtifact,
} from './artifact-store';
import { buildFiscalHumanView } from './build-fiscal-human-view';
import { buildMonitoringOperationalView } from './build-monitoring-operational-view';
import type { EvidenceEventStore } from './evidence-store';

const CLASSIFICATIONS: SigefMovementClass[] = [
  'REPASSE_FNDE',
  'APLICACAO_FINANCEIRA',
  'RESGATE_APLICACAO',
  'PAGAMENTO_TRANSFERENCIA',
  'PAGAMENTO_CARTAO',
  'RENDIMENTO_FINANCEIRO',
  'ENTRADA_TERCEIRO',
  'TARIFA_BANCARIA',
  'ESTORNO_REVERSAO',
  'MOVIMENTO_NAO_CLASSIFICADO',
];

const optionsSchema = z.object({
  schools: z.array(z.object({
    inep: z.string().regex(/^\d{8}$/),
    sme: z.string().regex(/^\d{7}$/),
    nome: z.string().min(1),
  }).strict()).min(1).max(163),
  workspacePath: z.string().min(1),
  fiscalYear: z.literal(2026, { error: 'O monitoramento institucional opera exclusivamente no exercício de 2026.' }),
  runId: z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/),
  institutionalPathPrefix: z.string().min(1).max(300).optional(),
}).strict();

export interface MonitoringSchool {
  inep: string;
  sme: string;
  nome: string;
}

export interface MonitoringPddeInfoSchoolResult {
  school: PddeInfoRawSchool;
  queriedAt: string;
  rawBytes: Buffer;
}

type CollectPddeInfoSchool = (
  school: MonitoringSchool,
  fiscalYear: 2026,
  signal?: AbortSignal,
) => Promise<MonitoringPddeInfoSchoolResult>;

type CollectSigefAccount = (input: Parameters<typeof collectSigefPublicAccount>[0]) => Promise<SigefAccountResult>;

export interface RunMonitoringOptions {
  schools: MonitoringSchool[];
  workspacePath: string;
  fiscalYear: 2026;
  runId: string;
  evidenceStore?: EvidenceEventStore;
  artifactStore?: ArtifactStore;
  manageExecutionLifecycle?: boolean;
  institutionalPathPrefix?: string;
  signal?: AbortSignal;
  collectPddeInfoSchool?: CollectPddeInfoSchool;
  collectSigefAccount?: CollectSigefAccount;
  now?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
}

type RawMonitoring = ReturnType<typeof createRawMonitoring>;

export interface RunMonitoringResult {
  status: 'COMPLETE' | 'PARTIAL';
  raw: RawMonitoring;
  operational: ReturnType<typeof buildMonitoringOperationalView>;
  fiscal: ReturnType<typeof buildFiscalHumanView>;
  paths: {
    monitoring: string;
    operational: string;
    fiscal: string;
  };
}

function programCode(raw: string): string | null {
  const value = canonicalText(raw);
  if (value === 'PDDE' || value === 'PDDE BASICO') return '02';
  if (value === 'PDDE QUALIDADE') return '0B';
  if (value === 'PDDE EQUIDADE') return '0A';
  if (value === 'PDDE EDUCACAO INTEGRAL') return 'Z9';
  return null;
}

function money(raw: string): number | null {
  const match = raw.trim().replace(/^R\$\s*/, '').match(/^(-)?(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!match) return null;
  let cents = BigInt(match[2].replace(/\./g, '')) * 100n + BigInt(match[3]);
  if (match[1]) cents = -cents;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`Valor fora do intervalo seguro: ${raw}.`);
  }
  return Number(cents);
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function emptyTotals(): Record<SigefMovementClass, number> {
  return Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<SigefMovementClass, number>;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

async function defaultCollectPddeInfoSchool(
  school: MonitoringSchool,
  fiscalYear: 2026,
  signal?: AbortSignal,
  sleep: (milliseconds: number) => Promise<void> = defaultSleep,
): Promise<MonitoringPddeInfoSchoolResult> {
  let lastError: Error | null = null;
  for (let round = 1; round <= 2; round += 1) {
    signal?.throwIfAborted();
    try {
      const http: PddeInfoHttpResult = await fetchPddeInfoSchoolHtml({
        fiscalYear,
        inep: school.inep,
        maxAttempts: 4,
        timeoutMs: 30_000,
        retryBackoffMs: 1_000,
        ...(signal ? { signal } : {}),
      });
      const parsed = parsePddeInfoSchoolHtml(http.html, {
        expectedSchool: school as PddeInfoExpectedSchool,
        sourceUrl: http.sourceUrl,
      });
      return {
        school: parsed,
        queriedAt: http.queriedAt,
        rawBytes: http.rawBytes ?? Buffer.from(http.html, 'utf8'),
      };
    } catch (cause) {
      signal?.throwIfAborted();
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      if (round < 2) await sleep(2_000);
    }
  }
  throw lastError ?? new Error(`Falha desconhecida no PDDEInfo para ${school.inep}.`);
}

async function appendEvidence(
  store: EvidenceEventStore | undefined,
  event: Omit<EvidenceEventInput, 'eventId'>,
): Promise<void> {
  if (!store) return;
  await store.append({ ...event, eventId: randomUUID() } as EvidenceEventInput);
}

async function preserveArtifact(input: {
  store?: ArtifactStore;
  evidenceStore?: EvidenceEventStore;
  runId: string;
  fiscalYear: number;
  source: EvidenceSource;
  schoolInep?: string;
  relativePath: string;
  kind: ArtifactKind;
  bytes: Uint8Array;
  mediaType: string;
  metadata?: Record<string, unknown>;
  occurredAt: string;
}): Promise<PreservedArtifact | undefined> {
  if (!input.store) return undefined;
  const preserved = await input.store.preserve({
    runId: input.runId,
    relativePath: input.relativePath,
    kind: input.kind,
    bytes: input.bytes,
    mediaType: input.mediaType,
    ...(input.schoolInep ? { schoolInep: input.schoolInep } : {}),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
  await appendEvidence(input.evidenceStore, {
    runId: input.runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: input.occurredAt,
    source: input.source,
    fiscalYear: input.fiscalYear,
    ...(input.schoolInep ? { schoolInep: input.schoolInep } : {}),
    payload: {
      kind: preserved.kind,
      path: preserved.path,
      sha256: preserved.sha256,
      bytes: preserved.bytes,
      mediaType: preserved.mediaType,
      provider: preserved.provider,
      bucket: preserved.bucket,
      metadata: preserved.metadata,
    },
  });
  return preserved;
}

function safeSegment(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, '_');
}

function institutionalPath(prefix: string | undefined, relative: string): string {
  return prefix ? `${prefix}/${relative}` : relative;
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

interface AccountResult {
  inep: string;
  programCode: string;
  programLabel: string;
  account: BankAccount;
  saldoPddeInfoCents: number | null;
  occurrence: string | null;
  status: 'COMPLETE' | 'PARTIAL' | 'ERROR';
  error: string | null;
  pagesFetched: number;
  declaredTotal: number | null;
  uniqueMovements: number;
  movementsInYear: number;
  coverageThrough: string | null;
  totals: Record<SigefMovementClass, number>;
  movements: SigefAccountResult['movements'];
}

function createRawMonitoring(input: {
  generatedAt: string;
  fiscalYear: 2026;
  selectedCount: number;
  schools: PddeInfoRawSchool[];
  pddeFailures: Array<{ inep: string; name: string; error: string }>;
  pddeMeta: Record<string, { queriedAt: string; rawSha256: string }>;
  accountResults: AccountResult[];
  unknownProgramAccounts: Array<{
    inep: string;
    programLabel: string;
    bank: string;
    agency: string;
    account: string;
  }>;
}) {
  const pdde = normalizePddeInfoSchools(input.schools, {
    fiscalYear: input.fiscalYear,
    queriedAt: input.generatedAt,
  });

  const schoolResults = input.schools.map((school) => ({
    inep: school.inep,
    sme: school.sme,
    name: school.nome,
    uex: school.uex,
    cnpj: school.cnpj,
    status: school.status ?? {
      uexRegistration: '',
      mandate: '',
      mandateStartDate: '',
      mandateEndDate: '',
      uexAccounting: '',
      eexAdhesion: '',
      eexAccounting: '',
    },
    pddeInfo: input.pddeMeta[school.inep],
    repasses: pdde.payments
      .filter((payment) => payment.school.inep === school.inep)
      .map((payment) => ({
        programCode: payment.programCode,
        action: payment.actionName,
        installment: payment.installmentLabel ?? null,
        programadoCents: payment.amountFinalDueCents,
        programadoCusteioCents: payment.amountFinalDueCusteioCents ?? null,
        programadoCapitalCents: payment.amountFinalDueCapitalCents ?? null,
        ajusteCusteioCents: payment.adjustmentCusteioCents ?? null,
        ajusteCapitalCents: payment.adjustmentCapitalCents ?? null,
        pagoInformadoCents: payment.amountPaidCents,
        pagoCusteioCents: payment.amountPaidCusteioCents ?? null,
        pagoCapitalCents: payment.amountPaidCapitalCents ?? null,
        dataOrdem: payment.paymentDate ?? null,
        account: payment.account ?? null,
      })),
    accounts: input.accountResults.filter((account) => account.inep === school.inep),
    unknownProgramAccounts: input.unknownProgramAccounts.filter((account) => account.inep === school.inep),
  }));

  const summaryTotals = emptyTotals();
  let movementsInYear = 0;
  let historical = 0;
  let balances = 0;
  let accountsComplete = 0;
  let accountsPartial = 0;
  let accountsFailed = 0;

  for (const account of input.accountResults) {
    for (const classification of CLASSIFICATIONS) {
      summaryTotals[classification] += account.totals[classification];
    }
    movementsInYear += account.movementsInYear;
    historical += account.uniqueMovements;
    balances += account.saldoPddeInfoCents ?? 0;
    if (account.status === 'COMPLETE') accountsComplete += 1;
    else if (account.status === 'PARTIAL') accountsPartial += 1;
    else accountsFailed += 1;
  }

  const paidRows = pdde.payments.filter((payment) => payment.amountPaidCents > 0);
  const complete = input.pddeFailures.length === 0
    && accountsPartial === 0
    && accountsFailed === 0
    && input.unknownProgramAccounts.length === 0;
  const sourceObservations = buildMonitoringSourceObservations({
    generatedAt: input.generatedAt,
    pddeInfo: {
      collected: input.schools.length,
      failures: input.pddeFailures.length,
      queriedAt: Object.values(input.pddeMeta).map((meta) => meta.queriedAt),
    },
    sigef: input.accountResults.map((account) => ({
      status: account.status,
      coverageThrough: account.coverageThrough,
      movementsInYear: account.movementsInYear,
    })),
  });

  return {
    version: 4,
    generatedAt: input.generatedAt,
    fiscalYear: input.fiscalYear,
    status: complete ? 'COMPLETE' as const : 'PARTIAL' as const,
    sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
    sourceObservations,
    coverage: {
      requestedSchools: input.selectedCount,
      pddeInfoSchoolsCollected: input.schools.length,
      pddeInfoFailures: input.pddeFailures,
      mappedAccountsAttempted: input.accountResults.length,
      mappedAccountsComplete: accountsComplete,
      mappedAccountsPartial: accountsPartial,
      mappedAccountsFailed: accountsFailed,
      unknownProgramAccounts: input.unknownProgramAccounts,
    },
    summary: {
      schools: schoolResults.length,
      accounts: input.accountResults.length,
      repassesProgramadosCents: pdde.payments.reduce((sum, payment) => sum + payment.amountFinalDueCents, 0),
      repassesProgramadosNosItensPagosCents: paidRows.reduce((sum, payment) => sum + payment.amountFinalDueCents, 0),
      repassesPagosInformadosCents: pdde.payments.reduce((sum, payment) => sum + payment.amountPaidCents, 0),
      creditosFndeLocalizadosCents: summaryTotals.REPASSE_FNDE,
      aplicacoesFinanceirasCents: summaryTotals.APLICACAO_FINANCEIRA,
      resgatesCents: summaryTotals.RESGATE_APLICACAO,
      pagamentosTransferenciasCents: summaryTotals.PAGAMENTO_TRANSFERENCIA + summaryTotals.PAGAMENTO_CARTAO,
      rendimentosCents: summaryTotals.RENDIMENTO_FINANCEIRO,
      entradasTerceirosCents: summaryTotals.ENTRADA_TERCEIRO,
      tarifasCents: summaryTotals.TARIFA_BANCARIA,
      estornosCents: summaryTotals.ESTORNO_REVERSAO,
      naoClassificadosCents: summaryTotals.MOVIMENTO_NAO_CLASSIFICADO,
      saldosPddeInfoCents: balances,
      movimentosHistoricosExtraidos: historical,
      movimentosDoExercicio: movementsInYear,
    },
    schools: schoolResults,
  };
}

export async function runMonitoring(rawOptions: RunMonitoringOptions): Promise<RunMonitoringResult> {
  rawOptions.signal?.throwIfAborted();
  const parsed = optionsSchema.parse({
    schools: rawOptions.schools,
    workspacePath: rawOptions.workspacePath,
    fiscalYear: rawOptions.fiscalYear,
    runId: rawOptions.runId,
    ...(rawOptions.institutionalPathPrefix ? { institutionalPathPrefix: rawOptions.institutionalPathPrefix } : {}),
  });
  const unique = new Set(parsed.schools.map((school) => school.inep));
  if (unique.size !== parsed.schools.length) throw new Error('A seleção de monitoramento contém INEP duplicado.');

  const workspacePath = resolve(parsed.workspacePath);
  await rm(workspacePath, { recursive: true, force: true });
  await mkdir(workspacePath, { recursive: true });
  const now = rawOptions.now ?? (() => new Date().toISOString());
  const generatedAt = now();
  const manageLifecycle = rawOptions.manageExecutionLifecycle ?? true;

  if (manageLifecycle) {
    await appendEvidence(rawOptions.evidenceStore, {
      runId: parsed.runId,
      type: 'EXECUTION_STARTED',
      occurredAt: generatedAt,
      source: 'CONCILIADOR',
      fiscalYear: parsed.fiscalYear,
      payload: { portfolioSize: parsed.schools.length },
    });
  }

  const collector = rawOptions.collectPddeInfoSchool
    ?? ((school, year, signal) => defaultCollectPddeInfoSchool(
      school,
      year,
      signal,
      rawOptions.sleep ?? defaultSleep,
    ));
  const sigefCollector = rawOptions.collectSigefAccount ?? collectSigefPublicAccount;
  const pddeFailures: Array<{ inep: string; name: string; error: string }> = [];
  const pddeMeta: Record<string, { queriedAt: string; rawSha256: string }> = {};

  const collected = await mapConcurrent(parsed.schools, 2, async (school) => {
    rawOptions.signal?.throwIfAborted();
    try {
      const result = await collector(school, parsed.fiscalYear, rawOptions.signal);
      const rawPath = join(workspacePath, 'pddeinfo', `${school.inep}.html`);
      await mkdir(dirname(rawPath), { recursive: true });
      await writeFile(rawPath, result.rawBytes);
      const rawSha256 = sha256(result.rawBytes);
      pddeMeta[school.inep] = { queriedAt: result.queriedAt, rawSha256 };
      await preserveArtifact({
        store: rawOptions.artifactStore,
        evidenceStore: rawOptions.evidenceStore,
        runId: parsed.runId,
        fiscalYear: parsed.fiscalYear,
        source: 'PDDEINFO',
        schoolInep: school.inep,
        relativePath: institutionalPath(parsed.institutionalPathPrefix, `pddeinfo/${school.inep}.html`),
        kind: 'RAW_HTML',
        bytes: result.rawBytes,
        mediaType: 'text/html',
        metadata: { queriedAt: result.queriedAt, localPath: rawPath },
        occurredAt: generatedAt,
      });
      return result.school;
    } catch (cause) {
      rawOptions.signal?.throwIfAborted();
      pddeFailures.push({
        inep: school.inep,
        name: school.nome,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return null;
    }
  });

  const schools = collected.filter((item): item is PddeInfoRawSchool => item !== null);
  const unknownProgramAccounts: Array<{
    inep: string;
    programLabel: string;
    bank: string;
    agency: string;
    account: string;
  }> = [];
  const accountTasks: Array<{
    school: PddeInfoRawSchool;
    programLabel: string;
    programCode: string;
    saldo: string;
    occurrence: string;
    account: BankAccount;
  }> = [];

  for (const item of schools) {
    const seen = new Set<string>();
    for (const raw of item.accounts) {
      if (!raw.banco.trim() || !raw.agencia.trim() || !raw.conta.trim()) continue;
      const code = programCode(raw.programa);
      if (!code) {
        unknownProgramAccounts.push({
          inep: item.inep,
          programLabel: raw.programa,
          bank: raw.banco.trim(),
          agency: raw.agencia.trim(),
          account: raw.conta.trim(),
        });
        continue;
      }
      const account = {
        bank: raw.banco.trim(),
        agency: raw.agencia.trim(),
        number: raw.conta.trim(),
      };
      const key = `${item.inep}|${code}|${canonicalAccount(account)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      accountTasks.push({
        school: item,
        programLabel: raw.programa,
        programCode: code,
        saldo: raw.saldo,
        occurrence: raw.ocorrencia,
        account,
      });
    }
  }

  const accountResults = await mapConcurrent(accountTasks, 2, async (task): Promise<AccountResult> => {
    rawOptions.signal?.throwIfAborted();
    const rawDir = join(
      workspacePath,
      'sigef',
      task.school.inep,
      task.programCode,
      safeSegment(task.account.number),
    );
    try {
      const statement = await sigefCollector({
        cnpj: task.school.cnpj,
        programCode: task.programCode,
        account: task.account,
        startYear: parsed.fiscalYear,
        startMonth: 1,
        maxPages: 500,
        ...(rawOptions.signal ? { signal: rawOptions.signal } : {}),
        onPage: async (page) => {
          await mkdir(rawDir, { recursive: true });
          const filename = `page-${String(page.index).padStart(3, '0')}.html`;
          const localPath = join(rawDir, filename);
          await writeFile(localPath, page.rawBytes);
          await preserveArtifact({
            store: rawOptions.artifactStore,
            evidenceStore: rawOptions.evidenceStore,
            runId: parsed.runId,
            fiscalYear: parsed.fiscalYear,
            source: 'SIGEF_EXTRATO',
            schoolInep: task.school.inep,
            relativePath: institutionalPath(
              parsed.institutionalPathPrefix,
              `sigef/${task.school.inep}/${task.programCode}/${safeSegment(task.account.number)}/${filename}`,
            ),
            kind: 'RAW_HTML',
            bytes: page.rawBytes,
            mediaType: 'text/html',
            metadata: { sourceUrl: page.url, localPath, account: task.account },
            occurredAt: generatedAt,
          });
        },
      });
      const inYear = statement.movements.filter((movement) => (
        movement.movementDate.startsWith(`${parsed.fiscalYear}-`)
      ));
      const totals = emptyTotals();
      for (const movement of inYear) totals[movement.classification] += movement.amountCents;
      return {
        inep: task.school.inep,
        programCode: task.programCode,
        programLabel: task.programLabel,
        account: task.account,
        saldoPddeInfoCents: money(task.saldo),
        occurrence: task.occurrence.trim() || null,
        status: statement.status,
        error: null,
        pagesFetched: statement.pagesFetched,
        declaredTotal: statement.declaredTotal,
        uniqueMovements: statement.movements.length,
        movementsInYear: inYear.length,
        coverageThrough: statement.coverageThrough,
        totals,
        movements: inYear,
      };
    } catch (cause) {
      rawOptions.signal?.throwIfAborted();
      return {
        inep: task.school.inep,
        programCode: task.programCode,
        programLabel: task.programLabel,
        account: task.account,
        saldoPddeInfoCents: money(task.saldo),
        occurrence: task.occurrence.trim() || null,
        status: 'ERROR',
        error: cause instanceof Error ? cause.message : String(cause),
        pagesFetched: 0,
        declaredTotal: null,
        uniqueMovements: 0,
        movementsInYear: 0,
        coverageThrough: null,
        totals: emptyTotals(),
        movements: [],
      };
    }
  });

  const raw = createRawMonitoring({
    generatedAt,
    fiscalYear: parsed.fiscalYear,
    selectedCount: parsed.schools.length,
    schools,
    pddeFailures,
    pddeMeta,
    accountResults,
    unknownProgramAccounts,
  });
  const operational = buildMonitoringOperationalView(raw);
  const fiscal = buildFiscalHumanView(raw);

  const monitoringPath = join(workspacePath, 'monitoring.json');
  const operationalPath = join(workspacePath, 'operational.json');
  const fiscalPath = join(workspacePath, 'fiscal.json');
  const monitoringBytes = jsonBytes(raw);
  const operationalBytes = jsonBytes(operational);
  const fiscalBytes = jsonBytes(fiscal);
  await writeFile(monitoringPath, monitoringBytes);
  await writeFile(operationalPath, operationalBytes);
  await writeFile(fiscalPath, fiscalBytes);

  for (const artifact of [
    { relative: 'monitoring.json', bytes: monitoringBytes, localPath: monitoringPath, role: 'MONITORING_RAW' },
    { relative: 'operational.json', bytes: operationalBytes, localPath: operationalPath, role: 'MONITORING_OPERATIONAL' },
    { relative: 'fiscal.json', bytes: fiscalBytes, localPath: fiscalPath, role: 'MONITORING_FISCAL' },
  ]) {
    await preserveArtifact({
      store: rawOptions.artifactStore,
      evidenceStore: rawOptions.evidenceStore,
      runId: parsed.runId,
      fiscalYear: parsed.fiscalYear,
      source: 'CONCILIADOR',
      relativePath: institutionalPath(parsed.institutionalPathPrefix, artifact.relative),
      kind: 'NORMALIZED_JSON',
      bytes: artifact.bytes,
      mediaType: 'application/json',
      metadata: { role: artifact.role, localPath: artifact.localPath },
      occurredAt: generatedAt,
    });
  }

  if (manageLifecycle) {
    await appendEvidence(rawOptions.evidenceStore, {
      runId: parsed.runId,
      type: 'EXECUTION_FINISHED',
      occurredAt: now(),
      source: 'CONCILIADOR',
      fiscalYear: parsed.fiscalYear,
      payload: {
        status: raw.status,
        succeeded: raw.coverage.pddeInfoSchoolsCollected,
        failed: raw.coverage.pddeInfoFailures.length,
      },
    });
  }

  return {
    status: raw.status,
    raw,
    operational,
    fiscal,
    paths: {
      monitoring: monitoringPath,
      operational: operationalPath,
      fiscal: fiscalPath,
    },
  };
}
