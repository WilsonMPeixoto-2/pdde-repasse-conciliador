import { describe, expect, test } from 'vitest';
import { analyzeLiveFinancialConsistency } from '../../backend/application/verify-live-financial-consistency';

const recoveredAccount = { bank: '001', agency: '0249', number: '0000549789' };

function rawFixture(temporal: unknown): any {
  return {
    quality: { paymentTemporalCoverage: temporal },
    coverage: { paymentTemporalCoverage: temporal },
    schools: [{
      inep: '33069247',
      cnpj: '04.500.463/0001-73',
      repasses: [{
        programCode: '02',
        action: 'PDDE Básico',
        installment: '1ª Parcela',
        pagoInformadoCents: 418_500,
        dataOrdem: '2026-08-05',
        account: recoveredAccount,
      }],
      accounts: [{
        programCode: '02',
        account: recoveredAccount,
        coverageThrough: '2026-08-18',
      }],
    }],
    accountRecoveries: [{
      schoolInep: '33069247',
      schoolCnpj: '04500463000173',
      programCode: '02',
      action: 'PDDE Básico',
      installment: '1ª Parcela',
      amountCents: 418_500,
      status: 'RECOVERED',
      account: recoveredAccount,
      paymentDate: '2026-08-05',
      orderBank: '019072',
      sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes',
      error: null,
    }],
    publicReports: {
      coverageThrough: '2026-07-31',
      balanceReferenceMonth: '07-2026',
      balances: [],
    },
  };
}

const staleTemporal = {
  status: 'UNKNOWN',
  evaluatedPaymentCount: 1,
  sufficientCount: 0,
  outOfCoverageCount: 0,
  unknownCount: 1,
  latestKnownPaymentDate: '2026-08-05',
  maxObservedCoverageThrough: null,
  rows: [{
    schoolInep: '33069247',
    programCode: '02',
    paymentDate: '2026-08-05',
    coverageThrough: null,
    status: 'UNKNOWN',
    reason: 'STRONG_ACCOUNT_MISSING',
  }],
};

const currentTemporal = {
  status: 'SUFFICIENT',
  evaluatedPaymentCount: 1,
  sufficientCount: 1,
  outOfCoverageCount: 0,
  unknownCount: 0,
  latestKnownPaymentDate: '2026-08-05',
  maxObservedCoverageThrough: '2026-08-18',
  rows: [{
    schoolInep: '33069247',
    programCode: '02',
    paymentDate: '2026-08-05',
    coverageThrough: '2026-08-18',
    status: 'SUFFICIENT',
    reason: 'COVERAGE_REACHES_PAYMENT',
  }],
};

describe('consistência do produto financeiro live', () => {
  test('reprova resumo temporal stale depois que a conta foi recuperada', () => {
    const report = analyzeLiveFinancialConsistency(rawFixture(staleTemporal));

    expect(report.status).toBe('FAIL');
    expect(report.errors).toContain('TEMPORAL_SUMMARY_STALE');
  });

  test('aprova o mesmo caso quando cobertura temporal reflete a conta final recuperada', () => {
    const report = analyzeLiveFinancialConsistency(rawFixture(currentTemporal));

    expect(report.status).toBe('PASS');
    expect(report.errors).toEqual([]);
    expect(report.recoveredAccounts).toBe(1);
    expect(report.paymentsAfterBalanceReference).toBe(1);
  });
});
