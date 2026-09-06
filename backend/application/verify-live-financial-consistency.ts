import { isDeepStrictEqual } from 'node:util';
import { canonicalAccount } from '../core/normalization';
import { assessPaymentTemporalCoverage } from '../core/payment-temporal-coverage';
import type { RunFinancialIntelligenceMonitoringResult } from './run-financial-intelligence-monitoring';

type RawFinancialMonitoring = RunFinancialIntelligenceMonitoringResult['raw'];

export interface LiveFinancialConsistencyReport {
  status: 'PASS' | 'FAIL';
  paymentCount: number;
  recoveredAccounts: number;
  confirmedAccounts: number;
  temporalStatus: string;
  sufficientPayments: number;
  outOfCoveragePayments: number;
  unknownPayments: number;
  balanceReferenceDate: string | null;
  paymentsAfterBalanceReference: number;
  errors: string[];
}

function recomputeTemporal(raw: RawFinancialMonitoring) {
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

export function analyzeLiveFinancialConsistency(raw: RawFinancialMonitoring): LiveFinancialConsistencyReport {
  const errors: string[] = [];
  const expectedTemporal = recomputeTemporal(raw);
  if (!isDeepStrictEqual(raw.quality.paymentTemporalCoverage, expectedTemporal)) {
    errors.push('TEMPORAL_SUMMARY_STALE');
  }
  if (!isDeepStrictEqual(raw.coverage.paymentTemporalCoverage, expectedTemporal)) {
    errors.push('TEMPORAL_COVERAGE_MIRROR_STALE');
  }

  const recoveries = raw.accountRecoveries ?? [];
  for (const recovery of recoveries) {
    if ((recovery.status !== 'RECOVERED' && recovery.status !== 'CONFIRMED') || !recovery.account) continue;
    const school = raw.schools.find((candidate) => candidate.inep === recovery.schoolInep);
    if (!school) {
      errors.push(`RECOVERY_SCHOOL_MISSING:${recovery.schoolInep}`);
      continue;
    }
    const expectedAccount = canonicalAccount(recovery.account);
    const repasse = school.repasses.find((candidate) => (
      candidate.programCode === recovery.programCode
      && candidate.pagoInformadoCents === recovery.amountCents
      && candidate.dataOrdem === recovery.paymentDate
      && candidate.account !== null
      && canonicalAccount(candidate.account) === expectedAccount
    ));
    if (!repasse) {
      errors.push(`RECOVERY_NOT_MATERIALIZED:${recovery.schoolInep}:${recovery.programCode}`);
    }
    if (recovery.status === 'RECOVERED') {
      const collected = school.accounts.some((account) => (
        account.programCode === recovery.programCode
        && canonicalAccount(account.account) === expectedAccount
      ));
      if (!collected) {
        errors.push(`RECOVERED_ACCOUNT_NOT_COLLECTED:${recovery.schoolInep}:${recovery.programCode}`);
      }
    }
  }

  const balanceReferenceDate = raw.publicReports?.coverageThrough ?? null;
  const paid = raw.schools.flatMap((school) => school.repasses)
    .filter((repasse) => repasse.pagoInformadoCents > 0);
  const paymentsAfterBalanceReference = balanceReferenceDate
    ? paid.filter((repasse) => repasse.dataOrdem !== null && repasse.dataOrdem > balanceReferenceDate).length
    : 0;

  return {
    status: errors.length === 0 ? 'PASS' : 'FAIL',
    paymentCount: expectedTemporal.evaluatedPaymentCount,
    recoveredAccounts: recoveries.filter((item) => item.status === 'RECOVERED').length,
    confirmedAccounts: recoveries.filter((item) => item.status === 'CONFIRMED').length,
    temporalStatus: expectedTemporal.status,
    sufficientPayments: expectedTemporal.sufficientCount,
    outOfCoveragePayments: expectedTemporal.outOfCoverageCount,
    unknownPayments: expectedTemporal.unknownCount,
    balanceReferenceDate,
    paymentsAfterBalanceReference,
    errors,
  };
}
