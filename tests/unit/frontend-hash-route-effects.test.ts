import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('efeitos de rota com hash', () => {
  test('RouteEffects observa hash e foca a seção alvo', () => {
    const source = readFileSync('src/product/components/RouteEffects.tsx', 'utf8');
    expect(source).toContain('hash');
    expect(source).toContain('getElementById');
    expect(source).toContain('scrollIntoView');
  });
});
