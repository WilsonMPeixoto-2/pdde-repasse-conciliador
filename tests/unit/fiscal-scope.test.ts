import { describe, expect, it } from 'vitest';
import {
  assertContextFiscalYear,
  assertCurrentFiscalYear,
  CONTEXT_FISCAL_YEAR,
  CURRENT_FISCAL_YEAR,
  isCurrentFiscalDate,
} from '../../backend/core/fiscal-scope';

describe('fiscal scope', () => {
  it('fixa 2026 como exercício corrente', () => {
    expect(CURRENT_FISCAL_YEAR).toBe(2026);
    expect(assertCurrentFiscalYear(2026)).toBe(2026);
    expect(() => assertCurrentFiscalYear(2025)).toThrow(/2026/);
  });

  it('aceita 2025 somente como contexto histórico', () => {
    expect(CONTEXT_FISCAL_YEAR).toBe(2025);
    expect(assertContextFiscalYear(2025)).toBe(2025);
    expect(() => assertContextFiscalYear(2024)).toThrow(/2025/);
    expect(() => assertContextFiscalYear(2026)).toThrow(/2025/);
  });

  it('identifica datas pertencentes ao exercício corrente sem aceitar histórico', () => {
    expect(isCurrentFiscalDate('2026-01-01')).toBe(true);
    expect(isCurrentFiscalDate('2026-12-31')).toBe(true);
    expect(isCurrentFiscalDate('2025-12-31')).toBe(false);
    expect(isCurrentFiscalDate('valor-invalido')).toBe(false);
  });
});
