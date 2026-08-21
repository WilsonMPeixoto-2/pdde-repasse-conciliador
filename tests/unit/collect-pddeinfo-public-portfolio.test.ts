import { Buffer } from 'node:buffer';
import { describe, expect, it } from 'vitest';
import {
  collectPddeInfoPublicPortfolio,
  type PublicPortfolioFetchReport,
} from '../../backend/application/collect-pddeinfo-public-portfolio';
import type {
  PddeInfoPublicReportKind,
  PddeInfoPublicReportResult,
} from '../../backend/adapters/pddeinfo-public-reports';

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' },
  { inep: '33069433', sme: '0410003', nome: 'EM RUY BARBOSA' },
];

function report(
  kind: PddeInfoPublicReportKind,
  rows: Array<Record<string, string>>,
  coverageThrough: string | null = null,
): PddeInfoPublicReportResult {
  return {
    kind,
    headers: Object.keys(rows[0] ?? {}),
    rows,
    via: 'HTTP',
    sourceUrl: `https://example.test/${kind.toLowerCase()}`,
    queriedAt: '2026-08-15T23:00:00.000Z',
    html: '<html></html>',
    rawBytes: Buffer.from('<html></html>'),
    httpStatus: 200,
    responseBytes: 13,
    coverageThrough,
  };
}

function attendanceRow(inep: string) {
  return {
    Ano: '2026',
    'Código Escola': inep,
    'CNPJ Executora': '04.500.463/0001-73',
    'Nome Escola': schools.find((school) => school.inep === inep)?.nome ?? inep,
    Programa: 'PDDE',
    Destinação: 'PDDE Básico - 1ª Parcela',
    'Valor Custeio': '837,00',
    'Valor Capital': '3.348,00',
    'Valor Total': '4.185,00',
    'Data da Ord. de Pagamento': '04/08/2026',
  };
}

const balanceRow = {
  CNPJ: '04.500.463/0001-73',
  Banco: '001',
  Agência: '0249',
  Conta: '0000546402',
  'Saldo Conta': '0,00',
  'Saldo Fundos': '3.186,99',
  'Saldo Poupança': '0,00',
  'Saldo RDB/CDB': '0,00',
  'Descrição Programa FNDE': 'PDDE QUALIDADE',
};

const accountingRow = {
  Ano: '2026',
  Programa: 'PDDE',
  'Código da Escola': '33069247',
  'CNPJ da Executora': '04.500.463/0001-73',
  'Situação Prestação de Contas UEx': 'Aguardando',
  'Suspensão de Pagamento UEx': 'Não',
  'Valor Total Previsto': '4.185,00',
};

describe('collectPddeInfoPublicPortfolio', () => {
  it('deduplica saldo por CNPJ, usa o mês mais recente descoberto e isola falha por fonte', async () => {
    const balanceCalls: string[] = [];
    const fetchReport: PublicPortfolioFetchReport = async ({ filter }) => {
      if (filter.kind === 'ATTENDANCE') return report('ATTENDANCE', [attendanceRow(filter.inep)]);
      if (filter.kind === 'ACCOUNTING') {
        if (filter.inep === '33069433') throw new Error('fonte indisponível para teste');
        return report('ACCOUNTING', [accountingRow]);
      }
      if (filter.kind === 'BALANCE') {
        balanceCalls.push(filter.cnpj);
        expect(filter.month).toBe('06-2026');
        return report('BALANCE', [balanceRow], '2026-06-30');
      }
      throw new Error(`relatório não esperado: ${filter.kind}`);
    };

    const result = await collectPddeInfoPublicPortfolio({
      schools,
      fiscalYear: 2026,
      fetchReport,
      discoverBalanceMonths: async () => ['06-2026', '05-2026'],
    });

    expect(result.attendance).toHaveLength(2);
    expect(result.accounting).toHaveLength(1);
    expect(result.balanceReferenceMonth).toBe('06-2026');
    expect(result.coverageThrough).toBe('2026-06-30');
    expect(balanceCalls).toEqual(['04500463000173']);
    expect(result.balances).toEqual([
      expect.objectContaining({
        uexCnpj: '04500463000173',
        schoolIneps: ['33069247', '33069433'],
        fundBalanceCents: 318699,
      }),
    ]);
    expect(result.failures).toEqual([
      expect.objectContaining({
        kind: 'ACCOUNTING',
        schoolInep: '33069433',
      }),
    ]);
  });

  it('não inventa mês de saldo quando a fonte não anuncia cobertura de 2026', async () => {
    const fetchReport: PublicPortfolioFetchReport = async ({ filter }) => {
      if (filter.kind === 'ATTENDANCE') return report('ATTENDANCE', [attendanceRow(filter.inep)]);
      if (filter.kind === 'ACCOUNTING') return report('ACCOUNTING', []);
      throw new Error('saldo não deveria ser consultado');
    };

    const result = await collectPddeInfoPublicPortfolio({
      schools: [schools[0]],
      fiscalYear: 2026,
      fetchReport,
      discoverBalanceMonths: async () => [],
    });

    expect(result.balanceReferenceMonth).toBeNull();
    expect(result.coverageThrough).toBeNull();
    expect(result.balances).toEqual([]);
  });

  it('repete consulta de saldo quando o FNDE excede temporariamente sessões Oracle', async () => {
    let balanceAttempts = 0;
    const fetchReport: PublicPortfolioFetchReport = async ({ filter }) => {
      if (filter.kind === 'ATTENDANCE') return report('ATTENDANCE', [attendanceRow(filter.inep)]);
      if (filter.kind === 'ACCOUNTING') return report('ACCOUNTING', []);
      if (filter.kind === 'BALANCE') {
        balanceAttempts += 1;
        if (balanceAttempts === 1) {
          throw new Error('Relatório público do FNDE retornou erro da fonte: ORA-02391: limite de SESSIONS_PER_USER simultâneo excedido.');
        }
        return report('BALANCE', [balanceRow], '2026-06-30');
      }
      throw new Error(`relatório não esperado: ${filter.kind}`);
    };

    const result = await collectPddeInfoPublicPortfolio({
      schools: [schools[0]],
      fiscalYear: 2026,
      fetchReport,
      discoverBalanceMonths: async () => ['06-2026'],
      balanceRetryAttempts: 2,
      balanceRetryDelayMs: 0,
    });

    expect(balanceAttempts).toBe(2);
    expect(result.balances).toHaveLength(1);
    expect(result.failures).toEqual([]);
  });
});
