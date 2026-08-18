import { describe, expect, test } from 'vitest';
import { parseSigefReleaseHtml } from '../../backend/adapters/sigef-releases-html';

describe('Liberações SIGEF com marcação atual', () => {
  test('localiza metadados e tabela financeira sem depender de ids, classes, thead ou th', () => {
    const html = `<!doctype html><html><head><meta charset="iso-8859-1"></head><body>
      <table class="dados-entidade">
        <tr><td><b>CNPJ:</b></td><td>01.856.391/0001-03</td><td><b>Nome:</b></td><td>CEC ESCOLA A</td></tr>
        <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
        <tr><td><b>Data da consulta:</b></td><td>18/08/2026 13:45:00</td></tr>
      </table>
      <table class="resultado-atual">
        <tbody>
          <tr><td>Data de Pagamento</td><td>Ordem Bancária</td><td>Valor</td><td>Programa</td><td>Banco</td><td>Agência</td><td>Conta Corrente</td></tr>
          <tr><td>05/AGO/26</td><td>900001</td><td>10.235,00</td><td>PDDE - 1ª parc. 2026</td><td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr>
        </tbody>
      </table>
    </body></html>`;

    const result = parseSigefReleaseHtml(Buffer.from(html, 'latin1'), {
      fiscalYear: 2026,
      programCode: '02',
      targetCnpjs: ['01856391000103'],
      sourceUrl: 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes/resultado-entidade/ano/2026/programa/02/cnpj/01856391000103',
    });

    expect(result.entity).toEqual({
      cnpj: '01856391000103',
      name: 'CEC ESCOLA A',
      state: 'RJ',
      city: 'RIO DE JANEIRO',
    });
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]).toMatchObject({
      amountCents: 1_023_500,
      actionCode: 'PDDE_BASICO',
      installmentCode: '1',
      destinationAccount: { bank: '001', agency: '0249', number: '00012345X' },
    });
  });
});
