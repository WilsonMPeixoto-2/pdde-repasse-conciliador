import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test, vi } from 'vitest';

const loadSchool = vi.fn(async () => { throw new Error('não deve carregar prontuário'); });

vi.mock('../../src/product/PortfolioContext', () => ({
  usePortfolio: () => ({
    status: 'ready',
    source: 'published',
    refreshing: false,
    refreshError: null,
    refreshProgress: null,
    liveGeneratedAt: null,
    refreshLive: async () => undefined,
    loadSchool,
    data: {
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      referenceLabel: 'Posição financeira pública disponível 31/07/2026',
      schoolCount: 1,
      metrics: {
        schoolCount: 1,
        accountsTotal: 2,
        accountsWithPosition: 1,
        programmedCents: 100000,
        paymentInformedCents: 80000,
        creditLocatedCents: 70000,
        reportedBalanceCents: 30000,
        applicationsCents: null,
      },
      sources: [],
      indicators: [],
      schools: [{
        inep: '33000001',
        sme: '04.31.001',
        name: 'EM Escola Teste',
        programmedCents: 100000,
        paymentInformedCents: 80000,
        creditLocatedCents: 70000,
        knownBalanceCents: 30000,
        referenceDate: '2026-07-31',
        accountsTotal: 2,
        accountsWithReferencePosition: 1,
        paymentSuspended: false,
        repasseAccountMissing: false,
        followUpCount: 0,
      }],
    },
  }),
}));

import { AppHeader } from '../../src/product/components/AppHeader';
import { RepasseOverviewPage } from '../../src/product/pages/RepasseOverviewPage';
import { BalancesOverviewPage } from '../../src/product/pages/BalancesOverviewPage';

function renderWithRouter(node: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, node));
}

describe('navegação financeira direta', () => {
  test('cabeçalho expõe os quatro destinos principais', () => {
    const html = renderWithRouter(createElement(AppHeader));
    expect(html).toContain('Início');
    expect(html).toContain('Escolas');
    expect(html).toContain('Repasses');
    expect(html).toContain('Saldos e contas');
    expect(html).toContain('href="/repasses"');
    expect(html).toContain('href="/saldos"');
  });

  test('visões consolidadas usam a carteira sem carregar prontuários individuais', () => {
    const repasses = renderWithRouter(createElement(RepasseOverviewPage));
    const saldos = renderWithRouter(createElement(BalancesOverviewPage));

    expect(repasses).toContain('Repasses 2026');
    expect(repasses).toContain('EM Escola Teste');
    expect(saldos).toContain('Saldos e contas 2026');
    expect(saldos).toContain('EM Escola Teste');
    expect(loadSchool).not.toHaveBeenCalled();
  });
});
