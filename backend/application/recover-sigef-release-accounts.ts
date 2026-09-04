import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import {
  collectSigefPublicReleases,
  type SigefPublicReleaseCollection,
} from '../adapters/sigef-public-releases';
import {
  collectSigefPublicAccount,
  type SigefAccountResult,
  type SigefMovementClass,
} from '../adapters/sigef-public-statement';
import { canonicalAccount, canonicalCnpj, canonicalText } from '../core/normalization';
import type { BankAccount, SigefRelease } from '../core/schemas';
import { buildFiscalHumanView } from './build-fiscal-human-view';
import { buildMonitoringOperationalView } from './build-monitoring-operational-view';
import type { RunMonitoringResult } from './run-monitoring';

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

type RawMonitoring = RunMonitoringResult['raw'];
type RawSchool = RawMonitoring['schools'][number];
type RawRepasse = RawSchool['repasses'][number];
type RawAccount = RawSchool['accounts'][number];
type CollectSigefReleases = (input: {
  cnpj: string;
  programCode: string;
  fiscalYear: number;
  targetCnpjs?: string[];
  signal?: AbortSignal;
}) => Promise<SigefPublicReleaseCollection>;
type CollectSigefAccount = (input: Parameters<typeof collectSigefPublicAccount>[0]) => Promise<SigefAccountResult>;

export interface SigefReleaseAccountRecovery {
  schoolInep: string;
  schoolCnpj: string;
  programCode: string;
  action: string;
  installment: string | null;
  amountCents: number;
  status: 'RECOVERED' | 'CONFIRMED' | 'ACCOUNT_MISMATCH' | 'NOT_FOUND' | 'AMBIGUOUS' | 'ERROR';
  account: BankAccount | null;
  paymentDate: string | null;
  orderBank: string | null;
  sourceUrl: string | null;
  error: string | null;
}

export type MonitoringWithSigefReleaseAccounts = Omit<RunMonitoringResult, 'raw'> & {
  raw: RawMonitoring & {
    accountRecoveries: SigefReleaseAccountRecovery[];
  };
};

export interface RecoverSigefReleaseAccountsOptions {
  base: RunMonitoringResult;
  workspacePath: string;
  fiscalYear: 2026;
  signal?: AbortSignal;
  collectSigefReleases?: CollectSigefReleases;
  collectSigefAccount?: CollectSigefAccount;
}

function emptyTotals(): Record<SigefMovementClass, number> {
  return Object.fromEntries(CLASSIFICATIONS.map((classification) => [classification, 0])) as Record<SigefMovementClass, number>;
}

function safeSegment(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, '_');
}

async function mapConcurrent<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function run(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => run()));
  return results;
}

function actionCode(programCode: string, action: string): string | null {
  const text = canonicalText(action);
  if (programCode === '02') {
    if (text.includes('PRIMEIRA INFANCIA')) return 'PDDE_PRIMEIRA_INFANCIA';
    if (text.includes('PDDE BASICO') || text.includes('MANUTENCAO ESCOLAR')) return 'PDDE_BASICO';
  }
  if (programCode === '0B') {
    if (text.includes('EDUCACAO CONECTADA')) return 'EDUCACAO_CONECTADA';
    if (text.includes('ESCOLA E COMUNIDADE')) return 'ESCOLA_E_COMUNIDADE';
    if (text.includes('ESCOLA DAS ADOLESCENCIAS')) return 'ESCOLA_DAS_ADOLESCENCIAS';
    if (text.includes('CANTINHO DA LEITURA')) return 'CANTINHO_DA_LEITURA';
  }
  if (programCode === '0A' && (text.includes('PDDE SRM') || text.includes('SALA DE RECURSOS'))) return 'PDDE_SRM';
  if (programCode === 'Z9' && text.includes('EDUCACAO INTEGRAL')) return 'PDDE_EDUCACAO_INTEGRAL';
  return null;
}

function installmentCode(value: string | null): string | null {
  const text = canonicalText(value ?? '');
  if (/\bP1\b/.test(text)) return 'P1';
  if (/\bP2\b/.test(text)) return 'P2';
  if (/\b(?:1|PRIMEIRA) PARC(?:ELA)?\b/.test(text)) return '1';
  if (/\b(?:2|SEGUNDA) PARC(?:ELA)?\b/.test(text)) return '2';
  return null;
}

function releaseCandidates(repasse: RawRepasse, releases: readonly SigefRelease[]): SigefRelease[] {
  const wantedAction = actionCode(repasse.programCode, repasse.action);
  const wantedInstallment = installmentCode(repasse.installment);
  return releases.filter((release) => (
    release.programCode === repasse.programCode
    && release.amountCents === repasse.pagoInformadoCents
    && (!wantedAction || release.actionCode === wantedAction)
    && (!wantedInstallment || !release.installmentCode || release.installmentCode === wantedInstallment)
  ));
}

function uniqueRelease(repasse: RawRepasse, releases: readonly SigefRelease[]): {
  status: 'RECOVERED' | 'NOT_FOUND' | 'AMBIGUOUS';
  release: SigefRelease | null;
} {
  const candidates = releaseCandidates(repasse, releases);
  if (repasse.dataOrdem) {
    const exactDate = candidates.filter((release) => release.paymentDate === repasse.dataOrdem);
    if (exactDate.length === 1) return { status: 'RECOVERED', release: exactDate[0] };
    if (exactDate.length > 1) return { status: 'AMBIGUOUS', release: null };
  }
  if (candidates.length === 1) return { status: 'RECOVERED', release: candidates[0] };
  return { status: candidates.length === 0 ? 'NOT_FOUND' : 'AMBIGUOUS', release: null };
}

function accountKey(programCode: string, account: BankAccount): string {
  return `${programCode}|${canonicalAccount(account)}`;
}

function repasseKey(input: {
  schoolInep: string;
  programCode: string;
  action: string;
  installment: string | null;
  amountCents: number;
  orderDate: string | null;
}): string {
  return [
    input.schoolInep,
    input.programCode,
    canonicalText(input.action),
    canonicalText(input.installment ?? ''),
    String(input.amountCents),
    input.orderDate ?? '',
  ].join('|');
}

function needsReleaseEscalation(options: RecoverSigefReleaseAccountsOptions): Set<string> {
  return new Set(options.base.operational.repasses
    .filter((repasse) => (
      repasse.amountPaidInformedCents > 0
      && repasse.bankCreditStatus !== 'CREDITO_CONFIRMADO'
    ))
    .map((repasse) => repasseKey({
      schoolInep: repasse.school.inep,
      programCode: repasse.programCode,
      action: repasse.action,
      installment: repasse.installment,
      amountCents: repasse.amountPaidInformedCents,
      orderDate: repasse.orderDate,
    })));
}

function accountResult(input: {
  schoolInep: string;
  programCode: string;
  programLabel: string;
  account: BankAccount;
  statement: SigefAccountResult;
  fiscalYear: 2026;
}): RawAccount {
  const inYear = input.statement.movements.filter((movement) => movement.movementDate.startsWith(`${input.fiscalYear}-`));
  const totals = emptyTotals();
  for (const movement of inYear) totals[movement.classification] += movement.amountCents;
  return {
    inep: input.schoolInep,
    programCode: input.programCode,
    programLabel: input.programLabel,
    account: input.account,
    saldoPddeInfoCents: null,
    occurrence: null,
    status: input.statement.status,
    error: null,
    pagesFetched: input.statement.pagesFetched,
    declaredTotal: input.statement.declaredTotal,
    uniqueMovements: input.statement.movements.length,
    movementsInYear: inYear.length,
    coverageThrough: input.statement.coverageThrough,
    totals,
    movements: inYear,
  } as RawAccount;
}

function failedAccountResult(input: {
  schoolInep: string;
  programCode: string;
  programLabel: string;
  account: BankAccount;
  error: string;
}): RawAccount {
  return {
    inep: input.schoolInep,
    programCode: input.programCode,
    programLabel: input.programLabel,
    account: input.account,
    saldoPddeInfoCents: null,
    occurrence: null,
    status: 'ERROR',
    error: input.error,
    pagesFetched: 0,
    declaredTotal: null,
    uniqueMovements: 0,
    movementsInYear: 0,
    coverageThrough: null,
    totals: emptyTotals(),
    movements: [],
  } as RawAccount;
}

function recomputeRaw(raw: RawMonitoring & { accountRecoveries: SigefReleaseAccountRecovery[] }, releaseFailures: number): void {
  const accounts = raw.schools.flatMap((school) => school.accounts);
  const repasses = raw.schools.flatMap((school) => school.repasses);
  const totals = emptyTotals();
  let historical = 0;
  let movementsInYear = 0;
  let balances = 0;
  let complete = 0;
  let partial = 0;
  let failed = 0;
  for (const account of accounts) {
    for (const classification of CLASSIFICATIONS) totals[classification] += account.totals[classification] ?? 0;
    historical += account.uniqueMovements;
    movementsInYear += account.movementsInYear;
    balances += account.saldoPddeInfoCents ?? 0;
    if (account.status === 'COMPLETE') complete += 1;
    else if (account.status === 'PARTIAL') partial += 1;
    else failed += 1;
  }
  const paid = repasses.filter((repasse) => repasse.pagoInformadoCents > 0);
  raw.summary = {
    ...raw.summary,
    accounts: accounts.length,
    repassesProgramadosCents: repasses.reduce((sum, repasse) => sum + repasse.programadoCents, 0),
    repassesProgramadosNosItensPagosCents: paid.reduce((sum, repasse) => sum + repasse.programadoCents, 0),
    repassesPagosInformadosCents: repasses.reduce((sum, repasse) => sum + repasse.pagoInformadoCents, 0),
    creditosFndeLocalizadosCents: totals.REPASSE_FNDE,
    aplicacoesFinanceirasCents: totals.APLICACAO_FINANCEIRA,
    resgatesCents: totals.RESGATE_APLICACAO,
    pagamentosTransferenciasCents: totals.PAGAMENTO_TRANSFERENCIA + totals.PAGAMENTO_CARTAO,
    rendimentosCents: totals.RENDIMENTO_FINANCEIRO,
    entradasTerceirosCents: totals.ENTRADA_TERCEIRO,
    tarifasCents: totals.TARIFA_BANCARIA,
    estornosCents: totals.ESTORNO_REVERSAO,
    naoClassificadosCents: totals.MOVIMENTO_NAO_CLASSIFICADO,
    saldosPddeInfoCents: balances,
    movimentosHistoricosExtraidos: historical,
    movimentosDoExercicio: movementsInYear,
  };
  raw.coverage = {
    ...raw.coverage,
    mappedAccountsAttempted: accounts.length,
    mappedAccountsComplete: complete,
    mappedAccountsPartial: partial,
    mappedAccountsFailed: failed,
  };
  raw.status = raw.status === 'COMPLETE' && releaseFailures === 0 && partial === 0 && failed === 0
    ? 'COMPLETE'
    : 'PARTIAL';
  if (raw.accountRecoveries.length > 0 && !raw.sources.includes('SIGEF_LIBERACOES')) raw.sources.push('SIGEF_LIBERACOES');
}

export async function recoverSigefReleaseAccounts(
  options: RecoverSigefReleaseAccountsOptions,
): Promise<MonitoringWithSigefReleaseAccounts> {
  const releaseCollector = options.collectSigefReleases ?? collectSigefPublicReleases;
  const statementCollector = options.collectSigefAccount ?? collectSigefPublicAccount;
  const workspacePath = resolve(options.workspacePath);
  const raw = structuredClone(options.base.raw) as RawMonitoring & { accountRecoveries: SigefReleaseAccountRecovery[] };
  raw.accountRecoveries = [];
  const escalationKeys = needsReleaseEscalation(options);

  const groups: Array<{ school: RawSchool; programCode: string; repasses: RawRepasse[] }> = [];
  for (const school of raw.schools) {
    const pendingByProgram = new Map<string, RawRepasse[]>();
    for (const repasse of school.repasses) {
      if (repasse.pagoInformadoCents <= 0) continue;
      const key = repasseKey({
        schoolInep: school.inep,
        programCode: repasse.programCode,
        action: repasse.action,
        installment: repasse.installment,
        amountCents: repasse.pagoInformadoCents,
        orderDate: repasse.dataOrdem,
      });
      if (!escalationKeys.has(key)) continue;
      const list = pendingByProgram.get(repasse.programCode) ?? [];
      list.push(repasse);
      pendingByProgram.set(repasse.programCode, list);
    }
    for (const [programCode, repasses] of pendingByProgram) groups.push({ school, programCode, repasses });
  }

  let releaseFailures = 0;
  await mapConcurrent(groups, 2, async (group) => {
    options.signal?.throwIfAborted();
    let collection: SigefPublicReleaseCollection;
    try {
      collection = await releaseCollector({
        cnpj: canonicalCnpj(group.school.cnpj),
        programCode: group.programCode,
        fiscalYear: options.fiscalYear,
        targetCnpjs: [canonicalCnpj(group.school.cnpj)],
        ...(options.signal ? { signal: options.signal } : {}),
      });
      const releasePath = join(workspacePath, 'sigef', group.school.inep, group.programCode, 'liberacoes.html');
      await mkdir(dirname(releasePath), { recursive: true });
      await writeFile(releasePath, collection.rawBytes);
    } catch (cause) {
      options.signal?.throwIfAborted();
      releaseFailures += 1;
      const error = cause instanceof Error ? cause.message : String(cause);
      for (const repasse of group.repasses) {
        raw.accountRecoveries.push({
          schoolInep: group.school.inep,
          schoolCnpj: canonicalCnpj(group.school.cnpj),
          programCode: group.programCode,
          action: repasse.action,
          installment: repasse.installment,
          amountCents: repasse.pagoInformadoCents,
          status: 'ERROR',
          account: repasse.account ? { ...repasse.account } : null,
          paymentDate: null,
          orderBank: null,
          sourceUrl: null,
          error,
        });
      }
      return;
    }

    for (const repasse of group.repasses) {
      const match = uniqueRelease(repasse, collection.releases);
      if (!match.release) {
        raw.accountRecoveries.push({
          schoolInep: group.school.inep,
          schoolCnpj: canonicalCnpj(group.school.cnpj),
          programCode: group.programCode,
          action: repasse.action,
          installment: repasse.installment,
          amountCents: repasse.pagoInformadoCents,
          status: match.status,
          account: repasse.account ? { ...repasse.account } : null,
          paymentDate: null,
          orderBank: null,
          sourceUrl: collection.sourceUrl,
          error: null,
        });
        continue;
      }

      const releasedAccount = { ...match.release.destinationAccount };
      let status: SigefReleaseAccountRecovery['status'];
      if (!repasse.account) {
        repasse.account = releasedAccount;
        status = 'RECOVERED';
      } else if (canonicalAccount(repasse.account) === canonicalAccount(releasedAccount)) {
        status = 'CONFIRMED';
      } else {
        status = 'ACCOUNT_MISMATCH';
      }

      raw.accountRecoveries.push({
        schoolInep: group.school.inep,
        schoolCnpj: canonicalCnpj(group.school.cnpj),
        programCode: group.programCode,
        action: repasse.action,
        installment: repasse.installment,
        amountCents: repasse.pagoInformadoCents,
        status,
        account: releasedAccount,
        paymentDate: match.release.paymentDate,
        orderBank: match.release.orderBank,
        sourceUrl: collection.sourceUrl,
        error: null,
      });
    }
  });

  const accountTasks: Array<{ school: RawSchool; programCode: string; programLabel: string; account: BankAccount }> = [];
  for (const school of raw.schools) {
    const existing = new Set(school.accounts.map((account) => accountKey(account.programCode, account.account)));
    const recovered = raw.accountRecoveries.filter((item) => item.schoolInep === school.inep && item.status === 'RECOVERED' && item.account);
    for (const item of recovered) {
      if (!item.account) continue;
      const key = accountKey(item.programCode, item.account);
      if (existing.has(key)) continue;
      existing.add(key);
      accountTasks.push({
        school,
        programCode: item.programCode,
        programLabel: item.programCode === '02' ? 'PDDE' : item.action,
        account: item.account,
      });
    }
  }

  await mapConcurrent(accountTasks, 2, async (task) => {
    options.signal?.throwIfAborted();
    const rawDir = join(workspacePath, 'sigef', task.school.inep, task.programCode, safeSegment(task.account.number));
    let result: RawAccount;
    try {
      const statement = await statementCollector({
        cnpj: canonicalCnpj(task.school.cnpj),
        programCode: task.programCode,
        account: task.account,
        startYear: options.fiscalYear,
        startMonth: 1,
        maxPages: 500,
        ...(options.signal ? { signal: options.signal } : {}),
        onPage: async (page) => {
          await mkdir(rawDir, { recursive: true });
          await writeFile(join(rawDir, `page-${String(page.index).padStart(3, '0')}.html`), page.rawBytes);
        },
      });
      result = accountResult({
        schoolInep: task.school.inep,
        programCode: task.programCode,
        programLabel: task.programLabel,
        account: task.account,
        statement,
        fiscalYear: options.fiscalYear,
      });
    } catch (cause) {
      options.signal?.throwIfAborted();
      result = failedAccountResult({
        schoolInep: task.school.inep,
        programCode: task.programCode,
        programLabel: task.programLabel,
        account: task.account,
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
    task.school.accounts.push(result);
  });

  recomputeRaw(raw, releaseFailures);
  const operational = buildMonitoringOperationalView(raw);
  const fiscal = buildFiscalHumanView(raw);
  return {
    status: raw.status,
    raw,
    operational,
    fiscal,
    paths: options.base.paths,
  };
}
