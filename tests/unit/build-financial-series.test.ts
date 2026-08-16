import { describe, expect, it } from 'vitest';
import { buildFinancialSeries } from '../../backend/application/build-financial-series';
import type { FinancialAccountSnapshot } from '../../backend/core/financial-snapshot';

function snapshot(referenceDate: string, totalReportedBalanceCents: number): FinancialAccountSnapshot {
  return {
    schoolInep: '33069247',
    uexCnpj: '04500463000173',
    programName: 'PDDE QUALIDADE',
    bank: '001',
    agency: '0249',
    account: '0000546402',
    referenceDate,
    checkingBalanceCents: 0,
    fundBalanceCents: totalReportedBalanceCents,
    savingsBalanceCents: 0,
    rdbCdbBalanceCents: 0,
    investmentBalanceCents: totalReportedBalanceCents,
    totalReportedBalanceCents,
    source: 'PDDEINFO',
    collectedAt: '2026-08-15T23:00:00.000Z',
    artifactSha256: null,
  };
}

describe('buildFinancialSeries', () => {
  it('ordena snapshots por data de referência', () => {
    const series = buildFinancialSeries([
      snapshot('2026-06-30', 318699),
      snapshot('2026-04-30', 400000),
      snapshot('2026-05-31', 350000),
    ]);
    expect(series).toHaveLength(1);
    expect(series[0].points.map((point) => point.referenceDate)).toEqual([
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
    ]);
  });

  it('rejeita duplicidade da mesma posição lógica', () => {
    expect(() => buildFinancialSeries([
      snapshot('2026-06-30', 318699),
      snapshot('2026-06-30', 318699),
    ])).toThrow(/duplic/i);
  });
});
