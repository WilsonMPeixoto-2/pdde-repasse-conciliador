import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolio } from '../PortfolioContext';
import type { HumanPortfolioSchool } from '../types';
import { derivePortfolioSchoolTriage } from '../visual/portfolio-school-triage';

function sortSchools(schools: readonly HumanPortfolioSchool[]): HumanPortfolioSchool[] {
  return [...schools].sort((left, right) => left.sme.localeCompare(right.sme)
    || left.name.localeCompare(right.name, 'pt-BR'));
}

function coverageLabel(school: HumanPortfolioSchool): string {
  if (school.accountsTotal === 0) return 'Nenhuma conta apresentada';
  return `${school.accountsWithReferencePosition} de ${school.accountsTotal} contas com posição`;
}

export function BalancesOverviewPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const schools = state.status === 'ready' ? state.data.schools : [];
  const filtered = useMemo(
    () => sortSchools(schools.filter((school) => schoolMatchesSearch(school, query))),
    [query, schools],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando saldos…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir os saldos.</strong><span>{state.error}</span></div></main>;

  return (
    <main className="page financial-overview-page">
      <div className="eyebrow">Consulta financeira · 2026</div>
      <h1>Saldos e contas 2026</h1>
      <p className="lead">Encontre o saldo conhecido de cada escola, a data de referência e a cobertura das contas apresentadas no retrato financeiro atual.</p>

      <section className="section financial-overview-controls" aria-label="Buscar escola nos saldos e contas">
        <SchoolSearch
          value={query}
          onChange={setQuery}
          visibleCount={filtered.length}
          totalCount={schools.length}
          label="Buscar escola nos saldos e contas"
        />
      </section>

      <section className="section" aria-labelledby="balance-results-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Por escola</div>
            <h2 id="balance-results-title">Saldo conhecido e cobertura</h2>
          </div>
          <p>Agência, número da conta, aplicações e composição completa permanecem disponíveis dentro do prontuário de cada escola.</p>
        </div>

        <div className="financial-overview-list financial-overview-list--balances" role="list">
          <div className="financial-overview-list__head" aria-hidden="true">
            <span>Escola</span>
            <span>Saldo conhecido</span>
            <span>Referência</span>
            <span>Cobertura</span>
            <span>Situação</span>
          </div>
          {filtered.map((school) => {
            const triage = derivePortfolioSchoolTriage(school);
            return (
              <Link
                className="financial-overview-row financial-overview-row--balances"
                data-status={triage.status}
                key={school.inep}
                to={`/unidades/${school.inep}#contas-saldos`}
                role="listitem"
              >
                <span className="financial-overview-row__school">
                  <strong>{school.name}</strong>
                  <small>SME {school.sme} · INEP {school.inep}</small>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Saldo conhecido</small>
                  <strong>{formatMoney(school.knownBalanceCents)}</strong>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Referência</small>
                  <strong>{formatDate(school.referenceDate)}</strong>
                </span>
                <span className="financial-overview-row__metric">
                  <small>Cobertura</small>
                  <strong>{coverageLabel(school)}</strong>
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
