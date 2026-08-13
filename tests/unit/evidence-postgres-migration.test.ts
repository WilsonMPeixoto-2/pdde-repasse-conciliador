import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const migrationUrl = new URL(
  '../../supabase/migrations/20260813050000_evidence_events.sql',
  import.meta.url,
);

describe('migration Postgres de evidências', () => {
  test('mantém log append-only, RLS fechado, hash canônico e verificação da cadeia', async () => {
    const sql = (await readFile(migrationUrl, 'utf8')).toLowerCase();

    expect(sql).toMatch(/create extension if not exists pgcrypto/);
    expect(sql).toMatch(/create table public\.evidence_events/);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/create.*index.*run_id.*sequence/s);
    expect(sql).toMatch(/create.*index.*school_inep.*sequence/s);
    expect(sql).toMatch(/prevent_evidence_event_mutation/);
    expect(sql).toMatch(/before update or delete/);
    expect(sql).toMatch(/pg_advisory_xact_lock/);
    expect(sql).toMatch(/order by sequence desc\s+limit 1/);
    expect(sql).toMatch(/at time zone 'utc'/);
    expect(sql).toMatch(/digest\(/);
    expect(sql).toMatch(/create or replace function public\.verify_evidence_chain/);
    expect(sql).toMatch(/eventhash divergente|event_hash divergente/);
    expect(sql).toMatch(/grant execute.*service_role/s);
    expect(sql).toMatch(/revoke all.*anon/s);
    expect(sql).toMatch(/revoke all.*authenticated/s);
  });
});
