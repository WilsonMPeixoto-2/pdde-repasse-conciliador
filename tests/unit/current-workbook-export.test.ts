import { describe, expect, test } from 'vitest';
import { buildCurrentWorkbookView } from '../../src/product/export-workbook';
import { humanPortfolioSchema, humanSchoolSchema } from '../../src/product/types';

function school(inep: string, sme: string, name: string) {
  return humanSchoolSchema.parse({
    fiscalYear: 2026,
    school: {
      inep,
      sme,
      name,
      uex: `UEx ${name}`,
      cnpj: '00000000000000',
    },
    programs: [],
    accounts: [],
    accounting: [],
    followUp: [],
  });
}

function summary(inep: string, sme: string, name: string) {
  return {
    inep,
    sme,
    name,
    programmedCents: 0,
    paymentInformedCents: 0,
    creditLocatedCents: 0,
    knownBalanceCents: null,
    referenceDate: null,
    accountsTotal: 0,
    accountsWithReferencePosition: 0,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  };
}

describe('exportação da planilha do retrato financeiro atual', () => {
  const schoolA = school('33000001', '0431001', 'Escola A');
  const schoolB = school('33000002', '0431002', 'Escola B');
  const portfolio = humanPortfolioSchema.parse({
    title: 'Inteligência Financeira PDDE | 4ª CRE',
    fiscalYear: 2026,
    referenceLabel: 'Posição de saldo público ainda não disponível para 2026',
    schoolCount: 2,
    metrics: {
      schoolCount: 2,
      accountsTotal: 0,
      accountsWithPosition: 0,
      programmedCents: 0,
      paymentInformedCents: 0,
      creditLocatedCents: 0,
      reportedBalanceCents: null,
      applicationsCents: null,
    },
    sources: [{ name: 'PDDEInfo', information: 'Fonte pública utilizada nesta consulta.' }],
    indicators: [],
    schools: [
      summary('33000002', '0431002', 'Escola B'),
      summary('33000001', '0431001', 'Escola A'),
    ],
  });

  test('gera o read model do Excel com as mesmas unidades e a mesma ordem visível no portfólio', () => {
    const view = buildCurrentWorkbookView(portfolio, [schoolA, schoolB]);

    expect(view.title).toBe(portfolio.title);
    expect(view.referenceLabel).toBe(portfolio.referenceLabel);
    expect(view.metrics).toEqual(portfolio.metrics);
    expect(view.schools.map((item) => item.school.inep)).toEqual(['33000002', '33000001']);
    expect(view.schools.every((item) => !('fiscalYear' in item))).toBe(true);
  });

  test('bloqueia exportação quando a cobertura escolar está incompleta', () => {
    expect(() => buildCurrentWorkbookView(portfolio, [schoolA]))
      .toThrow(/cobertura escolar está incompleta/i);
  });
});
