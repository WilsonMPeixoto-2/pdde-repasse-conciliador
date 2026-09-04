import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  derivePddeBasicPortfolio,
  pddeBasicBalanceLocationLabel,
  pddeBasicEvidenceStateLabel,
  pddeBasicInstallmentStateLabel,
  type PddeBasicSchoolReading,
} from '../../../shared/pdde-basic-monitoring';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

type FilterMode =
  | 'all'
  | 'first_pending'
  | 'second_paid'
  | 'credit_located'
  | 'temporal_gap'
  | 'evidence_gap'
  | 'coherence_alert'
  | 'checking'
  | 'application';

function moneyTone(value: number | null): 'positive' | 'zero' | 'unknown' | 'negative' {
  if (value === null) return 'unknown';
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'zero';
}

function installmentTone(row: PddeBasicSchoolReading['first']): 'paid' | 'waiting' | 'missing' {
  if (row.state === 'PAID_INFORMED') return 'paid';
  if (row.state === 'PROGRAMMED') return 'waiting';
  return 'missing';
}

function matchesFilter(row: PddeBasicSchoolReading, filter: FilterMode): boolean {
  if (filter === 'first_pending') return row.first.state !== 'PAID_INFORMED';
  if (filter === 'second_paid') return row.second.state === 'PAID_INFORMED';
  if (filter === 'credit_located') return row.firstEvidence.creditLocated;
  if (filter === 'temporal_gap') return row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT';
  if (filter === 'evidence_gap') return row.firstEvidence.needsSourceEscalation;
  if (filter === 'coherence_alert') return row.firstEvidence.isContradiction;
  if (filter === 'checking') return (row.balance.checkingCents ?? 0) > 0;
  if (filter === 'application') return (row.balance.applicationsCents ?? 0) > 0;
  return true;
}

export function PddeBasicOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const schools = details.status === 'ready' ? details.schools : [];
  const monitoring = useMemo(() => derivePddeBasicPortfolio(schools), [schools]);
  const visibleRows = useMemo(() => monitoring.rows
    .filter((row) => schoolMatchesSearch(row, query))
    .filter((row) => matchesFilter(row, filter)), [filter, monitoring.rows, query]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando acompanhamento do PDDE Básico…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir o acompanhamento do PDDE Básico.</strong><span>{details.error}</span></div></main>;

  const staleZeroCount = monitoring.rows.filter((row) => (
    row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT'
    && row.balance.totalCents === 0
  )).length;
  const filters: Array<{ key: FilterMode; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: monitoring.schoolCount },
    { key: 'first_pending', label: '1ª/P1 sem pagamento', count: monitoring.firstPendingCount },
    { key: 'second_paid', label: '2ª/P2 paga', count: monitoring.secondPaidCount },
    { key: 'credit_located', label: 'Crédito localizado', count: monitoring.firstCreditLocatedCount },
    { key: 'temporal_gap', label: 'Saldo anterior ao pagamento', count: monitoring.balanceBeforePaymentCount },
    { key: 'evidence_gap', label: 'Evidência a completar', count: monitoring.firstNeedsSourceEscalationCount },
    { key: 'coherence_alert', label: 'Inconsistência real', count: monitoring.trueInconsistencyCount },
    { key: 'checking', label: 'Valor em conta', count: monitoring.checkingPositiveCount },
    { key: 'application', label: 'Valor aplicado', count: monitoring.applicationsPositiveCount },
  ];

  return (
    <main className="page data-overview-page pdde-basic-page">
      <div className="eyebrow">PDDE Básico · 2026</div>
      <h1>Parcelas, evidência bancária e localização do saldo</h1>
      <p className="lead">
        A tela separa três perguntas diferentes: o FNDE informou o pagamento? o crédito foi localizado no extrato?
        e a posição de saldo disponível é posterior ao pagamento? Só dados temporalmente comparáveis são tratados como possível inconsistência.
      </p>

      <section className="section pdde-basic-summary" aria-label="Resumo do PDDE Básico">
        <div className="pdde-basic-summary__grid">
          <article data-tone={monitoring.firstPendingCount === 0 ? 'positive' : 'attention'}>
            <span>1ª parcela / P1 com pagamento informado</span>
            <strong>{monitoring.firstPaidCount} de {monitoring.schoolCount}</strong>
            <small>{monitoring.firstRegularCount} PDDE Básico + {monitoring.firstInfancyCount} Primeira Infância.</small>
          </article>
          <article data-tone={monitoring.secondPaidCount > 0 ? 'positive' : 'waiting'}>
            <span>2ª parcela / P2 com pagamento informado</span>
            <strong>{monitoring.secondPaidCount} de {monitoring.schoolCount}</strong>
            <small>{monitoring.secondPendingCount} ainda sem pagamento informado.</small>
          </article>
          <article data-tone="positive">
            <span>Crédito do 1º ciclo localizado no SIGEF</span>
            <strong>{monitoring.firstCreditLocatedCount} de {monitoring.firstPaidCount}</strong>
            <small>Evidência bancária mais forte que o simples “pagamento informado”.</small>
          </article>
          <article data-tone={monitoring.balanceBeforePaymentCount > 0 ? 'application' : 'neutral'}>
            <span>Saldo publicado anterior ao pagamento</span>
            <strong>{monitoring.balanceBeforePaymentCount} escolas</strong>
            <small>{staleZeroCount} aparecem zeradas por essa defasagem e não devem ser tratadas como contradição.</small>
          </article>
          <article data-tone={monitoring.trueInconsistencyCount > 0 ? 'attention' : 'positive'}>
            <span>Inconsistência temporalmente comparável</span>
            <strong>{monitoring.trueInconsistencyCount}</strong>
            <small>Pagamento anterior/igual à referência, mas saldo posterior zerado e sem crédito localizado.</small>
          </article>
          <article data-tone="checking">
            <span>Saldo PDDE positivo</span>
            <strong>{monitoring.balancePositiveCount} escolas</strong>
            <small>{monitoring.checkingPositiveCount} com valor em conta · {monitoring.applicationsPositiveCount} com valor aplicado.</small>
          </article>
        </div>
      </section>

      <section className="section financial-overview-controls">
        <SchoolSearch
          value={query}
          onChange={setQuery}
          visibleCount={visibleRows.length}
          totalCount={monitoring.schoolCount}
          label="Buscar escola no acompanhamento do PDDE Básico"
        />
        <div className="pdde-basic-filter-bar" aria-label="Filtros do PDDE Básico">
          {filters.map((item) => (
            <button
              className="portfolio-schools-filter"
              data-active={filter === item.key ? 'true' : 'false'}
              key={item.key}
              type="button"
              aria-pressed={filter === item.key}
              onClick={() => setFilter(item.key)}
            >
              <span>{item.label}</span>
              <strong>{item.count}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="section" aria-labelledby="pdde-basic-table-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Escola por escola</div>
            <h2 id="pdde-basic-table-title">{visibleRows.length} unidades no recorte</h2>
          </div>
          <p>
            Saldo positivo depois do pagamento é coerente, mas não prova sozinho o crédito específico.
            Saldo anterior ao pagamento não é usado para negar o recebimento.
          </p>
        </div>

        <div className="data-table-shell">
          <table className="data-table data-table--pdde-basic">
            <thead>
              <tr>
                <th>Escola</th>
                <th>1ª parcela / P1</th>
                <th>Evidência bancária</th>
                <th>2ª parcela / P2</th>
                <th>Conta corrente</th>
                <th>Aplicações</th>
                <th>Saldo total PDDE</th>
                <th>Referência do saldo</th>
                <th>Leitura coerente</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr
                  key={row.inep}
                  data-first-pending={row.first.state !== 'PAID_INFORMED' || undefined}
                  data-coherence-alert={row.firstEvidence.isContradiction || undefined}
                >
                  <td>
                    <Link to={`/unidades/${row.inep}#contas-saldos`}><strong>{row.name}</strong></Link>
                    <small>SME {row.sme} · INEP {row.inep}</small>
                  </td>
                  <td data-money-state={moneyTone(row.first.paymentInformedCents)}>
                    <span className="pdde-basic-status" data-tone={installmentTone(row.first)}>
                      {pddeBasicInstallmentStateLabel(row.first.state)}
                    </span>
                    <strong>{formatMoney(row.first.paymentInformedCents)}</strong>
                    <small>{row.first.track} · {row.first.paymentInformedDate ? formatDate(row.first.paymentInformedDate) : 'sem data válida'}</small>
                  </td>
                  <td>
                    <span className="pdde-basic-evidence" data-state={row.firstEvidence.state.toLowerCase()}>
                      {row.firstEvidence.creditLocated
                        ? `Crédito localizado · ${formatMoney(row.first.creditLocatedCents)}`
                        : 'Crédito específico ainda não localizado'}
                    </span>
                  </td>
                  <td data-money-state={moneyTone(row.second.paymentInformedCents)} data-expected-positive={row.second.programmedCents > 0 && row.second.paymentInformedCents === 0 || undefined}>
                    <span className="pdde-basic-status" data-tone={installmentTone(row.second)}>
                      {pddeBasicInstallmentStateLabel(row.second.state)}
                    </span>
                    <strong>{formatMoney(row.second.paymentInformedCents)}</strong>
                    <small>{row.second.track} · programado {formatMoney(row.second.programmedCents)}</small>
                  </td>
                  <td data-money-state={moneyTone(row.balance.checkingCents)}>
                    <strong>{formatMoney(row.balance.checkingCents)}</strong>
                  </td>
                  <td data-money-state={moneyTone(row.balance.applicationsCents)} data-money-kind="application">
                    <strong>{formatMoney(row.balance.applicationsCents)}</strong>
                  </td>
                  <td data-money-state={moneyTone(row.balance.totalCents)}>
                    <strong>{formatMoney(row.balance.totalCents)}</strong>
                    <small>{pddeBasicBalanceLocationLabel(row.balance.location)}</small>
                  </td>
                  <td>{formatDate(row.balance.referenceDate)}</td>
                  <td>
                    <span className="pdde-basic-evidence" data-state={row.firstEvidence.state.toLowerCase()}>
                      {pddeBasicEvidenceStateLabel(row.firstEvidence.state)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
