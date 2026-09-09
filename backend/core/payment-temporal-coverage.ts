import { canonicalAccount } from './normalization';
import type { BankAccount } from './schemas';

export type PaymentTemporalCoverageStatus = 'SUFFICIENT' | 'OUT_OF_COVERAGE' | 'UNKNOWN';

export type PaymentTemporalCoverageReason =
  | 'COVERAGE_REACHES_PAYMENT'
  | 'COVERAGE_BEFORE_PAYMENT'
  | 'STRONG_ACCOUNT_MISSING'
  | 'PAYMENT_DATE_MISSING'
  | 'ACCOUNT_OBSERVATION_MISSING'
  | 'COVERAGE_UNKNOWN';

export interface PaymentTemporalCoveragePayment {
  schoolInep: string;
  programCode: string;
  account: BankAccount | null;
  amountPaidCents: number;
  paymentDate: string | null;
}

export interface PaymentTemporalCoverageAccount {
  schoolInep: string;
  programCode: string;
  account: BankAccount;
  coverageThrough: string | null;
}

export interface PaymentTemporalCoverageInput {
  payments: readonly PaymentTemporalCoveragePayment[];
  accounts: readonly PaymentTemporalCoverageAccount[];
}

export interface PaymentTemporalCoverageAssessment {
  schoolInep: string;
  programCode: string;
  paymentDate: string | null;
  coverageThrough: string | null;
  status: PaymentTemporalCoverageStatus;
  reason: PaymentTemporalCoverageReason;
}

export interface PaymentTemporalCoverageSummary {
  status: PaymentTemporalCoverageStatus;
  evaluatedPaymentCount: number;
  sufficientCount: number;
  outOfCoverageCount: number;
  unknownCount: number;
  latestKnownPaymentDate: string | null;
  maxObservedCoverageThrough: string | null;
  rows: PaymentTemporalCoverageAssessment[];
}

function validIsoDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function strongKey(input: {
  schoolInep: string;
  programCode: string;
  account: BankAccount;
}): string {
  return `${input.schoolInep}|${input.programCode}|${canonicalAccount(input.account)}`;
}

function latest(values: readonly (string | null)[]): string | null {
  const valid = values.filter(validIsoDate).sort();
  return valid.at(-1) ?? null;
}

export function assessPaymentTemporalCoverage(
  input: PaymentTemporalCoverageInput,
): PaymentTemporalCoverageSummary {
  const coverageByAccount = new Map<string, string | null>();
  for (const account of input.accounts) {
    const key = strongKey(account);
    const current = coverageByAccount.get(key) ?? null;
    const candidate = validIsoDate(account.coverageThrough) ? account.coverageThrough : null;
    if (candidate && (!current || candidate > current)) coverageByAccount.set(key, candidate);
    else if (!coverageByAccount.has(key)) coverageByAccount.set(key, null);
  }

  const rows = input.payments
    .filter((payment) => payment.amountPaidCents > 0)
    .map((payment): PaymentTemporalCoverageAssessment => {
      if (!validIsoDate(payment.paymentDate)) {
        return {
          schoolInep: payment.schoolInep,
          programCode: payment.programCode,
          paymentDate: payment.paymentDate,
          coverageThrough: null,
          status: 'UNKNOWN',
          reason: 'PAYMENT_DATE_MISSING',
        };
      }

      if (!payment.account) {
        return {
          schoolInep: payment.schoolInep,
          programCode: payment.programCode,
          paymentDate: payment.paymentDate,
          coverageThrough: null,
          status: 'UNKNOWN',
          reason: 'STRONG_ACCOUNT_MISSING',
        };
      }

      const key = strongKey({
        schoolInep: payment.schoolInep,
        programCode: payment.programCode,
        account: payment.account,
      });
      if (!coverageByAccount.has(key)) {
        return {
          schoolInep: payment.schoolInep,
          programCode: payment.programCode,
          paymentDate: payment.paymentDate,
          coverageThrough: null,
          status: 'UNKNOWN',
          reason: 'ACCOUNT_OBSERVATION_MISSING',
        };
      }

      const coverageThrough = coverageByAccount.get(key) ?? null;
      if (!coverageThrough) {
        return {
          schoolInep: payment.schoolInep,
          programCode: payment.programCode,
          paymentDate: payment.paymentDate,
          coverageThrough: null,
          status: 'UNKNOWN',
          reason: 'COVERAGE_UNKNOWN',
        };
      }

      if (coverageThrough >= payment.paymentDate) {
        return {
          schoolInep: payment.schoolInep,
          programCode: payment.programCode,
          paymentDate: payment.paymentDate,
          coverageThrough,
          status: 'SUFFICIENT',
          reason: 'COVERAGE_REACHES_PAYMENT',
        };
      }

      return {
        schoolInep: payment.schoolInep,
        programCode: payment.programCode,
        paymentDate: payment.paymentDate,
        coverageThrough,
        status: 'OUT_OF_COVERAGE',
        reason: 'COVERAGE_BEFORE_PAYMENT',
      };
    });

  const sufficientCount = rows.filter((row) => row.status === 'SUFFICIENT').length;
  const outOfCoverageCount = rows.filter((row) => row.status === 'OUT_OF_COVERAGE').length;
  const unknownCount = rows.filter((row) => row.status === 'UNKNOWN').length;
  const status: PaymentTemporalCoverageStatus = outOfCoverageCount > 0
    ? 'OUT_OF_COVERAGE'
    : unknownCount > 0 || rows.length === 0
      ? 'UNKNOWN'
      : 'SUFFICIENT';

  return {
    status,
    evaluatedPaymentCount: rows.length,
    sufficientCount,
    outOfCoverageCount,
    unknownCount,
    latestKnownPaymentDate: latest(rows.map((row) => row.paymentDate)),
    maxObservedCoverageThrough: latest(input.accounts.map((account) => account.coverageThrough)),
    rows,
  };
}
