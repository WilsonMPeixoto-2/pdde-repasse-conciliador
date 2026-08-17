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

  const canCompose = checkingCents !== null
    && applicationsCents !== null
    && checkingCents >= 0
    && applicationsCents >= 0
    && checkingCents + applicationsCents > 0;
  const compositionBase = canCompose ? checkingCents + applicationsCents : null;

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
    checkingShare: compositionBase === null ? null : checkingCents / compositionBase,
    applicationsShare: compositionBase === null ? null : applicationsCents / compositionBase,
    applicationBreakdown,
  };
}