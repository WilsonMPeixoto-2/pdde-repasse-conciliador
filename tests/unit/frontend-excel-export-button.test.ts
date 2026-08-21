import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ExcelExportButton } from '../../src/product/components/ExcelExportButton';

describe('exportação Excel da carteira financeira', () => {
  it('expõe uma ação visível para baixar o workbook oficial publicado', () => {
    const html = renderToStaticMarkup(createElement(ExcelExportButton));

    expect(html).toContain('Gerar visualização em arquivo Excel');
    expect(html).toContain('href="/data/inteligencia-financeira-pdde-4cre-2026.xlsx"');
    expect(html).toContain('download="inteligencia-financeira-pdde-4cre-2026.xlsx"');
    expect(html).toContain('excel-export-button');
  });
});
