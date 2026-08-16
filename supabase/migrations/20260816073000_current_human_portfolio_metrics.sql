-- Métricas executivas do read model humano corrente.
-- Retratos antigos podem permanecer com metrics = null durante o rollout; a
-- camada de leitura os trata como ainda não prontos. A próxima publicação
-- completa grava as métricas reais de 2026 de forma atômica com o retrato fiscal.

alter table public.current_human_financial_snapshots
  add column if not exists metrics jsonb;

alter table public.current_human_financial_snapshots
  drop constraint if exists current_human_financial_snapshots_metrics_object;

alter table public.current_human_financial_snapshots
  add constraint current_human_financial_snapshots_metrics_object
  check (metrics is null or pg_catalog.jsonb_typeof(metrics) = 'object');

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
  v_metrics jsonb;
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

  v_metrics := p_snapshot #> '{portfolio,metrics}';
  if pg_catalog.jsonb_typeof(v_metrics) <> 'object' then
    raise exception 'métricas humanas ausentes ou inválidas';
  end if;

  v_expected := (p_snapshot #>> '{portfolio,schoolCount}')::integer;
  if v_expected is null or v_expected <= 0
    or pg_catalog.jsonb_array_length(p_snapshot -> 'schools') <> v_expected
  then
    raise exception 'cobertura escolar inconsistente no snapshot humano';
  end if;
  if (v_metrics ->> 'schoolCount')::integer <> v_expected then
    raise exception 'cobertura escolar divergente nas métricas humanas';
  end if;
  if (v_metrics ->> 'accountsTotal')::integer < 0
    or (v_metrics ->> 'accountsWithPosition')::integer < 0
    or (v_metrics ->> 'accountsWithPosition')::integer > (v_metrics ->> 'accountsTotal')::integer
    or (v_metrics ->> 'programmedCents')::bigint < 0
    or (v_metrics ->> 'paymentInformedCents')::bigint < 0
    or (v_metrics ->> 'creditLocatedCents')::bigint < 0
  then
    raise exception 'métricas humanas financeiras inconsistentes';
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
    metrics,
    sources,
    indicators,
    published_at
  ) values (
    2026,
    p_run_id,
    p_snapshot #>> '{portfolio,title}',
    p_snapshot #>> '{portfolio,referenceLabel}',
    v_expected,
    v_metrics,
    p_snapshot #> '{portfolio,sources}',
    p_snapshot #> '{portfolio,indicators}',
    pg_catalog.clock_timestamp()
  )
  on conflict (fiscal_year) do update
  set run_id = excluded.run_id,
      title = excluded.title,
      reference_label = excluded.reference_label,
      school_count = excluded.school_count,
      metrics = excluded.metrics,
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

revoke all on function public.publish_current_human_financial_snapshot(text, jsonb)
  from public, anon, authenticated, service_role;
