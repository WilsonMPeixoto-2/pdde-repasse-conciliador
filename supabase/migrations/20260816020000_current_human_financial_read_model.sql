-- Read model humano corrente da Inteligência Financeira PDDE/2026.
-- O retrato fiscal técnico continua separado. A função pública concedida ao
-- service_role publica ambos na mesma transação para impedir runs divergentes.

create table public.current_human_financial_snapshots (
  fiscal_year smallint primary key check (fiscal_year = 2026),
  run_id text not null unique check (
    char_length(run_id) between 1 and 160
    and run_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  title text not null,
  reference_label text not null,
  school_count integer not null check (school_count > 0),
  sources jsonb not null check (jsonb_typeof(sources) = 'array'),
  indicators jsonb not null check (jsonb_typeof(indicators) = 'array'),
  published_at timestamptz not null default pg_catalog.clock_timestamp()
);

create table public.current_human_financial_schools (
  fiscal_year smallint not null
    references public.current_human_financial_snapshots(fiscal_year)
    on delete cascade,
  school_inep text not null check (school_inep ~ '^\d{8}$'),
  run_id text not null check (
    char_length(run_id) between 1 and 160
    and run_id ~ '^[A-Za-z0-9._:-]+$'
  ),
  sme text not null check (sme ~ '^\d{7}$'),
  school_name text not null,
  uex text not null,
  cnpj text not null,
  snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  primary key (fiscal_year, school_inep)
);

create index current_human_financial_schools_run_idx
  on public.current_human_financial_schools (run_id, sme, school_inep);

alter table public.current_human_financial_snapshots enable row level security;
alter table public.current_human_financial_snapshots force row level security;
alter table public.current_human_financial_schools enable row level security;
alter table public.current_human_financial_schools force row level security;

revoke all on table public.current_human_financial_snapshots
  from public, anon, authenticated;
revoke all on table public.current_human_financial_schools
  from public, anon, authenticated;
grant select on table public.current_human_financial_snapshots to service_role;
grant select on table public.current_human_financial_schools to service_role;

create or replace function public.publish_current_human_financial_snapshot(
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
  v_indicator jsonb;
  v_unit jsonb;
  v_expected integer;
  v_inserted integer := 0;
  v_known_ineps text[];
begin
  if p_run_id is null
    or char_length(p_run_id) not between 1 and 160
    or p_run_id !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception 'run_id inválido para publicação humana';
  end if;

  if pg_catalog.jsonb_typeof(p_snapshot) <> 'object' then
    raise exception 'snapshot humano inválido';
  end if;
  if (p_snapshot #>> '{portfolio,fiscalYear}')::integer <> 2026 then
    raise exception 'somente o exercício 2026 pode ser publicado na visão humana';
  end if;
  if p_snapshot #>> '{portfolio,runId}' <> p_run_id then
    raise exception 'run_id divergente no snapshot humano';
  end if;
  if pg_catalog.jsonb_typeof(p_snapshot -> 'schools') <> 'array' then
    raise exception 'lista de escolas ausente no snapshot humano';
  end if;
  if pg_catalog.jsonb_typeof(p_snapshot #> '{portfolio,sources}') <> 'array' then
    raise exception 'fontes humanas ausentes ou inválidas';
  end if;
  if pg_catalog.jsonb_typeof(p_snapshot #> '{portfolio,indicators}') <> 'array' then
    raise exception 'indicadores humanos ausentes ou inválidos';
  end if;

  v_expected := (p_snapshot #>> '{portfolio,schoolCount}')::integer;
  if v_expected is null or v_expected <= 0
    or pg_catalog.jsonb_array_length(p_snapshot -> 'schools') <> v_expected
  then
    raise exception 'cobertura escolar inconsistente no snapshot humano';
  end if;

  select pg_catalog.array_agg(value #>> '{school,inep}')
    into v_known_ineps
  from pg_catalog.jsonb_array_elements(p_snapshot -> 'schools');

  if pg_catalog.cardinality(v_known_ineps) <> v_expected
    or pg_catalog.cardinality(
      array(select distinct unnest(v_known_ineps))
    ) <> v_expected
  then
    raise exception 'snapshot humano contém INEP duplicado';
  end if;

  for v_indicator in
    select value from pg_catalog.jsonb_array_elements(p_snapshot #> '{portfolio,indicators}')
  loop
    if pg_catalog.jsonb_typeof(v_indicator -> 'units') <> 'array'
      or (v_indicator ->> 'count')::integer
        <> pg_catalog.jsonb_array_length(v_indicator -> 'units')
    then
      raise exception 'indicador humano inconsistente: %', coalesce(v_indicator ->> 'label', '(sem rótulo)');
    end if;

    for v_unit in
      select value from pg_catalog.jsonb_array_elements(v_indicator -> 'units')
    loop
      if not ((v_unit ->> 'inep') = any(v_known_ineps)) then
        raise exception 'unidade de indicador fora do portfólio: %', v_unit ->> 'inep';
      end if;
    end loop;
  end loop;

  insert into public.current_human_financial_snapshots (
    fiscal_year,
    run_id,
    title,
    reference_label,
    school_count,
    sources,
    indicators,
    published_at
  ) values (
    2026,
    p_run_id,
    p_snapshot #>> '{portfolio,title}',
    p_snapshot #>> '{portfolio,referenceLabel}',
    v_expected,
    p_snapshot #> '{portfolio,sources}',
    p_snapshot #> '{portfolio,indicators}',
    pg_catalog.clock_timestamp()
  )
  on conflict (fiscal_year) do update
  set run_id = excluded.run_id,
      title = excluded.title,
      reference_label = excluded.reference_label,
      school_count = excluded.school_count,
      sources = excluded.sources,
      indicators = excluded.indicators,
      published_at = excluded.published_at;

  delete from public.current_human_financial_schools where fiscal_year = 2026;

  for v_school in
    select value from pg_catalog.jsonb_array_elements(p_snapshot -> 'schools')
  loop
    insert into public.current_human_financial_schools (
      fiscal_year,
      school_inep,
      run_id,
      sme,
      school_name,
      uex,
      cnpj,
      snapshot,
      updated_at
    ) values (
      2026,
      v_school #>> '{school,inep}',
      p_run_id,
      v_school #>> '{school,sme}',
      v_school #>> '{school,name}',
      coalesce(v_school #>> '{school,uex}', ''),
      coalesce(v_school #>> '{school,cnpj}', ''),
      v_school -> 'snapshot',
      pg_catalog.clock_timestamp()
    );
    v_inserted := v_inserted + 1;
  end loop;

  if v_inserted <> v_expected then
    raise exception 'publicação humana incompleta: %/% escolas', v_inserted, v_expected;
  end if;
end;
$$;

-- Não conceder esta função isolada ao service_role. O runtime usa somente a
-- publicação combinada abaixo, para que fiscal e humano permaneçam no mesmo run.
revoke all on function public.publish_current_human_financial_snapshot(text, jsonb)
  from public, anon, authenticated, service_role;

create or replace function public.publish_current_monitoring_snapshot(
  p_run_id text,
  p_fiscal_snapshot jsonb,
  p_human_snapshot jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_run_id is null
    or char_length(p_run_id) not between 1 and 160
    or p_run_id !~ '^[A-Za-z0-9._:-]+$'
  then
    raise exception 'run_id inválido para publicação do monitoramento';
  end if;

  if p_fiscal_snapshot #>> '{portfolio,runId}' <> p_run_id
    or p_human_snapshot #>> '{portfolio,runId}' <> p_run_id
  then
    raise exception 'run_id divergente entre os retratos do monitoramento';
  end if;
  if (p_fiscal_snapshot #>> '{portfolio,fiscalYear}')::integer <> 2026
    or (p_human_snapshot #>> '{portfolio,fiscalYear}')::integer <> 2026
  then
    raise exception 'somente o exercício 2026 pode ser publicado';
  end if;

  -- Ambas as funções são executadas na mesma transação desta chamada. Qualquer
  -- exceção na segunda publicação desfaz também a primeira.
  perform public.publish_current_fiscal_snapshot(p_run_id, p_fiscal_snapshot);
  perform public.publish_current_human_financial_snapshot(p_run_id, p_human_snapshot);
end;
$$;

revoke all on function public.publish_current_monitoring_snapshot(text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_current_monitoring_snapshot(text, jsonb, jsonb)
  to service_role;
