import { describe, expect, test, vi } from 'vitest';
import {
  buildSigefPublicStatementExportUrl,
  collectSigefPublicAccount,
  parseSigefPublicExport,
} from '../../backend/adapters/sigef-public-statement';

const account = { bank: '001', agency: '0249', number: '0000549789' };
const cnpj = '04.500.463/0001-73';
const expected = { cnpj: '04500463000173', programCode: '02', account };
const exportUrl = 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel/banco/001/agencia/0249/contacorrente/0000549789/cnpj/04500463000173/programa/02/data/012026';

const header = '<tr><th>Data</th><th>Crédito</th><th>Débito</th><th>Documento</th><th>Histórico</th><th>CNPJ Beneficiário</th><th>Razão Social</th><th>Banco Beneficiário</th><th>Agência Beneficiário</th><th>Conta Corrente Beneficiário</th></tr>';
const mayRow = '<tr><td>28/05/2026</td><td>4.185,00</td><td>0</td><td>000000111</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO</td><td>001</td><td>1607</td><td>0997380845</td></tr>';
const augustRow = '<tr><td>05/08/2026</td><td>4.185,00</td><td>0</td><td>000000222</td><td>ORDEM BANCARIA</td><td>00.378.257/0001-81</td><td>FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO</td><td>001</td><td>1607</td><td>0997380845</td></tr>';
const exportHtml = `<html><body><h1>SIGEF - SISTEMA INTEGRADO DE GESTÃO FINANCEIRA</h1><table><tr><th>CNPJ:</th><td>${cnpj}</td><th>Nome:</th><td>CEC EMA NEGRAO DE LIMA</td></tr><tr><th>Programa:</th><td>PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr></table><table>${header}${mayRow}${augustRow}</table></body></html>`;

const primaryMovement = {
  id: 'primary-may',
  schoolCnpj: '04500463000173',
  programCode: '02',
  operation: 'credit' as const,
  amountCents: 418_500,
  movementDate: '2026-05-28',
  account,
  document: '000000111',
  history: 'ORDEM BANCARIA',
  classification: 'REPASSE_FNDE' as const,
  counterparty: {
    document: '00378257000181',
    name: 'FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO',
    bank: '001',
    agency: '1607',
    account: '0997380845',
  },
  sourceUrl: 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento',
};

function primary(coverageThrough = '2026-05-28') {
  return vi.fn(async () => ({
    status: 'COMPLETE' as const,
    pagesFetched: 1,
    declaredTotal: 1,
    movements: [primaryMovement],
    coverageThrough,
  }));
}

function exportFetcher() {
  return vi.fn(async () => ({
    html: exportHtml,
    rawBytes: Buffer.from(exportHtml, 'utf8'),
  }));
}

describe('fallback público SIGEF via visualizaexcel', () => {
  test('monta URL determinística da exportação por conta', () => {
    expect(buildSigefPublicStatementExportUrl({
      cnpj,
      programCode: '02',
      account,
      startYear: 2026,
      startMonth: 1,
    })).toBe(exportUrl);
  });

  test('interpreta a exportação usando a identidade forte da conta solicitada', () => {
    const parsed = parseSigefPublicExport(exportHtml, exportUrl, expected);

    expect(parsed.movements).toHaveLength(2);
    expect(parsed.movements.map((movement) => movement.movementDate)).toEqual([
      '2026-05-28',
      '2026-08-05',
    ]);
    expect(parsed.movements.every((movement) => movement.account.number === account.number)).toBe(true);
    expect(parsed.movements.every((movement) => movement.sourceUrl === exportUrl)).toBe(true);
  });

  test('não consulta exportação quando a rota principal já cobre a data necessária', async () => {
    const collectPrimary = primary('2026-08-05');
    const fetchExport = exportFetcher();

    const result = await collectSigefPublicAccount({
      cnpj,
      programCode: '02',
      account,
      startYear: 2026,
      startMonth: 1,
      requiredThrough: '2026-08-05',
      collectPrimary,
      fetchExport,
    });

    expect(collectPrimary).toHaveBeenCalledTimes(1);
    expect(fetchExport).not.toHaveBeenCalled();
    expect(result.coverageThrough).toBe('2026-08-05');
  });

  test('usa exportação quando a rota principal fica atrás e deduplica sobreposição', async () => {
    const collectPrimary = primary('2026-05-28');
    const fetchExport = exportFetcher();

    const result = await collectSigefPublicAccount({
      cnpj,
      programCode: '02',
      account,
      startYear: 2026,
      startMonth: 1,
      requiredThrough: '2026-08-05',
      collectPrimary,
      fetchExport,
    });

    expect(collectPrimary).toHaveBeenCalledTimes(1);
    expect(fetchExport).toHaveBeenCalledTimes(1);
    expect(result.coverageThrough).toBe('2026-08-05');
    expect(result.movements).toHaveLength(2);
    expect(result.movements.map((movement) => movement.movementDate)).toEqual([
      '2026-05-28',
      '2026-08-05',
    ]);
  });

  test('falha complementar não apaga o resultado primário nem fabrica cobertura', async () => {
    const collectPrimary = primary('2026-05-28');
    const fetchExport = vi.fn(async () => {
      throw new Error('fonte complementar indisponível');
    });

    const result = await collectSigefPublicAccount({
      cnpj,
      programCode: '02',
      account,
      startYear: 2026,
      requiredThrough: '2026-08-05',
      collectPrimary,
      fetchExport,
    });

    expect(result.status).toBe('COMPLETE');
    expect(result.coverageThrough).toBe('2026-05-28');
    expect(result.movements).toEqual([primaryMovement]);
    expect(result.supplementalExport).toMatchObject({
      attempted: true,
      failure: 'fonte complementar indisponível',
    });
  });
});
