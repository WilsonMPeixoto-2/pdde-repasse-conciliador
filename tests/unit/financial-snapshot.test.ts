import { describe, expect, it } from 'vitest';
import {
  financialSnapshotKey,
  financialAccountSnapshotSchema,
} from '../../backend/core/financial-snapshot';

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
