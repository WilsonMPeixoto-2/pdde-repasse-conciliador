import type { HumanSchool } from '../types';

type HumanMovement = HumanSchool['accounts'][number]['movements'][number];

export type MovementDirection = 'credit' | 'debit' | 'ambiguous' | 'none';
export type MovementKind = 'funding' | 'spending' | 'asset-transfer' | 'income' | 'adjustment' | 'other';

export interface MovementLedgerEntry {
  movement: HumanMovement;
  direction: MovementDirection;
  kind: MovementKind;
  label: string;
  signedAmountCents: number | null;
  creditCents: number | null;
  debitCents: number | null;
}

export interface MovementLedgerTotals {
  creditsCents: number;
  debitsCents: number;
  differenceCents: number;
  count: number;
}

export interface MovementLedgerModel {
  entries: MovementLedgerEntry[];
  totals: MovementLedgerTotals;
}

const CATEGORY_PRESENTATION: Record<string, { kind: MovementKind; label: string }> = {
  REPASSE_FNDE: { kind: 'funding', label: 'Repasse FNDE' },
  APLICACAO_FINANCEIRA: { kind: 'asset-transfer', label: 'Aplicação financeira' },
  RESGATE_APLICACAO: { kind: 'asset-transfer', label: 'Resgate de aplicação' },
  PAGAMENTO_TRANSFERENCIA: { kind: 'spending', label: 'Pagamento / transferência' },
  PAGAMENTO_CARTAO: { kind: 'spending', label: 'Pagamento com cartão' },
  RENDIMENTO_FINANCEIRO: { kind: 'income', label: 'Rendimento financeiro' },
  ENTRADA_TERCEIRO: { kind: 'other', label: 'Entrada de terceiro' },
  TARIFA_BANCARIA: { kind: 'spending', label: 'Tarifa bancária' },
  ESTORNO_REVERSAO: { kind: 'adjustment', label: 'Estorno / reversão' },
  MOVIMENTO_NAO_CLASSIFICADO: { kind: 'other', label: 'Movimento não classificado' },
};

function presentation(category: string | null): { kind: MovementKind; label: string } {
  if (!category) return CATEGORY_PRESENTATION.MOVIMENTO_NAO_CLASSIFICADO!;
  return CATEGORY_PRESENTATION[category] ?? CATEGORY_PRESENTATION.MOVIMENTO_NAO_CLASSIFICADO!;
}

function directionOf(movement: HumanMovement): MovementDirection {
  const hasCredit = movement.creditCents !== null;
  const hasDebit = movement.debitCents !== null;
  if (hasCredit && hasDebit) return 'ambiguous';
  if (hasCredit) return 'credit';
  if (hasDebit) return 'debit';
  return 'none';
}

function signedAmount(movement: HumanMovement, direction: MovementDirection): number | null {
  if (direction === 'credit') return movement.creditCents;
  if (direction === 'debit') return movement.debitCents === null ? null : -movement.debitCents;
  return null;
}

export function buildMovementLedger(movements: readonly HumanMovement[]): MovementLedgerModel {
  let creditsCents = 0;
  let debitsCents = 0;

  const entries = movements.map((movement): MovementLedgerEntry => {
    if (movement.creditCents !== null) creditsCents += movement.creditCents;
    if (movement.debitCents !== null) debitsCents += movement.debitCents;

    const direction = directionOf(movement);
    const semantic = presentation(movement.category);
    return {
      movement,
      direction,
      kind: semantic.kind,
      label: semantic.label,
      signedAmountCents: signedAmount(movement, direction),
      creditCents: movement.creditCents,
      debitCents: movement.debitCents,
    };
  });

  return {
    entries,
    totals: {
      creditsCents,
      debitsCents,
      differenceCents: creditsCents - debitsCents,
      count: movements.length,
    },
  };
}
