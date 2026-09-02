import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

export function RepasseOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const selected = useMemo(() => schools.filter((school) => schoolMatchesSearch(school.school, query)), [query, schools]);
  const rows = useMemo(() => selected.flatMap((school) => school.programs.flatMap((program) => program.installments.map((installment) => ({
    school, program, installment,
  })))).sort((left, right) => left.school.school.sme.localeCompare(right.school.school.sme)
    || left.program.name.localeCompare(right.program.name, 'pt-BR')
    || (left.installment.installment ?? '').localeCompare(right.installment.installment ?? '', 'pt-BR')), [selected]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando repasses…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir os repasses.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Repasses · 2026</div>
      <h1>Repasses</h1>
      <p className="lead">Programação, custeio, capital, ajustes, pagamento informado, ordem FNDE e evidência bancária por programa e parcela, sem fundir etapas diferentes do repasse.</p>
      <section className="section financial-overview-controls">
        <SchoolSearch value={query} onChange={setQuery} visibleCount={selected.length} totalCount={schools.length} label="Buscar escola nos repasses" />
      </section>
      <section className="section" aria-labelledby="repasse-table-title">
        <div className="section-heading"><div><div className="eyebrow">Por parcela</div><h2 id="repasse-table-title">{rows.length} registros de repasse</h2></div><p>Pagamento informado continua distinto de crédito compatível localizado.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Programa / ação</th><th>Parcela</th><th>Programado custeio</th><th>Programado capital</th><th>Ajuste custeio</th><th>Ajuste capital</th><th>Programado final</th><th>Pago custeio</th><th>Pago capital</th><th>Pagamento informado</th><th>Data pagamento</th><th>Ordem FNDE</th><th>Conta</th><th>Crédito compatível</th></tr></thead>
            <tbody>{rows.map(({ school, program, installment }, index) => {
              const b = installment.breakdown;
              return <tr key={`${school.school.inep}-${program.name}-${installment.installment ?? 'repasse'}-${index}`}>
                <td><Link to={`/unidades/${school.school.inep}#repasses`}><strong>{school.school.name}</strong></Link><small>SME {school.school.sme} · INEP {school.school.inep}</small></td>
                <td>{program.name}</td><td>{installment.installment ?? 'Sem divisão'}</td>
                <td>{formatMoney(b?.programmedCusteioCents ?? null)}</td><td>{formatMoney(b?.programmedCapitalCents ?? null)}</td>
                <td>{formatMoney(b?.adjustmentCusteioCents ?? null)}</td><td>{formatMoney(b?.adjustmentCapitalCents ?? null)}</td>
                <td>{formatMoney(installment.programmedCents)}</td><td>{formatMoney(b?.paidCusteioCents ?? null)}</td><td>{formatMoney(b?.paidCapitalCents ?? null)}</td>
                <td>{formatMoney(installment.paymentInformedCents)}</td><td>{formatDate(installment.paymentInformedDate)}</td><td>{formatDate(installment.paymentOrderDate)}</td>
                <td>{installment.account ? `Banco ${installment.account.bank} · Ag. ${installment.account.agency} · ${installment.account.number}` : '—'}</td>
                <td><strong>{installment.creditEvidence.status}</strong><small>{installment.creditEvidence.date ? `${formatDate(installment.creditEvidence.date)} · ${formatMoney(installment.creditEvidence.amountCents)}` : ''}</small></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
