import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';

let database: PGlite;

beforeAll(async () => {
  database = await PGlite.create({ extensions: { pgcrypto } });
  await database.exec(`
    create role anon noinherit;
    create role authenticated noinherit;
    create role service_role noinherit bypassrls;
    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null default false,
      file_size_limit bigint, allowed_mime_types text[]
    );
  `);
  for (const path of [
    '../../supabase/migrations/20260813050000_evidence_events.sql',
    '../../supabase/migrations/20260813064845_institutional_backend.sql',
    '../../supabase/migrations/20260814225500_monitoring_job_kind.sql',
    '../../supabase/migrations/20260815033500_current_fiscal_read_model.sql',
  ]) {
    await database.exec(await readFile(new URL(path, import.meta.url), 'utf8'));
  }
});

afterAll(async () => { await database.close(); });

function snapshot(runId: string, sourceStatus: 'COMPLETE' | 'PARTIAL' = 'COMPLETE') {
  const schools = [
    {
      school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01.872.287/0001-02' },
      metrics: { accounts: 1, movements: 2, programmedCents: 10000, paidInformedCents: 5000, creditedCents: 5000, reportedBalanceCents: 5000 },
      snapshot: { fiscalYear: 2026, runId, school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01.872.287/0001-02' }, repasses: [], statements: [] },
    },
    {
      school: { inep: '33069093', sme: '0410002', name: 'ESCOLA B', uex: 'CEC B', cnpj: '01.872.287/0001-03' },
      metrics: { accounts: 2, movements: 3, programmedCents: 20000, paidInformedCents: 10000, creditedCents: 10000, reportedBalanceCents: 10000 },
      snapshot: { fiscalYear: 2026, runId, school: { inep: '33069093', sme: '0410002', name: 'ESCOLA B', uex: 'CEC B', cnpj: '01.872.287/0001-03' }, repasses: [], statements: [] },
    },
  ];
  return {
    sourceStatus,
    portfolio: {
      fiscalYear: 2026,
      runId,
      generatedAt: '2026-08-15T03:19:47Z',
      sourceGeneratedAt: '2026-08-15T03:19:47Z',
      sourceObservations: [],
      coverage: { requestedSchools: 2 },
      metrics: { schools: 2, accounts: 3, movements: 5, programmedCents: 30000, paidInformedCents: 15000, creditedCents: 15000, reportedBalanceCents: 15000 },
      schools: schools.map((item) => ({ inep: item.school.inep, sme: item.school.sme, name: item.school.name, metrics: item.metrics })),
    },
    schools,
  };
}

describe('read model fiscal corrente em PostgreSQL', () => {
  test('publica atomicamente e substitui a fotografia anterior somente quando completa', async () => {
    await database.exec('set role service_role');
    try {
      await database.query(
        'select public.publish_current_fiscal_snapshot($1::text, $2::jsonb)',
        ['monitoring-a', JSON.stringify(snapshot('monitoring-a'))],
      );
      const first = await database.query<{ run_id: string; schools: number }>(`
        select s.run_id, count(e.school_inep)::int as schools
        from public.current_fiscal_snapshots s
        join public.current_fiscal_schools e using (fiscal_year)
        group by s.run_id
      `);
      expect(first.rows).toEqual([{ run_id: 'monitoring-a', schools: 2 }]);

      await expect(database.query(
        'select public.publish_current_fiscal_snapshot($1::text, $2::jsonb)',
        ['monitoring-partial', JSON.stringify(snapshot('monitoring-partial', 'PARTIAL'))],
      )).rejects.toThrow(/completo|complete/i);

      const preserved = await database.query<{ run_id: string }>(
        'select run_id from public.current_fiscal_snapshots where fiscal_year = 2026',
      );
      expect(preserved.rows).toEqual([{ run_id: 'monitoring-a' }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('nega leitura pública direta das fotografias fiscais', async () => {
    await database.exec('set role anon');
    try {
      await expect(database.query('select * from public.current_fiscal_snapshots')).rejects.toThrow(/permission denied/i);
      await expect(database.query('select * from public.current_fiscal_schools')).rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }
  });
});
