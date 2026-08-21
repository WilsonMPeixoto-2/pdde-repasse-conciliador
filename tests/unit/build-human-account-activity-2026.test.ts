import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';
import { humanAccountSchema } from '../../shared/human-financial-contract';

const schoolIdentity = {
  inep: '33069409',
  sme: '0410006',
  name: 'EM PROFESSOR CARNEIRO RIBEIRO',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA EM PROFESSOR CARNEIRO RIBEIRO',
  cnpj: '05406794000101',
};

const counterparty = {
  document: null,
  name: null,
  bank: null,
  agency: null,
  account: null,
};

const movementSpecs = [
  ['REPASSE_FNDE', 'Crédito FNDE', 100000, null],
  ['APLICACAO_FINANCEIRA', 'Aplicação financeira', null, 50000],
  ['RESGATE_APLICACAO', 'Resgate de aplicação', 20000, null],
  ['PAGAMENTO_TRANSFERENCIA', 'Pagamento / transferência', null, 10000],
  ['PAGAMENTO_CARTAO', 'Pagamento por cartão', null, 5000],
  ['RENDIMENTO_FINANCEIRO', 'Rendimento financeiro', 300, null],
  ['ENTRADA_TERCEIRO', 'Entrada registrada no extrato', 700, null],
  ['TARIFA_BANCARIA', 'Tarifa bancária', null, 100],
  ['ESTORNO_REVERSAO', 'Estorno / reversão', 1000, null],
  ['MOVIMENTO_NAO_CLASSIFICADO', null, null, 200],
] as const;

function entriesFromSpecs() {
  return movementSpecs.map(([technicalClassification, neutralCategory, creditCents, debitCents], index) => ({
    id: `movement-${index + 1}`,
    date: `2026-05-${String(index + 1).padStart(2, '0')}`,
    history: `HISTORICO ${index + 1}`,
    document: `DOC${index + 1}`,
    creditCents,
    debitCents,
    counterparty,
    neutralCategory,
    technicalClassification,
    sourceUrl: 'https://tecnico.example/raw',
  }));
}

function fiscalView(input: {
  collectionStatus?: 'COMPLETE' | 'PARTIAL' | 'ERROR';
  entries?: ReturnType<typeof entriesFromSpecs>;
  includeStatement?: boolean;
}) {
  const includeStatement = input.includeStatement ?? true;
  return {
    fiscalYear: 2026,
    schools: [{
      school: schoolIdentity,
      repasses: [],
      statements: includeStatement ? [{
        programCode: '0B',
        programLabel: 'PDDE QUALIDADE',
        account: { bank: '001', agency: '0249', number: '0000546461' },
        saldoPddeInfoCents: 345973,
        collectionStatus: input.collectionStatus ?? 'COMPLETE',
        collectionError: input.collectionStatus === 'ERROR' ? 'Falha de coleta' : null,
        coverageThrough: '2026-07-31',
        pagesFetched: 1,
        declaredTotal: input.entries?.length ?? 0,
        entries: input.entries ?? [],
      }] : [],
    }],
  };
}

function publicReports(input?: { applicationsCents?: number; totalCents?: number }) {
  const applicationsCents = input?.applicationsCents ?? 345973;
  const totalCents = input?.totalCents ?? 345973;
  return {
    attendance: [],
    accounting: [],
    balances: [{
      schoolIneps: [schoolIdentity.inep],
      coverageThrough: '2026-07-31',
      uexCnpj: schoolIdentity.cnpj,
      bank: '001',
      agency: '0249',
      account: '0000546461',
      programName: 'PDDE QUALIDADE',
      checkingBalanceCents: totalCents - applicationsCents,
      fundBalanceCents: applicationsCents,
      savingsBalanceCents: 0,
      rdbCdbBalanceCents: 0,
      investmentBalanceCents: applicationsCents,
      totalReportedBalanceCents: totalCents,
    }],
    failures: [],
    artifacts: [],
    balanceReferenceMonth: '07-2026',
    coverageThrough: '2026-07-31',
  };
}

describe('atividade financeira e cobertura humana por conta em 2026', () => {
  it('classifica movimentos por código estável e calcula a atividade uma única vez', () => {
    const view = buildHumanFinancialView({
      fiscalView: fiscalView({ entries: entriesFromSpecs() }) as never,
      publicReports: publicReports() as never,
    });
    const account = view.schools[0].accounts[0];

    expect(account.movements.map((movement) => movement.kind)).toEqual([
      'FNDE_CREDIT',
      'APPLICATION',
      'REDEMPTION',
      'PAYMENT_OR_TRANSFER',
      'CARD_PAYMENT',
      'FINANCIAL_INCOME',
      'THIRD_PARTY_ENTRY',
      'BANK_FEE',
      'REVERSAL',
      'OTHER',
    ]);
    expect(account.coverage).toEqual({
      positionCount: 1,
      firstPositionDate: '2026-07-31',
      latestPositionDate: '2026-07-31',
      movementCollectionStatus: 'COMPLETE',
      latestMovementDate: '2026-05-10',
    });
    expect(account.activity).toEqual({
      movementCount: 10,
      creditsObservedCents: 122000,
      debitsObservedCents: 65300,
      fndeCreditsCents: 100000,
      applicationsCents: 50000,
      redemptionsCents: 20000,
      paymentsAndTransfersCents: 15000,
      financialIncomeCents: 300,
      thirdPartyEntriesCents: 700,
      bankFeesCents: 100,
      otherCreditsCents: 1000,
      otherDebitsCents: 200,
    });
    expect(account.contextFlags).toEqual([]);
  });

  it('sinaliza ausência de evidência de origem somente quando a coleta de movimentos está completa', () => {
    const complete = buildHumanFinancialView({
      fiscalView: fiscalView({ collectionStatus: 'COMPLETE', entries: [] }) as never,
      publicReports: publicReports() as never,
    }).schools[0].accounts[0];
    expect(complete.contextFlags).toEqual(expect.arrayContaining([
      'NONZERO_POSITION_WITHOUT_2026_INFLOW',
      'NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT',
    ]));

    const partial = buildHumanFinancialView({
      fiscalView: fiscalView({ collectionStatus: 'PARTIAL', entries: [] }) as never,
      publicReports: publicReports() as never,
    }).schools[0].accounts[0];
    expect(partial.coverage.movementCollectionStatus).toBe('PARTIAL');
    expect(partial.contextFlags).toEqual(['MOVEMENT_COLLECTION_PARTIAL']);
    expect(partial.contextFlags).not.toContain('NONZERO_POSITION_WITHOUT_2026_INFLOW');
    expect(partial.contextFlags).not.toContain('NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT');

    const failed = buildHumanFinancialView({
      fiscalView: fiscalView({ collectionStatus: 'ERROR', entries: [] }) as never,
      publicReports: publicReports() as never,
    }).schools[0].accounts[0];
    expect(failed.coverage.movementCollectionStatus).toBe('FAILED');
    expect(failed.contextFlags).toEqual(['MOVEMENT_COLLECTION_FAILED']);
  });

  it('trata conta sem extrato mapeado como NOT_AVAILABLE sem inventar ausência de evento', () => {
    const account = buildHumanFinancialView({
      fiscalView: fiscalView({ includeStatement: false }) as never,
      publicReports: publicReports() as never,
    }).schools[0].accounts[0];

    expect(account.coverage.movementCollectionStatus).toBe('NOT_AVAILABLE');
    expect(account.activity.movementCount).toBe(0);
    expect(account.contextFlags).toEqual([]);
  });

  it('mantém compatibilidade de leitura com contas legadas e materializa defaults seguros', () => {
    const legacy = humanAccountSchema.parse({
      program: 'PDDE QUALIDADE',
      bank: '001',
      agency: '0249',
      account: '0000546461',
      positions: [],
      latestPosition: null,
      movements: [{
        date: '2026-05-01',
        description: 'MOVIMENTO LEGADO',
        document: null,
        category: null,
        creditCents: 100,
        debitCents: null,
        counterparty: null,
      }],
      note: null,
    });

    expect(legacy.movements[0].kind).toBe('OTHER');
    expect(legacy.coverage).toEqual({
      positionCount: 0,
      firstPositionDate: null,
      latestPositionDate: null,
      movementCollectionStatus: 'NOT_AVAILABLE',
      latestMovementDate: null,
    });
    expect(legacy.activity).toEqual({
      movementCount: 0,
      creditsObservedCents: 0,
      debitsObservedCents: 0,
      fndeCreditsCents: 0,
      applicationsCents: 0,
      redemptionsCents: 0,
      paymentsAndTransfersCents: 0,
      financialIncomeCents: 0,
      thirdPartyEntriesCents: 0,
      bankFeesCents: 0,
      otherCreditsCents: 0,
      otherDebitsCents: 0,
    });
    expect(legacy.contextFlags).toEqual([]);
  });
});