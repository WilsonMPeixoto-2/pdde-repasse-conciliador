import { describe, expect, test } from 'vitest';
import { buildRefreshComparison } from '../../src/product/refresh-comparison';
import { humanPortfolioSchema, humanSchoolSchema } from '../../src/product/types';

function school(programmedCents: number, paymentInformedCents: number, accountingCount = 1) {
  return humanSchoolSchema.parse({
    fiscalYear: 2026,
    school: {
      inep: '33069247',
      sme: '0410001',
      name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CEC EMA NEGRAO DE LIMA',
      cnpj: '04500463000173',
    },
    programs: [{
      name: 'PDDE QUALIDADE',
      installments: [{
        installment: 'Sem divisão',
        programmedCents,
        paymentInformedCents,
        paymentInformedDate: paymentInformedCents > 0 ? '2026-08-05' : null,
        paymentOrderDate: null,
        account: null,
        creditEvidence: {
          status: 'Crédito ainda não localizado',
          date: null,
          amountCents: null,
          document: null,
        },
        note: null,
      }],
    }],
    accounts: [],
    registration: null,
    accountOpenings: [],
    suspensions: [],
    sourceCoverage: [{
      dataset: 'PDDEInfo · Abertura de Conta',
      status: 'UNAVAILABLE',
      detail: 'Fonte indisponível.',
    }],
    accounting: Array.from({ length: accountingCount }, (_, index) => ({
      program: `PDDE ${index + 1}`,
      status: 'ADIMPLENTE',
      paymentSuspended: false,
      expectedTotalCents: programmedCents,
    })),
    followUp: [],
  });
}

function portfolio(programmedCents: number, paymentInformedCents: number, reference = 'Posição financeira pública disponível até 31/07/2026') {
  return humanPortfolioSchema.parse({
    title: 'Inteligência Financeira PDDE | 4ª CRE',
    fiscalYear: 2026,
    referenceLabel: reference,
    schoolCount: 1,
    metrics: {
      schoolCount: 1,
      accountsTotal: 0,
      accountsWithPosition: 0,
      programmedCents,
      paymentInformedCents,
      creditLocatedCents: 0,
      reportedBalanceCents: null,
      applicationsCents: null,
    },
    sources: [],
    indicators: [],
    schools: [{
      inep: '33069247',
      sme: '0410001',
      name: 'EM EMA NEGRAO DE LIMA',
      programmedCents,
      paymentInformedCents,
      creditLocatedCents: 0,
      knownBalanceCents: null,
      referenceDate: null,
      accountsTotal: 0,
      accountsWithReferencePosition: 0,
      followUpCount: 0,
      paymentSuspended: false,
      repasseAccountMissing: paymentInformedCents > 0,
    }],
  });
}

describe('comparação da nova consulta', () => {
  test('explicita alteração financeira e preserva valores sem mudança', () => {
    const beforeSchool = school(100_000, 80_000, 1);
    const afterSchool = school(156_452, 80_000, 2);
    const comparison = buildRefreshComparison({
      beforePortfolio: portfolio(100_000, 80_000),
      beforeSchools: [beforeSchool],
      afterPortfolio: portfolio(156_452, 80_000),
      afterSchools: [afterSchool],
      generatedAt: '2026-09-03T13:00:00Z',
    });

    expect(comparison.metrics.find((item) => item.key === 'programmed')).toMatchObject({
      beforeCents: 100_000,
      afterCents: 156_452,
      deltaCents: 56_452,
      changed: true,
    });
    expect(comparison.metrics.find((item) => item.key === 'paymentInformed')).toMatchObject({
      deltaCents: 0,
      changed: false,
    });
    expect(comparison.counts.find((item) => item.key === 'accounting')).toMatchObject({
      before: 1,
      after: 2,
      delta: 1,
    });
    expect(comparison.referenceChanged).toBe(false);
    expect(comparison.financialChangedSchoolCount).toBe(1);
    expect(comparison.unavailableSourceObservations).toBe(1);
    expect(comparison.unavailableSourceSchoolCount).toBe(1);
    expect(comparison.unavailableSources).toEqual([{
      dataset: 'PDDEInfo · Abertura de Conta',
      observations: 1,
      schoolCount: 1,
    }]);
    expect(comparison.hasFinancialChange).toBe(true);
  });

  test('distingue consulta concluída sem alteração financeira', () => {
    const currentSchool = school(100_000, 80_000, 1);
    const comparison = buildRefreshComparison({
      beforePortfolio: portfolio(100_000, 80_000),
      beforeSchools: [currentSchool],
      afterPortfolio: portfolio(100_000, 80_000),
      afterSchools: [currentSchool],
      generatedAt: '2026-09-03T13:00:00Z',
    });

    expect(comparison.hasFinancialChange).toBe(false);
    expect(comparison.hasAnyChange).toBe(false);
    expect(comparison.metrics.every((item) => !item.changed)).toBe(true);
  });
});
