import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

type PositionRow = {
  school: ReturnType<typeof usePortfolioSchoolDetails> extends never ? never : any;
  program: string;
  bank: string;
  agency: string;
  account: string;
  referenceDate: string;
  checking: number | null;
  funds: number | null;
  savings: number | null;
  rdbCdb: number | null;
  applications: number | null;
  total: number | null;
};

function sumKnown(values: Array<number | null>): number | null {
  const known = values.filter((value): value is number => value !== null);
  return known.length > 0 ? known.reduce((total, value) => total + value, 0) : null;
}

export function MonthlyEvolutionPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const selected = useMemo(() => schools.filter((school) => schoolMatchesSearch(school.school, query)), [query, schools]);
  const rows = useMemo<PositionRow[]>(() => selected.flatMap((school) => school.accounts.flatMap((account) => (
    account.positions.map((position) => ({
      school,
      program: account.program,
      bank: account.bank,
      agency: account.agency,
      account: account.account,
      referenceDate: position.referenceDate,
      checking: position.checkingBalanceCents,
      funds: position.applications.fundsCents,
      savings: position.applications.savingsCents,
      rdbCdb: position.applications.rdbCdbCents,
      applications: position.applications.totalCents,
      total: position.totalReportedBalanceCents,
    }))
  ))).sort((left, right) => right.referenceDate.localeCompare(left.referenceDate)
    || left.school.school.sme.localeCompare(right.school.school.sme)), [selected]);

  const monthly = useMemo(() => {
    const groups = new Map<string, PositionRow[]>();
    for (const row of rows) groups.set(row.referenceDate, [...(groups.get(row.referenceDate) ?? []), row]);
    return [...groups.entries()]
      .sort(([left], [right]) => right.localeCompare(left))
      .map(([referenceDate, items]) => ({
        referenceDate,
        accounts: items.length,
        checking: sumKnown(items.map((item) => item.checking)),
        applications: sumKnown(items.map((item) => item.applications)),
        total: sumKnown(items.map((item) => item.total)),
      }));
  }, [rows]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando evolução mensal…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir a evolução mensal.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Saldos e aplicações · 2026</div>
      <h1>Evolução Mensal</h1>
      <p className="lead">Série das posições públicas de saldo e aplicações por data de referência. Totais são subtotais conhecidos das contas com posição naquele mês, acompanhados pela própria cobertura.</p>
      <section className="section financial-overview-controls">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={selected.length} totalCount={schools.length} label="Filtrar evolução por escola" />
      </section>
      <section className="section" aria-labelledby="monthly-summary-title">
        <div className="section-heading"><div><div className="eyebrow">Por referência</div><h2 id="monthly-summary-title">Resumo mensal</h2></div><p>Não são preenchidos meses ausentes com zero.</p></div>
        <div className="data-table-shell">
          <table className="data-table data-table--compact">
            <thead><tr><th>Referência</th><th>Contas com posição</th><th>Saldo em conta conhecido</th><th>Aplicações conhecidas</th><th>Saldo total conhecido</th></tr></thead>
            <tbody>{monthly.map((item) => <tr key={item.referenceDate}><td>{formatDate(item.referenceDate)}</td><td>{item.accounts}</td><td>{formatMoney(item.checking)}</td><td>{formatMoney(item.applications)}</td><td>{formatMoney(item.total)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
      <section className="section" aria-labelledby="monthly-detail-title">
        <div className="section-heading"><div><div className="eyebrow">Por conta</div><h2 id="monthly-detail-title">Posições observadas</h2></div><p>Detalhamento da série que também alimenta a aba Evolução Mensal do Excel.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Programa</th><th>Conta</th><th>Referência</th><th>Saldo em conta</th><th>Fundos</th><th>Poupança</th><th>RDB/CDB</th><th>Aplicações</th><th>Saldo total</th></tr></thead>
            <tbody>{rows.map((row, index) => <tr key={`${row.school.school.inep}-${row.account}-${row.referenceDate}-${index}`}><td><Link to={`/unidades/${row.school.school.inep}#contas-saldos`}><strong>{row.school.school.name}</strong></Link><small>SME {row.school.school.sme}</small></td><td>{row.program}</td><td>Ag. {row.agency} · {row.account}</td><td>{formatDate(row.referenceDate)}</td><td>{formatMoney(row.checking)}</td><td>{formatMoney(row.funds)}</td><td>{formatMoney(row.savings)}</td><td>{formatMoney(row.rdbCdb)}</td><td>{formatMoney(row.applications)}</td><td>{formatMoney(row.total)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
