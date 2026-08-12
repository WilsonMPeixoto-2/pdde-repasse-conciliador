import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';

const subjectUrl = new URL(
  '../../backend/application/assist-sigef-release-exports.ts',
  import.meta.url,
).href;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(
    (path) => rm(path, { recursive: true, force: true }),
  ));
});

async function temp(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-release-assist-'));
  temporaryDirectories.push(path);
  return path;
}

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function assist(options: Record<string, unknown>) {
  const module = await loadSubject();
  expect(module, 'o Assistente de Liberações ainda não foi implementado').not.toBeNull();
  if (!module) return null;
  return (module.assistSigefReleaseExports as Function)(options) as Promise<Record<string, any>>;
}

function pddeInfo(cnpj = '11111111000191', program = 'PDDE') {
  return {
    fetchedAt: '2026-08-12T08:00:00-03:00',
    schools: [{
      sme: '0431001',
      nome: 'ESCOLA TESTE',
      cnpj,
      accounts: [{ programa: program }],
      finance: [],
    }],
  };
}

function releaseHtml(options: {
  cnpj?: string;
  program?: string;
  date?: string;
  order?: string;
  amount?: string;
  queriedAt?: string;
  extraRows?: string;
} = {}): Buffer {
  const cnpj = (options.cnpj ?? '11111111000191').replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
  const row = `<tr><td>${options.date ?? '05/AGO/26'}</td><td>${options.order ?? '900001'}</td><td>${options.amount ?? '5.065,00'}</td><td>${options.program ?? 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026'}</td><td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr>`;
  return Buffer.from(`<!doctype html><html><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td>${cnpj}</td><td><b>Nome:</b></td><td>CAIXA TESTE</td></tr>
      <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
      <tr><td><b>Programa:</b></td><td>PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr>
      <tr><td><b>Ano:</b></td><td>2026</td></tr>
      <tr><td><b>Data da consulta:</b></td><td>${options.queriedAt ?? '12/08/2026 08:30:00'}</td></tr>
    </table>
    <div class="listagem"><table><thead><tr>
      <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th><th>Programa</th>
      <th>Banco</th><th>Agência</th><th>Conta Corrente</th>
    </tr></thead><tbody>${row}${options.extraRows ?? ''}</tbody></table></div>
  </body></html>`, 'latin1');
}

async function setup() {
  const root = await temp();
  const workspacePath = join(root, 'workspace');
  await mkdir(workspacePath);
  const pddeInfoPath = join(root, 'pddeinfo.json');
  await writeFile(pddeInfoPath, JSON.stringify(pddeInfo()), 'utf8');
  return { root, workspacePath, pddeInfoPath };
}

describe('assistSigefReleaseExports', () => {
  test('aceita nome arbitrário, preserva o original, gera canônico e é idempotente', async () => {
    const { workspacePath, pddeInfoPath } = await setup();
    const sourcePath = join(workspacePath, 'download (7).xls');
    const source = releaseHtml();
    await writeFile(sourcePath, source);

    const first = await assist({
      pddeInfoPath,
      workspacePath,
      fiscalYear: 2026,
      generatedAt: '2026-08-12T09:00:00-03:00',
    });

    expect(first?.summary).toMatchObject({ expectedPairs: 1, availablePairs: 1, missingPairs: 0 });
    expect(first?.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'IMPORTADO', cnpj: '11111111000191', programCode: '02' }),
    ]));
    const canonicalPath = join(workspacePath, 'liberacoes', '11111111000191__02.xls');
    expect(await readFile(canonicalPath)).toEqual(source);
    expect((await readdir(join(workspacePath, 'originais', '02'))).length).toBe(1);
    for (const code of ['02', '0A', '0B', 'Z9']) {
      expect(await readdir(join(workspacePath, 'originais', code))).toBeDefined();
    }

    const second = await assist({
      pddeInfoPath,
      workspacePath,
      fiscalYear: 2026,
      generatedAt: '2026-08-12T09:10:00-03:00',
    });
    expect(second?.summary).toMatchObject({ expectedPairs: 1, availablePairs: 1, missingPairs: 0 });
    expect(second?.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'DUPLICADO_EQUIVALENTE' }),
    ]));
    expect((await readdir(join(workspacePath, 'originais', '02'))).length).toBe(1);
  });

  test('não promove arquivo colocado em pasta de programa incompatível', async () => {
    const { workspacePath, pddeInfoPath } = await setup();
    const wrongFolder = join(workspacePath, '0B');
    await mkdir(wrongFolder);
    await writeFile(join(wrongFolder, 'qualquer.xls'), releaseHtml());

    const result = await assist({ pddeInfoPath, workspacePath, fiscalYear: 2026 });

    expect(result?.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'PASTA_INCORRETA', programCode: '02' }),
    ]));
    await expect(readFile(join(workspacePath, 'liberacoes', '11111111000191__02.xls'))).rejects.toThrow();
  });

  test('registra arquivo fora da carteira sem promovê-lo', async () => {
    const { workspacePath, pddeInfoPath } = await setup();
    await writeFile(join(workspacePath, 'outro.xls'), releaseHtml({ cnpj: '22222222000182' }));

    const result = await assist({ pddeInfoPath, workspacePath, fiscalYear: 2026 });

    expect(result?.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'FORA_DA_CARTEIRA', cnpj: '22222222000182' }),
    ]));
    expect(result?.summary).toMatchObject({ availablePairs: 0, missingPairs: 1 });
  });

  test('mantém o canônico quando surge uma exportação conflitante do mesmo par', async () => {
    const { workspacePath, pddeInfoPath } = await setup();
    const firstPath = join(workspacePath, 'primeiro.xls');
    const firstBytes = releaseHtml();
    await writeFile(firstPath, firstBytes);
    await assist({ pddeInfoPath, workspacePath, fiscalYear: 2026 });

    await writeFile(join(workspacePath, 'segundo.xls'), releaseHtml({
      order: '999999',
      amount: '7.000,00',
      queriedAt: '12/08/2026 09:30:00',
    }));
    const result = await assist({ pddeInfoPath, workspacePath, fiscalYear: 2026 });

    expect(result?.files).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'CONFLITO', cnpj: '11111111000191', programCode: '02' }),
    ]));
    expect(await readFile(join(workspacePath, 'liberacoes', '11111111000191__02.xls'))).toEqual(firstBytes);
  });
});
