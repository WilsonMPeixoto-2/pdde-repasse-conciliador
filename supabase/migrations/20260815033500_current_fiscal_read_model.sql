-- Retrato fiscal corrente do exercício 2026.
-- Mantém apenas a publicação atual para leitura rápida do produto; o histórico
-- completo continua preservado na trilha de evidências e nos artefatos do run.

create table public.current_fiscal_snapshots (
  fiscal_year smallint primary key check (fiscal_year = 2026),
  run_id text not null unique check (
    char_length(run_id) between 1 and 160
    and run_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  generated_at timestamptz not null,
  source_generated_at timestamptz not null,
  source_status text not null check (source_status = 'COMPLETE'),
  source_observations jsonb not null default '[]'::jsonb check (jsonb_typeof(source_observations) = 'array'),
  coverage jsonb not null default '{}'::jsonb check (jsonb_typeof(coverage) = 'object'),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  published_at timestamptz not null default pg_catalog.clock_timestamp()
);

create table public.current_fiscal_schools (
  fiscal_year smallint not null references public.current_fiscal_snapshots(fiscal_year) on delete cascade,
  school_inep text not null check (school_inep ~ '^\d{8}$'),
  run_id text not null check (
    char_length(run_id) between 1 and 160
    and run_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  sme text not null check (sme ~ '^\d{7}$'),
  school_name text not null,
  uex text not null,
  cnpj text not null,
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (fiscal_year, school_inep)
);

create index current_fiscal_schools_run_idx
  on public.current_fiscal_schools (run_id, sme, school_inep);

alter table public.current_fiscal_snapshots enable row level security;
alter table public.current_fiscal_snapshots force row level security;
alter table public.current_fiscal_schools enable row level security;
alter table public.current_fiscal_schools force row level security;

revoke all on table public.current_fiscal_snapshots from public, anon, authenticated;
revoke all on table public.current_fiscal_schools from public, anon, authenticated;
grant select on table public.current_fiscal_snapshots to service_role;
grant select on table public.current_fiscal_schools to service_role;

create or replace function public.publish_current_fiscal_snapshot(
  p_run_id text,
  p_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school jsonb;
  v_expected integer;
  v_inserted integer := 0;
begin
  if p_run_id is null
    or char_length(p_run_id) not between 1 and 160
    or p_run_id !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception 'run_id inválido para publicação fiscal';
  end if;

  if pg_catalog.jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'snapshot fiscal inválido';
  end if;
  if (p_snapshot #>> '{portfolio,fiscalYear}')::integer <> 2026 then
    raise exception 'somente o exercício 2026 pode ser publicado';
  end if;
  if p_snapshot ->> 'sourceStatus' <> 'COMPLETE' then
    raise exception 'somente MONITORING completo pode substituir o retrato corrente';
  end if;
  if p_snapshot #>> '{portfolio,runId}' <> p_run_id then
    raise exception 'run_id divergente no snapshot fiscal';
  end if;
  if pg_catalog.jsonb_typeof(p_snapshot -> 'schools') <> 'array' then
    raise exception 'lista de escolas ausente no snapshot fiscal';
  end if;

  v_expected := (p_snapshot #>> '{portfolio,metrics,schools}')::integer;
  if v_expected is null or v_expected <= 0
    or pg_catalog.jsonb_array_length(p_snapshot -> 'schools') <> v_expected
  then
    raise exception 'cobertura escolar inconsistente no snapshot fiscal';
  end if;

  insert into public.current_fiscal_snapshots (
    fiscal_year, run_id, generated_at, source_generated_at, source_status,
    source_observations, coverage, metrics, published_at
  ) values (
    2026,
    p_run_id,
    (p_snapshot #>> '{portfolio,generatedAt}')::timestamptz,
    (p_snapshot #>> '{portfolio,sourceGeneratedAt}')::timestamptz,
    p_snapshot ->> 'sourceStatus',
    p_snapshot #> '{portfolio,sourceObservations}',
    p_snapshot #> '{portfolio,coverage}',
    p_snapshot #> '{portfolio,metrics}',
    pg_catalog.clock_timestamp()
  )
  on conflict (fiscal_year) do update
  set run_id = excluded.run_id,
      generated_at = excluded.generated_at,
      source_generated_at = excluded.source_generated_at,
      source_status = excluded.source_status,
      source_observations = excluded.source_observations,
      coverage = excluded.coverage,
      metrics = excluded.metrics,
      published_at = excluded.published_at;

  delete from public.current_fiscal_schools where fiscal_year = 2026;

  for v_school in select value from pg_catalog.jsonb_array_elements(p_snapshot -> 'schools')
  loop
    insert into public.current_fiscal_schools (
      fiscal_year, school_inep, run_id, sme, school_name, uex, cnpj,
      metrics, snapshot, updated_at
    ) values (
      2026,
      v_school #>> '{school,inep}',
      p_run_id,
      v_school #>> '{school,sme}',
      v_school #>> '{school,name}',
      coalesce(v_school #>> '{school,uex}', ''),
      coalesce(v_school #>> '{school,cnpj}', ''),
      v_school -> 'metrics',
      v_school -> 'snapshot',
      pg_catalog.clock_timestamp()
    );
    v_inserted := v_inserted + 1;
  end loop;

  if v_inserted <> v_expected then
    raise exception 'publicação fiscal incompleta: %/% escolas', v_inserted, v_expected;
  end if;
end;
$$;

revoke all on function public.publish_current_fiscal_snapshot(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_current_fiscal_snapshot(text, jsonb)
  to service_role;
