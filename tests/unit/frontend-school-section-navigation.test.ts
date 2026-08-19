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
    const source = readFileSync('src/product/pages/SchoolPage.tsx', 'utf8');
    expect(source).toContain('id="resumo"');
    expect(source).toContain('id="repasses"');
    expect(source).toContain('id="contas-saldos"');
    expect(source).toContain("? 'movimentacoes' : undefined");
    expect(source).toContain('id="prestacao-contas"');
    expect(source).toContain("hash === '#movimentacoes'");
    expect(source).toContain('accountIndex === firstMovementAccountIndex');
  });
});
