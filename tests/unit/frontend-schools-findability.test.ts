import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('encontrabilidade da carteira de escolas', () => {
  test('inicia pela URL quando a leitura executiva abre um subconjunto', () => {
    const source = readFileSync('src/product/pages/SchoolsPage.tsx', 'utf8');
    expect(source).toContain('useSearchParams');
    expect(source).toContain("searchParams.get('filtro')");
    expect(source).toContain("searchParams.get('status')");
    expect(source).toContain("useState<SortMode>('sme')");
    expect(source).toContain('Localize e compare');
  });
});
