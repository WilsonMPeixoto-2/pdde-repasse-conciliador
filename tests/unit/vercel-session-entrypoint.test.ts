import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('Vercel session entrypoint', () => {
  it('não depende de módulos locais fora do entrypoint da Function', async () => {
    const source = await readFile(new URL('../../api/session.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/from\s+['"]\.\.\/backend\//);
  });
});
