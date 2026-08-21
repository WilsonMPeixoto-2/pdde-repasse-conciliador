import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

const fiscalSchool = {
  school: { inep: '33069093', sme: '0410002', name: 'EM ALBINO SOUZA CRUZ', uex: 'CEC ALBINO', cnpj: '12345678000190' },
  repasses: [{
    programCode: '02',
    action: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      amountProgrammedCents: 506500,
      amountPaidInformedCents: 506500,
      pddeInfoDate: '2026-08-05',
      account: { bank: '001', agency: '0249', number: '0000549797' },
      bankCredit: {
        presentationStatus: 'CREDITO_LOCALIZADO', technicalStatus: 'CONFIRMADO',
        date: '2026-08-06', amountCents: 506500, document: 'OB123',
      },
      note: null,
    }],
  }],
  statements: [{
    programCode: '02', programLabel: 'PDDE',
    account: { bank: '001', agency: '0249', number: '0000549797' },
    entries: [],
  }],
};

const baseBalance = {
  schoolIneps: ['33069093'],
  cnpj: '12345678000190', bank: '001', agency: '0249', account: '0000549797',
  programName: 'PDDE', checkingBalanceCents: 111, fundBalanceCents: 0,
  savingsBalanceCents: 0, rdbCdbBalanceCents: 0, investmentBalanceCents: 0,
  totalReportedBalanceCents: 111,
};

const publicReports = {
  attendance: [{
    fiscalYear: 2026, schoolInep: '33069093', uexCnpj: '12345678000190',
    programName: 'PDDE', destination: 'PDDE Básico - 1ª Parcela',
    costCents: 126625, capitalCents: 379875, totalCents: 506500,
    paymentOrderDate: '2026-08-04',
  }],
  accounting: [],
  balances: [
    { ...baseBalance, coverageThrough: '2026-01-31', checkingBalanceCents: 111, totalReportedBalanceCents: 111 },
    { ...baseBalance, coverageThrough: '2026-03-31', checkingBalanceCents: 2400, fundBalanceCents: 100000, investmentBalanceCents: 100000, totalReportedBalanceCents: 102400 },
    { ...baseBalance, coverageThrough: '2026-06-30', checkingBalanceCents: 111, fundBalanceCents: 415032, investmentBalanceCents: 415032, totalReportedBalanceCents: 415143 },
  ],
  artifacts: [], failures: [], balanceReferenceMonth: '06-2026', coverageThrough: '2026-06-30',
};

describe('série histórica e métricas do read model humano', () => {
  it('preserva todas as posições observadas da conta, sem inventar fevereiro', () => {
    const view = buildHumanFinancialView({ fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never, publicReports: publicReports as never });
    const account = view.schools[0].accounts[0];

    expect(account.positions.map((item) => item.referenceDate)).toEqual([
      '2026-01-31', '2026-03-31', '2026-06-30',
    ]);
    expect(account.latestPosition?.referenceDate).toBe('2026-06-30');
  });

  it('calcula totais executivos somente a partir do read model humano e mantém saldo/aplicação separados', () => {
    const view = buildHumanFinancialView({ fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never, publicReports: publicReports as never });

    expect(view.metrics).toEqual({
      schoolCount: 1,
      accountsTotal: 1,
      accountsWithPosition: 1,
      programmedCents: 506500,
      paymentInformedCents: 506500,
      creditLocatedCents: 506500,
      reportedBalanceCents: 415143,
      applicationsCents: 415032,
    });
  });

  it('une saldo público e extrato quando a mesma conta usa zeros de preenchimento diferentes', () => {
    const differentlyFormattedReports = {
      ...publicReports,
      balances: publicReports.balances.map((balance) => ({
        ...balance,
        bank: '1',
        agency: '249',
        account: '549797',
      })),
    };

    const view = buildHumanFinancialView({
      fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never,
      publicReports: differentlyFormattedReports as never,
    });

    expect(view.schools[0].accounts).toHaveLength(1);
    expect(view.schools[0].accounts[0].positions).toHaveLength(3);
    expect(view.schools[0].accounts[0].latestPosition?.totalReportedBalanceCents).toBe(415143);
    expect(view.metrics.accountsTotal).toBe(1);
    expect(view.metrics.reportedBalanceCents).toBe(415143);
  });

  it('não infla a carteira com conta histórica zerada, mas preserva saldo residual sem extrato mapeado', () => {
    const reportsWithHistoricalBalances = {
      ...publicReports,
      balances: [
        ...publicReports.balances,
        {
          ...baseBalance,
          account: '0000000001',
          programName: 'PDDE/PDE-ESCOLA',
          coverageThrough: '2026-06-30',
          checkingBalanceCents: 0,
          fundBalanceCents: 0,
          investmentBalanceCents: 0,
          totalReportedBalanceCents: 0,
        },
        {
          ...baseBalance,
          account: '0000000002',
          programName: 'PDDE',
          coverageThrough: '2026-06-30',
          checkingBalanceCents: 1450,
          fundBalanceCents: 0,
          investmentBalanceCents: 0,
          totalReportedBalanceCents: 1450,
        },
      ],
    };

    const view = buildHumanFinancialView({
      fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never,
      publicReports: reportsWithHistoricalBalances as never,
    });

    const accounts = view.schools[0].accounts.map((account) => account.account);
    expect(accounts).toHaveLength(2);
    expect(accounts).toEqual(expect.arrayContaining(['0000549797', '0000000002']));
    expect(accounts).not.toContain('0000000001');
    expect(view.metrics.accountsTotal).toBe(2);
    expect(view.metrics.accountsWithPosition).toBe(2);
    expect(view.metrics.reportedBalanceCents).toBe(416593);
  });

  it('preserva uma conta sem extrato que teve saldo em 2026 mesmo quando a última posição é zero', () => {
    const historicalAccount = '0000000003';
    const reportsWithSpentAccount = {
      ...publicReports,
      balances: [
        ...publicReports.balances,
        {
          ...baseBalance,
          account: historicalAccount,
          programName: 'PDDE QUALIDADE',
          coverageThrough: '2026-02-28',
          checkingBalanceCents: 250000,
          totalReportedBalanceCents: 250000,
        },
        {
          ...baseBalance,
          account: historicalAccount,
          programName: 'PDDE QUALIDADE',
          coverageThrough: '2026-06-30',
          checkingBalanceCents: 0,
          totalReportedBalanceCents: 0,
        },
      ],
    };

    const view = buildHumanFinancialView({
      fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never,
      publicReports: reportsWithSpentAccount as never,
    });
    const account = view.schools[0].accounts.find((item) => item.account === historicalAccount);

    expect(account).toBeDefined();
    expect(account?.positions.map((item) => [item.referenceDate, item.totalReportedBalanceCents])).toEqual([
      ['2026-02-28', 250000],
      ['2026-06-30', 0],
    ]);
    expect(account?.latestPosition?.totalReportedBalanceCents).toBe(0);
  });

  it('deduplica posições idênticas da mesma conta na mesma data', () => {
    const duplicatedReports = {
      ...publicReports,
      balances: [publicReports.balances[0], publicReports.balances[0], ...publicReports.balances.slice(1)],
    };
    const view = buildHumanFinancialView({
      fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never,
      publicReports: duplicatedReports as never,
    });

    expect(view.schools[0].accounts[0].positions.map((item) => item.referenceDate)).toEqual([
      '2026-01-31', '2026-03-31', '2026-06-30',
    ]);
  });

  it('recusa posições divergentes da mesma conta na mesma data em vez de escolher silenciosamente', () => {
    const conflictingReports = {
      ...publicReports,
      balances: [
        ...publicReports.balances,
        {
          ...publicReports.balances[2],
          checkingBalanceCents: 999,
          totalReportedBalanceCents: 416031,
        },
      ],
    };

    expect(() => buildHumanFinancialView({
      fiscalView: { fiscalYear: 2026, schools: [fiscalSchool] } as never,
      publicReports: conflictingReports as never,
    })).toThrow(/posição financeira divergente/i);
  });
});