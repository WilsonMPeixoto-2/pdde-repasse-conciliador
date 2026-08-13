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
          1,
          60
        )
      `);
      const completed = await database.query<{ status: string }>(`
        select * from public.complete_execution_job(
          '11111111-1111-4111-8111-111111111111'::uuid,
          'pglite-worker-1',
          1,
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
            "sourceCollectionRunId": "pglite-run-1",
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
          1,
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

  test('fecha uma única vez o job cujo último lease expirou no limite de tentativas', async () => {
    await database.exec('set role service_role');
    try {
      await database.query(`
        select * from public.enqueue_execution_job(
          '44444444-4444-4444-8444-444444444444'::uuid,
          'pglite-expired-run-1'::text,
          'PDDEINFO'::text,
          'pglite-expired-contract-1'::text,
          2026::smallint,
          '${'d'.repeat(64)}'::text,
          '{"fiscalYear": 2026, "schoolIneps": ["33069247"]}'::jsonb,
          '2000-01-01T00:02:00Z'::timestamptz,
          1::integer
        )
      `);
      const claimed = await database.query<{ status: string; attempts: number }>(`
        select status, attempts
        from public.claim_execution_job('pglite-crashed-worker', 30)
      `);
      expect(claimed.rows).toEqual([{ status: 'RUNNING', attempts: 1 }]);

      await database.exec('reset role');
      await database.query(`
        update public.execution_jobs
        set lease_expires_at = pg_catalog.clock_timestamp() - interval '1 second'
        where job_id = '44444444-4444-4444-8444-444444444444'::uuid
      `);
      await database.exec('set role service_role');

      const firstRecovery = await database.query<{ job_id: string | null }>(`
        select (public.claim_execution_job('pglite-recovery-worker', 30)).job_id as job_id
      `);
      const secondRecovery = await database.query<{ job_id: string | null }>(`
        select (public.claim_execution_job('pglite-recovery-worker', 30)).job_id as job_id
      `);
      expect(firstRecovery.rows).toEqual([{ job_id: null }]);
      expect(secondRecovery.rows).toEqual([{ job_id: null }]);

      const stored = await database.query<{
        status: string;
        attempts: number;
        completed_at: string | null;
        lease_expires_at: string | null;
        last_error: string | null;
      }>(`
        select status, attempts, completed_at, lease_expires_at, last_error
        from public.execution_jobs
        where job_id = '44444444-4444-4444-8444-444444444444'::uuid
      `);
      expect(stored.rows).toEqual([expect.objectContaining({
        status: 'FAILED',
        attempts: 1,
        lease_expires_at: null,
        last_error: 'Lease expirou após o limite de tentativas.',
      })]);
      expect(stored.rows[0].completed_at).not.toBeNull();

      const events = await database.query<{
        event_type: string;
        payload: Record<string, unknown>;
      }>(`
        select event_type, payload
        from public.evidence_events
        where run_id = 'pglite-expired-run-1'
        order by sequence
      `);
      expect(events.rows.map((event) => event.event_type)).toEqual([
        'EXECUTION_REQUESTED', 'EXECUTION_STARTED', 'EXECUTION_FINISHED',
      ]);
      expect(events.rows[2].payload).toMatchObject({
        status: 'FAILED', attempt: 1, failed: 1,
        error: 'Lease expirou após o limite de tentativas.',
      });

      const integrity = await database.query<{ valid: boolean }>(
        'select valid from public.verify_evidence_chain()',
      );
      expect(integrity.rows).toEqual([{ valid: true }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('impede tentativa antiga de renovar ou concluir lease reclamado pelo mesmo workerId', async () => {
    await database.exec('set role service_role');
    try {
      await database.query(`
        select * from public.enqueue_execution_job(
          '55555555-5555-4555-8555-555555555555'::uuid,
          'pglite-fenced-run-1'::text,
          'PDDEINFO'::text,
          'pglite-fenced-contract-1'::text,
          2026::smallint,
          '${'e'.repeat(64)}'::text,
          '{"fiscalYear": 2026, "schoolIneps": ["33069247"]}'::jsonb,
          '2000-01-01T00:03:00Z'::timestamptz,
          3::integer
        )
      `);
      const firstClaim = await database.query<{ attempts: number }>(`
        select attempts from public.claim_execution_job('pglite-reused-worker', 30)
      `);
      expect(firstClaim.rows).toEqual([{ attempts: 1 }]);

      await database.exec('reset role');
      await database.query(`
        update public.execution_jobs
        set lease_expires_at = pg_catalog.clock_timestamp() - interval '1 second'
        where job_id = '55555555-5555-4555-8555-555555555555'::uuid
      `);
      await database.exec('set role service_role');

      const secondClaim = await database.query<{ attempts: number }>(`
        select attempts from public.claim_execution_job('pglite-reused-worker', 30)
      `);
      expect(secondClaim.rows).toEqual([{ attempts: 2 }]);

      await expect(database.query(`
        select * from public.renew_execution_job_lease(
          '55555555-5555-4555-8555-555555555555'::uuid,
          'pglite-reused-worker',
          1,
          30
        )
      `)).rejects.toMatchObject({
        code: 'PDE01',
        message: expect.stringMatching(/PDDE_LEASE_LOST.*lease expirou/i),
      });
      await expect(database.query(`
        select * from public.complete_execution_job(
          '55555555-5555-4555-8555-555555555555'::uuid,
          'pglite-reused-worker',
          1,
          'COMPLETE',
          null
        )
      `)).rejects.toMatchObject({
        code: 'PDE01',
        message: expect.stringMatching(/PDDE_LEASE_LOST.*não está RUNNING/i),
      });

      const completed = await database.query<{ status: string; attempts: number }>(`
        select status, attempts from public.complete_execution_job(
          '55555555-5555-4555-8555-555555555555'::uuid,
          'pglite-reused-worker',
          2,
          'COMPLETE',
          null
        )
      `);
      expect(completed.rows).toEqual([{ status: 'COMPLETE', attempts: 2 }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('mantém lotes de upload no log sem projetá-los como execuções UNKNOWN', async () => {
    await database.exec('set role service_role');
    try {
      await database.query(`
        select public.append_evidence_event(
          'artifact-upload:00000000-0000-5000-8000-000000000001:requested',
          'input-batch-2026-08-13',
          'OBSERVATION_RECORDED',
          '2026-08-13T12:00:00Z'::timestamptz,
          'SIGEF_MOVIMENTACOES',
          2026::smallint,
          null,
          '{"observationKind":"ARTIFACT_UPLOAD_REQUESTED"}'::jsonb
        )
      `);
      await database.query(`
        select public.append_evidence_event(
          'artifact-upload:00000000-0000-5000-8000-000000000001:preserved',
          'input-batch-2026-08-13',
          'ARTIFACT_PRESERVED',
          '2026-08-13T12:01:00Z'::timestamptz,
          'SIGEF_MOVIMENTACOES',
          2026::smallint,
          null,
          '{"provider":"SUPABASE_STORAGE","path":"runs/input-batch-2026-08-13/input.csv"}'::jsonb
        )
      `);

      const events = await database.query<{ events: string | number }>(`
        select count(*) as events
        from public.evidence_events
        where run_id = 'input-batch-2026-08-13'
      `);
      expect(Number(events.rows[0].events)).toBe(2);

      const projection = await database.query<{ run_id: string; status: string }>(`
        select run_id, status
        from public.execution_read_models
        where run_id = 'input-batch-2026-08-13'
      `);
      expect(projection.rows).toEqual([]);

      const integrity = await database.query<{ valid: boolean }>(
        'select valid from public.verify_evidence_chain()',
      );
      expect(integrity.rows[0].valid).toBe(true);
    } finally {
      await database.exec('reset role');
    }
  });

  test('recusa identificadores que não pertencem ao contrato append-only', async () => {
    await database.exec('begin');
    try {
      await database.exec('set role service_role');
      await database.exec('savepoint invalid_event_id');
      await expect(database.query(`
        select public.append_evidence_event(
          'evento com espaços',
          'run-valido',
          'OBSERVATION_RECORDED',
          '2026-08-13T12:00:00Z'::timestamptz,
          'CONCILIADOR',
          2026::smallint,
          null,
          '{"observationKind":"INVALID_IDENTIFIER"}'::jsonb
        )
      `)).rejects.toThrow(/event_id|check constraint/i);
      await database.exec('rollback to savepoint invalid_event_id');
      await expect(database.query(`
        select public.append_evidence_event(
          'evento-valido',
          '${'r'.repeat(161)}',
          'OBSERVATION_RECORDED',
          '2026-08-13T12:00:00Z'::timestamptz,
          'CONCILIADOR',
          2026::smallint,
          null,
          '{"observationKind":"INVALID_IDENTIFIER"}'::jsonb
        )
      `)).rejects.toThrow(/run_id|check constraint/i);
    } finally {
      await database.exec('rollback');
      await database.exec('reset role');
    }
  });

  test('projeta somente achados posteriores ao início da tentativa mais recente', async () => {
    await database.exec('set role service_role');
    try {
      const append = (eventId: string, eventType: string, occurredAt: string, payload: string) => (
        database.query(`
          select public.append_evidence_event(
            $1::text,
            'pglite-findings-run'::text,
            $2::text,
            $3::timestamptz,
            'CONCILIADOR'::text,
            2026::smallint,
            '33069247'::text,
            $4::jsonb
          )
        `, [eventId, eventType, occurredAt, payload])
      );
      await append('pglite-findings-start-1', 'EXECUTION_STARTED', '2026-08-13T13:00:00Z', '{"attempt":1}');
      await append('pglite-finding-stale', 'FINDING_RECORDED', '2026-08-13T13:01:00Z', '{"status":"DIVERGENCIA_REVISAO_NECESSARIA","reasonCode":"STALE","requiresHumanReview":true}');
      await append('pglite-findings-start-2', 'EXECUTION_STARTED', '2026-08-13T13:02:00Z', '{"attempt":2}');
      await append('pglite-finding-current', 'FINDING_RECORDED', '2026-08-13T13:03:00Z', '{"status":"REPASSE_CONFIRMADO","reasonCode":"EXACT_MATCH","requiresHumanReview":false}');

      const findings = await database.query<{ event_id: string }>(`
        select event_id from public.current_finding_events
        where run_id = 'pglite-findings-run'
        order by sequence
      `);
      expect(findings.rows).toEqual([{ event_id: 'pglite-finding-current' }]);
      const projection = await database.query<{
        findings_count: string | number;
        human_review_count: string | number;
      }>(`
        select findings_count, human_review_count
        from public.execution_read_models
        where run_id = 'pglite-findings-run'
      `);
      expect(Number(projection.rows[0].findings_count)).toBe(1);
      expect(Number(projection.rows[0].human_review_count)).toBe(0);
    } finally {
      await database.exec('reset role');
    }
  });

  test('nega leitura anônima e bloqueia UPDATE/DELETE/TRUNCATE até para o owner', async () => {
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

    await database.exec('begin');
    try {
      await expect(database.exec('truncate table public.evidence_events'))
        .rejects.toThrow(/append-only|not allowed/i);
    } finally {
      await database.exec('rollback');
    }
  });
});
