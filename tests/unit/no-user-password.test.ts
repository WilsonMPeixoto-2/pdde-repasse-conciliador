import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

describe('experiência pública da carteira financeira', () => {
  test('não pede chave de acesso ao usuário', async () => {
    const dialog = await readFile(new URL('../../src/product/components/SessionStartDialog.tsx', import.meta.url), 'utf8');
    const page = await readFile(new URL('../../src/product/pages/PortfolioPage.tsx', import.meta.url), 'utf8');

    expect(dialog).not.toMatch(/Chave de acesso|accessKey|type="password"/i);
    expect(page).not.toMatch(/SessionStartDialog|Nova consulta|Modo Sessão/i);
  });

  test('carrega a publicação financeira diretamente de um snapshot do site', async () => {
    const api = await readFile(new URL('../../src/product/api.ts', import.meta.url), 'utf8');

    expect(api).toContain('/data/pdde-2026-snapshot.json');
  });
});
