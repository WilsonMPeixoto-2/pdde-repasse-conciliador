import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { assistSigefReleaseExports } from '../../backend/application/assist-sigef-release-exports';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(
    (path) => rm(path, { recursive: true, force: true }),
  ));
});

function row(date: string, order: string, amount: string): string {
  return `<tr><td>${date}</td><td>${order}</td><td>${amount}</td><td>PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026</td><td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr>`;
}

function releaseHtml(queriedAt: string, rows: string): Buffer {
  return Buffer.from(`<!doctype html><html><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td>11.111.111/0001-91</td><td><b>Nome:</b></td><td>CAIXA TESTE</td></tr>
      <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
      <tr><td><b>Programa:</b></td><td>PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr>
      <tr><td><b>Ano:</b></td><td>2026</td></tr>
      <tr><td><b>Data da consulta:</b></td><td>${queriedAt}</td></tr>
    </table>
    <div class="listagem"><table><thead><tr>
      <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th><th>Programa</th>
      <th>Banco</th><th>Agência</th><th>Conta Corrente</th>
    </tr></thead><tbody>${rows}</tbody></table></div>
  </body></html>`, 'latin1');
}

describe('atualização monotônica do Assistente de Liberações', () => {
  test('substitui o canônico somente quando consulta posterior preserva todos os registros e acrescenta novos', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-release-update-'));
    temporaryDirectories.push(root);
    const workspacePath = join(root, 'workspace');
    await mkdir(workspacePath);
    const pddeInfoPath = join(root, 'pddeinfo.json');
    await writeFile(pddeInfoPath, JSON.stringify({
      schools: [{
        sme: '0431001',
        nome: 'ESCOLA TESTE',
        cnpj: '11111111000191',
        accounts: [{ programa: 'PDDE' }],
        finance: [],
      }],
    }));

    const first = releaseHtml(
      '12/08/2026 08:30:00',
      row('05/AGO/26', '900001', '5.065,00'),
    );
    await writeFile(join(workspacePath, 'primeira.xls'), first);
    await assistSigefReleaseExports({ pddeInfoPath, workspacePath, fiscalYear: 2026 });

    const second = releaseHtml(
      '12/08/2026 09:30:00',
      row('05/AGO/26', '900001', '5.065,00')
        + row('12/AGO/26', '900002', '1.000,00'),
    );
    await writeFile(join(workspacePath, 'segunda.xls'), second);
    const result = await assistSigefReleaseExports({
      pddeInfoPath,
      workspacePath,
      fiscalYear: 2026,
    });

    expect(result.files).toEqual(expect.arrayContaining([
      expect.objectContaining({
        status: 'ATUALIZADO',
        cnpj: '11111111000191',
        programCode: '02',
      }),
    ]));
    expect(await readFile(join(workspacePath, 'liberacoes', '11111111000191__02.xls')))
      .toEqual(second);
    expect(result.coverage[0]).toMatchObject({ status: 'DISPONIVEL', records: 2 });
  });
});
