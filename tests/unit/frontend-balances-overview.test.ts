import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('visão rápida de saldos', () => {
  test('mostra saldo, referência, cobertura e âncora de contas', () => {
    const source = readFileSync('src/product/pages/BalancesOverviewPage.tsx', 'utf8');
    expect(source).toContain('Situação de abertura');
    expect(source).toContain('Referência');
    expect(source).toContain('RDB/CDB');
    expect(source).toContain('#contas-saldos');
  });
});
