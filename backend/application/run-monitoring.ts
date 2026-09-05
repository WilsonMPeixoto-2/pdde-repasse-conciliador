import {
  assessPaymentTemporalCoverage,
  type PaymentTemporalCoverageSummary,
} from '../core/payment-temporal-coverage';
import {
  runMonitoring as runMonitoringCore,
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
 * Executa o monitor operacional estável e acrescenta uma dimensão independente
 * de qualidade temporal. `COMPLETE` continua significando que a coleta prevista
 * terminou sem falha operacional; ele não é promovido silenciosamente a
 * “evidência financeira temporalmente suficiente”.
 */
export async function runMonitoring(
  options: RunMonitoringOptions,
): Promise<RunMonitoringResult> {
  const result = await runMonitoringCore(options);
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
