import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/core/reconciliation.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const school = {
  inep: '33000001',
  sme: '0410001',
  name: 'EM Exemplo',
  uex: 'CAIXA ESCOLAR EM EXEMPLO',
  cnpj: '12345678000190',
};

const account = {
  bank: '001',
  agency: '0249',
  number: '00012345X',
};

const payment = {
  id: 'pdde-1',
  school,
  fiscalYear: 2026,
  programCode: '02',
  programName: 'PDDE',
  actionCode: 'PDDE_BASICO',
  actionName: 'PDDE Básico',
  installmentCode: '1',
  installmentLabel: '1ª Parcela',
  amountOriginalDueCents: 506_500,
  adjustmentCents: 0,
  amountFinalDueCents: 506_500,
  amountPaidCents: 506_500,
  paymentDate: '2026-08-05',
  account,
  sourceReference: {
    source: 'PDDEINFO',
    url: 'https://www.fnde.gov.br/pddeinfo/exemplo',
    rawDestination: 'PDDE / PDDE Básico - 1ª Parcela',
  },
};

const release = {
  id: 'release-1',
  schoolCnpj: school.cnpj,
  fiscalYear: 2026,
  programCode: '02',
  programName: 'PDDE',
  actionCode: 'PDDE_BASICO',
  installmentCode: '1',
  amountCents: 506_500,
  paymentDate: '2026-08-05',
  orderBank: '202608050001',
  destinationAccount: account,
  sourceReference: {
    source: 'SIGEF_LIBERACOES',
    url: 'https://www.fnde.gov.br/sigefweb/liberacoes/exemplo',
    rawProgram: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
  },
};

const movement = {
  id: 'movement-1',
  schoolCnpj: school.cnpj,
  programCode: '02',
  operation: 'credit',
  amountCents: 506_500,
  movementDate: '2026-08-05',
  account,
  document: release.orderBank,
  history: 'ORDEM BANCARIA',
};

const sources = {
  pddeInfo: {
    source: 'PDDEINFO',
    status: 'available',
    queriedAt: '2026-08-11T23:00:00-03:00',
    coverageThrough: '2026-08-11',
  },
  sigefReleases: {
    source: 'SIGEF_LIBERACOES',
    status: 'available',
    queriedAt: '2026-08-11T23:01:00-03:00',
    coverageThrough: '2026-08-11',
  },
  sigefMovements: {
    source: 'SIGEF_MOVIMENTACOES',
    status: 'available',
    queriedAt: '2026-08-11T23:02:00-03:00',
    coverageThrough: '2026-08-11',
  },
};

async function reconcile(input: Record<string, unknown>) {
  const subject = await loadSubject();
  expect(subject, 'o motor de conciliação ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.reconcileRepasse).toBeTypeOf('function');
  return (subject.reconcileRepasse as (value: Record<string, unknown>) => unknown)(input) as Record<string, unknown>;
}

describe('reconcileRepasse', () => {
  test('confirma o repasse quando PDDEInfo, liberação e crédito correspondem exatamente', async () => {
    const result = await reconcile({ payment, releases: [release], movements: [movement], sources });

    expect(result).toMatchObject({
      status: 'REPASSE_CONFIRMADO',
      statusLabel: 'REPASSE CONFIRMADO',
      requiresHumanReview: false,
      matchedReleaseId: release.id,
      matchedMovementIds: [movement.id],
    });
  });

  test('mantém a ordem bancária confirmada quando a fonte cobre a data mas o crédito não aparece', async () => {
    const result = await reconcile({ payment, releases: [release], movements: [], sources });

    expect(result).toMatchObject({
      status: 'ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO',
      statusLabel: 'ORDEM BANCÁRIA CONFIRMADA — CRÉDITO NÃO LOCALIZADO',
      requiresHumanReview: true,
      reasonCode: 'MOVEMENT_NOT_FOUND',
    });
  });

  test('não chama de crédito ausente quando a movimentação ainda não cobre a data do pagamento', async () => {
    const laggedSources = {
      ...sources,
      sigefMovements: {
        ...sources.sigefMovements,
        coverageThrough: '2026-05-31',
      },
    };

    const result = await reconcile({ payment, releases: [release], movements: [], sources: laggedSources });

    expect(result).toMatchObject({
      status: 'CONSULTA_INCONCLUSIVA',
      statusLabel: 'CONSULTA INCONCLUSIVA',
      requiresHumanReview: true,
      reasonCode: 'MOVEMENT_SOURCE_OUT_OF_COVERAGE',
    });
  });

  test('classifica pagamento encontrado apenas no PDDEInfo quando a consulta de liberações é conclusiva', async () => {
    const result = await reconcile({ payment, releases: [], movements: [], sources });

    expect(result).toMatchObject({
      status: 'PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO',
      statusLabel: 'PAGAMENTO INFORMADO SOMENTE NO PDDEINFO',
      requiresHumanReview: true,
      reasonCode: 'RELEASE_NOT_FOUND',
    });
  });

  test('sinaliza divergência em vez de escolher uma liberação com valor diferente', async () => {
    const conflictingRelease = { ...release, amountCents: 505_000 };

    const result = await reconcile({ payment, releases: [conflictingRelease], movements: [], sources });

    expect(result).toMatchObject({
      status: 'DIVERGENCIA_REVISAO_NECESSARIA',
      statusLabel: 'DIVERGÊNCIA — REVISÃO NECESSÁRIA',
      requiresHumanReview: true,
      reasonCode: 'RELEASE_AMOUNT_MISMATCH',
    });
  });

  test('informa ausência de pagamento somente quando todas as fontes responderam e não há registro', async () => {
    const result = await reconcile({ payment: null, releases: [], movements: [], sources });

    expect(result).toMatchObject({
      status: 'SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA',
      statusLabel: 'SEM PAGAMENTO REGISTRADO ATÉ A CONSULTA',
      requiresHumanReview: false,
      reasonCode: 'NO_PAYMENT_FOUND',
    });
  });

  test('não informa ausência de pagamento quando a movimentação termina antes da data de corte', async () => {
    const laggedSources = {
      ...sources,
      sigefMovements: {
        ...sources.sigefMovements,
        coverageThrough: '2026-05-29',
      },
    };

    const result = await reconcile({
      payment: null,
      releases: [],
      movements: [],
      sources: laggedSources,
    });

    expect(result).toMatchObject({
      status: 'CONSULTA_INCONCLUSIVA',
      reasonCode: 'MOVEMENT_SOURCE_OUT_OF_COVERAGE',
      requiresHumanReview: true,
    });
  });

  test('produz consulta inconclusiva quando uma fonte necessária está indisponível', async () => {
    const unavailableSources = {
      ...sources,
      sigefReleases: {
        ...sources.sigefReleases,
        status: 'unavailable',
        detail: 'CAPTCHA ou falha de resposta',
      },
    };

    const result = await reconcile({ payment, releases: [], movements: [], sources: unavailableSources });

    expect(result).toMatchObject({
      status: 'CONSULTA_INCONCLUSIVA',
      statusLabel: 'CONSULTA INCONCLUSIVA',
      requiresHumanReview: true,
      reasonCode: 'RELEASE_SOURCE_UNAVAILABLE',
    });
  });

  test('confirma um repasse quando vários créditos vinculados somam exatamente a liberação', async () => {
    const splitMovements = [
      { ...movement, id: 'movement-a', amountCents: 300_000 },
      { ...movement, id: 'movement-b', amountCents: 206_500 },
    ];

    const result = await reconcile({ payment, releases: [release], movements: splitMovements, sources });

    expect(result).toMatchObject({
      status: 'REPASSE_CONFIRMADO',
      matchedReleaseId: release.id,
      matchedMovementIds: ['movement-a', 'movement-b'],
      movementTotalCents: 506_500,
    });
  });
});
