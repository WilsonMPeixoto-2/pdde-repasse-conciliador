import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatCnpj, formatDate } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

export function RegistrationOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const filtered = useMemo(() => [...schools]
    .filter((school) => schoolMatchesSearch(school.school, query))
    .sort((left, right) => left.school.sme.localeCompare(right.school.sme)), [query, schools]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando cadastro e habilitação…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir o cadastro.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Cadastro e habilitação · 2026</div>
      <h1>Cadastro e Habilitação</h1>
      <p className="lead">Visão consolidada dos dados cadastrais da UEx, quantidade de alunos, localização, rede, mandato e atualização publicados nas fontes do FNDE.</p>
      <section className="section financial-overview-controls">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={filtered.length} totalCount={schools.length} label="Buscar escola no cadastro" />
      </section>
      <section className="section" aria-labelledby="registration-table-title">
        <div className="section-heading">
          <div><div className="eyebrow">Carteira</div><h2 id="registration-table-title">Situação cadastral das escolas</h2></div>
          <p>Campo vazio significa que a informação não foi apresentada no retrato atual, não que a situação esteja regular.</p>
        </div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>UEx / CNPJ</th><th>Alunos</th><th>Localização</th><th>Rede</th><th>Mandato</th><th>Fim do mandato</th><th>Atualização</th></tr></thead>
            <tbody>
              {filtered.map((school) => (
                <tr key={school.school.inep}>
                  <td><Link to={`/unidades/${school.school.inep}#cadastro`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme} · INEP {school.school.inep}</small></td>
                  <td><strong>{school.registration?.uexName ?? school.school.uex ?? 'Não informada'}</strong><small>{formatCnpj(school.registration?.uexCnpj ?? school.school.cnpj)}</small></td>
                  <td>{school.registration?.studentCount ?? '—'}</td>
                  <td>{school.registration?.location ?? '—'}</td>
                  <td>{school.registration?.network ?? '—'}</td>
                  <td>{school.registration?.mandateStatus ?? '—'}</td>
                  <td>{formatDate(school.registration?.mandateEndDate ?? null)}</td>
                  <td>{formatDate(school.registration?.updatedDate ?? null)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
