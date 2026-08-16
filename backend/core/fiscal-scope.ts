export const CURRENT_FISCAL_YEAR = 2026 as const;
export const CONTEXT_FISCAL_YEAR = 2025 as const;

export function assertCurrentFiscalYear(value: number): 2026 {
  if (value !== CURRENT_FISCAL_YEAR) {
    throw new RangeError(`A visão operacional corrente é exclusiva do exercício ${CURRENT_FISCAL_YEAR}.`);
  }
  return CURRENT_FISCAL_YEAR;
}

export function assertContextFiscalYear(value: number): 2025 {
  if (value !== CONTEXT_FISCAL_YEAR) {
    throw new RangeError(`O contexto histórico excepcional é restrito ao exercício ${CONTEXT_FISCAL_YEAR}.`);
  }
  return CONTEXT_FISCAL_YEAR;
}

export function isCurrentFiscalDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match || Number(match[1]) !== CURRENT_FISCAL_YEAR) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}
