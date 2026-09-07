import { canonicalAccount } from '../core/normalization';
import type { BankAccount } from '../core/schemas';
import {
  buildMonitoringOperationalView,
  type OperationalRepasse,
} from './build-monitoring-operational-view';

const CREDIT_MATCH_MAX_DELAY_DAYS = 30;

export type PaymentDataGapReason =
  | 'ACCOUNT_NOT_RESOLVED'
  | 'STATEMENT_QUERY_INCOMPLETE'
  | 'STATEMENT_OUT_OF_COVERAGE'
  | 'CREDIT_AMBIGUOUS'
  | 'CREDIT_NOT_FOUND_AFTER_FULL_WINDOW'
  | 'EVIDENCE_INCONCLUSIVE'
  | 'OTHER';

export interface PaymentDataGapRow {
  schoolInep: string;
  schoolSme: string;
  schoolName: string;
  schoolCnpj: string;
  programCode: string;
  action: string;
  installment: string | null;
  amountCents: number;
  paymentDate: string | null;
  account: BankAccount | null;
  bankCreditStatus: string;
  gapReason: PaymentDataGapReason;
  statementStatus: string | null;
  statementCoverageThrough: string | null;
  requiredEvidenceThrough: string | null;
  temporalCoverageStatus: string | null;
  temporalCoverageReason: string | null;
  recoveryStatus: string | null;
  recoveryPaymentDate: string | null;
  recoveryOrderBank: string | null;
  recoverySourceUrl: string | null;
  releaseCandidateCount: number;
}

export interface PaymentDataGapReport {
  fiscalYear: number;
  status: 'NO_GAPS' | 'GAPS_REMAIN';
  totalPaidRepasses: number;
  confirmedBankCredits: number;
  unresolvedPayments: number;
  countsByBankCreditStatus: Record<string, number>;
  countsByGapReason: Record<string, number>;
  countsByRecoveryStatus: Record<string, number>;
  countsByPaymentDate: Record<string, number>;
  rows: PaymentDataGapRow[];
}

interface RawRecovery {
  schoolInep: string;
  programCode: string;
  action: string;
  installment: string | null;
  amountCents: number;
  status: string;
  paymentDate: string | null;
  orderBank: string | null;
  sourceUrl: string | null;
  candidates?: readonly unknown[];
}

interface RawTemporalCoverageRow {
  schoolInep: string;
  programCode: string;
  paymentDate: string | null;
  status: string;
  reason: string;
}

interface RawAccountEvidence {
  programCode: string;
  account: BankAccount;
  status: string;
  coverageThrough: string | null;
}

interface RawSchoolEvidence {
  inep: string;
  accounts: RawAccountEvidence[];
}

interface PaymentGapRaw {
  fiscalYear?: number;
  accountRecoveries?: RawRecovery[];
  quality?: {
    paymentTemporalCoverage?: {
      rows?: RawTemporalCoverageRow[];
    };
  };
  schools?: RawSchoolEvidence[];
}

function parseIsoDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new Error(`Data ISO inválida no diagnóstico de lacunas: ${value}.`);
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(Date.UTC(year, month - 1, day));
  if (
    result.getUTCFullYear() !== year
    || result.getUTCMonth() !== month - 1
    || result.getUTCDate() !== day
  ) {
    throw new Error(`Data ISO inválida no diagnóstico de lacunas: ${value}.`);
  }
  return result;
}

export function requiredBankCreditEvidenceThrough(paymentDate: string | null): string | null {
  if (!paymentDate) return null;
  const result = parseIsoDate(paymentDate);
  result.setUTCDate(result.getUTCDate() + CREDIT_MATCH_MAX_DELAY_DAYS);
  return result.toISOString().slice(0, 10);
}

function sameAccount(
  left: BankAccount | null | undefined,
  right: BankAccount | null | undefined,
): boolean {
  return Boolean(left && right && canonicalAccount(left) === canonicalAccount(right));
}

export function classifyPaymentDataGap(input: {
  repasse: Pick<OperationalRepasse, 'bankCreditStatus' | 'account' | 'orderDate'>;
  statementStatus: string | null;
  statementCoverageThrough: string | null;
}): PaymentDataGapReason {
  if (input.repasse.bankCreditStatus === 'PAGO_SEM_CONTA_ATUAL' || !input.repasse.account) {
    return 'ACCOUNT_NOT_RESOLVED';
  }
  if (input.statementStatus !== 'COMPLETE') return 'STATEMENT_QUERY_INCOMPLETE';

  const requiredThrough = requiredBankCreditEvidenceThrough(input.repasse.orderDate);
  if (
    input.repasse.bankCreditStatus === 'CONSULTA_INCONCLUSIVA'
    && requiredThrough
    && (!input.statementCoverageThrough || input.statementCoverageThrough < requiredThrough)
  ) {
    return 'STATEMENT_OUT_OF_COVERAGE';
  }
  if (input.repasse.bankCreditStatus === 'CREDITO_AMBIGUO') return 'CREDIT_AMBIGUOUS';
  if (input.repasse.bankCreditStatus === 'PAGO_CREDITO_NAO_LOCALIZADO') {
    return 'CREDIT_NOT_FOUND_AFTER_FULL_WINDOW';
  }
  if (input.repasse.bankCreditStatus === 'CONSULTA_INCONCLUSIVA') return 'EVIDENCE_INCONCLUSIVE';
  return 'OTHER';
}

function increment(counter: Record<string, number>, key: string | null | undefined): void {
  const normalized = key || 'SEM_VALOR';
  counter[normalized] = (counter[normalized] ?? 0) + 1;
}

function sortedCounter(counter: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counter).sort(([left], [right]) => left.localeCompare(right)),
  );
}

function findRecovery(raw: PaymentGapRaw, repasse: OperationalRepasse): RawRecovery | null {
  const candidates = (raw.accountRecoveries ?? []).filter((recovery) => (
    recovery.schoolInep === repasse.school.inep
    && recovery.programCode === repasse.programCode
    && recovery.action === repasse.action
    && recovery.installment === (repasse.installment ?? null)
    && recovery.amountCents === repasse.amountPaidInformedCents
  ));
  if (candidates.length === 0) return null;
  if (repasse.orderDate) {
    const exact = candidates.find((recovery) => recovery.paymentDate === repasse.orderDate);
    if (exact) return exact;
  }
  return candidates[0] ?? null;
}

function findStatement(raw: PaymentGapRaw, repasse: OperationalRepasse): RawAccountEvidence | null {
  if (!repasse.account) return null;
  const school = (raw.schools ?? []).find((candidate) => candidate.inep === repasse.school.inep);
  if (!school) return null;
  return school.accounts.find((candidate) => (
    candidate.programCode === repasse.programCode
    && sameAccount(candidate.account, repasse.account)
  )) ?? null;
}

function findTemporalCoverage(
  raw: PaymentGapRaw,
  repasse: OperationalRepasse,
): RawTemporalCoverageRow | null {
  if (!repasse.orderDate) return null;
  return (raw.quality?.paymentTemporalCoverage?.rows ?? []).find((row) => (
    row.schoolInep === repasse.school.inep
    && row.programCode === repasse.programCode
    && row.paymentDate === repasse.orderDate
  )) ?? null;
}

export function analyzePaymentDataGaps(
  rawInput: unknown,
  operationalInput?: ReturnType<typeof buildMonitoringOperationalView>,
): PaymentDataGapReport {
  const operational = operationalInput ?? buildMonitoringOperationalView(rawInput);
  const raw = rawInput as PaymentGapRaw;
  const paidRepasses = operational.repasses.filter((repasse) => repasse.amountPaidInformedCents > 0);
  const unresolved = paidRepasses.filter((repasse) => repasse.bankCreditStatus !== 'CREDITO_CONFIRMADO');

  const countsByBankCreditStatus: Record<string, number> = {};
  const countsByGapReason: Record<string, number> = {};
  const countsByRecoveryStatus: Record<string, number> = {};
  const countsByPaymentDate: Record<string, number> = {};

  const rows = unresolved.map((repasse): PaymentDataGapRow => {
    increment(countsByBankCreditStatus, repasse.bankCreditStatus);
    increment(countsByPaymentDate, repasse.orderDate);
    const statement = findStatement(raw, repasse);
    const recovery = findRecovery(raw, repasse);
    const temporal = findTemporalCoverage(raw, repasse);
    const gapReason = classifyPaymentDataGap({
      repasse,
      statementStatus: statement?.status ?? null,
      statementCoverageThrough: statement?.coverageThrough ?? null,
    });
    increment(countsByGapReason, gapReason);
    increment(countsByRecoveryStatus, recovery?.status ?? null);

    return {
      schoolInep: repasse.school.inep,
      schoolSme: repasse.school.sme,
      schoolName: repasse.school.name,
      schoolCnpj: repasse.school.cnpj,
      programCode: repasse.programCode,
      action: repasse.action,
      installment: repasse.installment,
      amountCents: repasse.amountPaidInformedCents,
      paymentDate: repasse.orderDate,
      account: repasse.account ? { ...repasse.account } : null,
      bankCreditStatus: repasse.bankCreditStatus,
      gapReason,
      statementStatus: statement?.status ?? null,
      statementCoverageThrough: statement?.coverageThrough ?? null,
      requiredEvidenceThrough: requiredBankCreditEvidenceThrough(repasse.orderDate),
      temporalCoverageStatus: temporal?.status ?? null,
      temporalCoverageReason: temporal?.reason ?? null,
      recoveryStatus: recovery?.status ?? null,
      recoveryPaymentDate: recovery?.paymentDate ?? null,
      recoveryOrderBank: recovery?.orderBank ?? null,
      recoverySourceUrl: recovery?.sourceUrl ?? null,
      releaseCandidateCount: recovery?.candidates?.length ?? 0,
    };
  }).sort((left, right) => (
    (left.paymentDate ?? '').localeCompare(right.paymentDate ?? '')
    || left.schoolInep.localeCompare(right.schoolInep)
    || left.programCode.localeCompare(right.programCode)
    || left.action.localeCompare(right.action)
  ));

  const confirmedBankCredits = paidRepasses.length - rows.length;
  if (confirmedBankCredits < 0 || confirmedBankCredits + rows.length !== paidRepasses.length) {
    throw new Error('Invariante interna quebrada no diagnóstico de lacunas de pagamento.');
  }

  return {
    fiscalYear: raw.fiscalYear ?? operational.fiscalYear,
    status: rows.length === 0 ? 'NO_GAPS' : 'GAPS_REMAIN',
    totalPaidRepasses: paidRepasses.length,
    confirmedBankCredits,
    unresolvedPayments: rows.length,
    countsByBankCreditStatus: sortedCounter(countsByBankCreditStatus),
    countsByGapReason: sortedCounter(countsByGapReason),
    countsByRecoveryStatus: sortedCounter(countsByRecoveryStatus),
    countsByPaymentDate: sortedCounter(countsByPaymentDate),
    rows,
  };
}
