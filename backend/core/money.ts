const MAX_SAFE_CENTS = BigInt(Number.MAX_SAFE_INTEGER);
const MIN_SAFE_CENTS = BigInt(Number.MIN_SAFE_INTEGER);

/**
 * Soma valores monetários sem perder precisão antes de voltar ao tipo usado
 * pelos contratos JSON. Os valores individuais e o total precisam caber na
 * faixa de inteiros exatos do JavaScript.
 */
export function sumMoneyCents(values: readonly number[], label = 'total monetário'): number {
  let total = 0n;
  for (const value of values) {
    if (!Number.isSafeInteger(value)) {
      throw new RangeError(`${label}: valor fora da faixa segura de centavos.`);
    }
    total += BigInt(value);
  }
  if (total > MAX_SAFE_CENTS || total < MIN_SAFE_CENTS) {
    throw new RangeError(`${label} excede o limite seguro em centavos.`);
  }
  return Number(total);
}
