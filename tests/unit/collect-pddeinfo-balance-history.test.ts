import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  collectPddeInfoPublicPortfolio,
  type PublicPortfolioFetchReport,
} from '../../backend/application/collect-pddeinfo-public-portfolio';

const school = { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' };

function coverage(month: string): string {
  const [mm] = month.split('-');
  return mm === '06' ? '2026-06-30' : '2026-05-31';
}

const fetchReport: PublicPortfolioFetchReport = async ({ filter }) => {
  if (filter.kind === 'ATTENDANCE') {
    const rows = [{
      Ano: '2026', 'Código Escola': school.inep, 'CNPJ Executora': '04.500.463/0001-73',
      'Nome Escola': school.nome, Programa: 'PDDE', Destinação: 'PDDE Básico - 1ª Parcela',
      'Valor Custeio': '837,00', 'Valor Capital': '3.348,00', 'Valor Total': '4.185,00',
      'Data da Ord. de Pagamento': '04/08/2026',
    }];
    return {
      kind: 'ATTENDANCE', headers: Object.keys(rows[0]), rows, via: 'HTTP',
      sourceUrl: 'https://example.test/attendance', queriedAt: '2026-08-15T23:00:00Z',
      html: '', rawBytes: Buffer.from('attendance'), httpStatus: 200, responseBytes: 10,
      coverageThrough: null,
    };
  }
  if (filter.kind === 'ACCOUNTING') {
    return {
      kind: 'ACCOUNTING', headers: [], rows: [], via: 'HTTP',
      sourceUrl: 'https://example.test/accounting', queriedAt: '2026-08-15T23:00:00Z',
      html: '', rawBytes: Buffer.from('accounting'), httpStatus: 200, responseBytes: 10,
      coverageThrough: null,
    };
  }
  if (filter.kind === 'BALANCE') {
    const value = filter.month === '06-2026' ? '3.186,99' : '4.000,00';
    const rows = [{
      CNPJ: '04.500.463/0001-73', Banco: '001', Agência: '0249', Conta: '0000546402',
      'Saldo Conta': '0,00', 'Saldo Fundos': value, 'Saldo Poupança': '0,00',
      'Saldo RDB/CDB': '0,00', 'Descrição Programa FNDE': 'PDDE QUALIDADE',
    }];
    return {
      kind: 'BALANCE', headers: Object.keys(rows[0]), rows, via: 'HTTP',
      sourceUrl: `https://example.test/balance/${filter.month}`,
      queriedAt: '2026-08-15T23:00:00Z', html: '', rawBytes: Buffer.from(filter.month),
      httpStatus: 200, responseBytes: filter.month.length, coverageThrough: coverage(filter.month),
    };
  }
  throw new Error('relatório inesperado');
};

describe('backfill de saldos PDDEInfo 2026', () => {
  it('consulta todos os meses de 2026 anunciados pela fonte e preserva a série', async () => {
    const result = await collectPddeInfoPublicPortfolio({
      schools: [school],
      fiscalYear: 2026,
      fetchReport,
      balanceMode: 'ALL_AVAILABLE_2026',
      discoverBalanceMonths: async () => ['06-2026', '05-2026', '12-2025'],
    });

    expect(result.balanceReferenceMonth).toBe('06-2026');
    expect(result.coverageThrough).toBe('2026-06-30');
    expect(result.balances.map((item) => [item.coverageThrough, item.fundBalanceCents])).toEqual([
      ['2026-05-31', 400000],
      ['2026-06-30', 318699],
    ]);
    expect(result.artifacts.filter((item) => item.kind === 'BALANCE')).toHaveLength(2);
  });
});
