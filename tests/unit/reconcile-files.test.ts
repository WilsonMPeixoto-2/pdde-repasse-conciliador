import { mkdtemp, readFile, rm, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, test } from 'vitest';
import { reconcileFiles } from '../../backend/application/reconcile-files';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(
    (path) => rm(path, { recursive: true, force: true }),
  ));
});

async function temporaryDirectory(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-reconcile-files-'));
  temporaryDirectories.push(path);
  return path;
}

const school = {
  inep: '33000001',
  sme: '0410001',
  nome: 'EM Exemplo',
  denominacaoFnde: '0410001 EM EXEMPLO',
  uex: 'CAIXA ESCOLAR EM EXEMPLO',
  cnpj: '12.345.678/0001-90',
  accounts: [{
    programa: 'PDDE', banco: '001', agencia: '0249', conta: '00012345X',
    saldo: '5.065,00', ocorrencia: '',
  }],
  finance: [{
    destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
    devidoCusteio: '4.000,00', devidoCapital: '1.000,00', devidoTotal: '5.000,00',
    ajusteCusteio: '50,00', ajusteCapital: '15,00', ajusteTotal: '65,00',
    finalDevidoTotal: '5.065,00', pagoCusteio: '4.050,00', pagoCapital: '1.015,00',
    pagoTotal: '5.065,00', data: '05/08/2026',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/exemplo',
  sourceIdentity: {
    inep: '33000001', sme: '0410001', denominacao: '0410001 EM EXEMPLO',
  },
};

const movementHeader = [
  'OPERACAO', 'CO_PROGRAMA_FNDE', 'NO_PROGRAMA_FNDE', 'TP_PAGAMENTO',
  'TP_BENEFICIARIO', 'NU_BANCO', 'NU_BANCO_BENEF', 'TP_MOVIMENTACAO',
  'NU_AGENCIA', 'NU_AGENCIA_BENEF', 'TP_FINALIDADE_PAGTO', 'NU_CONTA_CORRENTE',
  'NU_CONTA_CORRENTE_BENEF', 'DT_EXTRACAO', 'DT_MOVIMENTO', 'NU_SEQ_CONTA_CORRENTE',
  'VL_MOVIMENTO', 'VL_SALDO_DISPONIVEL', 'NU_CNPJ', 'NU_CNPJ_BENEF',
  'NU_CPF_BENEF', 'NU_DOCUMENTO', 'DS_HISTORICO',
].join(';');

const movementRow = [
  'C', '02', 'PROGRAMA DINHEIRO DIRETO NA ESCOLA', '', '2', '001', '001', '632',
  '0249', '0249', '', '00012345X', '00012345X', '12-AUG-26', '05-AUG-26',
  '99', '5065', '5065', '12345678000190', '12345678000190', '', '900001',
  'ORDEM BANCARIA',
].join(';');

function releaseHtml(): Buffer {
  return Buffer.from(`<!doctype html><html><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td>12.345.678/0001-90</td><td><b>Nome:</b></td><td>CAIXA ESCOLAR EM EXEMPLO</td></tr>
      <tr><td><b>UF:</b></td><td>RJ</td><td><b>Município:</b></td><td>RIO DE JANEIRO</td></tr>
      <tr><td><b>Data da consulta:</b></td><td>12/08/2026 08:30:00</td></tr>
    </table>
    <div class="listagem"><table>
      <thead><tr><th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th>
        <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th></tr></thead>
      <tbody><tr><td>05/AGO/26</td><td>900001</td><td>5.065,00</td>
        <td>PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026</td><td>BANCO DO BRASIL</td>
        <td>0249</td><td>00012345X</td></tr></tbody>
    </table></div>
  </body></html>`, 'latin1');
}

describe('reconcileFiles', () => {
  test('executa ponta a ponta usando uma pasta de Liberações e relata sua cobertura', async () => {
    const root = await temporaryDirectory();
    const releasesPath = join(root, 'releases');
    await mkdir(releasesPath);
    const pddeInfoPath = join(root, 'pddeinfo.json');
    const movementsPath = join(root, 'movements.csv');
    const outputPath = join(root, 'result.xlsx');
    await writeFile(pddeInfoPath, JSON.stringify({
      fetchedAt: '2026-08-12T08:00:00-03:00', schools: [school],
    }), 'utf8');
    await writeFile(movementsPath, `${movementHeader}\n${movementRow}\n`, 'utf8');
    await writeFile(join(releasesPath, '12345678000190__02.xls'), releaseHtml());

    const result = await reconcileFiles({
      pddeInfoPath,
      movementsPath,
      releaseDirectoryPath: releasesPath,
      outputPath,
      fiscalYear: 2026,
      requestedThrough: '2026-08-12',
      generatedAt: '2026-08-12T09:00:00-03:00',
    });

    expect(result.releases).toEqual({
      mode: 'directory',
      exports: 1,
      records: 1,
      expectedPairs: 1,
      importedPairs: 1,
      missingPairs: [],
    });
    expect(result.reconciliation).toMatchObject({ total: 1, confirmed: 1, inconclusive: 0 });
    expect(result.workbookAudit).toEqual({ sheets: 3, rows: 1, exceptions: 0, columns: 53 });
    expect((await readFile(outputPath)).subarray(0, 2).toString('hex')).toBe('504b');
  });
});
