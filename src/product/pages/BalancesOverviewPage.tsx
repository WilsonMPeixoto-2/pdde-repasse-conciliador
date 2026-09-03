import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

function matchingOpeningStatus(program: string, openings: Array<{ program: string | null; status: string }>): string {
  const normalized = program.toLocaleUpperCase('pt-BR');
  return openings
    .filter((item) => !item.program || normalized.includes(item.program.toLocaleUpperCase('pt-BR')) || item.program.toLocaleUpperCase('pt-BR').includes(normalized))
    .map((item) => item.status)
    .join(' · ');
}

export function BalancesOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const selected = useMemo(() => schools.filter((school) => schoolMatchesSearch(school.school, query)), [query, schools]);
  const rows = useMemo(() => selected.flatMap((school) => school.accounts.map((account) => ({ school, account })))
    .sort((left, right) => left.school.school.sme.localeCompare(right.school.school.sme)
      || left.account.program.localeCompare(right.account.program, 'pt-BR')), [selected]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando contas e saldos…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir as contas e saldos.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Contas e saldos · 2026</div>
      <h1>Contas e Saldos</h1>
      <p className="lead">Banco, agência, conta, situação de abertura, ocorrência, composição do saldo e data de referência para cada conta observada.</p>
      <section className="section financial-overview-controls"><SchoolSearch value={query} onChange={setQuery} visibleCount={selected.length} totalCount={schools.length} label="Buscar escola nas contas e saldos" /></section>
      <section className="section" aria-labelledby="balance-table-title">
        <div className="section-heading"><div><div className="eyebrow">Por conta</div><h2 id="balance-table-title">{rows.length} contas no recorte</h2></div><p>Aplicação é posição publicada, não rendimento acumulado.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Programa</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Situação de abertura</th><th>Ocorrência</th><th>Saldo em conta</th><th>Fundos</th><th>Poupança</th><th>RDB/CDB</th><th>Aplicações</th><th>Saldo total</th><th>Referência</th></tr></thead>
            <tbody>{rows.map(({ school, account }) => {
              const p = account.latestPosition;
              return <tr key={`${school.school.inep}-${account.bank}-${account.agency}-${account.account}-${account.program}`}>
                <td><Link to={`/unidades/${school.school.inep}#contas-saldos`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme} · INEP {school.school.inep}</small></td>
                <td>{account.program}</td><td>{account.bank || '—'}</td><td>{account.agency || '—'}</td><td>{account.account || '—'}</td>
                <td>{matchingOpeningStatus(account.program, school.accountOpenings) || '—'}</td><td>{account.occurrence ?? '—'}</td>
                <td>{formatMoney(p?.checkingBalanceCents ?? null)}</td><td>{formatMoney(p?.applications.fundsCents ?? null)}</td><td>{formatMoney(p?.applications.savingsCents ?? null)}</td><td>{formatMoney(p?.applications.rdbCdbCents ?? null)}</td><td>{formatMoney(p?.applications.totalCents ?? null)}</td><td>{formatMoney(p?.totalReportedBalanceCents ?? null)}</td><td>{formatDate(p?.referenceDate ?? null)}</td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
