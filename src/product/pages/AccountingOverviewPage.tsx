import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

export function AccountingOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const selected = useMemo(() => schools.filter((school) => schoolMatchesSearch(school.school, query)), [query, schools]);
  const rows = useMemo(() => selected.flatMap((school) => school.accounting.map((accounting) => ({
    school,
    accounting,
    suspensionReasons: school.suspensions
      .filter((item) => !item.program || item.program === accounting.program)
      .map((item) => item.type),
  }))).sort((left, right) => Number(right.accounting.paymentSuspended) - Number(left.accounting.paymentSuspended)
    || left.school.school.sme.localeCompare(right.school.school.sme)
    || left.accounting.program.localeCompare(right.accounting.program, 'pt-BR')), [selected]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando prestação de contas…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir a prestação de contas.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Prestação de contas · 2026</div>
      <h1>Prestação de Contas</h1>
      <p className="lead">Situação publicada por escola e programa, valor previsto, suspensão de pagamento e motivos informados pelo FNDE. A plataforma exibe o fato da fonte, não emite julgamento automático de regularidade.</p>
      <section className="section financial-overview-controls"><SchoolSearch value={query} onChange={setQuery} visibleCount={selected.length} totalCount={schools.length} label="Buscar escola na prestação de contas" /></section>
      <section className="section" aria-labelledby="accounting-table-title">
        <div className="section-heading"><div><div className="eyebrow">Por programa</div><h2 id="accounting-table-title">{rows.length} situações publicadas</h2></div><p>Motivos de suspensão permanecem separados da situação geral da prestação.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Programa</th><th>Situação</th><th>Pagamento suspenso</th><th>Motivo(s) de suspensão</th><th>Valor previsto</th></tr></thead>
            <tbody>{rows.map(({ school, accounting, suspensionReasons }, index) => <tr key={`${school.school.inep}-${accounting.program}-${index}`} data-attention={accounting.paymentSuspended || undefined}><td><Link to={`/unidades/${school.school.inep}#prestacao-contas`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme} · INEP {school.school.inep}</small></td><td>{accounting.program}</td><td>{accounting.status || '—'}</td><td>{accounting.paymentSuspended ? 'Sim' : 'Não'}</td><td>{suspensionReasons.join(' · ') || '—'}</td><td>{formatMoney(accounting.expectedTotalCents)}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
