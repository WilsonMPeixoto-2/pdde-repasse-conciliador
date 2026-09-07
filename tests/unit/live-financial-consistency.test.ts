import { describe, expect, test } from 'vitest';
import { analyzeLiveFinancialConsistency } from '../../backend/application/verify-live-financial-consistency';

const recoveredAccount = { bank: '001', agency: '0249', number: '0000549789' };

const sourceObservations = [
  {
    source: 'PDDEINFO', collectionStatus: 'COMPLETE', collectedAt: '2026-08-18T13:00:00-03:00',
    observationBasis: 'QUERY_TIMESTAMP', observedThrough: null, observedLagDays: null,
    freshnessConclusion: 'NOT_INFERRED', metrics: { schoolsCollected: 1, failures: 0 },
  },
  {
    source: 'SIGEF_EXTRATO', collectionStatus: 'COMPLETE', collectedAt: '2026-08-18T13:01:00-03:00',
    observationBasis: 'LATEST_MOVEMENT_RETURNED', observedThrough: '2026-08-18', observedLagDays: 0,
    freshnessConclusion: 'NOT_INFERRED', metrics: { accountsQueried: 1, accountsComplete: 1, accountsPartial: 0, accountsFailed: 0, movementsInFiscalYear: 1 },
  },
  {
    source: 'SIGEF_LIBERACOES', collectionStatus: 'COMPLETE', collectedAt: '2026-08-18T13:01:00-03:00',
    observationBasis: 'LATEST_RELEASE_RETURNED', observedThrough: '2026-08-05', observedLagDays: 13,
    freshnessConclusion: 'NOT_INFERRED', metrics: { queriesAttempted: 1, queriesSucceeded: 1, queriesFailed: 0, releaseRows: 1, releaseMatches: 1, recoveredAccounts: 1, confirmedAccounts: 0, accountMismatches: 0, ambiguousMatches: 0, notFound: 0, errors: 0 },
  },
];

function rawFixture(temporal: unknown): any {
  return {
    sources: ['PDDEINFO', 'SIGEF_EXTRATO', 'SIGEF_LIBERACOES'],
    sourceObservations: structuredClone(sourceObservations),
    quality: { paymentTemporalCoverage: temporal }, coverage: { paymentTemporalCoverage: temporal },
    schools: [{
      inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC ESCOLA A', cnpj: '04.500.463/0001-73',
      repasses: [{ programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela', programadoCents: 418_500, pagoInformadoCents: 418_500, dataOrdem: '2026-08-05', account: recoveredAccount }],
      accounts: [{
        programCode: '02', programLabel: 'PDDE', account: recoveredAccount, saldoPddeInfoCents: null,
        status: 'COMPLETE', error: null, pagesFetched: 1, declaredTotal: 1, uniqueMovements: 1, movementsInYear: 1, coverageThrough: '2026-08-18', totals: {},
        movements: [{ id: 'credito-recuperado', schoolCnpj: '04500463000173', programCode: '02', operation: 'credit', amountCents: 418_500, movementDate: '2026-08-05', account: recoveredAccount, document: '019072', history: 'ORDEM BANCARIA', classification: 'REPASSE_FNDE', counterparty: { document: null, name: null, bank: null, agency: null, account: null }, sourceUrl: 'https://www.fnde.gov.br/sigefweb/extrato' }],
      }], unknownProgramAccounts: [],
    }],
    accountRecoveries: [{ schoolInep: '33069247', schoolCnpj: '04500463000173', programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela', amountCents: 418_500, status: 'RECOVERED', account: recoveredAccount, paymentDate: '2026-08-05', orderBank: '019072', sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes', error: null }],
    publicReports: { coverageThrough: '2026-07-31', balanceReferenceMonth: '07-2026', balances: [] },
  };
}

const staleTemporal = {
  status: 'UNKNOWN', evaluatedPaymentCount: 1, sufficientCount: 0, outOfCoverageCount: 0, unknownCount: 1,
  latestKnownPaymentDate: '2026-08-05', maxObservedCoverageThrough: null,
  rows: [{ schoolInep: '33069247', programCode: '02', paymentDate: '2026-08-05', coverageThrough: null, status: 'UNKNOWN', reason: 'STRONG_ACCOUNT_MISSING' }],
};

const currentTemporal = {
  status: 'SUFFICIENT', evaluatedPaymentCount: 1, sufficientCount: 1, outOfCoverageCount: 0, unknownCount: 0,
  latestKnownPaymentDate: '2026-08-05', maxObservedCoverageThrough: '2026-08-18',
  rows: [{ schoolInep: '33069247', programCode: '02', paymentDate: '2026-08-05', coverageThrough: '2026-08-18', status: 'SUFFICIENT', reason: 'COVERAGE_REACHES_PAYMENT' }],
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

  test('reprova fonte usada sem observação estruturada', () => {
    const raw = rawFixture(currentTemporal);
    raw.sourceObservations = raw.sourceObservations.filter((item: any) => item.source !== 'SIGEF_LIBERACOES');
    const report = analyzeLiveFinancialConsistency(raw);
    expect(report.status).toBe('FAIL');
    expect(report.errors).toContain('SOURCE_OBSERVATION_MISSING:SIGEF_LIBERACOES');
  });

  test('reprova observação de extrato congelada antes das contas recuperadas', () => {
    const raw = rawFixture(currentTemporal);
    raw.sourceObservations.find((item: any) => item.source === 'SIGEF_EXTRATO').metrics.accountsQueried = 0;
    const report = analyzeLiveFinancialConsistency(raw);
    expect(report.status).toBe('FAIL');
    expect(report.errors).toContain('SIGEF_STATEMENT_OBSERVATION_STALE:0:1');
  });
});
