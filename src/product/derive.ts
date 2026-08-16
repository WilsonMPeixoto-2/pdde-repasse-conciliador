import type { HumanPosition, HumanSchool } from './types';

export interface SchoolFinancialSummary {
  programmedCents: number;
  paymentInformedCents: number;
  creditLocatedCents: number;
  reportedBalanceCents: number | null;
  applicationsCents: number | null;
  balanceReferenceDate: string | null;
}

export interface TimelineMonth2026 {
  month: number;
  label: string;
  observed: boolean;
  referenceDate: string | null;
  totalReportedBalanceCents: number | null;
  checkingBalanceCents: number | null;
  applicationsCents: number | null;
}

const MONTH_LABELS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'] as const;

export function deriveSchoolSummary(school: HumanSchool): SchoolFinancialSummary {
  let programmedCents = 0;
  let paymentInformedCents = 0;
  let creditLocatedCents = 0;

  for (const program of school.programs) {
    for (const installment of program.installments) {
      programmedCents += installment.programmedCents;
      paymentInformedCents += installment.paymentInformedCents;
      if (installment.creditEvidence.status === 'Crédito localizado'
        && installment.creditEvidence.amountCents !== null) {
        creditLocatedCents += installment.creditEvidence.amountCents;
      }
    }
  }

  const positions = school.accounts
    .map((account) => account.latestPosition)
    .filter((position): position is HumanPosition => position !== null);
  const balanceReferenceDate = positions
    .map((position) => position.referenceDate)
    .sort()
    .at(-1) ?? null;
  const knownBalances = positions
    .map((position) => position.totalReportedBalanceCents)
    .filter((value): value is number => value !== null);
  const knownApplications = positions
    .map((position) => position.applications.totalCents)
    .filter((value): value is number => value !== null);

  return {
    programmedCents,
    paymentInformedCents,
    creditLocatedCents,
    reportedBalanceCents: knownBalances.length > 0
      ? knownBalances.reduce((total, value) => total + value, 0)
      : null,
    applicationsCents: knownApplications.length > 0
      ? knownApplications.reduce((total, value) => total + value, 0)
      : null,
    balanceReferenceDate,
  };
}

export function buildAccountTimeline2026(positions: readonly HumanPosition[]): TimelineMonth2026[] {
  const byMonth = new Map<number, HumanPosition>();
  for (const position of positions) {
    const match = /^2026-(\d{2})-(\d{2})$/.exec(position.referenceDate);
    if (!match) continue;
    const month = Number(match[1]);
    if (month < 1 || month > 12) continue;
    const existing = byMonth.get(month);
    if (!existing || position.referenceDate > existing.referenceDate) byMonth.set(month, position);
  }

  return MONTH_LABELS.map((label, index) => {
    const month = index + 1;
    const position = byMonth.get(month) ?? null;
    return {
      month,
      label,
      observed: position !== null,
      referenceDate: position?.referenceDate ?? null,
      totalReportedBalanceCents: position?.totalReportedBalanceCents ?? null,
      checkingBalanceCents: position?.checkingBalanceCents ?? null,
      applicationsCents: position?.applications.totalCents ?? null,
    };
  });
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function schoolMatchesSearch(
  school: { sme: string; inep: string; name: string },
  query: string,
): boolean {
  const wanted = normalizeSearchText(query);
  if (!wanted) return true;
  return normalizeSearchText(`${school.sme} ${school.inep} ${school.name}`).includes(wanted);
}
