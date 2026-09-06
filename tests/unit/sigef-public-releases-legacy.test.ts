import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  buildSigefLegacyReleaseUrl,
  collectSigefPublicReleases,
} from '../../backend/adapters/sigef-public-releases';
import { parseSigefLegacyReleaseHtml } from '../../backend/adapters/sigef-legacy-releases-html';

const cnpj = '12.290.969/0001-23';
const legacyHtml = `
<html><body>
<table><tr>
<td><b>Entidade..: 12.290.969/0001-23 - CEC DA CRECHE MUNICIPAL MUSSUM- O TRAPALHAO</b></td>
<td><b>Município.: RIO DE JANEIRO - RJ</b></td>
</tr></table>
<table>
<tr><td colspan="9"><b>PDDE - PROGRAMA DINHEIRO DIRETO NA ESCOLA</b></td></tr>
<tr><td><b>Data Pgto</b></td><td><b>OB</b></td><td><b>Valor</b></td><td><b>Programa</b></td><td><b>Banco</b></td><td><b>Agência</b></td><td><b>C/C</b></td></tr>
<tr><td>30/ABR/2026</td><td>008035</td><td>2.145,00</td><td>PDDE - Básico - 1ª parcela</td><td>BANCO DO BRASIL</td><td>3101</td><td>0000024961</td></tr>
<tr><td colspan="2"><b>Total:</b></td><td><b>2.145,00</b></td><td colspan="5"></td></tr>
</table>
Dados referentes ao fechamento do dia: <b>05/09/2026</b>
</body></html>`;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('rota legada pública de Liberações FNDE/SIGEF', () => {
  test('monta a consulta direta por CNPJ sem depender do formulário intermediário', () => {
    const url = new URL(buildSigefLegacyReleaseUrl({
      cnpj,
      programCode: '02',
      fiscalYear: 2026,
    }));

    expect(`${url.origin}${url.pathname}`).toBe('https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_result_pc');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      p_ano: '2026',
      p_cgc: '12290969000123',
      p_municipio: '',
      p_programa: '02',
      p_tp_entidade: '',
      p_uf: '',
    });
  });

  test('normaliza o HTML legado real preservando OB, conta e fechamento da fonte', () => {
    const parsed = parseSigefLegacyReleaseHtml(legacyHtml, {
      fiscalYear: 2026,
      programCode: '02',
      targetCnpjs: [cnpj],
      sourceUrl: buildSigefLegacyReleaseUrl({ cnpj, programCode: '02', fiscalYear: 2026 }),
      queriedAt: '2026-09-06T15:03:09.000Z',
    });

    expect(parsed.entity).toEqual({
      cnpj: '12290969000123',
      name: 'CEC DA CRECHE MUNICIPAL MUSSUM- O TRAPALHAO',
      state: 'RJ',
      city: 'RIO DE JANEIRO',
    });
    expect(parsed.releases).toHaveLength(1);
    expect(parsed.releases[0]).toMatchObject({
      schoolCnpj: '12290969000123',
      fiscalYear: 2026,
      programCode: '02',
      actionCode: 'PDDE_BASICO',
      installmentCode: '1',
      amountCents: 214_500,
      paymentDate: '2026-04-30',
      orderBank: '008035',
      destinationAccount: { bank: '001', agency: '3101', number: '0000024961' },
    });
    expect(parsed.source).toMatchObject({
      source: 'SIGEF_LIBERACOES',
      queriedAt: '2026-09-06T15:03:09.000Z',
      coverageThrough: '2026-09-05',
    });
  });

  test('usa a rota legada somente quando a rota moderna falha', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes('/sigefweb/index.php/liberacoes/resultado-entidade/')) {
        return new Response('<html><body>resposta moderna inválida</body></html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
      if (href.includes('/pls/simad/internet_fnde.liberacoes_result_pc')) {
        return new Response(legacyHtml, {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        });
      }
      throw new Error(`URL inesperada: ${href}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await collectSigefPublicReleases({
      cnpj,
      programCode: '02',
      fiscalYear: 2026,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.route).toBe('legacy');
    expect(result.releases).toHaveLength(1);
    expect(result.releases[0]?.orderBank).toBe('008035');
    expect(result.source.coverageThrough).toBe('2026-09-05');
    expect(result.sourceUrl).toContain('/pls/simad/internet_fnde.liberacoes_result_pc');
  });
});
