-- Backend institucional v0.5: fila durável, idempotência e Storage privado.
-- evidence_events permanece a fonte auditável; execution_jobs é transporte
-- operacional e pode ser reconstruído/conciliado a partir dos eventos.

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
  available_at timestamptz not null,
  claimed_at timestamptz null,
  lease_expires_at timestamptz null,
  completed_at timestamptz null,
  worker_id text null check (
    worker_id is null or (
      char_length(worker_id) between 1 and 160
      and worker_id ~ '^[A-Za-z0-9._:-]+$'
    )
  ),
  attempts integer not null default 0 check (attempts >= 0),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  last_error text null,
  unique (job_kind, idempotency_key),
  check (
    (status = 'QUEUED' and worker_id is null and lease_expires_at is null)
    or status <> 'QUEUED'
  ),
  check (
    (status = 'RUNNING' and worker_id is not null and lease_expires_at is not null)
    or status <> 'RUNNING'
  )
);

create index execution_jobs_claim_idx
  on public.execution_jobs (status, available_at, requested_at, job_id)
  where status in ('QUEUED', 'RUNNING');

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

revoke all on table public.execution_jobs from public;
revoke all on table public.execution_jobs from anon;
revoke all on table public.execution_jobs from authenticated;
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
  p_requested_at timestamptz,
  p_max_attempts integer default 3
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
  if p_max_attempts < 1 or p_max_attempts > 20 then
    raise exception 'max_attempts inválido: %', p_max_attempts;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'pdde-repasse-conciliador:execution-job:' || p_job_kind || ':' || p_idempotency_key,
      0
    )
  );

  select * into v_existing
  from public.execution_jobs
  where job_kind = p_job_kind
    and idempotency_key = p_idempotency_key;

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
    job_id,
    run_id,
    job_kind,
    status,
    idempotency_key,
    request_hash,
    request_payload,
    fiscal_year,
    requested_at,
    available_at,
    max_attempts
  ) values (
    p_job_id,
    p_run_id,
    p_job_kind,
    'QUEUED',
    p_idempotency_key,
    p_request_hash,
    p_request_payload,
    p_fiscal_year,
    p_requested_at,
    p_requested_at,
    p_max_attempts
  )
  returning * into v_job;

  v_source := case when p_job_kind = 'PDDEINFO' then 'PDDEINFO' else 'CONCILIADOR' end;

  perform public.append_evidence_event(
    p_job_id::text || ':requested',
    p_run_id,
    'EXECUTION_REQUESTED',
    p_requested_at,
    v_source,
    p_fiscal_year,
    null,
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

create or replace function public.claim_execution_job(
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns public.execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.execution_jobs;
  v_exhausted public.execution_jobs;
  v_source text;
begin
  if p_worker_id !~ '^[A-Za-z0-9._:-]{1,160}$' then
    raise exception 'worker_id inválido';
  end if;
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease_seconds deve estar entre 30 e 3600';
  end if;

  -- Fecha jobs cujo último worker morreu já no limite de tentativas. O mesmo
  -- lock de linha impede dois runners de emitirem o evento terminal.
  for v_exhausted in
    select jobs.*
    from public.execution_jobs as jobs
    where jobs.status = 'RUNNING'
      and jobs.lease_expires_at <= pg_catalog.clock_timestamp()
      and jobs.attempts >= jobs.max_attempts
    order by jobs.requested_at, jobs.job_id
    for update skip locked
    limit 100
  loop
    update public.execution_jobs
    set status = 'FAILED',
        completed_at = pg_catalog.clock_timestamp(),
        lease_expires_at = null,
        last_error = 'Lease expirou após o limite de tentativas.'
    where job_id = v_exhausted.job_id
      and status = 'RUNNING'
    returning * into v_exhausted;

    v_source := case when v_exhausted.job_kind = 'PDDEINFO'
      then 'PDDEINFO' else 'CONCILIADOR' end;
    perform public.append_evidence_event(
      v_exhausted.job_id::text || ':attempt:' || v_exhausted.attempts::text || ':finished',
      v_exhausted.run_id,
      'EXECUTION_FINISHED',
      v_exhausted.completed_at,
      v_source,
      v_exhausted.fiscal_year,
      null,
      pg_catalog.jsonb_build_object(
        'status', 'FAILED',
        'failed', 1,
        'attempt', v_exhausted.attempts,
        'error', v_exhausted.last_error
      )
    );
  end loop;

  update public.execution_jobs as jobs
  set status = 'RUNNING',
      worker_id = p_worker_id,
      claimed_at = pg_catalog.clock_timestamp(),
      lease_expires_at = pg_catalog.clock_timestamp()
        + pg_catalog.make_interval(secs => p_lease_seconds),
      completed_at = null,
      attempts = jobs.attempts + 1,
      last_error = case
        when jobs.status = 'RUNNING' then 'Lease anterior expirou; job reclamado novamente.'
        else null
      end
  where jobs.job_id = (
    select candidate.job_id
    from public.execution_jobs as candidate
    where (
      (candidate.status = 'QUEUED' and candidate.available_at <= pg_catalog.clock_timestamp())
      or (
        candidate.status = 'RUNNING'
        and candidate.lease_expires_at <= pg_catalog.clock_timestamp()
      )
    )
      and candidate.attempts < candidate.max_attempts
    order by candidate.requested_at, candidate.job_id
    for update skip locked
    limit 1
  )
  returning * into v_job;

  if v_job.job_id is not null then
    v_source := case when v_job.job_kind = 'PDDEINFO'
      then 'PDDEINFO' else 'CONCILIADOR' end;
    perform public.append_evidence_event(
      v_job.job_id::text || ':attempt:' || v_job.attempts::text || ':started',
      v_job.run_id,
      'EXECUTION_STARTED',
      v_job.claimed_at,
      v_source,
      v_job.fiscal_year,
      null,
      pg_catalog.jsonb_build_object(
        'jobId', v_job.job_id,
        'jobKind', v_job.job_kind,
        'attempt', v_job.attempts,
        'maxAttempts', v_job.max_attempts,
        'sourceCollectionRunId', case
          when v_job.job_kind = 'RECONCILIATION' then pg_catalog.split_part(
            v_job.request_payload #>> '{pddeInfoArtifact,path}',
            '/',
            2
          )
          else null
        end
      )
    );
  end if;

  return v_job;
end;
$$;

create or replace function public.renew_execution_job_lease(
  p_job_id uuid,
  p_worker_id text,
  p_lease_seconds integer default 300
)
returns public.execution_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.execution_jobs;
begin
  if p_lease_seconds < 30 or p_lease_seconds > 3600 then
    raise exception 'lease_seconds deve estar entre 30 e 3600';
  end if;

  update public.execution_jobs
  set lease_expires_at = pg_catalog.clock_timestamp()
    + pg_catalog.make_interval(secs => p_lease_seconds)
  where job_id = p_job_id
    and status = 'RUNNING'
    and worker_id = p_worker_id
    and lease_expires_at > pg_catalog.clock_timestamp()
  returning * into v_job;

  if not found then
    raise exception 'job não pertence ao worker ou o lease expirou: %', p_job_id;
  end if;
  return v_job;
end;
$$;

create or replace function public.complete_execution_job(
  p_job_id uuid,
  p_worker_id text,
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
      lease_expires_at = null,
      last_error = case when p_status = 'FAILED' then p_error else null end
  where job_id = p_job_id
    and status = 'RUNNING'
    and worker_id = p_worker_id
    and lease_expires_at > pg_catalog.clock_timestamp()
  returning * into v_job;

  if not found then
    raise exception 'job não está RUNNING para o worker informado: %', p_job_id;
  end if;

  v_source := case when v_job.job_kind = 'PDDEINFO'
    then 'PDDEINFO' else 'CONCILIADOR' end;
  perform public.append_evidence_event(
    v_job.job_id::text || ':attempt:' || v_job.attempts::text || ':finished',
    v_job.run_id,
    'EXECUTION_FINISHED',
    v_job.completed_at,
    v_source,
    v_job.fiscal_year,
    null,
    pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'status', p_status,
      'failed', case
        when p_status = 'FAILED' then 1
        when p_status = 'PARTIAL' then null
        else 0
      end,
      'attempt', v_job.attempts,
      'error', case when p_status = 'FAILED' then p_error else null end
    ))
  );
  return v_job;
end;
$$;

create or replace view public.execution_read_models
with (security_invoker = true)
as
select
  events.run_id,
  coalesce(
    (array_agg(events.source order by events.sequence) filter (
      where events.event_type in ('EXECUTION_STARTED', 'EXECUTION_REQUESTED')
    ))[1],
    (array_agg(events.source order by events.sequence))[1]
  ) as source,
  (array_agg(events.fiscal_year order by events.sequence))[1] as fiscal_year,
  min(events.occurred_at) filter (where events.event_type = 'EXECUTION_REQUESTED')
    as requested_at,
  min(events.occurred_at) filter (where events.event_type = 'EXECUTION_STARTED')
    as started_at,
  max(events.occurred_at) filter (where events.event_type = 'EXECUTION_FINISHED')
    as finished_at,
  case
    when count(*) filter (where events.event_type = 'EXECUTION_FINISHED') > 0 then
      (array_agg(events.payload ->> 'status' order by events.sequence desc) filter (
        where events.event_type = 'EXECUTION_FINISHED'
      ))[1]
    when count(*) filter (where events.event_type = 'EXECUTION_STARTED') > 0 then 'RUNNING'
    when count(*) filter (where events.event_type = 'EXECUTION_REQUESTED') > 0 then 'QUEUED'
    else 'UNKNOWN'
  end as status,
  (array_agg(events.payload ->> 'sourceCollectionRunId' order by events.sequence) filter (
    where events.event_type = 'EXECUTION_STARTED'
      and events.payload ->> 'sourceCollectionRunId' is not null
  ))[1] as source_collection_run_id,
  count(*) as events_count,
  count(*) filter (where events.event_type = 'SOURCE_ATTEMPT_RECORDED') as attempts_count,
  count(*) filter (
    where events.event_type = 'SOURCE_ATTEMPT_RECORDED'
      and events.payload ->> 'status' = 'FAILED'
  ) as failed_attempts_count,
  count(*) filter (where events.event_type = 'ARTIFACT_PRESERVED') as artifacts_count,
  count(*) filter (where events.event_type = 'FINDING_RECORDED') as findings_count,
  count(*) filter (
    where events.event_type = 'FINDING_RECORDED'
      and events.payload ->> 'requiresHumanReview' = 'true'
  ) as human_review_count,
  max(events.sequence) as anchor_sequence
from public.evidence_events as events
group by events.run_id
having count(*) filter (
  where events.event_type in (
    'EXECUTION_REQUESTED',
    'EXECUTION_STARTED',
    'EXECUTION_FINISHED'
  )
) > 0;

revoke all on table public.execution_read_models from public;
revoke all on table public.execution_read_models from anon;
revoke all on table public.execution_read_models from authenticated;
grant select on public.execution_read_models to service_role;

revoke all on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz, integer
) from public, anon, authenticated;
revoke all on function public.claim_execution_job(text, integer)
  from public, anon, authenticated;
revoke all on function public.renew_execution_job_lease(uuid, text, integer)
  from public, anon, authenticated;
revoke all on function public.complete_execution_job(uuid, text, text, text)
  from public, anon, authenticated;

grant execute on function public.enqueue_execution_job(
  uuid, text, text, text, smallint, text, jsonb, timestamptz, integer
) to service_role;
grant execute on function public.claim_execution_job(text, integer) to service_role;
grant execute on function public.renew_execution_job_lease(uuid, text, integer) to service_role;
grant execute on function public.complete_execution_job(uuid, text, text, text) to service_role;
