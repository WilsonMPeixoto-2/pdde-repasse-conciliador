import { Readable } from 'node:stream';
import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/sigef-movements-csv.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const header = [
  'OPERACAO',
  'CO_PROGRAMA_FNDE',
  'NO_PROGRAMA_FNDE',
  'TP_PAGAMENTO',
  'TP_BENEFICIARIO',
  'NU_BANCO',
  'NU_BANCO_BENEF',
  'TP_MOVIMENTACAO',
  'NU_AGENCIA',
  'NU_AGENCIA_BENEF',
  'TP_FINALIDADE_PAGTO',
  'NU_CONTA_CORRENTE',
  'NU_CONTA_CORRENTE_BENEF',
  'DT_EXTRACAO',
  'DT_MOVIMENTO',
  'NU_SEQ_CONTA_CORRENTE',
  'VL_MOVIMENTO',
  'VL_SALDO_DISPONIVEL',
  'NU_CNPJ',
  'NU_CNPJ_BENEF',
  'NU_CPF_BENEF',
  'NU_DOCUMENTO',
  'DS_HISTORICO',
].join(';');

const targetCnpj = '12345678000190';

const rows = [
  [
    'C', '02', 'PROGRAMA DINHEIRO DIRETO NA ESCOLA ', '', '2', '001', '001', '632',
    '0249', '0249', '', '000012345X', '000012345X', '25-FEB-26', '05-AUG-26',
    '99', '3000', '3000', targetCnpj, targetCnpj, '', '00000202608050000001', 'ORDEM BANCARIA',
  ].join(';'),
  [
    'C', '02', 'PROGRAMA DINHEIRO DIRETO NA ESCOLA ', '', '2', '001', '001', '632',
    '0249', '0249', '', '000012345X', '000012345X', '25-FEB-26', '05-AUG-26',
    '99', '2065.00', '5065', targetCnpj, targetCnpj, '', '00000202608050000001', 'ORDEM BANCARIA',
  ].join(';'),
  [
    'D', '02', 'PROGRAMA DINHEIRO DIRETO NA ESCOLA ', '', '2', '001', '001', '144',
    '0249', '0000', '', '000012345X', '0000000000', '25-FEB-26', '06-AUG-26',
    '99', '100.1', '4964.9', targetCnpj, '', '', '00000000000000010201', 'TRANSFERENCIA ENVIADA',
  ].join(';'),
  [
    'C', '02', 'PROGRAMA DINHEIRO DIRETO NA ESCOLA ', '', '2', '001', '001', '632',
    '0307', '1607', '', '0000107662', '0997380845', '25-FEB-26', '31-MAY-26',
    '88', '37.31', '37.31', '99999999000199', '88888888000188', '', '00000007121933000000', 'ORDEM BANCARIA',
  ].join(';'),
];

function chunkedCsv(csv: string): Readable {
  const bytes = Buffer.from(csv, 'utf8');
  return Readable.from([
    bytes.subarray(0, 17),
    bytes.subarray(17, 113),
    bytes.subarray(113, 521),
    bytes.subarray(521),
  ]);
}

async function parse(csv: string, options: Record<string, unknown>) {
  const subject = await loadSubject();
  expect(subject, 'o adaptador do CSV do SIGEF ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.parseSigefMovementCsv).toBeTypeOf('function');
  return await (subject.parseSigefMovementCsv as (
    source: AsyncIterable<Uint8Array>,
    value: Record<string, unknown>,
  ) => Promise<Record<string, unknown>>)(chunkedCsv(csv), options);
}

describe('parseSigefMovementCsv', () => {
  test('lê o contrato oficial em fluxo e preserva identificadores bancários como texto', async () => {
    const result = await parse(`${header}\n${rows.join('\n')}\n`, {
      targetCnpjs: [targetCnpj],
      programCodes: ['02'],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    });

    expect(result).toMatchObject({
      source: {
        source: 'SIGEF_MOVIMENTACOES',
        status: 'available',
        queriedAt: '2026-08-11T23:30:00-03:00',
        coverageThrough: '2026-08-06',
      },
      statistics: {
        rowsRead: 4,
        targetRows: 3,
        creditRows: 2,
        debitRows: 1,
        requestedThrough: '2026-08-31',
        coverageLagDays: 25,
      },
    });

    expect(result?.movements).toEqual([
      expect.objectContaining({
        schoolCnpj: targetCnpj,
        programCode: '02',
        operation: 'credit',
        amountCents: 300_000,
        movementDate: '2026-08-05',
        account: { bank: '001', agency: '0249', number: '000012345X' },
        document: '00000202608050000001',
        history: 'ORDEM BANCARIA',
      }),
      expect.objectContaining({
        operation: 'credit',
        amountCents: 206_500,
      }),
      expect.objectContaining({
        operation: 'debit',
        amountCents: 10_010,
      }),
    ]);
  });

  test('usa a maior data nacional para medir a cobertura mesmo sem movimento da UEx nessa data', async () => {
    const csv = `${header}\n${rows[0]}\n${rows[3]}\n`;
    const result = await parse(csv, {
      targetCnpjs: [targetCnpj],
      programCodes: ['02'],
      queriedAt: '2026-06-01T08:00:00-03:00',
      requestedThrough: '2026-05-31',
    });

    expect(result).toMatchObject({
      source: { coverageThrough: '2026-08-05' },
      statistics: { rowsRead: 2, targetRows: 1, coverageLagDays: 0 },
    });
  });

  test('rejeita alteração silenciosa de cabeçalhos obrigatórios', async () => {
    const invalidHeader = header.replace('NU_CNPJ', 'CNPJ_DESCONHECIDO');

    await expect(parse(`${invalidHeader}\n${rows[0]}\n`, {
      targetCnpjs: [targetCnpj],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    })).rejects.toThrow(/NU_CNPJ/);
  });

  test('rejeita data de cobertura civil impossível', async () => {
    await expect(parse(`${header}\n${rows[0]}\n`, {
      targetCnpjs: [targetCnpj],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-02-31',
    })).rejects.toThrow(/data ISO/i);
  });

  test('rejeita valor monetário inválido em registro pertencente à 4ª CRE', async () => {
    const invalidTargetRow = rows[0].replace(';3000;3000;', ';3.000,00;3000;');

    await expect(parse(`${header}\n${invalidTargetRow}\n`, {
      targetCnpjs: [targetCnpj],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    })).rejects.toThrow(/VL_MOVIMENTO/);
  });

  test('interpreta centavos sem zero inteiro conforme o formato real do SIGEF', async () => {
    const leadingDotRow = rows[0].replace(';3000;3000;', ';.06;.06;');
    const result = await parse(`${header}\n${leadingDotRow}\n`, {
      targetCnpjs: [targetCnpj],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    });

    expect(result?.movements).toEqual([
      expect.objectContaining({ amountCents: 6 }),
    ]);
  });

  test('retorna fonte disponível e sem cobertura quando o arquivo oficial não contém lançamentos', async () => {
    const result = await parse(`${header}\n`, {
      targetCnpjs: [targetCnpj],
      queriedAt: '2026-08-11T23:30:00-03:00',
      requestedThrough: '2026-08-31',
    });

    expect(result).toMatchObject({
      movements: [],
      source: { source: 'SIGEF_MOVIMENTACOES', status: 'available' },
      statistics: { rowsRead: 0, targetRows: 0, coverageLagDays: null },
    });
    expect((result?.source as Record<string, unknown>).coverageThrough).toBeUndefined();
  });
});
