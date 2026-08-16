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
    '20260815033500_current_fiscal_read_model.sql',
    '20260816013000_financial_intelligence_2026.sql',
    '20260816020000_current_human_financial_read_model.sql',
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

function fiscalSnapshot(runId: string) {
  const school = {
    inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102',
  };
  const metrics = {
    accounts: 0, movements: 0, programmedCents: 0,
    paidInformedCents: 0, creditedCents: 0, reportedBalanceCents: 0,
  };
  return {
    sourceStatus: 'COMPLETE',
    portfolio: {
      fiscalYear: 2026,
      runId,
      generatedAt: '2026-08-16T02:00:00Z',
      sourceGeneratedAt: '2026-08-16T01:59:00Z',
      sourceObservations: [],
      coverage: {},
      metrics: { schools: 1, ...metrics },
      schools: [{ inep: school.inep, sme: school.sme, name: school.name, metrics }],
    },
    schools: [{
      school,
      metrics,
      snapshot: { fiscalYear: 2026, runId, school, repasses: [], statements: [] },
    }],
  };
}

function humanSnapshot(runId: string, indicatorCount = 1) {
  const school = {
    inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102',
  };
  const unit = { inep: school.inep, sme: school.sme, name: school.name };
  return {
    portfolio: {
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      runId,
      referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
      schoolCount: 1,
      sources: [{ name: 'PDDEInfo', information: 'Repasses informados e saldos.' }],
      indicators: [{ label: '1ª parcela com pagamento informado', count: indicatorCount, units: [unit] }],
      schools: [unit],
    },
    schools: [{
      school,
      snapshot: {
        fiscalYear: 2026, runId, school,
        programs: [], accounts: [], accounting: [], followUp: [],
      },
    }],
  };
}

async function publishMonitoring(runId: string, humanCount = 1) {
  return database.query(
    `select public.publish_current_monitoring_snapshot($1::text, $2::jsonb, $3::jsonb)`,
    [runId, JSON.stringify(fiscalSnapshot(runId)), JSON.stringify(humanSnapshot(runId, humanCount))],
  );
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
      await expect(database.query('select * from public.current_human_financial_schools'))
        .rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }
  });

  test('publica retratos fiscal e humano no mesmo run', async () => {
    await database.exec('set role service_role');
    try {
      await publishMonitoring('monitoring-atomic-a');
      const state = await database.query<{ fiscal_run: string; human_run: string; school_count: number }>(`
        select f.run_id as fiscal_run, h.run_id as human_run, h.school_count
        from public.current_fiscal_snapshots f
        cross join public.current_human_financial_snapshots h
        where f.fiscal_year = 2026 and h.fiscal_year = 2026
      `);
      expect(state.rows).toEqual([{
        fiscal_run: 'monitoring-atomic-a',
        human_run: 'monitoring-atomic-a',
        school_count: 1,
      }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('falha humana desfaz também a atualização fiscal da mesma chamada', async () => {
    await database.exec('set role service_role');
    try {
      await expect(publishMonitoring('monitoring-atomic-b', 2)).rejects.toThrow(/indicador humano inconsistente/i);
      const state = await database.query<{ fiscal_run: string; human_run: string }>(`
        select f.run_id as fiscal_run, h.run_id as human_run
        from public.current_fiscal_snapshots f
        cross join public.current_human_financial_snapshots h
        where f.fiscal_year = 2026 and h.fiscal_year = 2026
      `);
      expect(state.rows).toEqual([{
        fiscal_run: 'monitoring-atomic-a',
        human_run: 'monitoring-atomic-a',
      }]);
    } finally {
      await database.exec('reset role');
    }
  });
});
