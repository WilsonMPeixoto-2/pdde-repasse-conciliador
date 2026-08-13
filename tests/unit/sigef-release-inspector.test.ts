import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/sigef-release-inspector.ts', import.meta.url).href;

async function subject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function html(program: string, date = '05/AGO/26', cnpj = '11.111.111/0001-91'): Buffer {
  return Buffer.from(`<!doctype html><html><body>
  <table id="filtros">
    <tr><td><b>CNPJ:</b></td><td>${cnpj}</td><td><b>Nome:</b></td><td>CAIXA TESTE</td></tr>
    <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
    <tr><td><b>Programa:</b></td><td>PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr>
    <tr><td><b>Data da consulta:</b></td><td>12/08/2026 08:30:00</td></tr>
  </table>
  <div class="listagem"><table><thead><tr>
    <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th><th>Programa</th>
    <th>Banco</th><th>Agência</th><th>Conta Corrente</th>
  </tr></thead><tbody><tr>
    <td>${date}</td><td>900001</td><td>5.065,00</td><td>${program}</td>
    <td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td>
  </tr></tbody></table></div></body></html>`, 'latin1');
}

async function inspect(source: Buffer, fiscalYear = 2026) {
  const module = await subject();
  expect(module, 'o inspetor ainda não foi implementado').not.toBeNull();
  if (!module) return null;
  return (module.inspectSigefReleaseHtml as Function)(source, { fiscalYear });
}

describe('inspectSigefReleaseHtml', () => {
  test.each([
    ['02', 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026'],
    ['0A', 'PDDE EQUIDADE - PDDE SRM 2026'],
    ['0B', 'PDDE QUALIDADE - EDUCAÇÃO CONECTADA 2026'],
    ['Z9', 'PDDE EDUCAÇÃO INTEGRAL - MAIS EDUCAÇÃO 2026'],
  ])('detecta o programa %s', async (programCode, rawProgram) => {
    expect(await inspect(html(rawProgram))).toMatchObject({
      cnpj: '11111111000191',
      programCode,
      query: { date: '2026-08-12' },
      fiscalYear: { requested: 2026, verified: true },
    });
  });

  test('rejeita exercício divergente', async () => {
    await expect(inspect(html('PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2025', '05/AGO/25')))
      .rejects.toThrow(/exerc[ií]cio/i);
  });

  test('rejeita CNPJ ausente ou inválido', async () => {
    await expect(inspect(html('PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026', '05/AGO/26', 'SEM CNPJ')))
      .rejects.toThrow(/CNPJ/i);
  });
});
