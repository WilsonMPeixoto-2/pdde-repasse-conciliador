import { readFileSync } from 'node:fs';
import { load } from 'cheerio';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, test } from 'vitest';
import {
  deriveSectionNavScrollState,
  SchoolSectionNav,
} from '../../src/product/components/SchoolSectionNav';

function render(
  hasMovements: boolean,
  hasAccounting: boolean,
  initialEntry = '/unidades/33069093',
) {
  return renderToStaticMarkup(createElement(
    MemoryRouter,
    { initialEntries: [initialEntry] },
    createElement(SchoolSectionNav, { hasMovements, hasAccounting }),
  ));
}

describe('navegação local do prontuário', () => {
  test('sempre oferece resumo, repasses e contas e saldos', () => {
    const html = render(false, false);
    expect(html).toContain('href="#resumo"');
    expect(html).toContain('href="#cadastro"');
    expect(html).toContain('href="#repasses"');
    expect(html).toContain('href="#contas-saldos"');
    expect(html).toContain('href="#pendencias"');
    expect(html).not.toContain('href="#movimentacoes"');
    expect(html).not.toContain('href="#prestacao-contas"');
  });

  test('oferece seções condicionais somente quando há conteúdo', () => {
    const html = render(true, true);
    expect(html).toContain('href="#movimentacoes"');
    expect(html).toContain('href="#prestacao-contas"');
  });

  test('considera o resumo como seção atual quando a URL não possui fragmento', () => {
    const $ = load(render(true, true));

    expect($('a[href="#resumo"]').attr('aria-current')).toBe('location');
    expect($('a[aria-current="location"]')).toHaveLength(1);
  });

  test('marca como atual a seção indicada pelo fragmento da URL', () => {
    const $ = load(render(true, true, '/unidades/33069093#movimentacoes'));

    expect($('a[href="#movimentacoes"]').attr('aria-current')).toBe('location');
    expect($('a[href="#resumo"]').attr('aria-current')).toBeUndefined();
  });

  test('oferece controles acessíveis associados à faixa rolável', () => {
    const $ = load(render(true, true));
    const navId = $('nav[aria-label="Seções do prontuário financeiro"]').attr('id');
    const previous = $('button[aria-label="Ver seções anteriores"]');
    const next = $('button[aria-label="Ver próximas seções"]');

    expect(navId).toBeTruthy();
    expect(previous.attr('aria-controls')).toBe(navId);
    expect(next.attr('aria-controls')).toBe(navId);
    expect(previous.is('[hidden]')).toBe(true);
    expect(next.is('[hidden]')).toBe(true);
  });

  test('deriva os controles disponíveis no início, meio e fim da rolagem', () => {
    expect(deriveSectionNavScrollState({ scrollLeft: 0, clientWidth: 320, scrollWidth: 700 })).toEqual({
      canScrollBackward: false,
      canScrollForward: true,
    });
    expect(deriveSectionNavScrollState({ scrollLeft: 200, clientWidth: 320, scrollWidth: 700 })).toEqual({
      canScrollBackward: true,
      canScrollForward: true,
    });
    expect(deriveSectionNavScrollState({ scrollLeft: 380, clientWidth: 320, scrollWidth: 700 })).toEqual({
      canScrollBackward: true,
      canScrollForward: false,
    });
  });

  test('prontuário possui alvos únicos e abre a conta que contém movimentações quando necessário', () => {
    const pageSource = readFileSync('src/product/pages/SchoolPage.tsx', 'utf8');
    const summarySource = readFileSync('src/product/components/SchoolOperationalSummary.tsx', 'utf8');
    expect(summarySource).toContain('id="resumo"');
    expect(pageSource).toContain('id="cadastro"');
    expect(pageSource).toContain('id="repasses"');
    expect(pageSource).toContain('id="contas-saldos"');
    expect(pageSource).toContain("? 'movimentacoes' : undefined");
    expect(pageSource).toContain('id="pendencias"');
    expect(pageSource).toContain('id="prestacao-contas"');
    expect(pageSource).toContain("hash === '#movimentacoes'");
    expect(pageSource).toContain('accountIndex === firstMovementAccountIndex');
  });
});
