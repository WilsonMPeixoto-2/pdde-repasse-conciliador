import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

type CoverageStatus = 'ALL' | 'AVAILABLE' | 'EMPTY' | 'PARTIAL' | 'UNAVAILABLE';

const LABELS: Record<Exclude<CoverageStatus, 'ALL'>, string> = {
  AVAILABLE: 'Disponível',
  EMPTY: 'Sem registro',
  PARTIAL: 'Parcial',
  UNAVAILABLE: 'Indisponível',
};

export function CoverageOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<CoverageStatus>('ALL');
  const schools = details.status === 'ready' ? details.schools : [];
  const selected = useMemo(() => schools.filter((school) => schoolMatchesSearch(school.school, query)), [query, schools]);
  const rows = useMemo(() => selected.flatMap((school) => school.sourceCoverage.map((coverage) => ({ school, coverage })))
    .filter(({ coverage }) => status === 'ALL' || coverage.status === status)
    .sort((left, right) => left.school.school.sme.localeCompare(right.school.school.sme)
      || left.coverage.dataset.localeCompare(right.coverage.dataset, 'pt-BR')), [selected, status]);

  const counts = useMemo(() => ({
    AVAILABLE: rows.filter(({ coverage }) => coverage.status === 'AVAILABLE').length,
    EMPTY: rows.filter(({ coverage }) => coverage.status === 'EMPTY').length,
    PARTIAL: rows.filter(({ coverage }) => coverage.status === 'PARTIAL').length,
    UNAVAILABLE: rows.filter(({ coverage }) => coverage.status === 'UNAVAILABLE').length,
  }), [rows]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando cobertura das fontes…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir a cobertura das fontes.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Rastreabilidade · 2026</div>
      <h1>Cobertura das Fontes</h1>
      <p className="lead">Mostra o que foi efetivamente obtido para cada escola e conjunto de dados. “Sem registro” permanece diferente de “fonte indisponível”.</p>
      <section className="section financial-overview-controls">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={selected.length} totalCount={schools.length} label="Buscar escola na cobertura" />
        <div className="coverage-filter-bar" aria-label="Filtrar cobertura">
          {(['ALL', 'AVAILABLE', 'EMPTY', 'PARTIAL', 'UNAVAILABLE'] as CoverageStatus[]).map((item) => (
            <button key={item} type="button" className="portfolio-schools-filter" data-active={status === item} aria-pressed={status === item} onClick={() => setStatus(item)}>
              {item === 'ALL' ? 'Todas' : LABELS[item]}
            </button>
          ))}
        </div>
      </section>
      <section className="section" aria-labelledby="coverage-table-title">
        <div className="section-heading"><div><div className="eyebrow">Por escola e fonte</div><h2 id="coverage-table-title">Matriz de cobertura</h2></div><p>{counts.AVAILABLE} disponíveis · {counts.EMPTY} sem registro · {counts.PARTIAL} parciais · {counts.UNAVAILABLE} indisponíveis no recorte.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Fonte / conjunto</th><th>Cobertura</th><th>Detalhe</th></tr></thead>
            <tbody>{rows.map(({ school, coverage }, index) => <tr key={`${school.school.inep}-${coverage.dataset}-${index}`} data-coverage={coverage.status.toLowerCase()}><td><Link to={`/unidades/${school.school.inep}#pendencias`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme} · INEP {school.school.inep}</small></td><td>{coverage.dataset}</td><td><strong>{LABELS[coverage.status]}</strong></td><td>{coverage.detail ?? '—'}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
