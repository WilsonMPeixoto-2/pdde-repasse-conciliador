import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

describe('contas públicas na visão financeira humana', () => {
  it('não esconde conta encontrada no relatório de saldos só porque o extrato fiscal anterior não a continha', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33069247',
            sme: '0410001',
            name: 'EM EMA NEGRAO DE LIMA',
            uex: 'CONSELHO ESCOLA COMUNIDADE',
            cnpj: '04500463000173',
          },
          repasses: [],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [],
        accounting: [],
        balances: [{
          schoolIneps: ['33069247'],
          coverageThrough: '2026-06-30',
          uexCnpj: '04500463000173',
          bank: '001',
          agency: '0249',
          account: '0000546402',
          programName: 'PDDE QUALIDADE',
          checkingBalanceCents: 0,
          fundBalanceCents: 318699,
          savingsBalanceCents: 0,
          rdbCdbBalanceCents: 0,
          investmentBalanceCents: 318699,
          totalReportedBalanceCents: 318699,
        }],
        failures: [],
        artifacts: [],
        balanceReferenceMonth: '06-2026',
        coverageThrough: '2026-06-30',
      } as never,
    });

    expect(view.schools[0].accounts).toEqual([
      expect.objectContaining({
        program: 'PDDE QUALIDADE',
        bank: '001',
        agency: '0249',
        account: '0000546402',
        latestPosition: expect.objectContaining({ totalReportedBalanceCents: 318699 }),
        movements: [],
      }),
    ]);
  });
});
