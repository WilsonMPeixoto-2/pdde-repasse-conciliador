import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260816013000_financial_intelligence_2026.sql',
);

describe('financial intelligence migration', () => {
  it('inclui a nova fonte, PDFs, snapshots e read model corrente', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toContain("'PORTAL_TRANSPARENCIA'");
    expect(sql).toContain("'application/pdf'");
    expect(sql).toMatch(/create table public\.financial_account_snapshots/i);
    expect(sql).toMatch(/create or replace view public\.current_financial_account_positions_2026/i);
    expect(sql).toMatch(/unique\s*\([\s\S]*school_inep[\s\S]*uex_cnpj[\s\S]*program_name[\s\S]*reference_date[\s\S]*source[\s\S]*\)/i);
  });

  it('mantém snapshots restritos ao exercício de 2026', async () => {
    const sql = await readFile(migrationPath, 'utf8');
    expect(sql).toMatch(/reference_date[^;]*2026-01-01[^;]*2026-12-31/is);
  });
});
