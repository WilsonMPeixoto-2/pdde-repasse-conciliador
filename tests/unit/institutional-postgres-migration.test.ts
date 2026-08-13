import { readdir, readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';

const migrationsUrl = new URL('../../supabase/migrations/', import.meta.url);

describe('migração Postgres do backend institucional', () => {
  test('cria Storage privado e fila durável protegida com claim concorrente', async () => {
    const files = await readdir(migrationsUrl);
    const filename = files.find((file) => file.endsWith('_institutional_backend.sql'));
    expect(filename, 'a migração institucional ainda não foi criada').toBeDefined();
    if (!filename) return;
    const sql = (await readFile(new URL(filename, migrationsUrl), 'utf8')).toLowerCase();

    expect(sql).toMatch(/execution_requested/);
    expect(sql).toMatch(/create table public\.execution_jobs/);
    expect(sql).toMatch(/unique\s*\(job_kind,\s*idempotency_key\)/s);
    expect(sql).toMatch(/enable row level security/);
    expect(sql).toMatch(/revoke all.*anon/s);
    expect(sql).toMatch(/revoke all.*authenticated/s);
    expect(sql).toMatch(/create or replace function public\.enqueue_execution_job/);
    expect(sql).toMatch(/append_evidence_event/);
    expect(sql).toMatch(/'requestpayload',\s*p_request_payload/);
    expect(sql).toMatch(/create or replace function public\.claim_execution_job/);
    expect(sql).toMatch(/for update skip locked/);
    expect(sql).toMatch(/claim_execution_job[\s\S]*execution_started/);
    expect(sql).toMatch(/'sourcecollectionrunid'[\s\S]*request_payload\s*->>\s*'sourcecollectionrunid'/);
    expect(sql).not.toMatch(/split_part\([\s\S]*pddeinfoartifact/);
    expect(sql).toMatch(/create or replace function public\.renew_execution_job_lease/);
    expect(sql).toMatch(/create or replace function public\.complete_execution_job/);
    expect(sql.match(/using errcode\s*=\s*'pde01'/g)).toHaveLength(2);
    expect(sql.match(/pdde_lease_lost/g)).toHaveLength(2);
    expect(sql).toMatch(/complete_execution_job[\s\S]*execution_finished/);
    expect(sql).toMatch(/when p_status = 'partial' then null/);
    expect(sql).toMatch(/lease_expires_at\s*>\s*pg_catalog\.clock_timestamp\(\)/);
    expect(sql).toMatch(/attempts\s*>=\s*(?:jobs\.)?max_attempts/);
    expect(sql).toMatch(/insert into storage\.buckets/);
    expect(sql).toMatch(/'pdde-evidence'/);
    expect(sql).toMatch(/public\s*=\s*false/);
    expect(sql).toMatch(/create (?:or replace )?view public\.execution_read_models/);
    expect(sql).toMatch(/create (?:or replace )?view public\.current_finding_events/);
    expect(sql).toMatch(/latest_start_sequence/);
    expect(sql).toMatch(/security_invoker\s*=\s*true/);
    expect(sql).toMatch(/evidence_events_findings_sequence_idx/);
    expect(sql).toMatch(/grant select on public\.execution_read_models to service_role/);
    expect(sql).toMatch(/grant select on public\.current_finding_events to service_role/);
  });
});
