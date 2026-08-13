create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.evidence_events (
  sequence bigint primary key,
  event_id text not null unique,
  run_id text not null,
  event_type text not null check (event_type in (
    'EXECUTION_STARTED',
    'EXECUTION_FINISHED',
    'SOURCE_ATTEMPT_RECORDED',
    'ARTIFACT_PRESERVED',
    'OBSERVATION_RECORDED',
    'FINDING_RECORDED'
  )),
  occurred_at timestamptz not null,
  source text not null check (source in (
    'PDDEINFO',
    'SIGEF_LIBERACOES',
    'SIGEF_MOVIMENTACOES',
    'SIGEF_EXTRATO',
    'DADOS_ABERTOS_FNDE',
    'EXTRATO_BANCARIO_AUTORIZADO',
    'CONCILIADOR'
  )),
  fiscal_year smallint not null check (fiscal_year between 2000 and 2100),
  school_inep text null check (school_inep is null or school_inep ~ '^[0-9]{8}$'),
  payload jsonb not null default '{}'::jsonb,
  previous_hash text null check (previous_hash is null or previous_hash ~ '^[a-f0-9]{64}$'),
  event_hash text not null unique check (event_hash ~ '^[a-f0-9]{64}$'),
  persisted_at timestamptz not null default now()
);

create index evidence_events_run_id_sequence_idx
  on public.evidence_events (run_id, sequence);

create index evidence_events_school_inep_sequence_idx
  on public.evidence_events (school_inep, sequence)
  where school_inep is not null;

create index evidence_events_source_year_sequence_idx
  on public.evidence_events (source, fiscal_year, sequence);

alter table public.evidence_events enable row level security;
alter table public.evidence_events force row level security;

revoke all on table public.evidence_events from public;
revoke all on table public.evidence_events from anon;
revoke all on table public.evidence_events from authenticated;
revoke insert, update, delete, truncate on table public.evidence_events from service_role;
grant select on table public.evidence_events to service_role;

create or replace function public.prevent_evidence_event_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'evidence_events is append-only: % is not allowed', tg_op;
end;
$$;

create trigger prevent_evidence_event_mutation
before update or delete on public.evidence_events
for each row execute function public.prevent_evidence_event_mutation();

create trigger prevent_evidence_event_truncate
before truncate on public.evidence_events
for each statement execute function public.prevent_evidence_event_mutation();

create or replace function public.compute_evidence_event_hash(
  p_sequence bigint,
  p_event_id text,
  p_run_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_source text,
  p_fiscal_year smallint,
  p_school_inep text,
  p_previous_hash text,
  p_payload jsonb
)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(
    extensions.digest(
      convert_to(
        concat_ws(
          E'\x1f',
          p_sequence::text,
          p_event_id,
          p_run_id,
          p_event_type,
          to_char(
            p_occurred_at at time zone 'UTC',
            'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
          ),
          p_source,
          p_fiscal_year::text,
          coalesce(p_school_inep, ''),
          coalesce(p_previous_hash, ''),
          p_payload::text
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

revoke all on function public.compute_evidence_event_hash(
  bigint, text, text, text, timestamptz, text, smallint, text, text, jsonb
) from public;
revoke all on function public.compute_evidence_event_hash(
  bigint, text, text, text, timestamptz, text, smallint, text, text, jsonb
) from anon;
revoke all on function public.compute_evidence_event_hash(
  bigint, text, text, text, timestamptz, text, smallint, text, text, jsonb
) from authenticated;

create or replace function public.append_evidence_event(
  p_event_id text,
  p_run_id text,
  p_event_type text,
  p_occurred_at timestamptz,
  p_source text,
  p_fiscal_year smallint,
  p_school_inep text default null,
  p_payload jsonb default '{}'::jsonb
)
returns public.evidence_events
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_last_sequence bigint;
  v_sequence bigint;
  v_previous_hash text;
  v_event_hash text;
  v_row public.evidence_events;
begin
  -- Serializa exclusivamente a escrita do log para que sequência e cadeia de hashes
  -- permaneçam monotônicas mesmo com várias escolas sendo processadas em paralelo.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('pdde-repasse-conciliador:evidence-events:v1')
  );

  if exists (select 1 from public.evidence_events where event_id = p_event_id) then
    raise exception 'eventId duplicado: %', p_event_id;
  end if;

  select sequence, event_hash
  into v_last_sequence, v_previous_hash
  from public.evidence_events
  order by sequence desc
  limit 1;

  v_sequence := coalesce(v_last_sequence, 0) + 1;
  v_event_hash := public.compute_evidence_event_hash(
    v_sequence,
    p_event_id,
    p_run_id,
    p_event_type,
    p_occurred_at,
    p_source,
    p_fiscal_year,
    p_school_inep,
    v_previous_hash,
    p_payload
  );

  insert into public.evidence_events (
    sequence,
    event_id,
    run_id,
    event_type,
    occurred_at,
    source,
    fiscal_year,
    school_inep,
    payload,
    previous_hash,
    event_hash
  ) values (
    v_sequence,
    p_event_id,
    p_run_id,
    p_event_type,
    p_occurred_at,
    p_source,
    p_fiscal_year,
    p_school_inep,
    p_payload,
    v_previous_hash,
    v_event_hash
  )
  returning * into v_row;

  return v_row;
end;
$$;

revoke all on function public.append_evidence_event(
  text, text, text, timestamptz, text, smallint, text, jsonb
) from public;
revoke all on function public.append_evidence_event(
  text, text, text, timestamptz, text, smallint, text, jsonb
) from anon;
revoke all on function public.append_evidence_event(
  text, text, text, timestamptz, text, smallint, text, jsonb
) from authenticated;
grant execute on function public.append_evidence_event(
  text, text, text, timestamptz, text, smallint, text, jsonb
) to service_role;

create or replace function public.verify_evidence_chain()
returns table (
  valid boolean,
  events bigint,
  broken_at_sequence bigint,
  reason text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.evidence_events%rowtype;
  v_expected_sequence bigint := 1;
  v_previous_hash text := null;
  v_expected_hash text;
  v_events bigint := 0;
begin
  for v_row in
    select * from public.evidence_events order by sequence
  loop
    v_events := v_events + 1;

    if v_row.sequence <> v_expected_sequence then
      return query select false, v_events, v_expected_sequence, 'sequência não contígua'::text;
      return;
    end if;

    if v_row.previous_hash is distinct from v_previous_hash then
      return query select false, v_events, v_row.sequence, 'previousHash divergente'::text;
      return;
    end if;

    v_expected_hash := public.compute_evidence_event_hash(
      v_row.sequence,
      v_row.event_id,
      v_row.run_id,
      v_row.event_type,
      v_row.occurred_at,
      v_row.source,
      v_row.fiscal_year,
      v_row.school_inep,
      v_row.previous_hash,
      v_row.payload
    );

    if v_row.event_hash is distinct from v_expected_hash then
      return query select false, v_events, v_row.sequence, 'eventHash divergente'::text;
      return;
    end if;

    v_previous_hash := v_row.event_hash;
    v_expected_sequence := v_expected_sequence + 1;
  end loop;

  return query select true, v_events, null::bigint, null::text;
end;
$$;

revoke all on function public.verify_evidence_chain() from public;
revoke all on function public.verify_evidence_chain() from anon;
revoke all on function public.verify_evidence_chain() from authenticated;
grant execute on function public.verify_evidence_chain() to service_role;
