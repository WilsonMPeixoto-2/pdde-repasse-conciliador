import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('prontuário durante atualização ao vivo', () => {
  test('recarrega a mesma escola quando muda a versão do retrato ao vivo', () => {
    const source = readFileSync('src/product/pages/SchoolPage.tsx', 'utf8');

    expect(source).toContain('[inep, portfolio.liveGeneratedAt, portfolio.loadSchool]');
  });
});
