import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { GlobalSchoolFinder } from '../../src/product/components/GlobalSchoolFinder';
import { FinancialTaskLinks } from '../../src/product/components/FinancialTaskLinks';

const schools = [
  {
    inep: '33012345', sme: '0431015', name: 'EM Ministro Afrânio Costa',
    programmedCents: 0, paymentInformedCents: 0, creditLocatedCents: 0,
    knownBalanceCents: null, referenceDate: null, accountsTotal: 0,
    accountsWithReferencePosition: 0, paymentSuspended: false,
    repasseAccountMissing: false, followUpCount: 0,
  },
];

function render(node: ReturnType<typeof createElement>) {
  return renderToStaticMarkup(createElement(MemoryRouter, null, node));
}

describe('encontrabilidade da página inicial', () => {
  test.each(['Afrânio', '04.31.015', '0431015', '33012345'])('localiza escola por %s', (query) => {
    const html = render(createElement(GlobalSchoolFinder, { schools, initialQuery: query }));
    expect(html).toContain('EM Ministro Afrânio Costa');
    expect(html).toContain('href="/unidades/33012345"');
  });

  test('informa o total real quando a Home limita a quantidade visível', () => {
    const manySchools = Array.from({ length: 8 }, (_, index) => ({
      ...schools[0],
      inep: `3301234${index}`,
      sme: `04310${String(index).padStart(2, '0')}`,
      name: `EM Escola Municipal ${index + 1}`,
    }));
    const html = render(createElement(GlobalSchoolFinder, {
      schools: manySchools,
      initialQuery: 'Escola Municipal',
      maxResults: 6,
    }));

    expect(html).toContain('6 de 8 resultados');
    expect(html.match(/class="global-school-finder__result"/g)?.length).toBe(6);
  });

  test('expõe atalhos operacionais para dados básicos', () => {
    const html = render(createElement(FinancialTaskLinks));
    expect(html).toContain('Ver repasses');
    expect(html).toContain('Ver saldos e contas');
    expect(html).toContain('Ver todas as escolas');
  });
});
