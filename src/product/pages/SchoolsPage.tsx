import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolio } from '../PortfolioContext';

export function SchoolsPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const schools = state.status === 'ready' ? state.data.schools : [];
  const filtered = useMemo(
    () => schools.filter((school) => schoolMatchesSearch(school, query)),
    [schools, query],
  );

  if (state.status === 'loading') return <main className="page loading"><p>Carregando unidades…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir a carteira.</strong><span>{state.error}</span></div></main>;

  return (
    <main className="page">
      <div className="eyebrow">Carteira · 2026</div>
      <h1>Unidades da 4ª CRE</h1>
      <p className="lead">Busque uma unidade pelo nome, código SME ou INEP e abra diretamente seu prontuário financeiro.</p>
      <section className="section" aria-label="Busca e lista de unidades">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={filtered.length} totalCount={schools.length} />
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
        {filtered.length === 0 ? <div className="empty-state"><div><strong>Nenhuma unidade encontrada.</strong><span>Confira o nome, código SME ou INEP informado.</span></div></div> : null}
      </section>
    </main>
  );
}
