import { describe, expect, test } from 'vitest';
import {
  buildSigefPublicStatementUrl,
  classifySigefMovement,
  decodeSigefHtml,
  formatSigefAccount,
  parseSigefPublicPage,
} from '../../backend/adapters/sigef-public-statement';

const url = 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0249/contacorrente/000056267X/cnpj/01226403000116/programa/02/data/012026';
const identity = '<table><tr><th>CNPJ</th><td>01.226.403/0001-16</td><th>Razão Social</th><td>CEC JOAO</td></tr><tr><th>Banco</th><td>001 - Banco do Brasil</td><th>Agência</th><td>0249</td></tr><tr><th>Conta Corrente</th><td>000056267X</td><th>Programa</th><td>02 - PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr></table>';
const header = '<tr><th>Data</th><th>Crédito</th><th>Débito</th><th>Documento</th><th>Histórico</th><th>CNPJ Beneficiário</th><th>Razão Social</th><th>Banco Beneficiário</th><th>Agência Beneficiário</th><th>Conta Corrente Beneficiário</th></tr>';
const orderRow = '<tr><td>03/05/2026</td><td>8.575,00</td><td>0</td><td>00000001974995000787</td><td>ORDEM BANCARIA</td><td>01.226.403/0001-16</td><td>CEC JOAO</td><td>001</td><td>0249</td><td>000056267X</td></tr>';
const applicationRow = '<tr><td>03/05/2026</td><td>0</td><td>8.575,00</td><td>1972</td><td>BB-APLIC C.PRZ-APL.AUT</td><td>-</td><td>-</td><td>-</td><td>-</td><td>-</td></tr>';
const html = `<html><body><h1>SIGEF Extrato Conta Corrente</h1>${identity}<table>${header}${orderRow}${applicationRow}</table><div>Exibindo de 1 até 2 de 12</div> <a href="${url}/page/2">2</a></body></html>`;
const expected = {
  cnpj: '01226403000116',
  programCode: '02',
  account: { bank: '001', agency: '0249', number: '000056267X' },
};

describe('SIGEF Extrato público', () => {
  test('preserva X e monta URL determinística', () => {
    expect(formatSigefAccount('56.267-X')).toBe('000056267X');
    expect(buildSigefPublicStatementUrl({
      cnpj: '01.226.403/0001-16',
      programCode: '02',
      account: { bank: '1', agency: '249', number: '56.267-X' },
      startYear: 2026,
    })).toBe(url);
  });

  test('parsing, classificação e paginação', () => {
    const result = parseSigefPublicPage(html, url, expected);
    expect(result.declaredTotal).toBe(12);
    expect(result.pageUrls).toContain(`${url}/page/2`);
    expect(result.movements[0]).toMatchObject({
      amountCents: 857_500,
      classification: 'REPASSE_FNDE',
      movementDate: '2026-05-03',
    });
    expect(result.movements[1].classification).toBe('APLICACAO_FINANCEIRA');
  });

  test('preserva duas linhas idênticas da própria fonte', () => {
    const duplicateHtml = `<html><body><h1>SIGEF Extrato Conta Corrente</h1>${identity}<table>${header}${orderRow}${orderRow}</table></body></html>`;
    const result = parseSigefPublicPage(duplicateHtml, url, expected);
    expect(result.movements).toHaveLength(2);
    expect(result.movements[0].id).not.toBe(result.movements[1].id);
    expect(result.movements.map((movement) => movement.amountCents)).toEqual([857_500, 857_500]);
  });

  test('classifica históricos observados no extrato real sem confundir estorno, tarifa e uso', () => {
    expect(classifySigefMovement('credit', 'RENDIMENTO APLICACAO')).toBe('RENDIMENTO_FINANCEIRO');
    expect(classifySigefMovement('credit', 'ESTORNO RESGATE AUTOMATICO')).toBe('ESTORNO_REVERSAO');
    expect(classifySigefMovement('credit', 'ESTORNO DE TARIFA')).toBe('ESTORNO_REVERSAO');
    expect(classifySigefMovement('debit', 'TARIFA DE DEVOLUCAO DE CHEQUE')).toBe('TARIFA_BANCARIA');
    expect(classifySigefMovement('debit', 'CHEQUE COMPENSADO')).toBe('PAGAMENTO_TRANSFERENCIA');
    expect(classifySigefMovement('debit', 'PAGAMENTO DE BOLETO')).toBe('PAGAMENTO_TRANSFERENCIA');
    expect(classifySigefMovement('debit', 'TED TRANSF.ELETR.DISPONIVEL')).toBe('PAGAMENTO_TRANSFERENCIA');
    expect(classifySigefMovement('credit', 'DEPOSITO ONLINE')).toBe('ENTRADA_TERCEIRO');
    expect(classifySigefMovement('credit', 'TRANSFERENCIA RECEBIDA')).toBe('ENTRADA_TERCEIRO');
  });

  test('decodifica Windows-1252 legado', () => {
    const bytes = Buffer.from('SIGEF Extrato Conta Corrente Cr\xe9dito D\xe9bito Raz\xe3o Social', 'latin1');
    expect(decodeSigefHtml(bytes, null)).toContain('Crédito');
  });
});
