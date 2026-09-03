import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('visão rápida de repasses', () => {
  test('mantém evidências separadas e usa âncora de repasses', () => {
    const source = readFileSync('src/product/pages/RepasseOverviewPage.tsx', 'utf8');
    expect(source).toContain('Programado custeio');
    expect(source).toContain('Pagamento informado');
    expect(source).toContain('Crédito compatível');
    expect(source).toContain('#repasses');
  });
});
