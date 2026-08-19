import { useMemo, useState } from 'react';
import { PortfolioSchoolList } from '../components/PortfolioSchoolList';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { usePortfolio } from '../PortfolioContext';
import { derivePortfolioSchoolTriage } from '../visual/portfolio-school-triage';

type FilterMode = 'all' | 'attention' | 'coverage' | 'suspended';
type SortMode = 'attention' | 'sme';

function matchesFilter(
  mode: FilterMode,
  school: Parameters<typeof derivePortfolioSchoolTriage>[0],
): boolean {
  const triage = derivePortfolioSchoolTriage(school);
  if (mode === 'attention') return triage.needsAttention;
  if (mode === 'coverage') {
    return school.accountsTotal === 0
      || school.accountsWithReferencePosition < school.accountsTotal;
  }
  if (mode === 'suspended') return school.paymentSuspended;
  return true;
}

export function SchoolsPage() {
  const state = usePortfolio();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const [sort, setSort] = useState<SortMode>('sme');
  const schools = state.status === 'ready' ? state.data.schools : [];

  const counts = useMemo(() => ({
    all: schools.length,
    attention: schools.filter((school) => matchesFilter('attention', school)).length,
    coverage: schools.filter((school) => matchesFilter('coverage', school)).length,
    suspended: schools.filter((school) => matchesFilter('suspended', school)).length,
  }), [schools]);

  const filtered = useMemo(() => {
    const result = schools
      .filter((school) => schoolMatchesSearch(school, query))
      .filter((school) => matchesFilter(filter, school));

    return [...result].sort((left, right) => {
      if (sort === 'attention') {
        const priority = derivePortfolioSchoolTriage(right).priority
          - derivePortfolioSchoolTriage(left).priority;
        if (priority !== 0) return priority;
      }
      return left.sme.localeCompare(right.sme)
        || left.name.localeCompare(right.name, 'pt-BR');
    });
  }, [filter, query, schools, sort]);

  if (state.status === 'loading') return <main className="page loading"><p>Carregando unidades…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir a carteira.</strong><span>{state.error}</span></div></main>;

  const filters: Array<{ mode: FilterMode; label: string }> = [
    { mode: 'all', label: 'Todas' },
    { mode: 'attention', label: 'Com atenção' },
    { mode: 'coverage', label: 'Cobertura incompleta' },
    { mode: 'suspended', label: 'Pagamento suspenso' },
  ];

  return (
    <main className="page portfolio-schools-page">
      <div className="eyebrow">Escolas · 2026</div>
      <h1>Unidades da 4ª CRE</h1>
      <p className="lead">Localize e compare as escolas por nome, código SME ou INEP. A lista mostra os valores básicos de repasse e saldo; filtros de acompanhamento continuam disponíveis quando você precisar investigar situações específicas.</p>

      <section className="section portfolio-schools-controls" aria-label="Busca, filtros e ordenação da carteira">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={filtered.length} totalCount={schools.length} />

        <div className="portfolio-schools-toolbar">
          <div className="portfolio-schools-filter-group">
            <span className="portfolio-schools-filter-group__label">Filtros de acompanhamento</span>
            <div className="portfolio-schools-filters" aria-label="Filtros da carteira">
              {filters.map((item) => (
                <button
                  className="portfolio-schools-filter"
                  data-active={filter === item.mode ? 'true' : 'false'}
                  key={item.mode}
                  type="button"
                  aria-pressed={filter === item.mode}
                  onClick={() => setFilter(item.mode)}
                >
                  <span>{item.label}</span>
                  <strong>{counts[item.mode]}</strong>
                </button>
              ))}
            </div>
          </div>

          <label className="portfolio-schools-sort">
            <span>Ordenação</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)}>
              <option value="sme">Código SME</option>
              <option value="attention">Atenção primeiro</option>
            </select>
          </label>
        </div>
      </section>

      <section className="section portfolio-schools-results" aria-labelledby="portfolio-schools-results-title">
        <div className="section-heading portfolio-schools-results__heading">
          <div>
            <div className="eyebrow">Leitura por unidade</div>
            <h2 id="portfolio-schools-results-title">{filtered.length} {filtered.length === 1 ? 'unidade' : 'unidades'} no recorte</h2>
          </div>
          <p>Previsto, pagamento informado e crédito localizado permanecem separados. Saldo e cobertura referem-se à posição pública indicada na própria linha.</p>
        </div>

        {filtered.length > 0
          ? <PortfolioSchoolList schools={filtered} />
          : <div className="empty-state"><div><strong>Nenhuma unidade encontrada.</strong><span>Altere a busca ou o filtro para ampliar o recorte.</span></div></div>}
      </section>
    </main>
  );
}
