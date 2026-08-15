import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

async function allMigrationSql(): Promise<string> {
  const directory = new URL('../../supabase/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  return (await Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8')))).join('\n');
}

describe('contrato SQL do retrato fiscal corrente', () => {
  test('mantém snapshot 2026 e publicação atômica privada ao service_role', async () => {
    const sql = await allMigrationSql();

    expect(sql).toMatch(/create table public\.current_fiscal_snapshots/i);
    expect(sql).toMatch(/create table public\.current_fiscal_schools/i);
    expect(sql).toMatch(/create or replace function public\.publish_current_fiscal_snapshot/i);
    expect(sql).toMatch(/fiscal_year\s*=\s*2026|fiscal_year[^;]+2026/is);
    expect(sql).toMatch(/sourceStatus|source_status/i);
    expect(sql).toMatch(/delete from public\.current_fiscal_schools/i);
    expect(sql).toMatch(/grant execute on function public\.publish_current_fiscal_snapshot[\s\S]+service_role/i);
    expect(sql).toMatch(/revoke all on table public\.current_fiscal_snapshots from public, anon, authenticated/i);
    expect(sql).toMatch(/revoke all on table public\.current_fiscal_schools from public, anon, authenticated/i);
  });
});
