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
    '../../supabase/migrations/20260813050000_evidence_events.sql',
    import.meta.url,
  ), 'utf8');
  const institutionalSql = await readFile(new URL(
    '../../supabase/migrations/20260813064845_institutional_backend.sql',
    import.meta.url,
  ), 'utf8');
  await database.exec(evidenceSql);
  await database.exec(institutionalSql);
});

afterAll(async () => {
  await database.close();
});

describe('migrations institucionais em PostgreSQL embutido', () => {
  test('aplica o DDL e mantém Storage privado', async () => {
    const bucket = await database.query<{
      id: string;
      public: boolean;
      file_size_limit: string | number;
    }>(`select id, public, file_size_limit from storage.buckets where id = 'pdde-evidence'`);
    expect(bucket.rows).toEqual([expect.objectContaining({
      id: 'pdde-evidence', public: false,
    })]);
    expect(Number(bucket.rows[0].file_size_limit)).toBe(52_428_800);
  });

  test('enfileira, reclama e conclui com eventos atômicos e cadeia íntegra', async () => {
    await database.exec('set role service_role');
    try {
      const enqueued = await database.query<{
        job_id: string;
        run_id: string;
        status: string;
      }>(`
        select * from public.enqueue_execution_job(
          $1::uuid, $2::text, $3::text, $4::text, $5::smallint,
          $6::text, $7::jsonb, $8::timestamptz, $9::integer
        )
      `, [
        '11111111-1111-4111-8111-111111111111',
        'pglite-run-1',
        'PDDEINFO',
        'pglite-contract-1',
        2026,
        'a'.repeat(64),
        JSON.stringify({ fiscalYear: 2026, schoolIneps: ['33069247'] }),
        '2000-01-01T00:00:00Z',
        3,
      ]);
      expect(enqueued.rows).toEqual([expect.objectContaining({
        run_id: 'pglite-run-1', status: 'QUEUED',
      })]);
      const idempotent = await database.query<{ job_id: string }>(`
        select * from public.enqueue_execution_job(
          $1::uuid, $2::text, $3::text, $4::text, $5::smallint,
          $6::text, $7::jsonb, $8::timestamptz, $9::integer
        )
      `, [
        '22222222-2222-4222-8222-222222222222',
        'pglite-run-1',
        'PDDEINFO',
        'pglite-contract-1',
        2026,
        'a'.repeat(64),
        JSON.stringify({ fiscalYear: 2026, schoolIneps: ['33069247'] }),
        '2000-01-01T00:00:00Z',
        3,
      ]);
      expect(idempotent.rows[0].job_id).toBe('11111111-1111-4111-8111-111111111111');

      const claimed = await database.query<{ status: string; attempts: number }>(`
        select * from public.claim_execution_job('pglite-worker-1', 60)
      `);
      const storedClaim = await database.query<{ status: string; attempts: number }>(`
        select status, attempts from public.execution_jobs where run_id = 'pglite-run-1'
      `);
      expect(storedClaim.rows).toEqual([{ status: 'RUNNING', attempts: 1 }]);
      expect(claimed.rows).toEqual([expect.objectContaining({ status: 'RUNNING', attempts: 1 })]);

      await database.query(`
        select * from public.renew_execution_job_lease(
          '11111111-1111-4111-8111-111111111111'::uuid,
          'pglite-worker-1',
          60
        )
      `);
      const completed = await database.query<{ status: string }>(`
        select * from public.complete_execution_job(
          '11111111-1111-4111-8111-111111111111'::uuid,
          'pglite-worker-1',
          'PARTIAL',
          null
        )
      `);
      expect(completed.rows).toEqual([expect.objectContaining({ status: 'PARTIAL' })]);

      const events = await database.query<{ event_type: string; payload: Record<string, unknown> }>(`
        select event_type, payload
        from public.evidence_events
        where run_id = 'pglite-run-1'
        order by sequence
      `);
      expect(events.rows.map((event) => event.event_type)).toEqual([
        'EXECUTION_REQUESTED', 'EXECUTION_STARTED', 'EXECUTION_FINISHED',
      ]);
      expect(events.rows[2].payload).toMatchObject({ status: 'PARTIAL', attempt: 1 });
      expect(events.rows[2].payload).not.toHaveProperty('failed');

      const integrity = await database.query<{
        valid: boolean;
        events: string | number;
      }>('select valid, events from public.verify_evidence_chain()');
      expect(integrity.rows).toEqual([expect.objectContaining({ valid: true })]);
      expect(Number(integrity.rows[0].events)).toBe(3);

      const projection = await database.query<{ run_id: string; status: string }>(`
        select run_id, status from public.execution_read_models where run_id = 'pglite-run-1'
      `);
      expect(projection.rows).toEqual([{ run_id: 'pglite-run-1', status: 'PARTIAL' }]);

      await database.query(`
        select * from public.enqueue_execution_job(
          '33333333-3333-4333-8333-333333333333'::uuid,
          'pglite-reconciliation-1'::text,
          'RECONCILIATION'::text,
          'pglite-reconciliation-contract-1'::text,
          2026::smallint,
          '${'b'.repeat(64)}'::text,
          '{
            "fiscalYear": 2026,
            "pddeInfoArtifact": {
              "bucket": "pdde-evidence",
              "path": "runs/pglite-run-1/attempts/1/pddeinfo-2026.json",
              "sha256": "${'c'.repeat(64)}"
            }
          }'::jsonb,
          '2000-01-01T00:01:00Z'::timestamptz,
          3::integer
        )
      `);
      await database.query(`
        select * from public.claim_execution_job('pglite-worker-1', 60)
      `);
      await database.query(`
        select * from public.complete_execution_job(
          '33333333-3333-4333-8333-333333333333'::uuid,
          'pglite-worker-1',
          'COMPLETE',
          null
        )
      `);
      const reconciliationProjection = await database.query<{
        status: string;
        source_collection_run_id: string;
      }>(`
        select status, source_collection_run_id
        from public.execution_read_models
        where run_id = 'pglite-reconciliation-1'
      `);
      expect(reconciliationProjection.rows).toEqual([{
        status: 'COMPLETE', source_collection_run_id: 'pglite-run-1',
      }]);
      const finalIntegrity = await database.query<{ valid: boolean; events: string | number }>(
        'select valid, events from public.verify_evidence_chain()',
      );
      expect(finalIntegrity.rows[0].valid).toBe(true);
      expect(Number(finalIntegrity.rows[0].events)).toBe(6);
    } finally {
      await database.exec('reset role');
    }
  });

  test('nega leitura anônima e bloqueia UPDATE/DELETE até para o owner', async () => {
    await database.exec('set role anon');
    try {
      await expect(database.query('select * from public.evidence_events'))
        .rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }

    await expect(database.exec(`
      update public.evidence_events set payload = '{}'::jsonb where sequence = 1
    `)).rejects.toThrow(/append-only|not allowed/i);
    await expect(database.exec(`
      delete from public.evidence_events where sequence = 1
    `)).rejects.toThrow(/append-only|not allowed/i);
  });
});
