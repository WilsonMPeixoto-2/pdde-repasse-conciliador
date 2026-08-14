-- Acrescenta MONITORING ao contrato institucional sem reescrever a migration-base.
-- O banco real ainda não está implantado; esta migration mantém o schema versionado
-- pronto para a próxima fase de provisionamento do Supabase dedicado.

alter table public.execution_jobs
  drop constraint if exists execution_jobs_job_kind_check;

alter table public.execution_jobs
  add constraint execution_jobs_job_kind_check
  check (job_kind in ('PDDEINFO', 'MONITORING', 'RECONCILIATION'));

create or replace function public.enqueue_execution_job(
  p_job_id uuid,
  p_run_id text,
  p_job_kind text,
  p_idempotency_key text,
  p_fiscal_year smallint,
  p_request_hash text,
  p_request_payload jsonb,
  p_requested_at timestamptz
)
returns public.execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.execution_jobs;
  v_job public.execution_jobs;
  v_source text;
begin
  if p_job_kind not in ('PDDEINFO', 'MONITORING', 'RECONCILIATION') then
    raise exception 'job_kind inválido: %', p_job_kind;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'pdde-repasse-conciliador:execution-job:' || p_job_kind || ':' || p_idempotency_key,
      0
    )
  );

  select * into v_existing
  from public.execution_jobs
  where job_kind = p_job_kind and idempotency_key = p_idempotency_key;

  if found then
    if v_existing.request_hash <> p_request_hash
      or v_existing.run_id <> p_run_id
      or v_existing.fiscal_year <> p_fiscal_year
    then
      raise exception 'idempotency conflict para %/%', p_job_kind, p_idempotency_key;
    end if;
    return v_existing;
  end if;

  insert into public.execution_jobs (
    job_id, run_id, job_kind, status, idempotency_key, request_hash,
    request_payload, fiscal_year, requested_at
  ) values (
    p_job_id, p_run_id, p_job_kind, 'QUEUED', p_idempotency_key,
    p_request_hash, p_request_payload, p_fiscal_year, p_requested_at
  ) returning * into v_job;

  v_source := case when p_job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end;
  perform public.append_evidence_event(
    p_job_id::text || ':requested', p_run_id, 'EXECUTION_REQUESTED',
    p_requested_at, v_source, p_fiscal_year, null,
    pg_catalog.jsonb_build_object(
      'jobKind', p_job_kind,
      'jobId', p_job_id,
      'idempotencyKey', p_idempotency_key,
      'requestHash', p_request_hash,
      'requestPayload', p_request_payload
    )
  );
  return v_job;
end;
$$;

revoke all on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz
) from public, anon, authenticated;

grant execute on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz
) to service_role;
