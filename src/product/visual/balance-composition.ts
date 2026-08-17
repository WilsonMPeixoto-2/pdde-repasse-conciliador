import type { HumanPosition } from '../types';

export interface BalanceApplicationItem {
  key: 'funds' | 'savings' | 'rdbCdb';
  label: 'Fundos' | 'Poupança' | 'RDB/CDB';
  valueCents: number;
}

export interface BalanceComposition {
  totalCents: number | null;
  checkingCents: number | null;
  applicationsCents: number | null;
  knownComponentsCents: number | null;
  differenceCents: number | null;
  checkingShare: number | null;
  applicationsShare: number | null;
  applicationBreakdown: BalanceApplicationItem[];
}

export function buildBalanceComposition(position: HumanPosition): BalanceComposition {
  const checkingCents = position.checkingBalanceCents;
  const applicationsCents = position.applications.totalCents;
  const totalCents = position.totalReportedBalanceCents;
  const componentsKnown = checkingCents !== null && applicationsCents !== null;
  const knownComponentsCents = componentsKnown ? checkingCents + applicationsCents : null;
  const differenceCents = totalCents !== null && knownComponentsCents !== null
    ? totalCents - knownComponentsCents
    : null;

  let checkingShare: number | null = null;
  let applicationsShare: number | null = null;
  if (
    checkingCents !== null
    && applicationsCents !== null
    && checkingCents >= 0
    && applicationsCents >= 0
  ) {
    const compositionBase = checkingCents + applicationsCents;
    if (compositionBase > 0) {
      checkingShare = checkingCents / compositionBase;
      applicationsShare = applicationsCents / compositionBase;
    }
  }

  const applicationBreakdown: BalanceApplicationItem[] = [
    ['funds', 'Fundos', position.applications.fundsCents],
    ['savings', 'Poupança', position.applications.savingsCents],
    ['rdbCdb', 'RDB/CDB', position.applications.rdbCdbCents],
  ].flatMap(([key, label, value]) => (
    typeof value === 'number'
      ? [{ key, label, valueCents: value } as BalanceApplicationItem]
      : []
  ));

  return {
    totalCents,
    checkingCents,
    applicationsCents,
    knownComponentsCents,
    differenceCents,
    checkingShare,
    applicationsShare,
    applicationBreakdown,
  };
}