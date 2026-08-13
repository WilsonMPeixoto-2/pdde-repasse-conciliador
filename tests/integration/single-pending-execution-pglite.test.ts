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
  for (const migration of [
    '20260813050000_evidence_events.sql',
    '20260813064845_institutional_backend.sql',
    '20260813235000_single_pending_execution.sql',
  ]) {
    const sql = await readFile(new URL(`../../supabase/migrations/${migration}`, import.meta.url), 'utf8');
    await database.exec(sql);
  }
});

afterAll(async () => { await database.close(); });

async function enqueue(jobId: string, runId: string, key: string) {
  return database.query(`
    select * from public.enqueue_execution_job(
      $1::uuid, $2::text, 'PDDEINFO'::text, $3::text, 2026::smallint,
      $4::text, '{"fiscalYear":2026}'::jsonb,
      '2026-08-13T12:00:00Z'::timestamptz
    )
  `, [jobId, runId, key, 'a'.repeat(64)]);
}

describe('fila institucional simplificada', () => {
  test('não permite acumular segunda execução enquanto há uma pendente ou em andamento', async () => {
    await database.exec('set role service_role');
    try {
      await enqueue('11111111-1111-4111-8111-111111111111', 'run-a', 'key-a');
      await expect(enqueue(
        '22222222-2222-4222-8222-222222222222',
        'run-b',
        'key-b',
      )).rejects.toThrow(/execution_jobs_single_pending_idx|duplicate key/i);

      await database.query('select * from public.claim_execution_job()');
      await expect(enqueue(
        '22222222-2222-4222-8222-222222222222',
        'run-b',
        'key-b',
      )).rejects.toThrow(/execution_jobs_single_pending_idx|duplicate key/i);

      await database.query(
        "select * from public.complete_execution_job('11111111-1111-4111-8111-111111111111'::uuid, 'COMPLETE', null)",
      );
      await expect(enqueue(
        '22222222-2222-4222-8222-222222222222',
        'run-b',
        'key-b',
      )).resolves.toBeDefined();
    } finally {
      await database.exec('reset role');
    }
  });
});
