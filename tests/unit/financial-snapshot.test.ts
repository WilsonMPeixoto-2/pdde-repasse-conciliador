import { describe, expect, it } from 'vitest';
import {
  financialSnapshotKey,
  financialAccountSnapshotSchema,
} from '../../backend/core/financial-snapshot';
import { buildFinancialSeries } from '../../backend/application/build-financial-series';

const base = {
  schoolInep: '33069247',
  uexCnpj: '04500463000173',
  programName: 'PDDE QUALIDADE',
  bank: '001',
  agency: '0249',
  account: '0000546402',
  referenceDate: '2026-06-30',
  checkingBalanceCents: 0,
  fundBalanceCents: 318699,
  savingsBalanceCents: 0,
  rdbCdbBalanceCents: 0,
  investmentBalanceCents: 318699,
  totalReportedBalanceCents: 318699,
  source: 'PDDEINFO' as const,
  collectedAt: '2026-08-15T23:00:00.000Z',
  artifactSha256: null,
};

describe('financial account snapshot', () => {
  it('gera chave estável para a mesma posição financeira lógica', () => {
    const first = financialAccountSnapshotSchema.parse(base);
    const second = financialAccountSnapshotSchema.parse({
      ...base,
      collectedAt: '2026-08-16T00:00:00.000Z',
      artifactSha256: 'a'.repeat(64),
    });
    expect(financialSnapshotKey(first)).toBe(financialSnapshotKey(second));
  });

  it('usa a mesma identidade bancária independentemente de zeros de preenchimento', () => {
    const padded = financialAccountSnapshotSchema.parse(base);
    const compact = financialAccountSnapshotSchema.parse({
      ...base,
      bank: '1',
      agency: '249',
      account: '546402',
    });
    expect(financialSnapshotKey(padded)).toBe(financialSnapshotKey(compact));
  });

  it('mantém meses com formatações bancárias equivalentes na mesma série', () => {
    const january = financialAccountSnapshotSchema.parse({
      ...base,
      referenceDate: '2026-01-31',
    });
    const june = financialAccountSnapshotSchema.parse({
      ...base,
      bank: '1',
      agency: '249',
      account: '546402',
      referenceDate: '2026-06-30',
    });
    const series = buildFinancialSeries([january, june]);
    expect(series).toHaveLength(1);
    expect(series[0].points.map((point) => point.referenceDate)).toEqual(['2026-01-31', '2026-06-30']);
  });

  it('rejeita snapshot corrente fora de 2026', () => {
    expect(() => financialAccountSnapshotSchema.parse({
      ...base,
      referenceDate: '2025-12-31',
    })).toThrow();
  });

  it('preserva ausência como null e nunca como zero inventado', () => {
    const parsed = financialAccountSnapshotSchema.parse({
      ...base,
      fundBalanceCents: null,
      investmentBalanceCents: null,
      totalReportedBalanceCents: null,
    });
    expect(parsed.fundBalanceCents).toBeNull();
    expect(parsed.investmentBalanceCents).toBeNull();
    expect(parsed.totalReportedBalanceCents).toBeNull();
  });
});
