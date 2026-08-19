import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('encontrabilidade da carteira de escolas', () => {
  test('inicia em todas as escolas e ordenação por código SME', () => {
    const source = readFileSync('src/product/pages/SchoolsPage.tsx', 'utf8');
    expect(source).toContain("useState<FilterMode>('all')");
    expect(source).toContain("useState<SortMode>('sme')");
    expect(source).toContain('Localize e compare');
  });
});
