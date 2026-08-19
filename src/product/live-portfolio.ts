import {
  runLiveSchoolQuery,
  type LiveSchoolQueryResult,
} from './api';
import {
  humanPortfolioSchema,
  type HumanIndicator,
  type HumanPortfolio,
  type HumanPortfolioSchool,
  type HumanSchool,
  type HumanUnit,
} from './types';

const DEFAULT_CONCURRENCY = 3;
const DEFAULT_ATTEMPTS = 2;

export interface LivePortfolioResult {
  generatedAt: string;
  status: 'COMPLETE' | 'PARTIAL';
  portfolio: HumanPortfolio;
  schools: Record<string, HumanSchool>;
}

export interface LivePortfolioProgress {
  completed: number;
  total: number;
  succeeded: number;
  failed: number;
}

export interface RunLivePortfolioQueryOptions {
  concurrency?: number;
  attempts?: number;
  signal?: AbortSignal;
  querySchool?: (inep: string, signal?: AbortSignal) => Promise<LiveSchoolQueryResult>;
  onProgress?: (progress: LivePortfolioProgress) => void;
}

function brDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function latestReference(schools: readonly HumanSchool[]): string | null {
  return schools
    .flatMap((school) => school.accounts)
    .map((account) => account.latestPosition?.referenceDate ?? null)
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1) ?? null;
}

function schoolSummary(school: HumanSchool, referenceDate: string | null): HumanPortfolioSchool {
  let programmedCents = 0;
  let paymentInformedCents = 0;
  let creditLocatedCents = 0;
  let repasseAccountMissing = false;

  for (const program of school.programs) {
    for (const installment of program.installments) {
      programmedCents += installment.programmedCents;
      paymentInformedCents += installment.paymentInformedCents;
      if (
        installment.creditEvidence.status === 'Crédito localizado'
        && installment.creditEvidence.amountCents !== null
      ) {
        creditLocatedCents += installment.creditEvidence.amountCents;
      }
      if (installment.paymentInformedCents > 0 && installment.account === null) {
        repasseAccountMissing = true;
      }
    }
  }

  const alignedAccounts = referenceDate === null
    ? []
    : school.accounts.filter((account) => account.latestPosition?.referenceDate === referenceDate);
  const knownBalances = alignedAccounts
    .map((account) => account.latestPosition?.totalReportedBalanceCents ?? null)
    .filter((value): value is number => value !== null);

  return {
    sme: school.school.sme,
    name: school.school.name,
    inep: school.school.inep,
    programmedCents,
    paymentInformedCents,
    creditLocatedCents,
    knownBalanceCents: knownBalances.length > 0
      ? knownBalances.reduce((total, value) => total + value, 0)
      : null,
    referenceDate,
    accountsTotal: school.accounts.length,
    accountsWithReferencePosition: alignedAccounts.length,
    followUpCount: school.followUp.length,
    paymentSuspended: school.accounting.some((item) => item.paymentSuspended),
    repasseAccountMissing,
  };
}

function portfolioMetrics(schools: readonly HumanSchool[], referenceDate: string | null) {
  let accountsTotal = 0;
  let accountsWithPosition = 0;
  let programmedCents = 0;
  let paymentInformedCents = 0;
  let creditLocatedCents = 0;
  let reportedBalanceCents = 0;
  let applicationsCents = 0;
  let reportedBalanceKnown = true;
  let applicationsKnown = true;

  for (const school of schools) {
    accountsTotal += school.accounts.length;
    for (const program of school.programs) {
      for (const installment of program.installments) {
        programmedCents += installment.programmedCents;
        paymentInformedCents += installment.paymentInformedCents;
        if (
          installment.creditEvidence.status === 'Crédito localizado'
          && installment.creditEvidence.amountCents !== null
        ) {
          creditLocatedCents += installment.creditEvidence.amountCents;
        }
      }
    }

    for (const account of school.accounts) {
      if (
        referenceDate === null
        || account.latestPosition === null
        || account.latestPosition.referenceDate !== referenceDate
      ) continue;
      accountsWithPosition += 1;
      if (account.latestPosition.totalReportedBalanceCents === null) {
        reportedBalanceKnown = false;
      } else {
        reportedBalanceCents += account.latestPosition.totalReportedBalanceCents;
      }
      if (account.latestPosition.applications.totalCents === null) {
        applicationsKnown = false;
      } else {
        applicationsCents += account.latestPosition.applications.totalCents;
      }
    }
  }

  const hasAlignedAccounts = referenceDate !== null && accountsWithPosition > 0;
  return {
    schoolCount: schools.length,
    accountsTotal,
    accountsWithPosition,
    programmedCents,
    paymentInformedCents,
    creditLocatedCents,
    reportedBalanceCents: hasAlignedAccounts && reportedBalanceKnown ? reportedBalanceCents : null,
    applicationsCents: hasAlignedAccounts && applicationsKnown ? applicationsCents : null,
  };
}

function indicatorKey(unit: HumanUnit): string {
  return `${unit.inep}:${unit.sme}`;
}

function aggregateIndicators(results: readonly LiveSchoolQueryResult[]): HumanIndicator[] {
  const order: string[] = [];
  const unitsByLabel = new Map<string, Map<string, HumanUnit>>();

  for (const result of results) {
    for (const indicator of result.portfolio.indicators) {
      if (!unitsByLabel.has(indicator.label)) {
        order.push(indicator.label);
        unitsByLabel.set(indicator.label, new Map());
      }
      const units = unitsByLabel.get(indicator.label)!;
      for (const unit of indicator.units) units.set(indicatorKey(unit), unit);
    }
  }

  return order.map((label) => {
    const units = [...(unitsByLabel.get(label)?.values() ?? [])]
      .sort((left, right) => (
        left.sme.localeCompare(right.sme)
        || left.name.localeCompare(right.name, 'pt-BR')
      ));
    return { label, count: units.length, units };
  });
}

export function buildLivePortfolio(results: readonly LiveSchoolQueryResult[]): LivePortfolioResult {
  if (results.length < 1) throw new Error('A nova consulta não retornou nenhuma unidade.');

  const uniqueIneps = new Set(results.map((result) => result.school.school.inep));
  if (uniqueIneps.size !== results.length) {
    throw new Error('A nova consulta retornou unidade duplicada.');
  }

  const schools = results.map((result) => result.school);
  const reference = latestReference(schools);
  const first = results[0].portfolio;
  const portfolio = humanPortfolioSchema.parse({
    title: first.title,
    fiscalYear: 2026,
    referenceLabel: reference
      ? `Posição financeira pública disponível até ${brDate(reference)}`
      : 'Posição de saldo público ainda não disponível para 2026',
    schoolCount: schools.length,
    metrics: portfolioMetrics(schools, reference),
    sources: first.sources,
    indicators: aggregateIndicators(results),
    schools: schools.map((school) => schoolSummary(school, reference)),
  });

  const generatedAt = results
    .map((result) => result.generatedAt)
    .sort()
    .at(-1)!;

  return {
    generatedAt,
    status: results.some((result) => result.status === 'PARTIAL') ? 'PARTIAL' : 'COMPLETE',
    portfolio,
    schools: Object.fromEntries(schools.map((school) => [school.school.inep, school])),
  };
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (milliseconds <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    if (!signal) return;
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('Operação cancelada.', 'AbortError'));
    };
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
  });
}

export async function runLivePortfolioQuery(
  ineps: readonly string[],
  options: RunLivePortfolioQueryOptions = {},
): Promise<LivePortfolioResult> {
  if (ineps.length < 1 || ineps.length > 163) {
    throw new Error('A nova consulta deve conter entre 1 e 163 unidades.');
  }
  if (ineps.some((inep) => !/^\d{8}$/.test(inep))) {
    throw new Error('A nova consulta contém INEP inválido.');
  }
  if (new Set(ineps).size !== ineps.length) {
    throw new Error('A nova consulta contém INEP duplicado.');
  }

  const concurrency = options.concurrency ?? DEFAULT_CONCURRENCY;
  const attempts = options.attempts ?? DEFAULT_ATTEMPTS;
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8) {
    throw new Error('Concorrência da nova consulta deve estar entre 1 e 8.');
  }
  if (!Number.isInteger(attempts) || attempts < 1 || attempts > 3) {
    throw new Error('Tentativas da nova consulta devem estar entre 1 e 3.');
  }

  const querySchool = options.querySchool ?? runLiveSchoolQuery;
  const results = new Array<LiveSchoolQueryResult | undefined>(ineps.length);
  const failures: Array<{ inep: string; error: string }> = [];
  let cursor = 0;
  let completed = 0;
  let succeeded = 0;

  async function collectOne(inep: string): Promise<LiveSchoolQueryResult> {
    let lastError: unknown = null;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      options.signal?.throwIfAborted();
      try {
        return await querySchool(inep, options.signal);
      } catch (error) {
        options.signal?.throwIfAborted();
        lastError = error;
        if (attempt < attempts) await delay(1_500 * attempt, options.signal);
      }
    }
    throw lastError instanceof Error ? lastError : new Error(`Falha na consulta da unidade ${inep}.`);
  }

  async function worker(): Promise<void> {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= ineps.length) return;
      const inep = ineps[index];
      try {
        results[index] = await collectOne(inep);
        succeeded += 1;
      } catch (error) {
        if (options.signal?.aborted) throw error;
        failures.push({
          inep,
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        completed += 1;
        options.onProgress?.({
          completed,
          total: ineps.length,
          succeeded,
          failed: failures.length,
        });
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, ineps.length) }, () => worker()),
  );
  options.signal?.throwIfAborted();

  if (failures.length > 0) {
    const sample = failures.slice(0, 3).map((failure) => failure.inep).join(', ');
    throw new Error(
      `A nova consulta não foi concluída em ${failures.length} de ${ineps.length} unidades${sample ? ` (${sample}${failures.length > 3 ? ', …' : ''})` : ''}. O retrato anterior foi preservado.`,
    );
  }

  return buildLivePortfolio(results as LiveSchoolQueryResult[]);
}
