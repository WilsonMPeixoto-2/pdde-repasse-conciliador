#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { canonicalAccount, canonicalText } from '../backend/core/normalization';
import { fetchPddeInfoSchoolHtml, type PddeInfoHttpResult } from '../backend/adapters/pddeinfo-http';
import { parsePddeInfoSchoolHtml, type PddeInfoRawSchool } from '../backend/adapters/pddeinfo-html';
import { normalizePddeInfoSchools } from '../backend/adapters/pddeinfo-normalizer';
import {
  collectSigefPublicAccount,
  type SigefMovementClass,
} from '../backend/adapters/sigef-public-statement';
import { loadMasterSchools } from '../backend/application/school-catalog';

const DEFAULT_INEPS = [
  '33069247', '33069093', '33069433', '33069379', '33069271',
  '33069409', '33069360', '33069468', '33069220', '33069328',
];

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

interface CliOptions {
  year: number;
  ineps: string[];
  workspace: string;
  output: string;
}

function args(argv: string[]): CliOptions {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    }
    map.set(key, value);
  }

  const year = Number(map.get('--year') ?? '2026');
  if (!Number.isInteger(year) || year < 2000 || year > 2100) throw new Error('--year inválido.');

  const ineps = map.get('--ineps')?.split(',').map((value) => value.trim()).filter(Boolean) ?? DEFAULT_INEPS;
  if (ineps.some((value) => !/^\d{8}$/.test(value))) throw new Error('--ineps contém INEP inválido.');

  return {
    year,
    ineps,
    workspace: resolve(map.get('--workspace') ?? '.tmp/monitor-live-2026'),
    output: resolve(map.get('--output') ?? 'artifacts/monitor-live-2026.json'),
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

function hash(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function emptyTotals(): Record<SigefMovementClass, number> {
  return Object.fromEntries(CLASSIFICATIONS.map((classification) => [classification, 0])) as Record<SigefMovementClass, number>;
}

function sleep(milliseconds: number): Promise<void> {
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

async function fetchPddeInfoWithRecovery(year: number, inep: string): Promise<PddeInfoHttpResult> {
  let lastError: Error | null = null;
  for (let round = 1; round <= 2; round += 1) {
    try {
      return await fetchPddeInfoSchoolHtml({
        fiscalYear: year,
        inep,
        maxAttempts: 4,
        timeoutMs: 30_000,
        retryBackoffMs: 1_000,
      });
    } catch (cause) {
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      if (round < 2) await sleep(2_000 + Math.floor(Math.random() * 750));
    }
  }
  throw lastError ?? new Error(`Falha desconhecida no PDDEInfo para ${inep}.`);
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const opt = args(argv);
  await rm(opt.workspace, { recursive: true, force: true });
  await mkdir(opt.workspace, { recursive: true });

  const master = await loadMasterSchools();
  const selected = opt.ineps.map((inep) => {
    const school = master.find((value) => value.inep === inep);
    if (!school) throw new Error(`INEP ${inep} não está na lista-mestre.`);
    return school;
  });

  const pddeFailures: Array<{ inep: string; name: string; error: string }> = [];
  const pddeMeta: Record<string, { queriedAt: string; rawSha256: string }> = {};

  const pddeCollected = await mapConcurrent(selected, 2, async (school) => {
    try {
      const http = await fetchPddeInfoWithRecovery(opt.year, school.inep);
      const parsed = parsePddeInfoSchoolHtml(http.html, {
        expectedSchool: school,
        sourceUrl: http.sourceUrl,
      });
      const raw = http.rawBytes ?? Buffer.from(http.html, 'utf8');
      const path = join(opt.workspace, 'pddeinfo', `${school.inep}.html`);
      await mkdir(dirname(path), { recursive: true });
      await writeFile(path, raw);
      pddeMeta[school.inep] = { queriedAt: http.queriedAt, rawSha256: hash(raw) };
      return parsed;
    } catch (cause) {
      pddeFailures.push({
        inep: school.inep,
        name: school.nome,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return null;
    }
  });

  const schools = pddeCollected.filter((school): school is PddeInfoRawSchool => school !== null);
  const pdde = normalizePddeInfoSchools(schools, {
    fiscalYear: opt.year,
    queriedAt: new Date().toISOString(),
  });

  interface AccountTask {
    school: PddeInfoRawSchool;
    raw: PddeInfoRawSchool['accounts'][number];
    code: string;
    account: { bank: string; agency: string; number: string };
  }

  const accountTasks: AccountTask[] = [];
  const unknownProgramAccounts: Array<{
    inep: string;
    programLabel: string;
    bank: string;
    agency: string;
    account: string;
  }> = [];

  for (const school of schools) {
    const seen = new Set<string>();
    for (const raw of school.accounts) {
      if (!raw.banco.trim() || !raw.agencia.trim() || !raw.conta.trim()) continue;
      const code = programCode(raw.programa);
      if (!code) {
        unknownProgramAccounts.push({
          inep: school.inep,
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
      const key = `${school.inep}|${code}|${canonicalAccount(account)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      accountTasks.push({ school, raw, code, account });
    }
  }

  const accountResults = await mapConcurrent(accountTasks, 2, async (task) => {
    const rawDir = join(
      opt.workspace,
      'sigef',
      task.school.inep,
      task.code,
      task.account.number.replace(/[^0-9A-Z]/gi, '_'),
    );

    try {
      const statement = await collectSigefPublicAccount({
        cnpj: task.school.cnpj,
        programCode: task.code,
        account: task.account,
        startYear: opt.year,
        startMonth: 1,
        maxPages: 500,
        onPage: async (page) => {
          await mkdir(rawDir, { recursive: true });
          await writeFile(join(rawDir, `page-${String(page.index).padStart(3, '0')}.html`), page.rawBytes);
        },
      });

      const inYear = statement.movements.filter((movement) => movement.movementDate.startsWith(`${opt.year}-`));
      const totals = emptyTotals();
      for (const movement of inYear) totals[movement.classification] += movement.amountCents;

      return {
        inep: task.school.inep,
        programCode: task.code,
        programLabel: task.raw.programa,
        account: task.account,
        saldoPddeInfoCents: money(task.raw.saldo),
        status: statement.status as 'COMPLETE' | 'PARTIAL',
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
      return {
        inep: task.school.inep,
        programCode: task.code,
        programLabel: task.raw.programa,
        account: task.account,
        saldoPddeInfoCents: money(task.raw.saldo),
        status: 'ERROR' as const,
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

  const schoolResults = schools.map((school) => ({
    inep: school.inep,
    sme: school.sme,
    name: school.nome,
    uex: school.uex,
    cnpj: school.cnpj,
    pddeInfo: pddeMeta[school.inep],
    repasses: pdde.payments
      .filter((payment) => payment.school.inep === school.inep)
      .map((payment) => ({
        programCode: payment.programCode,
        action: payment.actionName,
        installment: payment.installmentLabel,
        programadoCents: payment.amountFinalDueCents,
        pagoInformadoCents: payment.amountPaidCents,
        dataOrdem: payment.paymentDate ?? null,
        account: payment.account ?? null,
      })),
    accounts: accountResults.filter((account) => account.inep === school.inep),
    unknownProgramAccounts: unknownProgramAccounts.filter((account) => account.inep === school.inep),
  }));

  const summaryTotals = emptyTotals();
  let movementsInYear = 0;
  let historical = 0;
  let balances = 0;
  let accountsComplete = 0;
  let accountsPartial = 0;
  let accountsFailed = 0;

  for (const account of accountResults) {
    for (const classification of CLASSIFICATIONS) summaryTotals[classification] += account.totals[classification];
    movementsInYear += account.movementsInYear;
    historical += account.uniqueMovements;
    balances += account.saldoPddeInfoCents ?? 0;
    if (account.status === 'COMPLETE') accountsComplete += 1;
    else if (account.status === 'PARTIAL') accountsPartial += 1;
    else accountsFailed += 1;
  }

  const paidRows = pdde.payments.filter((payment) => payment.amountPaidCents > 0);
  const complete = pddeFailures.length === 0
    && accountsPartial === 0
    && accountsFailed === 0
    && unknownProgramAccounts.length === 0;

  const result = {
    version: 2,
    generatedAt: new Date().toISOString(),
    fiscalYear: opt.year,
    status: complete ? 'COMPLETE' : 'PARTIAL',
    sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
    coverage: {
      requestedSchools: selected.length,
      pddeInfoSchoolsCollected: schools.length,
      pddeInfoFailures,
      mappedAccountsAttempted: accountResults.length,
      mappedAccountsComplete: accountsComplete,
      mappedAccountsPartial: accountsPartial,
      mappedAccountsFailed: accountsFailed,
      unknownProgramAccounts,
    },
    summary: {
      schools: schoolResults.length,
      accounts: accountResults.length,
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

  await mkdir(dirname(opt.output), { recursive: true });
  await writeFile(opt.output, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ status: result.status, output: opt.output, coverage: result.coverage, summary: result.summary }, null, 2)}\n`);
  if (result.status !== 'COMPLETE') process.exitCode = 2;
}

const direct = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (direct) {
  main().catch((error) => {
    process.stderr.write(`Falha no monitoramento live: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
