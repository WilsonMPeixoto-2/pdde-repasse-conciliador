import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

async function allMigrationSql(): Promise<string> {
  const directory = new URL('../../supabase/migrations/', import.meta.url);
  const files = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  return (await Promise.all(files.map((name) => readFile(new URL(name, directory), 'utf8')))).join('\n');
}

describe('resumo compacto por escola no read model humano', () => {
  test('persiste summary por INEP sem obrigar leitura dos prontuários completos', async () => {
    const sql = await allMigrationSql();

    expect(sql).toMatch(/alter table public\.current_human_financial_schools[\s\S]+add column if not exists summary jsonb/i);
    expect(sql).toMatch(/summary is null or pg_catalog\.jsonb_typeof\(summary\) = 'object'/i);
    expect(sql).toMatch(/p_snapshot #> '\{portfolio,schools\}'/i);
    expect(sql).toMatch(/v_summary[\s\S]+inep[\s\S]+v_school #>> '\{school,inep\}'/i);
    expect(sql).toMatch(/insert into public\.current_human_financial_schools[\s\S]+summary/i);
  });
});
