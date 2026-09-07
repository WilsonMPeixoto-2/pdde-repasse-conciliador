import { isDeepStrictEqual } from 'node:util';
import { buildMonitoringOperationalView } from './build-monitoring-operational-view';
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
  sourceObservationCount: number;
  finalAccountCount: number;
  operationalCreditStatusCounts: Record<string, number>;
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

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(value: string, days: number): string {
  const date = parseDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
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

  const observations = raw.sourceObservations ?? [];
  const observedSources = new Set<string>(observations.map((item) => item.source));
  for (const source of raw.sources ?? []) {
    if (!observedSources.has(source)) errors.push(`SOURCE_OBSERVATION_MISSING:${source}`);
  }

  const finalAccountCount = raw.schools.reduce((sum, school) => sum + school.accounts.length, 0);
  const sigefStatementObservation = observations.find((item) => item.source === 'SIGEF_EXTRATO');
  if (sigefStatementObservation) {
    const observedAccounts = sigefStatementObservation.metrics.accountsQueried;
    if (observedAccounts !== finalAccountCount) {
      errors.push(`SIGEF_STATEMENT_OBSERVATION_STALE:${observedAccounts ?? 'MISSING'}:${finalAccountCount}`);
    }
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

  const operational = buildMonitoringOperationalView(raw);
  const operationalCreditStatusCounts: Record<string, number> = {};
  const confirmedClaims = new Map<string, number>();
  for (const repasse of operational.repasses) {
    operationalCreditStatusCounts[repasse.bankCreditStatus] = (operationalCreditStatusCounts[repasse.bankCreditStatus] ?? 0) + 1;

    if (repasse.bankCreditStatus === 'PAGO_CREDITO_NAO_LOCALIZADO' && repasse.orderDate && repasse.account) {
      const repasseAccount = repasse.account;
      const school = raw.schools.find((candidate) => candidate.inep === repasse.school.inep);
      const account = school?.accounts.find((candidate) => (
        candidate.programCode === repasse.programCode
        && canonicalAccount(candidate.account) === canonicalAccount(repasseAccount)
      ));
      const requiredThrough = addDays(repasse.orderDate, 30);
      if (!account?.coverageThrough || account.coverageThrough < requiredThrough) {
        errors.push(`NEGATIVE_CREDIT_WITHOUT_FULL_WINDOW:${repasse.school.inep}:${repasse.programCode}:${repasse.orderDate}:${account?.coverageThrough ?? 'NONE'}`);
      }
    }

    if (repasse.bankCreditStatus === 'CREDITO_CONFIRMADO' && repasse.account) {
      for (const candidate of repasse.bankCreditCandidates ?? []) {
        const key = `${repasse.school.inep}|${repasse.programCode}|${canonicalAccount(repasse.account)}|${candidate.id}`;
        confirmedClaims.set(key, (confirmedClaims.get(key) ?? 0) + 1);
      }
    }
  }
  for (const [key, count] of confirmedClaims) {
    if (count > 1) errors.push(`CREDIT_CLAIM_REUSED:${key}:${count}`);
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
    sourceObservationCount: observations.length,
    finalAccountCount,
    operationalCreditStatusCounts,
    errors,
  };
}
