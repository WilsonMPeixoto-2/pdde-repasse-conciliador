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
    '../../supabase/migrations/20260816020000_current_human_financial_read_model.sql',
    '../../supabase/migrations/20260816073000_current_human_portfolio_metrics.sql',
    '../../supabase/migrations/20260817193000_current_human_school_summary.sql',
  ]) {
    await database.exec(await readFile(new URL(path, import.meta.url), 'utf8'));
  }
});

afterAll(async () => { await database.close(); });

const schools = [
  { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102' },
  { inep: '33069093', sme: '0410002', name: 'ESCOLA B', uex: 'CEC B', cnpj: '01872287000103' },
];

function fiscalSnapshot(runId: string) {
  return {
    sourceStatus: 'COMPLETE',
    portfolio: {
      fiscalYear: 2026,
      runId,
      generatedAt: '2026-08-17T18:00:00Z',
      sourceGeneratedAt: '2026-08-17T18:00:00Z',
      sourceObservations: [],
      coverage: { requestedSchools: 2 },
      metrics: {
        schools: 2,
        accounts: 2,
        movements: 0,
        programmedCents: 300_000,
        paidInformedCents: 150_000,
        creditedCents: 150_000,
        reportedBalanceCents: 90_000,
      },
      schools: schools.map((school, index) => ({
        inep: school.inep,
        sme: school.sme,
        name: school.name,
        metrics: {
          accounts: 1,
          movements: 0,
          programmedCents: index === 0 ? 100_000 : 200_000,
          paidInformedCents: index === 0 ? 50_000 : 100_000,
          creditedCents: index === 0 ? 50_000 : 100_000,
          reportedBalanceCents: index === 0 ? 30_000 : 60_000,
        },
      })),
    },
    schools: schools.map((school, index) => ({
      school,
      metrics: {
        accounts: 1,
        movements: 0,
        programmedCents: index === 0 ? 100_000 : 200_000,
        paidInformedCents: index === 0 ? 50_000 : 100_000,
        creditedCents: index === 0 ? 50_000 : 100_000,
        reportedBalanceCents: index === 0 ? 30_000 : 60_000,
      },
      snapshot: { fiscalYear: 2026, runId, school, repasses: [], statements: [] },
    })),
  };
}

function humanSnapshot(runId: string) {
  const summaries = schools.map((school, index) => ({
    sme: school.sme,
    name: school.name,
    inep: school.inep,
    programmedCents: index === 0 ? 100_000 : 200_000,
    paymentInformedCents: index === 0 ? 50_000 : 100_000,
    creditLocatedCents: index === 0 ? 50_000 : 100_000,
    knownBalanceCents: index === 0 ? 30_000 : 60_000,
    referenceDate: '2026-06-30',
    accountsTotal: 1,
    accountsWithReferencePosition: 1,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  }));

  return {
    portfolio: {
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      runId,
      referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
      schoolCount: 2,
      metrics: {
        schoolCount: 2,
        accountsTotal: 2,
        accountsWithPosition: 2,
        programmedCents: 300_000,
        paymentInformedCents: 150_000,
        creditLocatedCents: 150_000,
        reportedBalanceCents: 90_000,
        applicationsCents: 70_000,
      },
      sources: [{ name: 'PDDEInfo', information: 'Dados financeiros públicos.' }],
      indicators: [{ label: 'Outra informação parcial', count: 0, units: [] }],
      schools: summaries,
    },
    schools: schools.map((school) => ({
      school,
      snapshot: {
        fiscalYear: 2026,
        runId,
        school,
        programs: [],
        accounts: [],
        accounting: [],
        followUp: [],
      },
    })),
  };
}

describe('publicação combinada do monitoramento humano em PostgreSQL', () => {
  test('aplica toda a cadeia de migrations e publica fiscal, portfólio humano, resumos e prontuários no mesmo run', async () => {
    await database.exec('set role service_role');
    try {
      await database.query(
        'select public.publish_current_monitoring_snapshot($1::text, $2::jsonb, $3::jsonb)',
        ['monitoring-human-a', JSON.stringify(fiscalSnapshot('monitoring-human-a')), JSON.stringify(humanSnapshot('monitoring-human-a'))],
      );

      const fiscal = await database.query<{ run_id: string }>(
        'select run_id from public.current_fiscal_snapshots where fiscal_year = 2026',
      );
      const human = await database.query<{ run_id: string; school_count: number; metrics: Record<string, unknown> }>(
        'select run_id, school_count, metrics from public.current_human_financial_snapshots where fiscal_year = 2026',
      );
      const humanSchools = await database.query<{ school_inep: string; run_id: string; summary: Record<string, unknown> | null }>(`
        select school_inep, run_id, summary
        from public.current_human_financial_schools
        where fiscal_year = 2026
        order by school_inep
      `);

      expect(fiscal.rows).toEqual([{ run_id: 'monitoring-human-a' }]);
      expect(human.rows[0]).toMatchObject({
        run_id: 'monitoring-human-a',
        school_count: 2,
        metrics: { schoolCount: 2, reportedBalanceCents: 90_000 },
      });
      expect(humanSchools.rows).toHaveLength(2);
      expect(humanSchools.rows.every((row) => row.run_id === 'monitoring-human-a')).toBe(true);
      expect(humanSchools.rows.map((row) => row.summary?.inep)).toEqual(['33069093', '33069247']);
    } finally {
      await database.exec('reset role');
    }
  });

  test('desfaz também a atualização fiscal quando o retrato humano é inválido', async () => {
    const invalidHuman = humanSnapshot('monitoring-human-b');
    invalidHuman.portfolio.schoolCount = 1;

    await database.exec('set role service_role');
    try {
      await expect(database.query(
        'select public.publish_current_monitoring_snapshot($1::text, $2::jsonb, $3::jsonb)',
        ['monitoring-human-b', JSON.stringify(fiscalSnapshot('monitoring-human-b')), JSON.stringify(invalidHuman)],
      )).rejects.toThrow(/cobertura escolar inconsistente/i);

      const fiscal = await database.query<{ run_id: string }>(
        'select run_id from public.current_fiscal_snapshots where fiscal_year = 2026',
      );
      const human = await database.query<{ run_id: string }>(
        'select run_id from public.current_human_financial_snapshots where fiscal_year = 2026',
      );
      expect(fiscal.rows).toEqual([{ run_id: 'monitoring-human-a' }]);
      expect(human.rows).toEqual([{ run_id: 'monitoring-human-a' }]);
    } finally {
      await database.exec('reset role');
    }
  });

  test('mantém as tabelas humanas indisponíveis para leitura anônima', async () => {
    await database.exec('set role anon');
    try {
      await expect(database.query('select * from public.current_human_financial_snapshots')).rejects.toThrow(/permission denied/i);
      await expect(database.query('select * from public.current_human_financial_schools')).rejects.toThrow(/permission denied/i);
    } finally {
      await database.exec('reset role');
    }
  });
});
