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
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
  `);
  const evidenceSql = await readFile(new URL(
    '../../supabase/migrations/20260813050000_evidence_events.sql', import.meta.url,
  ), 'utf8');
  const institutionalSql = await readFile(new URL(
    '../../supabase/migrations/20260813064845_institutional_backend.sql', import.meta.url,
  ), 'utf8');
  await database.exec(evidenceSql);
  await database.exec(institutionalSql);
});

afterAll(async () => { await database.close(); });

async function enqueue(
  jobId: string,
  runId: string,
  kind: 'PDDEINFO' | 'MONITORING' | 'RECONCILIATION',
  key: string,
  hash = 'a'.repeat(64),
) {
  return database.query(`
    select * from public.enqueue_execution_job(
      $1::uuid, $2::text, $3::text, $4::text, 2026::smallint,
      $5::text, $6::jsonb, '2026-08-13T12:00:00Z'::timestamptz
    )
  `, [jobId, runId, kind, key, hash, JSON.stringify({ fiscalYear: 2026 })]);
}

describe('migrations institucionais em PostgreSQL embutido', () => {
  test('aceita MONITORING como tipo institucional de execução', async () => {
    await database.exec('set role service_role');
    try {
      const inserted = await enqueue(
        '44444444-4444-4444-8444-444444444444',
        'monitoring-db',
        'MONITORING',
        'monitoring-key',
        'd'.repeat(64),
      );
      expect(inserted.rows).toEqual([
        expect.objectContaining({ run_id: 'monitoring-db', job_kind: 'MONITORING', status: 'QUEUED' }),
      ]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('mantém Storage privado e somente uma execução ativa', async () => {
    const bucket = await database.query<{ public: boolean }>(
      "select public from storage.buckets where id = 'pdde-evidence'",
    );
    expect(bucket.rows).toEqual([{ public: false }]);

    await database.exec('set role service_role');
    try {
      await enqueue('11111111-1111-4111-8111-111111111111', 'run-a', 'PDDEINFO', 'key-a');
      await enqueue(
        '22222222-2222-4222-8222-222222222222',
        'run-b',
        'RECONCILIATION',
        'key-b',
        'b'.repeat(64),
      );

      const first = await database.query<{ run_id: string | null; status: string | null }>(
        'select run_id, status from public.claim_execution_job()',
      );
      expect(first.rows).toEqual([expect.objectContaining({ run_id: 'run-a', status: 'RUNNING' })]);

      const blocked = await database.query<{ run_id: string | null }>(
        'select run_id from public.claim_execution_job()',
      );
      expect(blocked.rows[0].run_id).toBeNull();

      await database.query(
        "select * from public.complete_execution_job('11111111-1111-4111-8111-111111111111'::uuid, 'PARTIAL', null)",
      );
      const second = await database.query<{ run_id: string | null; status: string | null }>(
        'select run_id, status from public.claim_execution_job()',
      );
      expect(second.rows).toEqual([expect.objectContaining({ run_id: 'run-b', status: 'RUNNING' })]);

      const recovered = await database.query<{ recover_interrupted_execution_jobs: number }>(
        'select public.recover_interrupted_execution_jobs()',
      );
      expect(recovered.rows[0].recover_interrupted_execution_jobs).toBe(1);
    } finally {
      await database.exec('reset role');
    }
  });

  test('só publica achados de uma conciliação concluída', async () => {
    await database.exec('set role service_role');
    try {
      await enqueue(
        '33333333-3333-4333-8333-333333333333',
        'recon-ok',
        'RECONCILIATION',
        'key-c',
        'c'.repeat(64),
      );
      await database.query('select * from public.claim_execution_job()');
      await database.query(`select public.append_evidence_event(
        'finding-ok', 'recon-ok', 'FINDING_RECORDED', '2026-08-13T12:10:00Z'::timestamptz,
        'CONCILIADOR', 2026::smallint, '33069247',
        '{"status":"REPASSE_CONFIRMADO","requiresHumanReview":false}'::jsonb
      )`);

      const running = await database.query(
        "select event_id from public.current_finding_events where run_id = 'recon-ok'",
      );
      expect(running.rows).toEqual([]);

      await database.query(
        "select * from public.complete_execution_job('33333333-3333-4333-8333-333333333333'::uuid, 'COMPLETE', null)",
      );
      const completed = await database.query<{ event_id: string }>(
        "select event_id from public.current_finding_events where run_id = 'recon-ok'",
      );
      expect(completed.rows).toEqual([{ event_id: 'finding-ok' }]);

      const integrity = await database.query<{ valid: boolean }>(
        'select valid from public.verify_evidence_chain()',
      );
      expect(integrity.rows).toEqual([{ valid: true }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('nega leitura pública direta do estado operacional', async () => {
    await database.exec('set role anon');
    try {
      await expect(database.query('select * from public.execution_jobs')).rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }
  });
});
