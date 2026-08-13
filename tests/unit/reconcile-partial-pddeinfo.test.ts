import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, test } from 'vitest';
import { reconcileFiles } from '../../backend/application/reconcile-files';

describe('proteção contra coleta PDDEInfo parcial', () => {
  test('recusa envelope marcado como PARTIAL antes de iniciar a conciliação', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-partial-'));
    const pddeInfoPath = join(root, 'pddeinfo.json');
    await writeFile(pddeInfoPath, JSON.stringify({
      fetchedAt: '2026-08-12T22:51:00-03:00',
      collectionStatus: 'PARTIAL',
      schools: [],
    }), 'utf8');

    await expect(reconcileFiles({
      pddeInfoPath,
      movementsPath: join(root, 'nao-deve-ser-lido.csv'),
      outputPath: join(root, 'nao-deve-ser-gerado.xlsx'),
      fiscalYear: 2026,
      requestedThrough: '2026-08-12',
    })).rejects.toThrow(/PARTIAL|coleta.*parcial/i);
  });
});
