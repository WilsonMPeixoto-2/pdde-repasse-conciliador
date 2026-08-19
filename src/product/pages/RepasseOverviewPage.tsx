import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatMoney } from '../format';
import { usePortfolio } from '../PortfolioContext';
import type { HumanPortfolioSchool } from '../types';
import { derivePortfolioSchoolTriage } from '../visual/portfolio-school-triage';

function sortSchools(schools: readonly HumanPortfolioSchool[]): HumanPortfolioSchool[] {
  return [...schools].sort((left, right) => left.sme.localeCompare(right.sme)
    || left.name.localeCompare(right.name, 'pt-BR'));
}

export function RepasseOverviewPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const schools = state.status === 'ready' ? state.data.schools : [];
  const filtered = useMemo(
    () => sortSchools(schools.filter((school) => schoolMatchesSearch(school, query))),
    [query, schools],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando repasses…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir os repasses.</strong><span>{state.error}</span></div></main>;

  return (
    <main className="page financial-overview-page">
      <div className="eyebrow">Consulta financeira · 2026</div>
      <h1>Repasses 2026</h1>
      <p className="lead">Localize uma escola e compare, sem misturar evidências, o valor previsto, o pagamento informado pelo PDDEInfo e o crédito compatível localizado.</p>

      <section className="section financial-overview-controls" aria-label="Buscar escola nos repasses">
        <SchoolSearch
          value={query}
          onChange={setQuery}
          visibleCount={filtered.length}
          totalCount={schools.length}
          label="Buscar escola nos repasses"
        />
      </section>

      <section className="section" aria-labelledby="repasse-results-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Por escola</div>
            <h2 id="repasse-results-title">Valores do repasse</h2>
          </div>
          <p>Pagamento informado e crédito localizado representam etapas diferentes e permanecem apresentados separadamente.</p>
        </div>

        <div className="financial-overview-list" role="list">
          <div className="financial-overview-list__head" aria-hidden="true">
            <span>Escola</span>
            <span>Previsto em 2026</span>
            <span>Pagamento informado</span>
            <span>Crédito localizado</span>
            <span>Situação</span>
          </div>
          {filtered.map((school) => {
            const triage = derivePortfolioSchoolTriage(school);
            return (
              <Link
                className="financial-overview-row"
                data-status={triage.status}
                key={school.inep}
                to={`/unidades/${school.inep}#repasses`}
                role="listitem"
              >
                <span className="financial-overview-row__school">
                  <strong>{school.name}</strong>
                  <small>SME {school.sme} · INEP {school.inep}</small>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Previsto em 2026</small>
                  <strong>{formatMoney(school.programmedCents)}</strong>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Pagamento informado</small>
                  <strong>{formatMoney(school.paymentInformedCents)}</strong>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Crédito localizado</small>
                  <strong>{formatMoney(school.creditLocatedCents)}</strong>
                </span>
                <span className="financial-overview-row__status">{triage.label}</span>
                <span className="financial-overview-row__arrow" aria-hidden="true">→</span>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state"><div><strong>Nenhuma escola encontrada.</strong><span>Altere o termo de busca para ampliar o resultado.</span></div></div>
        ) : null}
      </section>
    </main>
  );
}
