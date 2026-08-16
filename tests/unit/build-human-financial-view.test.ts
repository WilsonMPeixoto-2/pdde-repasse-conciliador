import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

const fiscalView = {
  version: 1,
  generatedAt: '2026-08-15T23:10:00.000Z',
  sourceGeneratedAt: '2026-08-15T23:00:00.000Z',
  fiscalYear: 2026,
  sourceStatus: 'COMPLETE',
  sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
  sourceObservations: [{ source: 'PDDEINFO', queriedAt: '2026-08-15T23:00:00.000Z', status: 'AVAILABLE' }],
  coverage: { internalParserVersion: '0.5', requestHash: 'secret-hash' },
  presentation: {
    repasses: 'interno',
    statements: 'interno',
    interpretation: 'interno',
  },
  schools: [{
    school: {
      inep: '33069247',
      sme: '0410001',
      name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CONSELHO ESCOLA COMUNIDADE',
      cnpj: '04500463000173',
    },
    repasses: [{
      programCode: '02',
      action: 'PDDE / PDDE Básico',
      installments: [{
        installment: '1ª Parcela',
        amountProgrammedCents: 418500,
        amountPaidInformedCents: 418500,
        pddeInfoDate: '2026-08-04',
        account: { bank: '001', agency: '0249', number: '0000546402' },
        bankCredit: {
          presentationStatus: 'CREDITO_LOCALIZADO',
          technicalStatus: 'CREDITO_CONFIRMADO',
          date: '2026-08-05',
          amountCents: 418500,
          document: 'DOC123',
        },
        note: 'Pagamento informado no PDDEInfo e crédito compatível localizado no extrato SIGEF.',
      }],
    }],
    statements: [{
      programCode: '02',
      programLabel: 'PDDE',
      account: { bank: '001', agency: '0249', number: '0000546402' },
      saldoPddeInfoCents: 318699,
      collectionStatus: 'COMPLETE',
      collectionError: null,
      coverageThrough: '2026-06-30',
      pagesFetched: 4,
      declaredTotal: 17,
      entries: [{
        id: 'internal-id',
        date: '2026-06-10',
        history: 'PAGAMENTO FORNECEDOR',
        document: '12345',
        creditCents: null,
        debitCents: 50000,
        counterparty: {
          document: '12345678000199',
          name: 'FORNECEDOR EXEMPLO',
          bank: '001',
          agency: '1234',
          account: '56789',
          internalTraceId: 'counterparty-secret-id',
        },
        neutralCategory: 'Pagamento / transferência',
        technicalClassification: 'PAGAMENTO_TRANSFERENCIA',
        sourceUrl: 'https://tecnico.example/raw',
      }],
    }],
  }],
} as const;

const publicReports = {
  attendance: [],
  accounting: [{
    fiscalYear: 2026,
    programName: 'PDDE',
    schoolInep: '33069247',
    uexCnpj: '04500463000173',
    accountingStatus: 'Aguardando análise',
    paymentSuspended: false,
    expectedTotalCents: 418500,
  }],
  balances: [{
    schoolIneps: ['33069247'],
    coverageThrough: '2026-06-30',
    uexCnpj: '04500463000173',
    bank: '001',
    agency: '0249',
    account: '0000546402',
    programName: 'PDDE QUALIDADE',
    checkingBalanceCents: 0,
    fundBalanceCents: 318699,
    savingsBalanceCents: 0,
    rdbCdbBalanceCents: 0,
    investmentBalanceCents: 318699,
    totalReportedBalanceCents: 318699,
  }],
  failures: [],
  artifacts: [],
  balanceReferenceMonth: '06-2026',
  coverageThrough: '2026-06-30',
} as const;

describe('buildHumanFinancialView', () => {
  it('expõe somente informação financeira compreensível ao gestor', () => {
    const view = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: publicReports as never,
    });

    expect(view.title).toBe('Inteligência Financeira PDDE | 4ª CRE');
    expect(view.fiscalYear).toBe(2026);
    expect(view.referenceLabel).toContain('30/06/2026');
    expect(view.sources).toEqual([
      {
        name: 'PDDEInfo',
        information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.',
      },
      {
        name: 'SIGEF',
        information: 'Movimentações das contas e créditos compatíveis localizados no extrato.',
      },
    ]);
    expect(view.sources.map((source) => source.information).join(' ')).not.toMatch(/\bHTTP\b|\bAPI\b|parser|hash|retry/i);
    expect(view.schools[0]).toEqual(expect.objectContaining({
      school: expect.objectContaining({ name: 'EM EMA NEGRAO DE LIMA' }),
      accounting: [expect.objectContaining({ status: 'Aguardando análise' })],
    }));
    expect(view.schools[0].accounts[0].movements[0].counterparty).toEqual({
      document: '12345678000199',
      name: 'FORNECEDOR EXEMPLO',
      bank: '001',
      agency: '1234',
      account: '56789',
    });

    const serialized = JSON.stringify(view).toLowerCase();
    for (const forbidden of [
      'sha256',
      'parser',
      'sourceurl',
      'pagesfetched',
      'technicalclassification',
      'technicalstatus',
      'requesthash',
      'payload',
      'attempts',
      'internal-id',
      'internaltraceid',
      'counterparty-secret-id',
      'tecnico.example',
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it('recusa visão humana corrente fora de 2026', () => {
    expect(() => buildHumanFinancialView({
      fiscalView: { ...fiscalView, fiscalYear: 2025 } as never,
      publicReports: publicReports as never,
    })).toThrow(/2026/);
  });
});
