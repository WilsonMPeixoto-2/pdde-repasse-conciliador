import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import { SchoolSectionNav } from '../../src/product/components/SchoolSectionNav';

function render(hasMovements: boolean, hasAccounting: boolean) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    null,
    createElement(SchoolSectionNav, { hasMovements, hasAccounting }),
  ));
}

describe('navegação local do prontuário', () => {
  test('sempre oferece resumo, repasses e contas e saldos', () => {
    const html = render(false, false);
    expect(html).toContain('href="#resumo"');
    expect(html).toContain('href="#repasses"');
    expect(html).toContain('href="#contas-saldos"');
    expect(html).not.toContain('href="#movimentacoes"');
    expect(html).not.toContain('href="#prestacao-contas"');
  });

  test('oferece seções condicionais somente quando há conteúdo', () => {
    const html = render(true, true);
    expect(html).toContain('href="#movimentacoes"');
    expect(html).toContain('href="#prestacao-contas"');
  });

  test('prontuário possui alvos únicos e abre a conta que contém movimentações quando necessário', () => {
    const pageSource = readFileSync('src/product/pages/SchoolPage.tsx', 'utf8');
    const summarySource = readFileSync('src/product/components/SchoolOperationalSummary.tsx', 'utf8');
    expect(summarySource).toContain('id="resumo"');
    expect(pageSource).toContain('id="repasses"');
    expect(pageSource).toContain('id="contas-saldos"');
    expect(pageSource).toContain("? 'movimentacoes' : undefined");
    expect(pageSource).toContain('id="prestacao-contas"');
    expect(pageSource).toContain("hash === '#movimentacoes'");
    expect(pageSource).toContain('accountIndex === firstMovementAccountIndex');
  });
});
