import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('visão rápida de saldos', () => {
  test('mostra saldo, referência, cobertura e âncora de contas', () => {
    const source = readFileSync('src/product/pages/BalancesOverviewPage.tsx', 'utf8');
    expect(source).toContain('Saldo conhecido');
    expect(source).toContain('Referência');
    expect(source).toContain('Cobertura');
    expect(source).toContain('#contas-saldos');
  });
});
