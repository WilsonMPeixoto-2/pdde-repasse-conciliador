import { describe, expect, it } from 'vitest';
import { derivePortfolioSchoolTriage } from '../../src/product/visual/portfolio-school-triage';

const base = {
  sme: '0410002',
  name: 'ESCOLA B',
  inep: '33069093',
  programmedCents: 1_000_000,
  paymentInformedCents: 500_000,
  creditLocatedCents: 500_000,
  knownBalanceCents: 31_000,
  referenceDate: '2026-06-30',
  accountsTotal: 2,
  accountsWithReferencePosition: 2,
  followUpCount: 0,
  paymentSuspended: false,
  repasseAccountMissing: false,
};

describe('derivePortfolioSchoolTriage', () => {
  it('prioriza suspensão de pagamento e mantém as demais evidências como razões', () => {
    const result = derivePortfolioSchoolTriage({
      ...base,
      paymentSuspended: true,
      repasseAccountMissing: true,
      followUpCount: 2,
      accountsWithReferencePosition: 1,
    });

    expect(result.status).toBe('suspended');
    expect(result.label).toBe('Pagamento suspenso');
    expect(result.needsAttention).toBe(true);
    expect(result.coverageRatio).toBe(0.5);
    expect(result.reasons).toContain('Há prestação com pagamento suspenso informado.');
    expect(result.reasons).toContain('Há repasse sem conta exibida.');
    expect(result.reasons).toContain('Cobertura de saldo: 1 de 2 contas na referência.');
  });

  it('distingue acompanhamento de simples cobertura parcial', () => {
    expect(derivePortfolioSchoolTriage({
      ...base,
      followUpCount: 1,
    }).status).toBe('attention');

    const partial = derivePortfolioSchoolTriage({
      ...base,
      accountsWithReferencePosition: 1,
    });
    expect(partial.status).toBe('partial');
    expect(partial.label).toBe('Cobertura parcial');
    expect(partial.needsAttention).toBe(true);
  });

  it('não inventa cobertura quando nenhuma conta foi apresentada', () => {
    const result = derivePortfolioSchoolTriage({
      ...base,
      accountsTotal: 0,
      accountsWithReferencePosition: 0,
      knownBalanceCents: null,
    });
    expect(result.status).toBe('no_accounts');
    expect(result.coverageRatio).toBeNull();
    expect(result.coverageLabel).toBe('Sem conta apresentada');
  });

  it('trata cobertura total sem apontamentos como leitura disponível', () => {
    const result = derivePortfolioSchoolTriage(base);
    expect(result.status).toBe('ready');
    expect(result.label).toBe('Leitura disponível');
    expect(result.needsAttention).toBe(false);
    expect(result.coverageRatio).toBe(1);
    expect(result.reasons).toEqual([]);
  });
});
