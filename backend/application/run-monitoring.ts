import {
  fetchPddeInfoSchoolHtml,
  type PddeInfoHttpResult,
} from '../adapters/pddeinfo-http';
import {
  parsePddeInfoSchoolHtml,
  type PddeInfoExpectedSchool,
} from '../adapters/pddeinfo-html';
import { normalizePddeInfoSchools } from '../adapters/pddeinfo-normalizer';
import { collectSigefPublicAccount } from '../adapters/sigef-public-statement';
import { canonicalAccount, canonicalCnpj } from '../core/normalization';
import {
  assessPaymentTemporalCoverage,
  type PaymentTemporalCoverageSummary,
} from '../core/payment-temporal-coverage';
import {
  runMonitoring as runMonitoringCore,
  type MonitoringPddeInfoSchoolResult,
  type MonitoringSchool,
  type RunMonitoringOptions,
  type RunMonitoringResult as CoreRunMonitoringResult,
} from './run-monitoring-core';

export type {
  MonitoringSchool,
  MonitoringPddeInfoSchoolResult,
  RunMonitoringOptions,
} from './run-monitoring-core';

export interface RunMonitoringResult extends Omit<CoreRunMonitoringResult, 'raw'> {
  raw: CoreRunMonitoringResult['raw'] & {
    quality: {
      paymentTemporalCoverage: PaymentTemporalCoverageSummary;
    };
    coverage: CoreRunMonitoringResult['raw']['coverage'] & {
      paymentTemporalCoverage: PaymentTemporalCoverageSummary;
    };
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, milliseconds));
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

function accountEvidenceKey(input: {
  cnpj: string;
  programCode: string;
  account: { bank: string; agency: string; number: string };
}): string | null {
  const cnpj = canonicalCnpj(input.cnpj);
  if (!cnpj) return null;
  return `${cnpj}|${input.programCode}|${canonicalAccount(input.account)}`;
}

function paymentTemporalCoverage(
  raw: CoreRunMonitoringResult['raw'],
): PaymentTemporalCoverageSummary {
  return assessPaymentTemporalCoverage({
    payments: raw.schools.flatMap((school) => (
      school.repasses.map((repasse) => ({
        schoolInep: school.inep,
        programCode: repasse.programCode,
        account: repasse.account,
        amountPaidCents: repasse.pagoInformadoCents,
        paymentDate: repasse.dataOrdem,
      }))
    )),
    accounts: raw.schools.flatMap((school) => (
      school.accounts.map((account) => ({
        schoolInep: school.inep,
        programCode: account.programCode,
        account: account.account,
        coverageThrough: account.coverageThrough,
      }))
    )),
  });
}

/**
 * Executa o núcleo operacional estável, orienta o coletor SIGEF pela data do
 * pagamento mais recente associado por chave forte e acrescenta uma dimensão
 * independente de qualidade temporal. `COMPLETE` continua descrevendo sucesso
 * operacional; não significa automaticamente suficiência temporal da evidência.
 */
export async function runMonitoring(
  options: RunMonitoringOptions,
): Promise<RunMonitoringResult> {
  const requiredThroughByAccount = new Map<string, string>();
  const basePddeCollector = options.collectPddeInfoSchool
    ?? ((school: MonitoringSchool, year: 2026, signal?: AbortSignal) => (
      defaultCollectPddeInfoSchool(
        school,
        year,
        signal,
        options.sleep ?? defaultSleep,
      )
    ));

  const collectingPddeInfo: NonNullable<RunMonitoringOptions['collectPddeInfoSchool']> = async (
    school,
    fiscalYear,
    signal,
  ) => {
    const result = await basePddeCollector(school, fiscalYear, signal);
    const normalized = normalizePddeInfoSchools([result.school], {
      fiscalYear,
      queriedAt: result.queriedAt,
    });
    for (const payment of normalized.payments) {
      if (payment.amountPaidCents <= 0 || !payment.paymentDate || !payment.account) continue;
      const key = accountEvidenceKey({
        cnpj: payment.school.cnpj,
        programCode: payment.programCode,
        account: payment.account,
      });
      if (!key) continue;
      const current = requiredThroughByAccount.get(key);
      if (!current || payment.paymentDate > current) {
        requiredThroughByAccount.set(key, payment.paymentDate);
      }
    }
    return result;
  };

  const baseSigefCollector = options.collectSigefAccount ?? collectSigefPublicAccount;
  const collectingSigef: NonNullable<RunMonitoringOptions['collectSigefAccount']> = async (input) => {
    const key = accountEvidenceKey({
      cnpj: input.cnpj,
      programCode: input.programCode,
      account: input.account,
    });
    const requiredThrough = key ? requiredThroughByAccount.get(key) : undefined;
    return baseSigefCollector({
      ...input,
      ...(requiredThrough ? { requiredThrough } : {}),
    });
  };

  const result = await runMonitoringCore({
    ...options,
    collectPddeInfoSchool: collectingPddeInfo,
    collectSigefAccount: collectingSigef,
  });
  const temporal = paymentTemporalCoverage(result.raw);
  const raw: RunMonitoringResult['raw'] = {
    ...result.raw,
    quality: {
      paymentTemporalCoverage: temporal,
    },
    coverage: {
      ...result.raw.coverage,
      paymentTemporalCoverage: temporal,
    },
  };

  return {
    ...result,
    raw,
  };
}
