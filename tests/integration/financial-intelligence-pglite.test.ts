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
  for (const filename of [
    '20260813050000_evidence_events.sql',
    '20260813064845_institutional_backend.sql',
    '20260814225500_monitoring_job_kind.sql',
    '20260816013000_financial_intelligence_2026.sql',
  ]) {
    const sql = await readFile(new URL(`../../supabase/migrations/${filename}`, import.meta.url), 'utf8');
    await database.exec(sql);
  }
});

afterAll(async () => { await database.close(); });

const parameters = [
  '33069247',
  '04500463000173',
  'PDDE QUALIDADE',
  '001',
  '0249',
  '0000546402',
  '2026-06-30',
  0,
  318699,
  0,
  0,
  318699,
  318699,
  'PDDEINFO',
  '2026-08-15T23:00:00Z',
  'a'.repeat(64),
];

async function append(values = parameters) {
  return database.query(`
    select * from public.append_financial_account_snapshot(
      $1::text, $2::text, $3::text, $4::text, $5::text, $6::text,
      $7::date, $8::bigint, $9::bigint, $10::bigint, $11::bigint,
      $12::bigint, $13::bigint, $14::text, $15::timestamptz, $16::text
    )
  `, values);
}

describe('persistência financeira 2026', () => {
  test('aceita PDF no bucket institucional e a nova fonte de evidência', async () => {
    const bucket = await database.query<{ allowed_mime_types: string[] }>(
      "select allowed_mime_types from storage.buckets where id = 'pdde-evidence'",
    );
    expect(bucket.rows[0].allowed_mime_types).toContain('application/pdf');

    await database.exec('set role service_role');
    try {
      await expect(database.query(`select public.append_evidence_event(
        'portal-event', 'portal-run', 'OBSERVATION_RECORDED', '2026-08-15T23:00:00Z'::timestamptz,
        'PORTAL_TRANSPARENCIA', 2026::smallint, '33069247',
        '{"observationKind":"PORTAL_TEST","data":{}}'::jsonb
      )`)).resolves.toBeDefined();
    } finally {
      await database.exec('reset role');
    }
  });

  test('é idempotente para a mesma posição e rejeita conflito silencioso', async () => {
    await database.exec('set role service_role');
    try {
      const first = await append();
      const second = await append();
      expect(first.rows).toHaveLength(1);
      expect(second.rows).toHaveLength(1);

      const count = await database.query<{ count: string }>(
        'select count(*)::text as count from public.financial_account_snapshots',
      );
      expect(count.rows).toEqual([{ count: '1' }]);

      const conflicting = [...parameters];
      conflicting[8] = 999999;
      await expect(append(conflicting)).rejects.toThrow(/conflitante/i);
    } finally {
      await database.exec('reset role');
    }
  });

  test('read model corrente escolhe a posição mais recente e nega leitura anônima', async () => {
    await database.exec('set role service_role');
    try {
      const july = [...parameters];
      july[6] = '2026-07-31';
      july[8] = 250000;
      july[11] = 250000;
      july[12] = 250000;
      july[14] = '2026-08-16T00:00:00Z';
      july[15] = 'b'.repeat(64);
      await append(july);
      const current = await database.query<{ reference_date: string; fund_balance_cents: string }>(
        `select reference_date::text, fund_balance_cents::text
         from public.current_financial_account_positions_2026`,
      );
      expect(current.rows).toEqual([{ reference_date: '2026-07-31', fund_balance_cents: '250000' }]);
    } finally {
      await database.exec('reset role');
    }

    await database.exec('set role anon');
    try {
      await expect(database.query('select * from public.financial_account_snapshots'))
        .rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }
  });
});
