-- Backend institucional v0.5 simplificado.
-- O estado operacional atual vive em execution_jobs; evidence_events permanece
-- como trilha auxiliar append-only e não governa o estado corrente do produto.

alter table public.evidence_events
  drop constraint if exists evidence_events_event_type_check;

alter table public.evidence_events
  add constraint evidence_events_event_type_check check (event_type in (
    'EXECUTION_REQUESTED',
    'EXECUTION_STARTED',
    'EXECUTION_FINISHED',
    'SOURCE_ATTEMPT_RECORDED',
    'ARTIFACT_PRESERVED',
    'OBSERVATION_RECORDED',
    'FINDING_RECORDED'
  ));

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
) values (
  'pdde-evidence',
  'pdde-evidence',
  false,
  52428800,
  array[
    'text/html',
    'text/plain',
    'application/json',
    'application/octet-stream',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
  ]::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.execution_jobs (
  job_id uuid primary key,
  run_id text not null unique check (
    char_length(run_id) between 1 and 160
    and run_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  job_kind text not null check (job_kind in ('PDDEINFO', 'RECONCILIATION')),
  status text not null default 'QUEUED' check (
    status in ('QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL', 'FAILED')
  ),
  idempotency_key text not null check (char_length(idempotency_key) between 1 and 200),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  request_payload jsonb not null default '{}'::jsonb,
  fiscal_year smallint not null check (fiscal_year between 2000 and 2100),
  requested_at timestamptz not null,
  started_at timestamptz null,
  completed_at timestamptz null,
  last_error text null,
  unique (job_kind, idempotency_key),
  check ((status = 'QUEUED' and started_at is null and completed_at is null) or status <> 'QUEUED'),
  check ((status = 'RUNNING' and started_at is not null and completed_at is null) or status <> 'RUNNING'),
  check ((status in ('COMPLETE', 'PARTIAL', 'FAILED') and completed_at is not null) or status not in ('COMPLETE', 'PARTIAL', 'FAILED'))
);

create index execution_jobs_status_requested_idx
  on public.execution_jobs (status, requested_at, job_id);
create index execution_jobs_run_status_idx
  on public.execution_jobs (run_id, status);
create index evidence_events_findings_sequence_idx
  on public.evidence_events (sequence desc)
  where event_type = 'FINDING_RECORDED';
create index evidence_events_run_findings_sequence_idx
  on public.evidence_events (run_id, sequence desc)
  where event_type = 'FINDING_RECORDED';

alter table public.execution_jobs enable row level security;
alter table public.execution_jobs force row level security;
revoke all on table public.execution_jobs from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.execution_jobs from service_role;
grant select on table public.execution_jobs to service_role;

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
  if p_job_kind not in ('PDDEINFO', 'RECONCILIATION') then
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

create or replace function public.claim_execution_job()
returns public.execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.execution_jobs;
  v_source text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('pdde-repasse-conciliador:single-active-execution')
  );

  if exists (select 1 from public.execution_jobs where status = 'RUNNING') then
    return v_job;
  end if;

  update public.execution_jobs as jobs
  set status = 'RUNNING',
      started_at = pg_catalog.clock_timestamp(),
      completed_at = null,
      last_error = null
  where jobs.job_id = (
    select candidate.job_id
    from public.execution_jobs as candidate
    where candidate.status = 'QUEUED'
    order by candidate.requested_at, candidate.job_id
    for update skip locked
    limit 1
  )
  returning * into v_job;

  if v_job.job_id is not null then
    v_source := case when v_job.job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end;
    perform public.append_evidence_event(
      v_job.job_id::text || ':started', v_job.run_id, 'EXECUTION_STARTED',
      v_job.started_at, v_source, v_job.fiscal_year, null,
      pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
        'jobId', v_job.job_id,
        'jobKind', v_job.job_kind,
        'sourceCollectionRunId', case
          when v_job.job_kind = 'RECONCILIATION'
            then v_job.request_payload ->> 'sourceCollectionRunId'
          else null
        end
      ))
    );
  end if;
  return v_job;
end;
$$;

create or replace function public.recover_interrupted_execution_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.execution_jobs;
  v_source text;
  v_count integer := 0;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('pdde-repasse-conciliador:single-active-execution')
  );

  for v_job in
    select * from public.execution_jobs
    where status = 'RUNNING'
    order by requested_at, job_id
    for update
  loop
    update public.execution_jobs
    set status = 'FAILED',
        completed_at = pg_catalog.clock_timestamp(),
        last_error = 'Execução interrompida; recuperação manual solicitada.'
    where job_id = v_job.job_id
    returning * into v_job;

    v_source := case when v_job.job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end;
    perform public.append_evidence_event(
      v_job.job_id::text || ':finished', v_job.run_id, 'EXECUTION_FINISHED',
      v_job.completed_at, v_source, v_job.fiscal_year, null,
      pg_catalog.jsonb_build_object(
        'status', 'FAILED',
        'failed', 1,
        'error', v_job.last_error
      )
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.complete_execution_job(
  p_job_id uuid,
  p_status text,
  p_error text default null
)
returns public.execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.execution_jobs;
  v_source text;
begin
  if p_status not in ('COMPLETE', 'PARTIAL', 'FAILED') then
    raise exception 'status terminal inválido: %', p_status;
  end if;

  update public.execution_jobs
  set status = p_status,
      completed_at = pg_catalog.clock_timestamp(),
      last_error = case when p_status = 'FAILED' then p_error else null end
  where job_id = p_job_id and status = 'RUNNING'
  returning * into v_job;

  if not found then
    raise exception 'execução não está RUNNING: %', p_job_id;
  end if;

  v_source := case when v_job.job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end;
  perform public.append_evidence_event(
    v_job.job_id::text || ':finished', v_job.run_id, 'EXECUTION_FINISHED',
    v_job.completed_at, v_source, v_job.fiscal_year, null,
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'status', p_status,
      'failed', case when p_status = 'FAILED' then 1 when p_status = 'PARTIAL' then null else 0 end,
      'error', case when p_status = 'FAILED' then p_error else null end
    ))
  );
  return v_job;
end;
$$;

create or replace view public.current_finding_events
with (security_invoker = true)
as
select findings.*
from public.evidence_events as findings
join public.execution_jobs as jobs on jobs.run_id = findings.run_id
where findings.event_type = 'FINDING_RECORDED'
  and jobs.status = 'COMPLETE';

revoke all on table public.current_finding_events from public, anon, authenticated;
grant select on public.current_finding_events to service_role;

create or replace view public.execution_read_models
with (security_invoker = true)
as
with event_counts as (
  select
    run_id,
    count(*) as events_count,
    count(*) filter (where event_type = 'SOURCE_ATTEMPT_RECORDED') as attempts_count,
    count(*) filter (
      where event_type = 'SOURCE_ATTEMPT_RECORDED' and payload ->> 'status' = 'FAILED'
    ) as failed_attempts_count,
    count(*) filter (where event_type = 'ARTIFACT_PRESERVED') as artifacts_count,
    count(*) filter (where event_type = 'FINDING_RECORDED') as findings_count,
    count(*) filter (
      where event_type = 'FINDING_RECORDED' and payload ->> 'requiresHumanReview' = 'true'
    ) as human_review_count,
    max(sequence) as anchor_sequence
  from public.evidence_events
  group by run_id
)
select
  jobs.run_id,
  case when jobs.job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end as source,
  jobs.fiscal_year,
  jobs.requested_at,
  jobs.started_at,
  jobs.completed_at as finished_at,
  jobs.status,
  case when jobs.job_kind = 'RECONCILIATION'
    then jobs.request_payload ->> 'sourceCollectionRunId'
    else null
  end as source_collection_run_id,
  coalesce(counts.events_count, 0) as events_count,
  coalesce(counts.attempts_count, 0) as attempts_count,
  coalesce(counts.failed_attempts_count, 0) as failed_attempts_count,
  coalesce(counts.artifacts_count, 0) as artifacts_count,
  case when jobs.status = 'COMPLETE' then coalesce(counts.findings_count, 0) else 0 end as findings_count,
  case when jobs.status = 'COMPLETE' then coalesce(counts.human_review_count, 0) else 0 end as human_review_count,
  coalesce(counts.anchor_sequence, 1) as anchor_sequence
from public.execution_jobs as jobs
left join event_counts as counts on counts.run_id = jobs.run_id;

revoke all on table public.execution_read_models from public, anon, authenticated;
grant select on public.execution_read_models to service_role;

revoke all on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz
) from public, anon, authenticated;
revoke all on function public.claim_execution_job() from public, anon, authenticated;
revoke all on function public.recover_interrupted_execution_jobs() from public, anon, authenticated;
revoke all on function public.complete_execution_job(uuid, text, text) from public, anon, authenticated;

grant execute on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz
) to service_role;
grant execute on function public.claim_execution_job() to service_role;
grant execute on function public.recover_interrupted_execution_jobs() to service_role;
grant execute on function public.complete_execution_job(uuid, text, text) to service_role;
