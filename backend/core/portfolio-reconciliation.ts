import { z } from 'zod';
import { canonicalCnpj, canonicalProgramCode, sameAccount } from './normalization';
import { reconcileRepasse } from './reconciliation';
import {
  pddePaymentSchema,
  sigefMovementSchema,
  sigefReleaseSchema,
  sourceSnapshotSchema,
  type BankAccount,
  type PddePayment,
  type SigefMovement,
  type SigefRelease,
  type SourceSnapshot,
} from './schemas';
import type { ReconciliationResult, ReconciliationStatus } from './types';

const releaseSourceEntrySchema = z.object({
  schoolCnpj: z.string().min(1),
  programCode: z.string().min(1),
  snapshot: sourceSnapshotSchema,
}).strict();

const portfolioInputSchema = z.object({
  payments: z.array(pddePaymentSchema),
  releases: z.array(sigefReleaseSchema),
  movements: z.array(sigefMovementSchema),
  sources: z.object({
    pddeInfo: sourceSnapshotSchema,
    sigefMovements: sourceSnapshotSchema,
    sigefReleases: z.array(releaseSourceEntrySchema),
  }).strict(),
}).strict();

type AccountCorrespondence = 'MATCH' | 'PDDEINFO_ONLY' | 'SIGEF_ONLY' | 'DIVERGENT' | 'MISSING';
type AccountSource = 'PDDEINFO' | 'SIGEF_LIBERACOES' | 'PDDEINFO_E_SIGEF' | null;

export interface PortfolioRow {
  payment: PddePayment;
  matchedRelease: SigefRelease | null;
  matchedMovements: SigefMovement[];
  reconciliation: ReconciliationResult;
  accountResolution: {
    pddeInfoAccount: BankAccount | null;
    sigefDestinationAccount: BankAccount | null;
    effectiveAccount: BankAccount | null;
    source: AccountSource;
    correspondence: AccountCorrespondence;
  };
  sources: {
    pddeInfo: SourceSnapshot;
    sigefReleases: SourceSnapshot;
    sigefMovements: SourceSnapshot;
  };
}

export interface PortfolioReconciliationResult {
  rows: PortfolioRow[];
  summary: {
    total: number;
    confirmed: number;
    orderBankWithoutCredit: number;
    pddeInfoOnly: number;
    divergent: number;
    noPayment: number;
    inconclusive: number;
    requiringHumanReview: number;
    accountsFromPddeInfoOnly: number;
    accountsConfirmedByBoth: number;
    accountsCompletedFromSigef: number;
    accountDivergences: number;
    accountsMissing: number;
  };
}

function releaseSourceKey(cnpj: string, programCode: string): string {
  return `${canonicalCnpj(cnpj)}:${canonicalProgramCode(programCode)}`;
}

function releaseMatchesPayment(payment: PddePayment, release: SigefRelease): boolean {
  return canonicalCnpj(payment.school.cnpj) === canonicalCnpj(release.schoolCnpj)
    && payment.fiscalYear === release.fiscalYear
    && canonicalProgramCode(payment.programCode) === canonicalProgramCode(release.programCode)
    && payment.actionCode === release.actionCode
    && (payment.installmentCode === null || payment.installmentCode === release.installmentCode);
}

function movementMatchesPayment(payment: PddePayment, movement: SigefMovement): boolean {
  return canonicalCnpj(payment.school.cnpj) === canonicalCnpj(movement.schoolCnpj)
    && canonicalProgramCode(payment.programCode) === canonicalProgramCode(movement.programCode);
}

const TRUSTED_RELEASE_REASONS = new Set<ReconciliationResult['reasonCode']>([
  'EXACT_MATCH',
  'MOVEMENT_NOT_FOUND',
  'MOVEMENT_SOURCE_UNAVAILABLE',
  'MOVEMENT_SOURCE_OUT_OF_COVERAGE',
  'MOVEMENT_AMOUNT_MISMATCH',
]);

function resolveAccount(
  payment: PddePayment,
  release: SigefRelease | null,
  reconciliation: ReconciliationResult,
): PortfolioRow['accountResolution'] {
  const pddeInfoAccount = payment.account ?? null;
  const sigefDestinationAccount = release?.destinationAccount ?? null;
  if (pddeInfoAccount && sigefDestinationAccount) {
    if (!sameAccount(pddeInfoAccount, sigefDestinationAccount)) {
      return {
        pddeInfoAccount,
        sigefDestinationAccount,
        effectiveAccount: null,
        source: null,
        correspondence: 'DIVERGENT',
      };
    }
    return {
      pddeInfoAccount,
      sigefDestinationAccount,
      effectiveAccount: pddeInfoAccount,
      source: 'PDDEINFO_E_SIGEF',
      correspondence: 'MATCH',
    };
  }
  if (pddeInfoAccount) {
    return {
      pddeInfoAccount,
      sigefDestinationAccount: null,
      effectiveAccount: pddeInfoAccount,
      source: 'PDDEINFO',
      correspondence: 'PDDEINFO_ONLY',
    };
  }
  if (sigefDestinationAccount && TRUSTED_RELEASE_REASONS.has(reconciliation.reasonCode)) {
    return {
      pddeInfoAccount: null,
      sigefDestinationAccount,
      effectiveAccount: sigefDestinationAccount,
      source: 'SIGEF_LIBERACOES',
      correspondence: 'SIGEF_ONLY',
    };
  }
  return {
    pddeInfoAccount: null,
    sigefDestinationAccount,
    effectiveAccount: null,
    source: null,
    correspondence: 'MISSING',
  };
}

function statusCount(rows: PortfolioRow[], status: ReconciliationStatus): number {
  return rows.filter((row) => row.reconciliation.status === status).length;
}

export function reconcilePortfolio(rawInput: z.input<typeof portfolioInputSchema>): PortfolioReconciliationResult {
  const input = portfolioInputSchema.parse(rawInput);
  const releaseSources = new Map<string, SourceSnapshot>();
  for (const item of input.sources.sigefReleases) {
    if (item.snapshot.source !== 'SIGEF_LIBERACOES') {
      throw new Error(`Fonte de liberação inválida para ${item.schoolCnpj}/${item.programCode}.`);
    }
    const key = releaseSourceKey(item.schoolCnpj, item.programCode);
    if (releaseSources.has(key)) throw new Error(`Fonte de liberação duplicada para ${key}.`);
    releaseSources.set(key, item.snapshot);
  }

  const rows = input.payments.map((payment): PortfolioRow => {
    const candidateReleases = input.releases.filter((release) => releaseMatchesPayment(payment, release));
    const candidateMovements = candidateReleases.length > 0
      ? input.movements.filter((movement) => movementMatchesPayment(payment, movement))
      : [];
    const releaseSource = releaseSources.get(releaseSourceKey(payment.school.cnpj, payment.programCode)) ?? {
      source: 'SIGEF_LIBERACOES' as const,
      status: 'unavailable' as const,
      queriedAt: input.sources.pddeInfo.queriedAt,
      detail: 'Nenhum resultado de Liberações foi incorporado para este CNPJ e programa.',
    };
    const reconciliation = reconcileRepasse({
      payment,
      releases: candidateReleases,
      movements: candidateMovements,
      sources: {
        pddeInfo: input.sources.pddeInfo,
        sigefReleases: releaseSource,
        sigefMovements: input.sources.sigefMovements,
      },
    });
    const matchedRelease = reconciliation.matchedReleaseId
      ? candidateReleases.find((release) => release.id === reconciliation.matchedReleaseId) ?? null
      : null;
    const matchedMovementIds = new Set(reconciliation.matchedMovementIds);
    const matchedMovements = candidateMovements.filter((movement) => matchedMovementIds.has(movement.id));
    return {
      payment,
      matchedRelease,
      matchedMovements,
      reconciliation,
      accountResolution: resolveAccount(payment, matchedRelease, reconciliation),
      sources: {
        pddeInfo: input.sources.pddeInfo,
        sigefReleases: releaseSource,
        sigefMovements: input.sources.sigefMovements,
      },
    };
  });

  return {
    rows,
    summary: {
      total: rows.length,
      confirmed: statusCount(rows, 'REPASSE_CONFIRMADO'),
      orderBankWithoutCredit: statusCount(rows, 'ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO'),
      pddeInfoOnly: statusCount(rows, 'PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO'),
      divergent: statusCount(rows, 'DIVERGENCIA_REVISAO_NECESSARIA'),
      noPayment: statusCount(rows, 'SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA'),
      inconclusive: statusCount(rows, 'CONSULTA_INCONCLUSIVA'),
      requiringHumanReview: rows.filter((row) => row.reconciliation.requiresHumanReview).length,
      accountsFromPddeInfoOnly: rows.filter((row) => row.accountResolution.correspondence === 'PDDEINFO_ONLY').length,
      accountsConfirmedByBoth: rows.filter((row) => row.accountResolution.correspondence === 'MATCH').length,
      accountsCompletedFromSigef: rows.filter((row) => row.accountResolution.correspondence === 'SIGEF_ONLY').length,
      accountDivergences: rows.filter((row) => row.accountResolution.correspondence === 'DIVERGENT').length,
      accountsMissing: rows.filter((row) => row.accountResolution.correspondence === 'MISSING').length,
    },
  };
}
