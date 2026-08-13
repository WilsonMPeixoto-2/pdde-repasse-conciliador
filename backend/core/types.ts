export const RECONCILIATION_STATUS_LABELS = {
  REPASSE_CONFIRMADO: 'REPASSE CONFIRMADO',
  ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO:
    'ORDEM BANCÁRIA CONFIRMADA — CRÉDITO NÃO LOCALIZADO',
  PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO:
    'PAGAMENTO INFORMADO SOMENTE NO PDDEINFO',
  DIVERGENCIA_REVISAO_NECESSARIA:
    'DIVERGÊNCIA — REVISÃO NECESSÁRIA',
  SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA:
    'SEM PAGAMENTO REGISTRADO ATÉ A CONSULTA',
  CONSULTA_INCONCLUSIVA: 'CONSULTA INCONCLUSIVA',
} as const;

export type ReconciliationStatus = keyof typeof RECONCILIATION_STATUS_LABELS;

export type ReconciliationReasonCode =
  | 'EXACT_MATCH'
  | 'MOVEMENT_NOT_FOUND'
  | 'MOVEMENT_SOURCE_UNAVAILABLE'
  | 'MOVEMENT_SOURCE_OUT_OF_COVERAGE'
  | 'MOVEMENT_AMOUNT_MISMATCH'
  | 'PDDEINFO_SOURCE_UNAVAILABLE'
  | 'RELEASE_NOT_FOUND'
  | 'RELEASE_SOURCE_UNAVAILABLE'
  | 'RELEASE_SOURCE_OUT_OF_COVERAGE'
  | 'RELEASE_AMOUNT_MISMATCH'
  | 'RELEASE_DATE_MISMATCH'
  | 'RELEASE_ACCOUNT_MISMATCH'
  | 'RELEASE_ORDER_BANK_MISSING'
  | 'MULTIPLE_RELEASE_CANDIDATES'
  | 'PAYMENT_DATE_MISSING'
  | 'PAYMENT_ABSENT_BUT_SIGEF_RECORD_FOUND'
  | 'NO_PAYMENT_FOUND';

export interface Difference {
  field: 'amount' | 'date' | 'account' | 'record-count' | 'payment';
  pddeInfo: string | number | null;
  sigef: string | number | null;
  detail: string;
}

export interface ReconciliationResult {
  status: ReconciliationStatus;
  statusLabel: (typeof RECONCILIATION_STATUS_LABELS)[ReconciliationStatus];
  reasonCode: ReconciliationReasonCode;
  reason: string;
  requiresHumanReview: boolean;
  matchedReleaseId: string | null;
  matchedMovementIds: string[];
  movementTotalCents: number;
  differences: Difference[];
}
