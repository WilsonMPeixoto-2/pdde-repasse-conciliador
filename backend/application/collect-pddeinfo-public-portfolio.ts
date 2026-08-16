import { z } from 'zod';
import {
  discoverPddeInfoBalanceMonths,
  fetchPddeInfoPublicReport,
  type FetchPddeInfoPublicReportOptions,
  type PddeInfoPublicReportKind,
  type PddeInfoPublicReportResult,
} from '../adapters/pddeinfo-public-reports';
import {
  normalizeAccountingRow,
  normalizeAttendanceRow,
  normalizeBalanceRow,
  type PddeInfoAccountingObservation,
  type PddeInfoAttendanceObservation,
  type PddeInfoBalanceObservation,
} from '../adapters/pddeinfo-public-report-normalizer';
import { assertCurrentFiscalYear } from '../core/fiscal-scope';
import { runRateLimited } from '../runtime/rate-limited-queue';

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();

export interface PublicPortfolioSchool {
  inep: string;
  sme: string;
  nome: string;
}

export type PublicPortfolioFetchReport = (
  options: FetchPddeInfoPublicReportOptions,
) => Promise<PddeInfoPublicReportResult>;

export type DiscoverBalanceMonths = (signal?: AbortSignal) => Promise<string[]>;
export type BalanceCollectionMode = 'LATEST' | 'ALL_AVAILABLE_2026';

export interface PublicPortfolioFailure {
  kind: 'ATTENDANCE' | 'ACCOUNTING' | 'BALANCE' | 'BALANCE_MONTH_DISCOVERY';
  schoolInep?: string;
  cnpj?: string;
  month?: string;
  error: string;
}

export interface PublicPortfolioArtifact {
  kind: PddeInfoPublicReportKind;
  schoolInep?: string;
  cnpj?: string;
  queriedAt: string;
  sourceUrl: string;
  coverageThrough: string | null;
  rawBytes: Buffer;
}

export interface PortfolioBalanceObservation extends PddeInfoBalanceObservation {
  schoolIneps: string[];
}

export interface PddeInfoPublicPortfolioResult {
  attendance: PddeInfoAttendanceObservation[];
  accounting: PddeInfoAccountingObservation[];
  balances: PortfolioBalanceObservation[];
  failures: PublicPortfolioFailure[];
  artifacts: PublicPortfolioArtifact[];
  balanceReferenceMonth: string | null;
  coverageThrough: string | null;
}

export interface CollectPddeInfoPublicPortfolioOptions {
  schools: PublicPortfolioSchool[];
  fiscalYear: 2026;
  fetchReport?: PublicPortfolioFetchReport;
  discoverBalanceMonths?: DiscoverBalanceMonths;
  balanceMode?: BalanceCollectionMode;
  browserFallback?: boolean;
  signal?: AbortSignal;
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function monthRank(value: string): number {
  const match = /^(0[1-9]|1[0-2])-2026$/.exec(value);
  if (!match) return -1;
  return 202600 + Number(match[1]);
}

function valid2026Months(values: readonly string[]): string[] {
  return [...new Set(values)]
    .filter((value) => /^(0[1-9]|1[0-2])-2026$/.test(value))
    .sort((left, right) => monthRank(right) - monthRank(left));
}

function artifact(
  report: PddeInfoPublicReportResult,
  identity: { schoolInep?: string; cnpj?: string },
): PublicPortfolioArtifact {
  return {
    kind: report.kind,
    ...(identity.schoolInep ? { schoolInep: identity.schoolInep } : {}),
    ...(identity.cnpj ? { cnpj: identity.cnpj } : {}),
    queriedAt: report.queriedAt,
    sourceUrl: report.sourceUrl,
    coverageThrough: report.coverageThrough,
    rawBytes: report.rawBytes,
  };
}

export async function collectPddeInfoPublicPortfolio(
  options: CollectPddeInfoPublicPortfolioOptions,
): Promise<PddeInfoPublicPortfolioResult> {
  assertCurrentFiscalYear(options.fiscalYear);
  options.signal?.throwIfAborted();
  const schools = z.array(schoolSchema).min(1).max(163).parse(options.schools);
  const uniqueIneps = new Set(schools.map((school) => school.inep));
  if (uniqueIneps.size !== schools.length) {
    throw new Error('A carteira pública FNDE contém INEP duplicado.');
  }

  const fetchReport = options.fetchReport ?? fetchPddeInfoPublicReport;
  const discoverMonths = options.discoverBalanceMonths
    ?? ((signal?: AbortSignal) => discoverPddeInfoBalanceMonths(signal ? { signal } : {}));
  const browserFallback = options.browserFallback ?? true;
  const balanceMode = options.balanceMode ?? 'LATEST';
  const attendance: PddeInfoAttendanceObservation[] = [];
  const accounting: PddeInfoAccountingObservation[] = [];
  const balances: PortfolioBalanceObservation[] = [];
  const failures: PublicPortfolioFailure[] = [];
  const artifacts: PublicPortfolioArtifact[] = [];

  await runRateLimited(schools, async (school) => {
    options.signal?.throwIfAborted();
    try {
      const report = await fetchReport({
        filter: { kind: 'ATTENDANCE', fiscalYear: 2026, inep: school.inep },
        browserFallback,
        ...(options.signal ? { signal: options.signal } : {}),
      });
      artifacts.push(artifact(report, { schoolInep: school.inep }));
      for (const row of report.rows) attendance.push(normalizeAttendanceRow(row));
    } catch (cause) {
      failures.push({ kind: 'ATTENDANCE', schoolInep: school.inep, error: errorText(cause) });
    }

    try {
      const report = await fetchReport({
        filter: { kind: 'ACCOUNTING', fiscalYear: 2026, inep: school.inep },
        browserFallback,
        ...(options.signal ? { signal: options.signal } : {}),
      });
      artifacts.push(artifact(report, { schoolInep: school.inep }));
      for (const row of report.rows) accounting.push(normalizeAccountingRow(row));
    } catch (cause) {
      failures.push({ kind: 'ACCOUNTING', schoolInep: school.inep, error: errorText(cause) });
    }
  }, {
    concurrency: 3,
    intervalCap: 6,
    intervalMs: 5_000,
    timeoutMs: 35_000,
    strict: true,
    ...(options.signal ? { signal: options.signal } : {}),
  });

  let availableBalanceMonths: string[] = [];
  try {
    availableBalanceMonths = valid2026Months(await discoverMonths(options.signal));
  } catch (cause) {
    failures.push({ kind: 'BALANCE_MONTH_DISCOVERY', error: errorText(cause) });
  }
  const balanceReferenceMonth = availableBalanceMonths[0] ?? null;
  const monthsToCollect = balanceMode === 'ALL_AVAILABLE_2026'
    ? availableBalanceMonths
    : balanceReferenceMonth ? [balanceReferenceMonth] : [];

  const cnpjSchools = new Map<string, Set<string>>();
  for (const observation of attendance) {
    const bucket = cnpjSchools.get(observation.uexCnpj) ?? new Set<string>();
    bucket.add(observation.schoolInep);
    cnpjSchools.set(observation.uexCnpj, bucket);
  }

  let coverageThrough: string | null = null;
  const balanceTasks = [...cnpjSchools.keys()].sort().flatMap((cnpj) => (
    monthsToCollect.map((month) => ({ cnpj, month }))
  ));
  if (balanceTasks.length > 0) {
    await runRateLimited(balanceTasks, async ({ cnpj, month }) => {
      options.signal?.throwIfAborted();
      try {
        const report = await fetchReport({
          filter: { kind: 'BALANCE', month, cnpj },
          browserFallback,
          ...(options.signal ? { signal: options.signal } : {}),
        });
        artifacts.push(artifact(report, { cnpj }));
        if (report.coverageThrough) {
          coverageThrough = coverageThrough === null
            ? report.coverageThrough
            : [coverageThrough, report.coverageThrough].sort().at(-1) ?? coverageThrough;
        }
        const schoolIneps = [...(cnpjSchools.get(cnpj) ?? new Set<string>())].sort();
        for (const row of report.rows) {
          const normalized = normalizeBalanceRow(
            row,
            report.coverageThrough
              ?? (() => { throw new Error('Relatório de saldo sem data de cobertura.'); })(),
          );
          balances.push({ ...normalized, schoolIneps });
        }
      } catch (cause) {
        failures.push({ kind: 'BALANCE', cnpj, month, error: errorText(cause) });
      }
    }, {
      concurrency: 3,
      intervalCap: 6,
      intervalMs: 5_000,
      timeoutMs: 35_000,
      strict: true,
      ...(options.signal ? { signal: options.signal } : {}),
    });
  }

  attendance.sort((left, right) => (
    left.schoolInep.localeCompare(right.schoolInep)
    || left.programName.localeCompare(right.programName, 'pt-BR')
    || left.destination.localeCompare(right.destination, 'pt-BR')
  ));
  accounting.sort((left, right) => (
    left.schoolInep.localeCompare(right.schoolInep)
    || left.programName.localeCompare(right.programName, 'pt-BR')
  ));
  balances.sort((left, right) => (
    (left.schoolIneps[0] ?? '').localeCompare(right.schoolIneps[0] ?? '')
    || left.coverageThrough.localeCompare(right.coverageThrough)
    || left.programName.localeCompare(right.programName, 'pt-BR')
    || left.account.localeCompare(right.account)
  ));
  failures.sort((left, right) => (
    (left.schoolInep ?? left.cnpj ?? '').localeCompare(right.schoolInep ?? right.cnpj ?? '')
    || (left.month ?? '').localeCompare(right.month ?? '')
    || left.kind.localeCompare(right.kind)
  ));

  return {
    attendance,
    accounting,
    balances,
    failures,
    artifacts,
    balanceReferenceMonth,
    coverageThrough,
  };
}
