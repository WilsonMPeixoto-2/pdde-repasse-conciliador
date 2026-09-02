import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeSearchText, schoolMatchesSearch } from '../derive';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

function normalizedStatus(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
function registrationNeedsAttention(school: any): boolean {
  const status = normalizedStatus(school.registration?.mandateStatus);
  const note = normalizedStatus(school.registration?.registrationNote);
  return status.includes('VENCID') || status.includes('VENCER') || note.includes('PENDENCIA') || note.includes('DESATUALIZ');
}
function openingNeedsAttention(status: string): boolean {
  const normalized = normalizedStatus(status);
  return Boolean(normalized) && !(normalized.includes('SEM PENDENCIA') || normalized.includes('REGULAR') || normalized.includes('CONCLUID') || normalized.includes('ABERTA') || normalized.includes('ATIVA'));
}

export function IssuesOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const schools = details.status === 'ready' ? details.schools : [];
  const wanted = normalizeSearchText(query);
  const rows = useMemo(() => schools.flatMap((school) => {
    const items: Array<{ school: typeof school; kind: string; context: string; detail: string; source: string; target: string }> = [];
    if (registrationNeedsAttention(school)) items.push({ school, kind: 'Cadastro ou mandato', context: school.registration?.mandateStatus ?? 'UEx', detail: school.registration?.registrationNote ?? 'Situação cadastral requer acompanhamento.', source: 'PDDEInfo · Cadastro', target: 'cadastro' });
    school.suspensions.forEach((item) => items.push({ school, kind: 'Suspensão informada', context: [item.program, item.destination].filter(Boolean).join(' · '), detail: [item.type, item.detail].filter(Boolean).join(' · '), source: 'PDDEInfo · Suspensões', target: 'pendencias' }));
    school.accountOpenings.filter((item) => openingNeedsAttention(item.status)).forEach((item) => items.push({ school, kind: 'Abertura de conta', context: [item.program, item.bank, item.agency, item.account].filter(Boolean).join(' · '), detail: item.status, source: 'PDDEInfo · Abertura de Conta', target: 'contas-saldos' }));
    school.accounting.filter((item) => item.paymentSuspended || normalizedStatus(item.status).includes('INADIMPL') || normalizedStatus(item.status).includes('PENDENCIA')).forEach((item) => items.push({ school, kind: item.paymentSuspended ? 'Pagamento suspenso' : 'Prestação requer acompanhamento', context: item.program, detail: item.status || 'Situação informada na prestação de contas.', source: 'PDDEInfo · Prestação de Contas', target: 'prestacao-contas' }));
    school.followUp.forEach((message) => items.push({ school, kind: 'Outro ponto de acompanhamento', context: '', detail: message, source: 'Conciliação / cobertura', target: 'pendencias' }));
    return items;
  }).filter((item) => {
    if (!wanted) return true;
    if (schoolMatchesSearch(item.school.school, query)) return true;
    return normalizeSearchText([item.kind, item.context, item.detail, item.source].join(' ')).includes(wanted);
  }).sort((left, right) => left.school.school.sme.localeCompare(right.school.school.sme) || left.kind.localeCompare(right.kind, 'pt-BR')), [query, schools, wanted]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando pendências e suspensões…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir as pendências.</strong><span>{details.error}</span></div></main>;

  return (
    <main className="page data-overview-page">
      <div className="eyebrow">Acompanhamento · 2026</div>
      <h1>Pendências e Suspensões</h1>
      <p className="lead">Cada ocorrência é exibida com sua origem, contexto e detalhe. Ausência de registro ou indisponibilidade de fonte não é convertida em regularidade.</p>
      <section className="section financial-overview-controls">
        <div className="search-field"><label className="sr-only" htmlFor="issue-search">Buscar pendência</label><input id="issue-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar escola, tipo, programa, motivo ou fonte" autoComplete="off" /><div className="search-count" aria-live="polite">{rows.length} ocorrências</div></div>
      </section>
      <section className="section" aria-labelledby="issues-table-title">
        <div className="section-heading"><div><div className="eyebrow">Por ocorrência</div><h2 id="issues-table-title">Pontos para acompanhamento</h2></div><p>Um fato estruturado aparece uma vez, sem duplicação artificial no total.</p></div>
        <div className="data-table-shell">
          <table className="data-table">
            <thead><tr><th>Escola</th><th>Tipo</th><th>Programa / contexto</th><th>Detalhe</th><th>Fonte</th></tr></thead>
            <tbody>{rows.map((item, index) => <tr key={`${item.school.school.inep}-${item.kind}-${index}`}><td><Link to={`/unidades/${item.school.school.inep}#${item.target}`}><strong>{item.school.school.name}</strong></Link><small>SME {item.school.school.sme} · INEP {item.school.school.inep}</small></td><td>{item.kind}</td><td>{item.context || '—'}</td><td>{item.detail || '—'}</td><td>{item.source}</td></tr>)}</tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="empty-state"><div><strong>Nenhuma ocorrência no recorte.</strong><span>Isso não substitui a cobertura explicitada na aba Cobertura das Fontes.</span></div></div> : null}
      </section>
    </main>
  );
}
