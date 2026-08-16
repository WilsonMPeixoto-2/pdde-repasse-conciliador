-- Fundação persistente da Plataforma de Inteligência Financeira das Verbas do PDDE/2026.
-- Esta migration é incremental: não reescreve o histórico e mantém 2025 fora do read model corrente.

alter table public.evidence_events
  drop constraint if exists evidence_events_source_check;

alter table public.evidence_events
  add constraint evidence_events_source_check check (source in (
    'PDDEINFO',
    'SIGEF_LIBERACOES',
    'SIGEF_MOVIMENTACOES',
    'SIGEF_EXTRATO',
    'DADOS_ABERTOS_FNDE',
    'PORTAL_TRANSPARENCIA',
    'EXTRATO_BANCARIO_AUTORIZADO',
    'CONCILIADOR'
  ));

update storage.buckets
set allowed_mime_types = case
  when allowed_mime_types is null then array['application/pdf']::text[]
  when not ('application/pdf' = any(allowed_mime_types))
    then array_append(allowed_mime_types, 'application/pdf')
  else allowed_mime_types
end
where id = 'pdde-evidence';

create table public.financial_account_snapshots (
  snapshot_id uuid primary key default gen_random_uuid(),
  school_inep text not null check (school_inep ~ '^[0-9]{8}$'),
  uex_cnpj text not null check (uex_cnpj ~ '^[0-9]{14}$'),
  program_name text not null check (char_length(trim(program_name)) > 0),
  bank text not null check (char_length(trim(bank)) > 0),
  agency text not null check (char_length(trim(agency)) > 0),
  account_number text not null check (char_length(trim(account_number)) > 0),
  reference_date date not null check (
    reference_date >= date '2026-01-01'
    and reference_date <= date '2026-12-31'
  ),
  checking_balance_cents bigint null,
  fund_balance_cents bigint null,
  savings_balance_cents bigint null,
  rdb_cdb_balance_cents bigint null,
  investment_balance_cents bigint null,
  total_reported_balance_cents bigint null,
  source text not null check (source in ('PDDEINFO')),
  collected_at timestamptz not null,
  artifact_sha256 text null check (
    artifact_sha256 is null or artifact_sha256 ~ '^[a-f0-9]{64}$'
  ),
  persisted_at timestamptz not null default now(),
  unique (
    school_inep,
    uex_cnpj,
    program_name,
    bank,
    agency,
    account_number,
    reference_date,
    source
  )
);

create index financial_account_snapshots_school_date_idx
  on public.financial_account_snapshots (school_inep, reference_date desc);
create index financial_account_snapshots_cnpj_date_idx
  on public.financial_account_snapshots (uex_cnpj, reference_date desc);
create index financial_account_snapshots_program_account_date_idx
  on public.financial_account_snapshots (
    school_inep,
    program_name,
    bank,
    agency,
    account_number,
    reference_date desc
  );

alter table public.financial_account_snapshots enable row level security;
alter table public.financial_account_snapshots force row level security;
revoke all on table public.financial_account_snapshots from public, anon, authenticated;
revoke insert, update, delete, truncate on table public.financial_account_snapshots from service_role;
grant select on table public.financial_account_snapshots to service_role;

create or replace function public.append_financial_account_snapshot(
  p_school_inep text,
  p_uex_cnpj text,
  p_program_name text,
  p_bank text,
  p_agency text,
  p_account_number text,
  p_reference_date date,
  p_checking_balance_cents bigint,
  p_fund_balance_cents bigint,
  p_savings_balance_cents bigint,
  p_rdb_cdb_balance_cents bigint,
  p_investment_balance_cents bigint,
  p_total_reported_balance_cents bigint,
  p_source text,
  p_collected_at timestamptz,
  p_artifact_sha256 text default null
)
returns public.financial_account_snapshots
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.financial_account_snapshots;
  v_inserted public.financial_account_snapshots;
begin
  if p_reference_date < date '2026-01-01' or p_reference_date > date '2026-12-31' then
    raise exception 'snapshot financeiro fora do exercício 2026: %', p_reference_date;
  end if;
  if p_source <> 'PDDEINFO' then
    raise exception 'fonte de snapshot financeiro ainda não suportada: %', p_source;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      concat_ws('|',
        p_school_inep, p_uex_cnpj, p_program_name, p_bank,
        p_agency, p_account_number, p_reference_date::text, p_source
      ),
      0
    )
  );

  select * into v_existing
  from public.financial_account_snapshots
  where school_inep = p_school_inep
    and uex_cnpj = p_uex_cnpj
    and program_name = p_program_name
    and bank = p_bank
    and agency = p_agency
    and account_number = p_account_number
    and reference_date = p_reference_date
    and source = p_source;

  if found then
    if v_existing.checking_balance_cents is distinct from p_checking_balance_cents
      or v_existing.fund_balance_cents is distinct from p_fund_balance_cents
      or v_existing.savings_balance_cents is distinct from p_savings_balance_cents
      or v_existing.rdb_cdb_balance_cents is distinct from p_rdb_cdb_balance_cents
      or v_existing.investment_balance_cents is distinct from p_investment_balance_cents
      or v_existing.total_reported_balance_cents is distinct from p_total_reported_balance_cents
    then
      raise exception 'snapshot financeiro conflitante para a mesma posição lógica';
    end if;
    return v_existing;
  end if;

  insert into public.financial_account_snapshots (
    school_inep,
    uex_cnpj,
    program_name,
    bank,
    agency,
    account_number,
    reference_date,
    checking_balance_cents,
    fund_balance_cents,
    savings_balance_cents,
    rdb_cdb_balance_cents,
    investment_balance_cents,
    total_reported_balance_cents,
    source,
    collected_at,
    artifact_sha256
  ) values (
    p_school_inep,
    p_uex_cnpj,
    p_program_name,
    p_bank,
    p_agency,
    p_account_number,
    p_reference_date,
    p_checking_balance_cents,
    p_fund_balance_cents,
    p_savings_balance_cents,
    p_rdb_cdb_balance_cents,
    p_investment_balance_cents,
    p_total_reported_balance_cents,
    p_source,
    p_collected_at,
    p_artifact_sha256
  )
  returning * into v_inserted;

  return v_inserted;
end;
$$;

revoke all on function public.append_financial_account_snapshot(
  text, text, text, text, text, text, date,
  bigint, bigint, bigint, bigint, bigint, bigint,
  text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.append_financial_account_snapshot(
  text, text, text, text, text, text, date,
  bigint, bigint, bigint, bigint, bigint, bigint,
  text, timestamptz, text
) to service_role;

create or replace view public.current_financial_account_positions_2026
with (security_invoker = true)
as
select distinct on (
  school_inep,
  uex_cnpj,
  program_name,
  bank,
  agency,
  account_number,
  source
)
  snapshot_id,
  school_inep,
  uex_cnpj,
  program_name,
  bank,
  agency,
  account_number,
  reference_date,
  checking_balance_cents,
  fund_balance_cents,
  savings_balance_cents,
  rdb_cdb_balance_cents,
  investment_balance_cents,
  total_reported_balance_cents,
  source,
  collected_at,
  artifact_sha256
from public.financial_account_snapshots
where reference_date >= date '2026-01-01'
  and reference_date <= date '2026-12-31'
order by
  school_inep,
  uex_cnpj,
  program_name,
  bank,
  agency,
  account_number,
  source,
  reference_date desc,
  collected_at desc;

revoke all on table public.current_financial_account_positions_2026
  from public, anon, authenticated;
grant select on public.current_financial_account_positions_2026 to service_role;
