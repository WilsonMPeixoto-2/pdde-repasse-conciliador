import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { describe, expect, test } from 'vitest';
import { probeAntonietaDataProduct } from '../../backend/adapters/antonieta-data-product';

function mockFetch(compressed: Buffer): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = String(input);
    if (url.endsWith('/artifact-metadata')) {
      return new Response(JSON.stringify({
        size: compressed.length,
        name: 'PDDE_Exec_Fin_Basico.txt.gz',
        lastUpdated: '2026-04-09T19:20:56Z',
        path: 'exports/PDDE/',
      }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (url.endsWith('/artifact')) {
      const body = Uint8Array.from(compressed).buffer;
      return new Response(body, { status: 200, headers: { 'content-type': 'application/gzip' } });
    }
    return new Response('not found', { status: 404 });
  }) as typeof fetch;
}

describe('probe streaming da Plataforma Antonieta de Barros', () => {
  test('processa CSV gzip com campo entre aspas contendo ponto e vírgula sem corromper as colunas', async () => {
    const text = [
      'ANO;INEP;DESCRICAO',
      '2025;33069247;normal',
      '2026;33069247;"texto;com;separadores"',
      '2026;99999999;outro',
    ].join('\n');
    const compressed = gzipSync(Buffer.from(text, 'utf8'));
    const probe = await probeAntonietaDataProduct({
      productId: 24,
      targetIneps: new Set(['33069247']),
      fetchImpl: mockFetch(compressed),
      maxSamples: 5,
    });

    expect(probe).toMatchObject({
      productId: 24,
      recordCount: 3,
      header: ['ANO', 'INEP', 'DESCRICAO'],
      headerFieldCount: 3,
      fieldCountDistribution: { '3': 3 },
      dominantFieldCount: 3,
      nonDominantFieldCount: 0,
      years: { '2025': 1, '2026': 2 },
      matchedTargetIneps: ['33069247'],
      targetMatchCountsByYear: { '2025:33069247': 1, '2026:33069247': 1 },
    });
    expect(probe.compressedBytes).toBe(compressed.length);
    expect(probe.compressedSha256).toBe(createHash('sha256').update(compressed).digest('hex'));
    expect(probe.sample2026Rows).toContainEqual(['2026', '33069247', 'texto;com;separadores']);
    expect(probe.sample2026TargetRows).toContainEqual(['2026', '33069247', 'texto;com;separadores']);
  });

  test('preserva aspas literais dentro de campo não delimitado como ocorre no artefato oficial', async () => {
    const text = [
      'ANO;INEP;NOME;DESCRICAO',
      '2026;33069247;ESC INDÍGENA O"DIA;normal',
    ].join('\n');
    const compressed = gzipSync(Buffer.from(text, 'utf8'));
    const probe = await probeAntonietaDataProduct({
      productId: 24,
      targetIneps: new Set(['33069247']),
      fetchImpl: mockFetch(compressed),
      maxSamples: 5,
    });

    expect(probe).toMatchObject({
      recordCount: 1,
      fieldCountDistribution: { '4': 1 },
      dominantFieldCount: 4,
      nonDominantFieldCount: 0,
      years: { '2026': 1 },
      matchedTargetIneps: ['33069247'],
      targetMatchCountsByYear: { '2026:33069247': 1 },
    });
    expect(probe.sample2026TargetRows).toContainEqual([
      '2026',
      '33069247',
      'ESC INDÍGENA O"DIA',
      'normal',
    ]);
  });

  test('preserva par de aspas literais no meio de campo não delimitado como no registro oficial 2761528', async () => {
    const text = [
      'ANO;INEP;NOME;DESCRICAO',
      '2026;33069247;E E E F "FREI GIL DE VILA NOVA";normal',
    ].join('\n');
    const compressed = gzipSync(Buffer.from(text, 'utf8'));

    const probe = await probeAntonietaDataProduct({
      productId: 24,
      targetIneps: new Set(['33069247']),
      fetchImpl: mockFetch(compressed),
      maxSamples: 5,
    });

    expect(probe).toMatchObject({
      recordCount: 1,
      fieldCountDistribution: { '4': 1 },
      dominantFieldCount: 4,
      nonDominantFieldCount: 0,
      years: { '2026': 1 },
      matchedTargetIneps: ['33069247'],
      targetMatchCountsByYear: { '2026:33069247': 1 },
    });
    expect(probe.sample2026TargetRows).toContainEqual([
      '2026',
      '33069247',
      'E E E F "FREI GIL DE VILA NOVA"',
      'normal',
    ]);
  });
});
