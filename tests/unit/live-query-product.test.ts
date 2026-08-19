import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('nova consulta financeira em tempo real', () => {
  test('expõe o botão Fazer nova consulta sem pedir senha ao operador', async () => {
    const page = await readFile(new URL('../../src/product/pages/PortfolioPage.tsx', import.meta.url), 'utf8');

    expect(page).toContain('Fazer nova consulta');
    expect(page).not.toMatch(/Chave de acesso|type="password"/i);
  });

  test('usa endpoint próprio de consulta ao vivo sem depender de segredo no navegador', async () => {
    const api = await readFile(new URL('../../src/product/api.ts', import.meta.url), 'utf8');
    const liveEndpoint = await readFile(new URL('../../api/live.ts', import.meta.url), 'utf8');

    expect(api).toContain('/api/live');
    expect(liveEndpoint).not.toMatch(/PDDE_SESSION_ACCESS_KEY|authorization:\s*`Bearer \$\{accessKey\}`/i);
  });
});
