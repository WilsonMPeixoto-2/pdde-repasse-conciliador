import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeSearchText, schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

export function MovementsOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const wanted = normalizeSearchText(query);
  const rows = useMemo(() => schools.flatMap((school) => school.accounts.flatMap((account) => account.movements.map((movement) => ({
    school,
    account,
    movement,
  }))))
    .filter(({ school, account, movement }) => {
      if (!wanted) return true;
      if (schoolMatchesSearch(school.school, query)) return true;
      return normalizeSearchText([
        account.program, account.bank, account.agency, account.account,
        movement.category ?? '', movement.description, movement.document ?? '',
        movement.counterparty?.name ?? '', movement.counterparty?.document ?? '',
      ].join(' ')).includes(wanted);
    })
    .sort((left, right) => right.movement.date.localeCompare(left.movement.date)
      || left.school.school.sme.localeCompare(right.school.school.sme)), [query, schools, wanted]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando movimentações…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir as movimentações.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Extrato financeiro · 2026</div>
      <h1>Movimentações</h1>
      <p className="lead">Lançamentos bancários observados no SIGEF, preservando histórico, documento, contraparte e classificação auxiliar. A categoria não é juízo automático de regularidade.</p>
      <section className="section financial-overview-controls">
        <div className="search-field">
          <label className="sr-only" htmlFor="movement-search">Buscar movimentação</label>
          <input id="movement-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar escola, programa, histórico, documento ou contraparte" autoComplete="off" />
          <div className="search-count" aria-live="polite">{rows.length} movimentações</div>
        </div>
      </section>
      <section className="section" aria-labelledby="movements-table-title">
        <div className="section-heading"><div><div className="eyebrow">Lançamentos</div><h2 id="movements-table-title">Extrato consolidado</h2></div><p>Crédito e débito permanecem separados, assim como documento e contraparte.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Data</th><th>Escola</th><th>Programa / conta</th><th>Categoria</th><th>Histórico</th><th>Documento</th><th>Contraparte</th><th>Crédito</th><th>Débito</th></tr></thead>
            <tbody>{rows.map(({ school, account, movement }, index) => <tr key={`${school.school.inep}-${account.account}-${movement.date}-${index}`}><td>{formatDate(movement.date)}</td><td><Link to={`/unidades/${school.school.inep}#movimentacoes`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme}</small></td><td>{account.program}<small>Ag. {account.agency} · {account.account}</small></td><td>{movement.category ?? 'Não classificada'}</td><td>{movement.description}</td><td>{movement.document ?? '—'}</td><td>{movement.counterparty?.name ?? '—'}<small>{movement.counterparty?.document ?? ''}</small></td><td>{formatMoney(movement.creditCents)}</td><td>{formatMoney(movement.debitCents)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
