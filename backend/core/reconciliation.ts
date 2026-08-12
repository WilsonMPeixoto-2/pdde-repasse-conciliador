import {
  canonicalCnpj,
  canonicalDocument,
  canonicalProgramCode,
  canonicalText,
  sameAccount,
} from './normalization';
import {
  reconciliationInputSchema,
  type PddePayment,
  type ReconciliationInput,
  type SigefMovement,
  type SigefRelease,
  type SourceSnapshot,
} from './schemas';
import {
  RECONCILIATION_STATUS_LABELS,
  type Difference,
  type ReconciliationReasonCode,
  type ReconciliationResult,
  type ReconciliationStatus,
} from './types';

const REASONS: Record<ReconciliationReasonCode, string> = {
  EXACT_MATCH: 'PDDEInfo, liberação e movimentação apresentam correspondência suficiente.',
  MOVEMENT_NOT_FOUND: 'A ordem bancária foi localizada, mas o crédito correspondente não apareceu na movimentação coberta pela consulta.',
  MOVEMENT_SOURCE_UNAVAILABLE: 'A fonte de movimentações não respondeu de forma utilizável.',
  MOVEMENT_SOURCE_OUT_OF_COVERAGE: 'A fonte de movimentações ainda não cobre a data da liberação.',
  MOVEMENT_AMOUNT_MISMATCH: 'Os movimentos vinculados não totalizam o valor da liberação.',
  RELEASE_NOT_FOUND: 'O pagamento consta no PDDEInfo, mas nenhuma liberação correspondente foi localizada em uma consulta com cobertura suficiente.',
  RELEASE_SOURCE_UNAVAILABLE: 'A fonte de liberações não respondeu de forma utilizável.',
  RELEASE_SOURCE_OUT_OF_COVERAGE: 'A fonte de liberações ainda não cobre a data informada pelo PDDEInfo.',
  RELEASE_AMOUNT_MISMATCH: 'A liberação candidata possui valor diferente do pagamento informado no PDDEInfo.',
  RELEASE_DATE_MISMATCH: 'A data da liberação diverge da data informada pelo PDDEInfo.',
  RELEASE_ACCOUNT_MISMATCH: 'A conta destinatária da liberação diverge da conta informada pelo PDDEInfo.',
  RELEASE_ORDER_BANK_MISSING: 'A liberação candidata não contém número de ordem bancária.',
  MULTIPLE_RELEASE_CANDIDATES: 'Mais de uma liberação atende aos identificadores principais; nenhuma foi escolhida arbitrariamente.',
  PAYMENT_DATE_MISSING: 'Há valor pago no PDDEInfo, mas falta a data necessária para avaliar a cobertura das outras fontes.',
  PAYMENT_ABSENT_BUT_SIGEF_RECORD_FOUND: 'O PDDEInfo não apresenta pagamento, mas há registro positivo no SIGEF.',
  NO_PAYMENT_FOUND: 'As fontes responderam normalmente e não apresentaram pagamento.',
};

function result(
  status: ReconciliationStatus,
  reasonCode: ReconciliationReasonCode,
  options: {
    release?: SigefRelease;
    movements?: SigefMovement[];
    differences?: Difference[];
  } = {},
): ReconciliationResult {
  const movements = options.movements ?? [];
  return {
    status,
    statusLabel: RECONCILIATION_STATUS_LABELS[status],
    reasonCode,
    reason: REASONS[reasonCode],
    requiresHumanReview: status !== 'REPASSE_CONFIRMADO'
      && status !== 'SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA',
    matchedReleaseId: options.release?.id ?? null,
    matchedMovementIds: movements.map((movement) => movement.id),
    movementTotalCents: movements.reduce((sum, movement) => sum + movement.amountCents, 0),
    differences: options.differences ?? [],
  };
}

function sourceIsUsable(source: SourceSnapshot): boolean {
  return source.status === 'available';
}

function sourceCovers(source: SourceSnapshot, date: string): boolean {
  return sourceIsUsable(source)
    && source.coverageThrough !== undefined
    && source.coverageThrough >= date;
}

function releaseMatchesIdentity(payment: PddePayment, release: SigefRelease): boolean {
  return canonicalCnpj(payment.school.cnpj) === canonicalCnpj(release.schoolCnpj)
    && payment.fiscalYear === release.fiscalYear
    && canonicalProgramCode(payment.programCode) === canonicalProgramCode(release.programCode)
    && payment.actionCode === release.actionCode
    && (payment.installmentCode === null || payment.installmentCode === release.installmentCode);
}

function movementMatchesIdentity(release: SigefRelease, movement: SigefMovement): boolean {
  return movement.operation === 'credit'
    && canonicalCnpj(movement.schoolCnpj) === canonicalCnpj(release.schoolCnpj)
    && canonicalProgramCode(movement.programCode) === canonicalProgramCode(release.programCode)
    && sameAccount(movement.account, release.destinationAccount)
    && canonicalText(movement.history).includes('ORDEM BANCARIA');
}

function linkedMovements(release: SigefRelease, movements: SigefMovement[]): SigefMovement[] {
  const identityMatches = movements.filter((movement) => movementMatchesIdentity(release, movement));
  const releaseDocument = canonicalDocument(release.orderBank);
  const documentMatches = releaseDocument
    ? identityMatches.filter((movement) => canonicalDocument(movement.document) === releaseDocument)
    : [];

  if (documentMatches.length > 0) return documentMatches;
  return identityMatches.filter((movement) => movement.movementDate === release.paymentDate);
}

function inconclusiveForSource(
  source: SourceSnapshot,
  unavailableReason: ReconciliationReasonCode,
  uncoveredReason: ReconciliationReasonCode,
  date: string,
  release?: SigefRelease,
): ReconciliationResult | null {
  if (!sourceIsUsable(source)) {
    return result('CONSULTA_INCONCLUSIVA', unavailableReason, { release });
  }
  if (!sourceCovers(source, date)) {
    return result('CONSULTA_INCONCLUSIVA', uncoveredReason, { release });
  }
  return null;
}

export function reconcileRepasse(rawInput: ReconciliationInput): ReconciliationResult {
  const input = reconciliationInputSchema.parse(rawInput);
  const { payment, releases, movements, sources } = input;

  if (!payment || payment.amountPaidCents === 0) {
    if (releases.length > 0 || movements.some((movement) => movement.amountCents > 0)) {
      return result('DIVERGENCIA_REVISAO_NECESSARIA', 'PAYMENT_ABSENT_BUT_SIGEF_RECORD_FOUND', {
        differences: [{
          field: 'payment',
          pddeInfo: null,
          sigef: releases.length || movements.length,
          detail: 'Há registro no SIGEF sem pagamento correspondente no PDDEInfo.',
        }],
      });
    }
    if (!sourceIsUsable(sources.pddeInfo)
      || !sourceIsUsable(sources.sigefReleases)
      || !sourceIsUsable(sources.sigefMovements)) {
      const reasonCode = !sourceIsUsable(sources.sigefReleases)
        ? 'RELEASE_SOURCE_UNAVAILABLE'
        : 'MOVEMENT_SOURCE_UNAVAILABLE';
      return result('CONSULTA_INCONCLUSIVA', reasonCode);
    }
    const cutoff = sources.pddeInfo.coverageThrough ?? sources.pddeInfo.queriedAt.slice(0, 10);
    const releaseSourceIssue = inconclusiveForSource(
      sources.sigefReleases,
      'RELEASE_SOURCE_UNAVAILABLE',
      'RELEASE_SOURCE_OUT_OF_COVERAGE',
      cutoff,
    );
    if (releaseSourceIssue) return releaseSourceIssue;
    const movementSourceIssue = inconclusiveForSource(
      sources.sigefMovements,
      'MOVEMENT_SOURCE_UNAVAILABLE',
      'MOVEMENT_SOURCE_OUT_OF_COVERAGE',
      cutoff,
    );
    if (movementSourceIssue) return movementSourceIssue;
    return result('SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA', 'NO_PAYMENT_FOUND');
  }

  if (!payment.paymentDate) {
    return result('CONSULTA_INCONCLUSIVA', 'PAYMENT_DATE_MISSING');
  }

  const releaseSourceIssue = inconclusiveForSource(
    sources.sigefReleases,
    'RELEASE_SOURCE_UNAVAILABLE',
    'RELEASE_SOURCE_OUT_OF_COVERAGE',
    payment.paymentDate,
  );
  if (releaseSourceIssue) return releaseSourceIssue;

  const releaseCandidates = releases.filter((release) => releaseMatchesIdentity(payment, release));
  if (releaseCandidates.length === 0) {
    return result('PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO', 'RELEASE_NOT_FOUND');
  }
  if (releaseCandidates.length > 1) {
    return result('DIVERGENCIA_REVISAO_NECESSARIA', 'MULTIPLE_RELEASE_CANDIDATES', {
      differences: [{
        field: 'record-count',
        pddeInfo: 1,
        sigef: releaseCandidates.length,
        detail: 'Foram encontradas várias liberações com os mesmos identificadores principais.',
      }],
    });
  }

  const matchedRelease = releaseCandidates[0];
  if (matchedRelease.amountCents !== payment.amountPaidCents) {
    return result('DIVERGENCIA_REVISAO_NECESSARIA', 'RELEASE_AMOUNT_MISMATCH', {
      release: matchedRelease,
      differences: [{
        field: 'amount',
        pddeInfo: payment.amountPaidCents,
        sigef: matchedRelease.amountCents,
        detail: 'Valores expressos em centavos.',
      }],
    });
  }
  if (matchedRelease.paymentDate !== payment.paymentDate) {
    return result('DIVERGENCIA_REVISAO_NECESSARIA', 'RELEASE_DATE_MISMATCH', {
      release: matchedRelease,
      differences: [{
        field: 'date',
        pddeInfo: payment.paymentDate,
        sigef: matchedRelease.paymentDate,
        detail: 'As datas foram comparadas no formato ISO.',
      }],
    });
  }
  if (payment.account && !sameAccount(payment.account, matchedRelease.destinationAccount)) {
    return result('DIVERGENCIA_REVISAO_NECESSARIA', 'RELEASE_ACCOUNT_MISMATCH', {
      release: matchedRelease,
      differences: [{
        field: 'account',
        pddeInfo: `${payment.account.bank}/${payment.account.agency}/${payment.account.number}`,
        sigef: `${matchedRelease.destinationAccount.bank}/${matchedRelease.destinationAccount.agency}/${matchedRelease.destinationAccount.number}`,
        detail: 'A comparação ignora apenas pontuação e zeros não significativos.',
      }],
    });
  }
  if (!canonicalDocument(matchedRelease.orderBank)) {
    return result('CONSULTA_INCONCLUSIVA', 'RELEASE_ORDER_BANK_MISSING', { release: matchedRelease });
  }

  const movementSourceIssue = inconclusiveForSource(
    sources.sigefMovements,
    'MOVEMENT_SOURCE_UNAVAILABLE',
    'MOVEMENT_SOURCE_OUT_OF_COVERAGE',
    matchedRelease.paymentDate,
    matchedRelease,
  );
  if (movementSourceIssue) return movementSourceIssue;

  const matches = linkedMovements(matchedRelease, movements);
  if (matches.length === 0) {
    return result(
      'ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO',
      'MOVEMENT_NOT_FOUND',
      { release: matchedRelease },
    );
  }

  const movementTotalCents = matches.reduce((sum, movement) => sum + movement.amountCents, 0);
  if (movementTotalCents !== matchedRelease.amountCents) {
    return result('DIVERGENCIA_REVISAO_NECESSARIA', 'MOVEMENT_AMOUNT_MISMATCH', {
      release: matchedRelease,
      movements: matches,
      differences: [{
        field: 'amount',
        pddeInfo: matchedRelease.amountCents,
        sigef: movementTotalCents,
        detail: 'A soma dos movimentos vinculados não corresponde à liberação.',
      }],
    });
  }

  return result('REPASSE_CONFIRMADO', 'EXACT_MATCH', {
    release: matchedRelease,
    movements: matches,
  });
}
