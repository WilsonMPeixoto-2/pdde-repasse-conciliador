import { describe, expect, test } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

function statement(account: string) {
  return {
    programCode: '02',
    programLabel: 'PDDE',
    account: { bank: '001', agency: '0249', number: account },
    saldoPddeInfoCents: null,
    collectionStatus: 'COMPLETE',
    collectionError: null,
    coverageThrough: '2026-06-30',
    pagesFetched: 1,
    declaredTotal: 0,
    entries: [],
  };
}

function balance(account: string, total: number | null, applications: number | null) {
  return {
    schoolIneps: ['33000001'],
    coverageThrough: '2026-06-30',
    uexCnpj: '00000000000100',
    bank: '001',
    agency: '0249',
    account,
    programName: 'PDDE',
    checkingBalanceCents: total === null || applications === null ? null : total - applications,
    fundBalanceCents: applications,
    savingsBalanceCents: 0,
    rdbCdbBalanceCents: 0,
    investmentBalanceCents: applications,
    totalReportedBalanceCents: total,
  };
}

const fiscalView = {
  fiscalYear: 2026,
  schools: [{
    school: {
      inep: '33000001',
      sme: '0410001',
      name: 'EM TESTE',
      uex: 'UEx Teste',
      cnpj: '00000000000100',
    },
    repasses: [],
    statements: [statement('0000000001'), statement('0000000002')],
  }],
};

function reports(balances: unknown[]) {
  return {
    attendance: [],
    accounting: [],
    balances,
    failures: [],
    artifacts: [],
    balanceReferenceMonth: '06-2026',
    coverageThrough: '2026-06-30',
  };
}

describe('integridade dos agregados financeiros do portfólio', () => {
  test('não apresenta subtotal conhecido como se fosse saldo total quando uma conta alinhada é desconhecida', () => {
    const view = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: reports([
        balance('0000000001', 10_000_00, 4_000_00),
        balance('0000000002', null, null),
      ]) as never,
    });

    expect(view.metrics.accountsWithPosition).toBe(2);
    expect(view.metrics.reportedBalanceCents).toBeNull();
    expect(view.metrics.applicationsCents).toBeNull();
  });

  test('preserva zero real quando todas as contas alinhadas têm valor conhecido', () => {
    const view = buildHumanFinancialView({
      fiscalView: fiscalView as never,
      publicReports: reports([
        balance('0000000001', 0, 0),
        balance('0000000002', 0, 0),
      ]) as never,
    });

    expect(view.metrics.accountsWithPosition).toBe(2);
    expect(view.metrics.reportedBalanceCents).toBe(0);
    expect(view.metrics.applicationsCents).toBe(0);
  });
});
