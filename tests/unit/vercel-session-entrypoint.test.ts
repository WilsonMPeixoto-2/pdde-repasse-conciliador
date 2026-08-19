import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import sessionHandler from '../../api/session';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('Vercel session entrypoint', () => {
  it('não depende de módulos locais fora do entrypoint da Function', async () => {
    const source = await readFile(new URL('../../api/session.ts', import.meta.url), 'utf8');

    expect(source).not.toMatch(/from\s+['"]\.\.\/backend\//);
  });

  it('não transforma uma chave de acesso configurada e curta em erro 500', async () => {
    process.env.PDDE_SESSION_GITHUB_TOKEN = '12345678901234567890';
    process.env.PDDE_SESSION_ACCESS_KEY = 'chave-configurada';
    process.env.PDDE_SESSION_GITHUB_REF = 'main';

    const response = await sessionHandler.fetch(new Request('https://example.test/api/session'));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: 'Acesso ao Modo Sessão não autorizado.',
    });
  });
});
