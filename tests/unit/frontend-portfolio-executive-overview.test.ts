import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PortfolioExecutiveOverview } from '../../src/product/components/PortfolioExecutiveOverview';
import type { HumanPortfolio } from '../../src/product/types';

const portfolio: HumanPortfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  schoolCount: 3,
  metrics: {
    schoolCount: 3,
    accountsTotal: 4,
    accountsWithPosition: 3,
    programmedCents: 3_000_000,
    paymentInformedCents: 1_500_000,
    creditLocatedCents: 1_200_000,
    reportedBalanceCents: 500_000,
    applicationsCents: 400_000,
  },
  sources: [{ name: 'PDDEInfo', information: 'Fonte pública de repasses.' }],
  indicators: [],
  schools: [
    {
      sme: '0410001', name: 'EM PRIORIDADE', inep: '33000001',
      programmedCents: 1_000_000, paymentInformedCents: 500_000, creditLocatedCents: 400_000,
      knownBalanceCents: 200_000, referenceDate: '2026-06-30',
      accountsTotal: 1, accountsWithReferencePosition: 1,
      followUpCount: 0, paymentSuspended: true, repasseAccountMissing: false,
    },
    {
      sme: '0410002', name: 'EM COBERTURA', inep: '33000002',
      programmedCents: 1_000_000, paymentInformedCents: 500_000, creditLocatedCents: 400_000,
      knownBalanceCents: 300_000, referenceDate: '2026-06-30',
      accountsTotal: 2, accountsWithReferencePosition: 1,
      followUpCount: 0, paymentSuspended: false, repasseAccountMissing: false,
    },
    {
      sme: '0410003', name: 'EM REGULAR', inep: '33000003',
      programmedCents: 1_000_000, paymentInformedCents: 500_000, creditLocatedCents: 400_000,
      knownBalanceCents: 0, referenceDate: '2026-06-30',
      accountsTotal: 1, accountsWithReferencePosition: 1,
      followUpCount: 0, paymentSuspended: false, repasseAccountMissing: false,
    },
  ],
};

describe('PortfolioExecutiveOverview', () => {
  it('renderiza fluxo financeiro, cobertura e prioridades sem reduzir os estágios a um percentual', () => {
    const tree = createElement(
      MemoryRouter,
      null,
      createElement(PortfolioExecutiveOverview, { portfolio }),
    );
    const html = renderToStaticMarkup(tree);

    expect(html).toContain('Leitura executiva da carteira');
    expect(html).toContain('Fluxo de evidência financeira');
    expect(html).toContain('Previsto em 2026');
    expect(html).toContain('Pagamento informado');
    expect(html).toContain('Crédito localizado');
    expect(html).toContain('Cobertura da carteira');
    expect(html).toContain('2 unidades com atenção');
    expect(html).toContain('1 com cobertura incompleta');
    expect(html).toContain('Prioridades do momento');
    expect(html).toContain('EM PRIORIDADE');
    expect(html).toContain('EM COBERTURA');
    expect(html).toContain('/unidades/33000001');
    expect(html).not.toContain('percentual de execução');
    expect(html).not.toContain('score');
  });

  it('transforma os números agregados em entradas operacionais para seus subconjuntos', () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(PortfolioExecutiveOverview, { portfolio }),
    ));

    expect(html).toContain('href="/unidades?filtro=atencao"');
    expect(html).toContain('href="/unidades?filtro=cobertura"');
    expect(html).toContain('href="/unidades?status=suspended"');
    expect(html).toContain('href="/unidades?status=partial"');
    expect(html).toContain('href="/unidades?status=ready"');
  });
});
