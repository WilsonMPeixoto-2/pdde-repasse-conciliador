import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

const school = {
  inep: '33069409',
  sme: '0410006',
  name: 'EM PROFESSOR CARNEIRO RIBEIRO',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA EM PROFESSOR CARNEIRO RIBEIRO',
  cnpj: '05406794000101',
};

const counterparty = {
  document: '12345678000190',
  name: 'FORNECEDOR TESTE',
  bank: '001',
  agency: '1234',
  account: '0000012345',
};

function entry(input: {
  id: string;
  date: string;
  history: string;
  document: string;
  creditCents: number | null;
  debitCents: number | null;
  technicalClassification: 'REPASSE_FNDE' | 'PAGAMENTO_TRANSFERENCIA';
}) {
  return {
    ...input,
    neutralCategory: input.technicalClassification === 'REPASSE_FNDE'
      ? 'Repasse FNDE'
      : 'Pagamento / transferência',
    counterparty,
    sourceUrl: 'https://tecnico.example/raw',
  };
}

const currentCredit = entry({
  id: 'mov-2026-credit',
  date: '2026-05-03',
  history: 'ORDEM BANCARIA FNDE',
  document: '00000001974995000852',
  creditCents: 315500,
  debitCents: null,
  technicalClassification: 'REPASSE_FNDE',
});

const currentPayment = entry({
  id: 'mov-2026-payment',
  date: '2026-06-15',
  history: 'PAGAMENTO FORNECEDOR',
  document: 'DOC-PAG-2026',
  creditCents: null,
  debitCents: 84500,
  technicalClassification: 'PAGAMENTO_TRANSFERENCIA',
});

const historicalMovement = entry({
  id: 'mov-2025-history',
  date: '2025-10-23',
  history: 'MOVIMENTO HISTORICO 2025',
  document: 'DOC-2025',
  creditCents: 332800,
  debitCents: null,
  technicalClassification: 'REPASSE_FNDE',
});

const fiscalView = {
  fiscalYear: 2026,
  schools: [{
    school,
    repasses: [],
    statements: [{
      programCode: '02',
      programLabel: 'PDDE Básico',
      account: { bank: '001', agency: '0249', number: '0000549827' },
      saldoPddeInfoCents: 315500,
      collectionStatus: 'COMPLETE',
      collectionError: null,
      coverageThrough: '2026-07-31',
      pagesFetched: 1,
      declaredTotal: 3,
      entries: [historicalMovement, currentCredit, currentPayment],
    }],
  }],
};

const baseBalance = {
  schoolIneps: [school.inep],
  uexCnpj: school.cnpj,
  bank: '001',
  agency: '0249',
  account: '0000549827',
  programName: 'PDDE Básico',
  checkingBalanceCents: 315500,
  fundBalanceCents: 0,
  savingsBalanceCents: 0,
  rdbCdbBalanceCents: 0,
  investmentBalanceCents: 0,
  totalReportedBalanceCents: 315500,
};

const publicReports = {
  attendance: [],
  accounting: [],
  balances: [
    { ...baseBalance, coverageThrough: '2025-12-31', checkingBalanceCents: 111000, totalReportedBalanceCents: 111000 },
    { ...baseBalance, coverageThrough: '2026-05-31', checkingBalanceCents: 315500, totalReportedBalanceCents: 315500 },
    { ...baseBalance, coverageThrough: '2026-07-31', checkingBalanceCents: 231000, totalReportedBalanceCents: 231000 },
  ],
  failures: [],
  artifacts: [],
  balanceReferenceMonth: '07-2026',
  coverageThrough: '2026-07-31',
};

describe('paridade do contrato financeiro humano de 2026', () => {
  it('preserva literalmente os campos probatórios dos movimentos correntes', () => {
    const account = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: publicReports as never,
    }).schools[0].accounts[0];

    const credit = account.movements.find((movement) => movement.document === currentCredit.document);
    expect(credit).toMatchObject({
      date: currentCredit.date,
      description: currentCredit.history,
      document: currentCredit.document,
      creditCents: currentCredit.creditCents,
      debitCents: currentCredit.debitCents,
      kind: 'FNDE_CREDIT',
    });

    const payment = account.movements.find((movement) => movement.document === currentPayment.document);
    expect(payment).toMatchObject({
      date: currentPayment.date,
      description: currentPayment.history,
      document: currentPayment.document,
      creditCents: currentPayment.creditCents,
      debitCents: currentPayment.debitCents,
      kind: 'PAYMENT_OR_TRANSFER',
    });
  });

  it('impede qualquer movimento ou posição de outro exercício no retrato humano corrente', () => {
    const account = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: publicReports as never,
    }).schools[0].accounts[0];

    expect(account.movements.map((movement) => movement.date)).toEqual([
      '2026-05-03',
      '2026-06-15',
    ]);
    expect(account.positions.map((position) => position.referenceDate)).toEqual([
      '2026-05-31',
      '2026-07-31',
    ]);
    expect(account.movements.every((movement) => movement.date.startsWith('2026-'))).toBe(true);
    expect(account.positions.every((position) => position.referenceDate.startsWith('2026-'))).toBe(true);
  });

  it('mantém uma única posição por data e define latestPosition como o último ponto da série', () => {
    const account = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: {
        ...publicReports,
        balances: [
          ...publicReports.balances,
          { ...baseBalance, coverageThrough: '2026-05-31' },
        ],
      } as never,
    }).schools[0].accounts[0];

    expect(account.positions.map((position) => position.referenceDate)).toEqual([
      '2026-05-31',
      '2026-07-31',
    ]);
    expect(account.latestPosition).toEqual(account.positions.at(-1));
  });

  it('omite somente conta observada exclusivamente com zeros e sem qualquer movimento', () => {
    const zeroAccount = '0000000999';
    const view = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: {
        ...publicReports,
        balances: [
          ...publicReports.balances.filter((balance) => balance.coverageThrough.startsWith('2026-')),
          {
            ...baseBalance,
            account: zeroAccount,
            coverageThrough: '2026-05-31',
            checkingBalanceCents: 0,
            totalReportedBalanceCents: 0,
          },
          {
            ...baseBalance,
            account: zeroAccount,
            coverageThrough: '2026-07-31',
            checkingBalanceCents: 0,
            totalReportedBalanceCents: 0,
          },
        ],
      } as never,
    });

    expect(view.schools[0].accounts.some((account) => account.account === zeroAccount)).toBe(false);
  });
});
