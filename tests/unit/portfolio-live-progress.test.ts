import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../src/product/PortfolioContext', () => ({
  usePortfolio: () => ({
    status: 'ready',
    source: 'published',
    refreshing: true,
    refreshError: null,
    refreshProgress: {
      completed: 40,
      total: 163,
      succeeded: 40,
      failed: 0,
    },
    liveGeneratedAt: null,
    refreshLive: async () => undefined,
    loadSchool: async () => { throw new Error('não usado neste teste'); },
    data: {
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      referenceLabel: 'Posição financeira pública disponível 31/07/2026',
      schoolCount: 163,
      metrics: {
        schoolCount: 163,
        accountsTotal: 0,
        accountsWithPosition: 0,
        programmedCents: 0,
        paymentInformedCents: 0,
        creditLocatedCents: 0,
        reportedBalanceCents: null,
        applicationsCents: null,
      },
      sources: [],
      indicators: [],
      schools: [],
    },
  }),
}));

vi.mock('../../src/product/components/FinancialTaskLinks', () => ({ FinancialTaskLinks: () => null }));
vi.mock('../../src/product/components/GlobalSchoolFinder', () => ({ GlobalSchoolFinder: () => null }));
vi.mock('../../src/product/components/IndicatorLink', () => ({ IndicatorLink: () => null }));
vi.mock('../../src/product/components/MetricValue', () => ({ MetricValue: () => null }));
vi.mock('../../src/product/components/PortfolioExecutiveOverview', () => ({ PortfolioExecutiveOverview: () => null }));
vi.mock('../../src/product/components/SourceInfo', () => ({ SourceInfo: () => null }));

import { PortfolioPage } from '../../src/product/pages/PortfolioPage';

describe('progresso visual da nova consulta', () => {
  test('mostra barra semântica, percentual e contagem de unidades durante a atualização', () => {
    const html = renderToStaticMarkup(createElement(PortfolioPage));

    expect(html).toContain('<progress');
    expect(html).toContain('value="40"');
    expect(html).toContain('max="163"');
    expect(html).toContain('25%');
    expect(html).toContain('40 de 163 unidades concluídas');
  });
});
