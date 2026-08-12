import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/sigef-releases-html.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function releaseHtml(rows: string, headers = `
  <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th>
  <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th>
`) {
  return `<!doctype html><html><head><meta charset="iso-8859-1"></head><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td colspan="3">48.425.714/0001-78</td><td><b>Nome:</b></td><td>APM EXEMPLO</td></tr>
      <tr><td><b>UF:</b></td><td>SP</td><td><b>Município:</b></td><td>PEREIRA BARRETO</td></tr>
      <tr><td colspan="9"><b>Programa:</b> PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr>
      <tr><td colspan="9"><b>Data da consulta:</b> 11/08/2026 23:35:26</td></tr>
    </table>
    <div class="listagem"><table>
      <thead><tr>${headers}</tr></thead>
      <tbody>${rows}<tr><td></td><th>Total:</th><td><b>22.640,00</b></td><td></td><td></td><td></td><td></td></tr></tbody>
    </table></div>
  </body></html>`;
}

const basicRows = `
  <tr><td>21/SET/18</td><td>826912</td><td>11.320,00</td><td>PDDE - MANUTENÇÃO ESCOLAR - 2ª PARCELA 2018</td><td>BANCO DO BRASIL</td><td>0440</td><td>000023835X</td></tr>
  <tr><td>09/MAI/18</td><td>808533</td><td>11.320,00</td><td>PDDE - Manutenção Escolar -1ª parcela 2018</td><td>BANCO DO BRASIL</td><td>0440</td><td>000023835X</td></tr>
`;

async function parse(html: string, extraOptions: Record<string, unknown> = {}) {
  const subject = await loadSubject();
  expect(subject, 'o adaptador de Liberações ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.parseSigefReleaseHtml).toBeTypeOf('function');
  return (subject.parseSigefReleaseHtml as (
    source: Uint8Array,
    options: Record<string, unknown>,
  ) => Record<string, unknown>)(Buffer.from(html, 'latin1'), {
    fiscalYear: 2018,
    programCode: '02',
    targetCnpjs: ['48425714000178'],
    sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes/exemplo',
    ...extraOptions,
  });
}

describe('parseSigefReleaseHtml', () => {
  test('interpreta o XLS-HTML oficial, inclusive acentos e identificadores com zeros à esquerda', async () => {
    const result = await parse(releaseHtml(basicRows));

    expect(result).toMatchObject({
      entity: {
        cnpj: '48425714000178',
        name: 'APM EXEMPLO',
        state: 'SP',
        city: 'PEREIRA BARRETO',
      },
      source: {
        source: 'SIGEF_LIBERACOES',
        status: 'available',
        queriedAt: '2026-08-11T23:35:26-03:00',
        coverageThrough: '2026-08-11',
      },
      statistics: { releaseRows: 2 },
    });

    expect(result?.releases).toEqual([
      expect.objectContaining({
        schoolCnpj: '48425714000178',
        fiscalYear: 2018,
        programCode: '02',
        programName: 'PDDE',
        actionCode: 'PDDE_BASICO',
        installmentCode: '2',
        amountCents: 1_132_000,
        paymentDate: '2018-09-21',
        orderBank: '826912',
        destinationAccount: { bank: '001', agency: '0440', number: '000023835X' },
        sourceReference: expect.objectContaining({
          source: 'SIGEF_LIBERACOES',
          rawProgram: 'PDDE - MANUTENÇÃO ESCOLAR - 2ª PARCELA 2018',
        }),
      }),
      expect.objectContaining({
        installmentCode: '1',
        paymentDate: '2018-05-09',
        orderBank: '808533',
      }),
    ]);
  });

  test('aceita a coluna Parcela quando o SIGEF a inclui', async () => {
    const headers = `
      <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th><th>Parcela</th>
      <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th>
    `;
    const row = '<tr><td>05/AGO/26</td><td>900001</td><td>5.065,00</td><td>001</td><td>MANUTENÇÃO ESCOLAR - PDDE ED. BÁSICA</td><td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr>';

    const result = await parse(releaseHtml(row, headers), { fiscalYear: 2026 });

    expect(result?.releases).toEqual([
      expect.objectContaining({
        installmentCode: '1',
        amountCents: 506_500,
        paymentDate: '2026-08-05',
      }),
    ]);
  });

  test('rejeita arquivo de entidade fora da relação autorizada', async () => {
    await expect(parse(releaseHtml(basicRows), {
      targetCnpjs: ['00000000000000'],
    })).rejects.toThrow(/CNPJ.*não pertence/i);
  });

  test('rejeita mudança de cabeçalho obrigatório', async () => {
    const invalidHeaders = `
      <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th>
      <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Desconhecida</th>
    `;

    await expect(parse(releaseHtml(basicRows, invalidHeaders))).rejects.toThrow(/Conta Corrente/i);
  });

  test('rejeita descrição financeira ainda não mapeada', async () => {
    const unknownRow = '<tr><td>05/AGO/26</td><td>900001</td><td>5.065,00</td><td>AÇÃO DESCONHECIDA</td><td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr>';

    await expect(parse(releaseHtml(unknownRow), { fiscalYear: 2026 })).rejects.toThrow(/programa.*não mapeado/i);
  });
});
