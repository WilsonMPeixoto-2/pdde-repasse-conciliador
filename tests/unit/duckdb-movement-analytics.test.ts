import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/analytics/duckdb-movement-analytics.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const account = { bank: '001', agency: '1234', number: '98765-4' };

const movements = [
  {
    id: 'm1', schoolCnpj: '12345678000190', programCode: '02', operation: 'credit',
    amountCents: 123_456, movementDate: '2026-08-01', account,
    document: 'OB123', history: 'ORDEM BANCARIA FNDE',
  },
  {
    id: 'm2', schoolCnpj: '12345678000190', programCode: '02', operation: 'credit',
    amountCents: 99_900, movementDate: '2026-08-02', account,
    document: 'OB999', history: 'OUTRO CREDITO',
  },
  {
    id: 'm3', schoolCnpj: '00999999000100', programCode: '02', operation: 'credit',
    amountCents: 123_456, movementDate: '2026-08-01', account,
    document: 'OB123', history: 'ORDEM BANCARIA FNDE',
  },
] as const;

describe('DuckDB como camada analítica complementar', () => {
  test('filtra candidatos por chaves fortes mantendo dinheiro como inteiro', async () => {
    const subject = await loadSubject();
    expect(subject, 'a camada DuckDB ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const Analytics = subject.DuckDbMovementAnalytics as { create(): Promise<any> };
    const analytics = await Analytics.create();
    try {
      await analytics.loadMovements(movements);
      const candidates = await analytics.findCandidates({
        schoolCnpj: '12345678000190',
        programCode: '02',
        account,
        amountCents: 123_456,
        dateFrom: '2026-07-31',
        dateTo: '2026-08-02',
      });
      expect(candidates).toHaveLength(1);
      expect(candidates[0]).toMatchObject({ id: 'm1', amountCents: 123_456 });
      expect(Number.isSafeInteger(candidates[0].amountCents)).toBe(true);
    } finally {
      await analytics.close();
    }
  });

  test('agrega créditos e débitos sem ponto flutuante', async () => {
    const subject = await loadSubject();
    expect(subject, 'a camada DuckDB ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const Analytics = subject.DuckDbMovementAnalytics as { create(): Promise<any> };
    const analytics = await Analytics.create();
    try {
      await analytics.loadMovements(movements);
      const summary = await analytics.summarize({ schoolCnpj: '12345678000190', fiscalYear: 2026 });
      expect(summary).toMatchObject({ movementCount: 2, creditCents: 223_356, debitCents: 0 });
      expect(Number.isSafeInteger(summary.creditCents)).toBe(true);
    } finally {
      await analytics.close();
    }
  });
});
