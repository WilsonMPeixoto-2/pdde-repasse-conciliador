import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolio } from '../PortfolioContext';
import type { HumanPortfolioSchool } from '../types';

function sortSchools(schools: readonly HumanPortfolioSchool[]): HumanPortfolioSchool[] {
  return [...schools].sort((left, right) => (
    Number(right.paymentSuspended) - Number(left.paymentSuspended)
    || right.accountingAttentionCount - left.accountingAttentionCount
    || left.sme.localeCompare(right.sme)
  ));
}

export function AccountingOverviewPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const schools = state.status === 'ready' ? state.data.schools : [];
  const filtered = useMemo(
    () => sortSchools(schools.filter((school) => schoolMatchesSearch(school, query))),
    [query, schools],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando prestações de contas…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir as prestações de contas.</strong><span>{state.error}</span></div></main>;

  return (
    <main className="page financial-overview-page">
      <div className="eyebrow">Prestação de contas · 2026</div>
      <h1>Prestação de contas</h1>
      <p className="lead">Visão da carteira para localizar unidades com suspensão ou situação que requer acompanhamento. O detalhamento oficial por programa permanece no prontuário da escola.</p>

      <section className="section financial-overview-controls" aria-label="Buscar escola na prestação de contas">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={filtered.length} totalCount={schools.length} label="Buscar escola na prestação de contas" />
      </section>

      <section className="section" aria-labelledby="accounting-results-title">
        <div className="section-heading">
          <div><div className="eyebrow">Por escola</div><h2 id="accounting-results-title">Situação informada</h2></div>
          <p>Suspensão de pagamento e situação da prestação são fatos publicados pela fonte; não constituem julgamento automático do sistema.</p>
        </div>
        <div className="financial-overview-list financial-overview-list--accounting" role="list">
          <div className="financial-overview-list__head" aria-hidden="true">
            <span>Escola</span><span>Pagamento</span><span>Pontos de prestação</span><span>Abrir</span>
          </div>
          {filtered.map((school) => (
            <Link className="financial-overview-row financial-overview-row--accounting" key={school.inep} to={`/unidades/${school.inep}#prestacao-contas`} role="listitem">
              <span className="financial-overview-row__school"><strong>{school.name}</strong><small>SME {school.sme} · INEP {school.inep}</small></span>
              <span className="financial-overview-row__metric"><small>Pagamento</small><strong>{school.paymentSuspended ? 'Suspenso informado' : 'Sem suspensão informada'}</strong></span>
              <span className="financial-overview-row__metric"><small>Pontos de prestação</small><strong>{school.accountingAttentionCount}</strong></span>
              <span className="financial-overview-row__metric"><small>Abrir</small><strong>Ver programas</strong></span>
              <span className="financial-overview-row__arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
