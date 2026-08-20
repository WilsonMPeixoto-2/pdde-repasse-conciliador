import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { SchoolContent } from '../../src/product/pages/SchoolPage';
import { humanSchoolSchema } from '../../src/product/types';

const missingCredit = 'Há pagamento informado no PDDEInfo sem crédito compatível localizado nesta coleta.';
const sourceUnavailable = 'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.';

const school = humanSchoolSchema.parse({
  fiscalYear: 2026,
  school: {
    inep: '33069247',
    sme: '0410001',
    name: 'EM EMA NEGRAO DE LIMA',
    uex: 'CEC EMA NEGRAO DE LIMA',
    cnpj: '01872287000102',
  },
  programs: [{
    name: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      programmedCents: 100_000,
      paymentInformedCents: 100_000,
      paymentInformedDate: '2026-08-04',
      paymentOrderDate: null,
      account: { bank: '001', agency: '0249', number: '0000549797' },
      creditEvidence: {
        status: 'Crédito não localizado', date: null, amountCents: null, document: null,
      },
      note: null,
    }],
  }],
  accounts: [],
  accounting: [],
  followUp: [missingCredit, sourceUnavailable],
});

describe('integração da leitura operacional no prontuário', () => {
  it('mostra a síntese uma vez antes dos detalhes e elimina a lateral duplicada', () => {
    const html = renderToStaticMarkup(createElement(
      MemoryRouter,
      null,
      createElement(SchoolContent, { school }),
    ));

    expect(html).toContain('Leitura rápida desta escola');
    expect(html).toContain('Programas e parcelas');
    expect(html).toContain('Contas, aplicações e evolução');
    expect(html.indexOf('Leitura rápida desta escola')).toBeLessThan(html.indexOf('Programas e parcelas'));
    expect(html.match(/Leitura rápida desta escola/g)).toHaveLength(1);
    expect(html).not.toContain('O que merece atenção');
    expect(html).not.toContain('sidebar-sticky');
    expect(html.match(new RegExp(sourceUnavailable, 'g'))).toHaveLength(1);
  });
});
