import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';

const subjectUrl = new URL(
  '../../backend/application/load-sigef-release-exports.ts',
  import.meta.url,
).href;

const temporaryDirectories: string[] = [];

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(temporaryDirectories.splice(0).map(
    (path) => rm(path, { recursive: true, force: true }),
  ));
});

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-releases-'));
  temporaryDirectories.push(path);
  return path;
}

function releaseHtml(options: {
  cnpj: string;
  program: string;
  amount?: string;
  orderBank?: string;
}): Buffer {
  const cnpj = options.cnpj.replace(
    /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
    '$1.$2.$3/$4-$5',
  );
  return Buffer.from(`<!doctype html><html><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td>${cnpj}</td><td><b>Nome:</b></td><td>CAIXA ESCOLAR TESTE</td></tr>
      <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
      <tr><td><b>Data da consulta:</b></td><td>12/08/2026 08:30:00</td></tr>
    </table>
    <div class="listagem"><table>
      <thead><tr>
        <th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th>
        <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th>
      </tr></thead>
      <tbody><tr>
        <td>05/AGO/26</td><td>${options.orderBank ?? '900001'}</td>
        <td>${options.amount ?? '5.065,00'}</td><td>${options.program}</td>
        <td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td>
      </tr></tbody>
    </table></div>
  </body></html>`, 'latin1');
}

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function load(rawOptions: Record<string, unknown>) {
  const subject = await loadSubject();
  expect(subject, 'o carregador em lote de Liberações ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.loadSigefReleaseExports).toBeTypeOf('function');
  return (subject.loadSigefReleaseExports as (
    options: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>)(rawOptions);
}

const expectedPairs = [
  { cnpj: '11111111000191', programCode: '02' },
  { cnpj: '22222222000182', programCode: '0B' },
  { cnpj: '33333333000173', programCode: '0A' },
];

describe('loadSigefReleaseExports', () => {
  test('carrega a pasta por nome determinístico e informa a cobertura faltante', async () => {
    const directoryPath = await temporaryDirectory();
    await writeFile(join(directoryPath, '22222222000182__0B.xls'), releaseHtml({
      cnpj: '22222222000182',
      program: 'PDDE QUALIDADE - EDUCAÇÃO CONECTADA 2026',
      orderBank: '900002',
    }));
    await writeFile(join(directoryPath, '11111111000191__02.xls'), releaseHtml({
      cnpj: '11111111000191',
      program: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    }));

    const result = await load({ fiscalYear: 2026, expectedPairs, directoryPath });

    expect(result).toMatchObject({
      mode: 'directory',
      coverage: {
        expectedPairs: 3,
        importedPairs: 2,
        missingPairs: [{ cnpj: '33333333000173', programCode: '0A' }],
      },
    });
    expect((result?.exports as Array<{ entity: { cnpj: string } }>).map(
      (item) => item.entity.cnpj,
    )).toEqual(['11111111000191', '22222222000182']);
  });

  test('rejeita quando o CNPJ interno diverge do nome do arquivo', async () => {
    const directoryPath = await temporaryDirectory();
    await writeFile(join(directoryPath, '11111111000191__02.xls'), releaseHtml({
      cnpj: '22222222000182',
      program: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    }));

    await expect(load({ fiscalYear: 2026, expectedPairs, directoryPath }))
      .rejects.toThrow(/CNPJ.*arquivo/i);
  });

  test('rejeita XLS mal nomeado em vez de ignorá-lo silenciosamente', async () => {
    const directoryPath = await temporaryDirectory();
    await writeFile(join(directoryPath, 'liberacoes.xls'), releaseHtml({
      cnpj: '11111111000191',
      program: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    }));

    await expect(load({ fiscalYear: 2026, expectedPairs, directoryPath }))
      .rejects.toThrow(/CNPJ__PROGRAMA\.xls/i);
  });

  test('rejeita pasta vazia e par que não pertence à carteira', async () => {
    const emptyDirectory = await temporaryDirectory();
    await expect(load({ fiscalYear: 2026, expectedPairs, directoryPath: emptyDirectory }))
      .rejects.toThrow(/nenhum arquivo \.xls/i);

    const unexpectedDirectory = await temporaryDirectory();
    await writeFile(join(unexpectedDirectory, '99999999000100__02.xls'), releaseHtml({
      cnpj: '99999999000100',
      program: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    }));
    await expect(load({
      fiscalYear: 2026,
      expectedPairs,
      directoryPath: unexpectedDirectory,
    })).rejects.toThrow(/não pertence à carteira/i);
  });

  test('preserva o manifesto e rejeita duas entradas do mesmo par', async () => {
    const root = await temporaryDirectory();
    const exportsPath = join(root, 'exports');
    await mkdir(exportsPath);
    const filePath = join(exportsPath, 'primeiro.xls');
    await writeFile(filePath, releaseHtml({
      cnpj: '11111111000191',
      program: 'PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    }));
    const manifestPath = join(root, 'manifest.json');
    const entry = {
      path: './exports/primeiro.xls',
      programCode: '02',
      sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes/primeiro',
    };
    await writeFile(manifestPath, JSON.stringify([entry, entry]), 'utf8');

    await expect(load({ fiscalYear: 2026, expectedPairs, manifestPath }))
      .rejects.toThrow(/duplicad[ao]/i);
  });
});
