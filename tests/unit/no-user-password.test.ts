import { readFile } from 'node:fs/promises';
import { gunzipSync, strFromU8 } from 'fflate';
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

  test('o snapshot publicado reconstitui a carteira real das 163 unidades', async () => {
    const publicRoot = new URL('../../public/', import.meta.url);
    const manifest = JSON.parse(
      await readFile(new URL('data/pdde-2026-snapshot.json', publicRoot), 'utf8'),
    ) as {
      encoding: string;
      parts: string[];
      source: { workflowRunId: number; artifactId: number };
    };

    expect(manifest.encoding).toBe('gzip-base64-parts');
    expect(manifest.source).toEqual(expect.objectContaining({
      workflowRunId: 32164281411,
      artifactId: 9335143477,
    }));

    const encoded = (await Promise.all(manifest.parts.map((part) =>
      readFile(new URL(part.replace(/^\//, ''), publicRoot), 'utf8'),
    ))).join('');
    const compressed = Uint8Array.from(Buffer.from(encoded.replace(/\s+/g, ''), 'base64'));
    const snapshot = JSON.parse(strFromU8(gunzipSync(compressed))) as {
      portfolio: { schoolCount: number };
      schools: Record<string, unknown>;
    };

    expect(snapshot.portfolio.schoolCount).toBe(163);
    expect(Object.keys(snapshot.schools)).toHaveLength(163);
  });
});
