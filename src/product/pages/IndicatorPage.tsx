import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolio } from '../PortfolioContext';
import { slugify } from '../routing';

export function IndicatorPage() {
  const state = usePortfolio();
  const { slug = '' } = useParams();
  const [query, setQuery] = useState('');
  const indicator = state.status === 'ready'
    ? state.data.indicators.find((item) => slugify(item.label) === slug) ?? null
    : null;
  const units = indicator?.units ?? [];
  const filtered = useMemo(
    () => units.filter((school) => schoolMatchesSearch(school, query)),
    [units, query],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando acompanhamento…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir o acompanhamento.</strong><span>{state.error}</span></div></main>;
  if (!indicator) return <main className="page empty-state"><div><strong>Indicador não encontrado.</strong><Link className="text-link" to="/">Voltar à visão geral</Link></div></main>;

  return (
    <main className="page">
      <div className="eyebrow">Acompanhamento · 2026</div>
      <h1>{indicator.count}</h1>
      <p className="lead">{indicator.label}</p>
      <section className="section" aria-label={`Unidades em ${indicator.label}`}>
        <SchoolSearch value={query} onChange={setQuery} visibleCount={filtered.length} totalCount={indicator.count} label="Buscar dentro deste conjunto" />
        <div className="school-list" style={{ marginTop: '2rem' }}>
          {filtered.map((school) => (
            <Link className="school-row" key={school.inep} to={`/unidades/${school.inep}`}>
              <span>
                <span className="school-row__name">{school.sme} · {school.name}</span>
                <span className="school-row__meta">INEP {school.inep}</span>
              </span>
              <span className="school-row__arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
