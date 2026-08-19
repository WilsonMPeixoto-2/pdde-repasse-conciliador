import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { schoolMatchesSearch } from '../derive';
import type { HumanPortfolioSchool } from '../types';

export function GlobalSchoolFinder({
  schools,
  maxResults = 6,
  initialQuery = '',
}: {
  schools: readonly HumanPortfolioSchool[];
  maxResults?: number;
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const results = useMemo(() => {
    const wanted = query.trim();
    if (!wanted) return [];
    return schools
      .filter((school) => schoolMatchesSearch(school, wanted))
      .sort((left, right) => left.sme.localeCompare(right.sme)
        || left.name.localeCompare(right.name, 'pt-BR'))
      .slice(0, maxResults);
  }, [maxResults, query, schools]);

  return (
    <div className="global-school-finder">
      <label htmlFor="global-school-search">Encontrar uma escola</label>
      <div className="global-school-finder__input-wrap">
        <input
          id="global-school-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Digite nome, código SME ou INEP"
          autoComplete="off"
        />
      </div>

      {query.trim() ? (
        <div className="global-school-finder__results" aria-live="polite">
          {results.length > 0 ? (
            <>
              <div className="global-school-finder__count">
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </div>
              <div role="list" className="global-school-finder__list">
                {results.map((school) => (
                  <Link
                    role="listitem"
                    className="global-school-finder__result"
                    key={school.inep}
                    to={`/unidades/${school.inep}`}
                  >
                    <span>
                      <strong>{school.name}</strong>
                      <small>SME {school.sme} · INEP {school.inep}</small>
                    </span>
                    <span aria-hidden="true">→</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <div className="global-school-finder__empty">Nenhuma escola encontrada para este termo.</div>
          )}
        </div>
      ) : (
        <p className="global-school-finder__hint">Pesquise entre as {schools.length} unidades da 4ª CRE.</p>
      )}
    </div>
  );
}
