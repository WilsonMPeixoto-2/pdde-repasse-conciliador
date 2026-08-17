import { describe, expect, it } from 'vitest';
import type { HumanPortfolio, HumanPortfolioSchool } from '../../src/product/types';
import { derivePortfolioExecutiveSummary } from '../../src/product/visual/portfolio-executive-summary';

const baseSchool: HumanPortfolioSchool = {
  sme: '0410001',
  name: 'ESCOLA BASE',
  inep: '33000001',
  programmedCents: 1_000_000,
  paymentInformedCents: 500_000,
  creditLocatedCents: 450_000,
  knownBalanceCents: 31_000,
  referenceDate: '2026-06-30',
  accountsTotal: 2,
  accountsWithReferencePosition: 2,
  followUpCount: 0,
  paymentSuspended: false,
  repasseAccountMissing: false,
};

function school(
  inep: string,
  sme: string,
  overrides: Partial<HumanPortfolioSchool>,
): HumanPortfolioSchool {
  return {
    ...baseSchool,
    inep,
    sme,
    name: `ESCOLA ${sme}`,
    ...overrides,
  };
}

const schools: HumanPortfolioSchool[] = [
  school('33000005', '0410005', {}),
  school('33000004', '0410004', { accountsWithReferencePosition: 1 }),
  school('33000002', '0410002', { followUpCount: 2 }),
  school('33000001', '0410001', { paymentSuspended: true }),
  school('33000003', '0410003', {
    accountsTotal: 0,
    accountsWithReferencePosition: 0,
    knownBalanceCents: null,
    referenceDate: null,
  }),
];

const portfolio: HumanPortfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível em 30/06/2026',
  schoolCount: schools.length,
  metrics: {
    schoolCount: schools.length,
    accountsTotal: 8,
    accountsWithPosition: 7,
    programmedCents: 5_000_000,
    paymentInformedCents: 2_500_000,
    creditLocatedCents: 2_250_000,
    reportedBalanceCents: 124_000,
    applicationsCents: 100_000,
  },
  sources: [{ name: 'PDDEInfo', information: 'Fonte pública de repasses.' }],
  indicators: [],
  schools,
};

describe('derivePortfolioExecutiveSummary', () => {
  it('resume a carteira por estado e ordena somente unidades prioritárias', () => {
    const result = derivePortfolioExecutiveSummary(portfolio);

    expect(result.statusCounts).toEqual({
      suspended: 1,
      attention: 1,
      no_accounts: 1,
      partial: 1,
      ready: 1,
    });
    expect(result.attentionCount).toBe(4);
    expect(result.coverageIncompleteCount).toBe(2);
    expect(result.prioritySchools.map((item) => item.school.inep)).toEqual([
      '33000001',
      '33000002',
      '33000003',
      '33000004',
    ]);
    expect(result.prioritySchools.every((item) => item.triage.needsAttention)).toBe(true);
  });

  it('preserva os três estágios financeiros sem derivar percentual ou saldo entre eles', () => {
    const result = derivePortfolioExecutiveSummary(portfolio);

    expect(result.evidenceStages).toEqual([
      { key: 'programmed', label: 'Previsto em 2026', valueCents: 5_000_000 },
      { key: 'payment', label: 'Pagamento informado', valueCents: 2_500_000 },
      { key: 'credit', label: 'Crédito localizado', valueCents: 2_250_000 },
    ]);
  });

  it('mantém zero observado como zero', () => {
    const result = derivePortfolioExecutiveSummary({
      ...portfolio,
      metrics: {
        ...portfolio.metrics,
        paymentInformedCents: 0,
        creditLocatedCents: 0,
      },
    });

    expect(result.evidenceStages[1]?.valueCents).toBe(0);
    expect(result.evidenceStages[2]?.valueCents).toBe(0);
  });
});
