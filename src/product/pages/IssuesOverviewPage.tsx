import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolio } from '../PortfolioContext';
import type { HumanPortfolioSchool } from '../types';

function sortSchools(schools: readonly HumanPortfolioSchool[]): HumanPortfolioSchool[] {
  return [...schools].sort((left, right) => (
    right.pendingCount - left.pendingCount
    || left.sme.localeCompare(right.sme)
    || left.name.localeCompare(right.name, 'pt-BR')
  ));
}

function registrationLabel(school: HumanPortfolioSchool): string {
  if (!school.registrationAttention) return school.mandateStatus || 'Sem apontamento';
  return school.mandateStatus ? `Acompanhar · ${school.mandateStatus}` : 'Acompanhar cadastro';
}

export function IssuesOverviewPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const schools = state.status === 'ready' ? state.data.schools : [];
  const filtered = useMemo(
    () => sortSchools(schools.filter((school) => (
      schoolMatchesSearch(school, query)
      && (school.pendingCount > 0 || query.trim().length > 0)
    ))),
    [query, schools],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando pendências…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir as pendências.</strong><span>{state.error}</span></div></main>;

  return (
    <main className="page financial-overview-page">
      <div className="eyebrow">Acompanhamento operacional · 2026</div>
      <h1>Pendências</h1>
      <p className="lead">Consolida cadastro e mandato, suspensões informadas pelo FNDE, abertura de conta, prestação de contas e demais pontos de acompanhamento sem transformar ausência de dado em irregularidade.</p>

      <section className="section financial-overview-controls" aria-label="Buscar escola nas pendências">
        <SchoolSearch
          value={query}
          onChange={setQuery}
          visibleCount={filtered.length}
          totalCount={schools.length}
          label="Buscar escola nas pendências"
        />
      </section>

      <section className="section" aria-labelledby="issues-results-title">
        <div className="section-heading">
          <div><div className="eyebrow">Por escola</div><h2 id="issues-results-title">Pontos para acompanhamento</h2></div>
          <p>Cada ocorrência mantém sua origem. Abra a escola para consultar motivo, programa e cobertura da fonte.</p>
        </div>
        <div className="financial-overview-list financial-overview-list--issues" role="list">
          <div className="financial-overview-list__head" aria-hidden="true">
            <span>Escola</span><span>Total</span><span>Cadastro / mandato</span><span>Suspensões</span><span>Contas</span><span>Prestação</span>
          </div>
          {filtered.map((school) => (
            <Link className="financial-overview-row financial-overview-row--issues" key={school.inep} to={`/unidades/${school.inep}#pendencias`} role="listitem">
              <span className="financial-overview-row__school">
                <strong>{school.name}</strong>
                <small>SME {school.sme} · INEP {school.inep}</small>
              </span>
              <span className="financial-overview-row__metric"><small>Total</small><strong>{school.pendingCount}</strong></span>
              <span className="financial-overview-row__metric"><small>Cadastro / mandato</small><strong>{registrationLabel(school)}</strong></span>
              <span className="financial-overview-row__metric"><small>Suspensões</small><strong>{school.suspensionCount}</strong></span>
              <span className="financial-overview-row__metric"><small>Abertura de conta</small><strong>{school.accountOpeningIssueCount}</strong></span>
              <span className="financial-overview-row__metric"><small>Prestação</small><strong>{school.accountingAttentionCount}</strong></span>
              <span className="financial-overview-row__arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
        {filtered.length === 0 ? (
          <div className="empty-state"><div><strong>Nenhuma pendência encontrada no retrato atual.</strong><span>A ausência de apontamento não substitui novas consultas às fontes oficiais.</span></div></div>
        ) : null}
      </section>
    </main>
  );
}
