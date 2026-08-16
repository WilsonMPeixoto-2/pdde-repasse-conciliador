import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const financialMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260816013000_financial_intelligence_2026.sql',
);
const humanMigrationPath = resolve(
  process.cwd(),
  'supabase/migrations/20260816020000_current_human_financial_read_model.sql',
);

describe('financial intelligence migrations', () => {
  it('inclui a nova fonte, PDFs, snapshots e read model corrente de contas', async () => {
    const sql = await readFile(financialMigrationPath, 'utf8');
    expect(sql).toContain("'PORTAL_TRANSPARENCIA'");
    expect(sql).toContain("'application/pdf'");
    expect(sql).toMatch(/create table public\.financial_account_snapshots/i);
    expect(sql).toMatch(/create or replace view public\.current_financial_account_positions_2026/i);
    expect(sql).toMatch(/unique\s*\([\s\S]*school_inep[\s\S]*uex_cnpj[\s\S]*program_name[\s\S]*reference_date[\s\S]*source[\s\S]*\)/i);
  });

  it('mantém snapshots restritos ao exercício de 2026', async () => {
    const sql = await readFile(financialMigrationPath, 'utf8');
    expect(sql).toMatch(/reference_date[^;]*2026-01-01[^;]*2026-12-31/is);
  });

  it('cria read model humano separado e só concede publicação combinada ao service_role', async () => {
    const sql = await readFile(humanMigrationPath, 'utf8');
    expect(sql).toMatch(/create table public\.current_human_financial_snapshots/i);
    expect(sql).toMatch(/create table public\.current_human_financial_schools/i);
    expect(sql).toMatch(/create or replace function public\.publish_current_human_financial_snapshot/i);
    expect(sql).toMatch(/create or replace function public\.publish_current_monitoring_snapshot/i);
    expect(sql).toMatch(/perform public\.publish_current_fiscal_snapshot/i);
    expect(sql).toMatch(/perform public\.publish_current_human_financial_snapshot/i);
    expect(sql).toMatch(/revoke all on function public\.publish_current_human_financial_snapshot\(text, jsonb\)[\s\S]*service_role/i);
    expect(sql).toMatch(/grant execute on function public\.publish_current_monitoring_snapshot\(text, jsonb, jsonb\)[\s\S]*service_role/i);
  });
});
