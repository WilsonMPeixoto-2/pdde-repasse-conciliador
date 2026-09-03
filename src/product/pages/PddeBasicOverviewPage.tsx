import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  derivePddeBasicPortfolio,
  pddeBasicBalanceLocationLabel,
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
  | 'second_pending'
  | 'checking'
  | 'application'
  | 'zero';

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
  if (filter === 'second_pending') return row.second.state !== 'PAID_INFORMED';
  if (filter === 'checking') return (row.balance.checkingCents ?? 0) > 0;
  if (filter === 'application') return (row.balance.applicationsCents ?? 0) > 0;
  if (filter === 'zero') return row.balance.totalCents === 0;
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

  const filters: Array<{ key: FilterMode; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: monitoring.schoolCount },
    { key: 'first_pending', label: '1ª parcela pendente', count: monitoring.firstPendingCount },
    { key: 'second_paid', label: '2ª parcela paga', count: monitoring.secondPaidCount },
    { key: 'second_pending', label: '2ª parcela pendente', count: monitoring.secondPendingCount },
    { key: 'checking', label: 'Valor em conta', count: monitoring.checkingPositiveCount },
    { key: 'application', label: 'Valor aplicado', count: monitoring.applicationsPositiveCount },
    { key: 'zero', label: 'Saldo zerado', count: monitoring.rows.filter((row) => row.balance.totalCents === 0).length },
  ];

  return (
    <main className="page data-overview-page pdde-basic-page">
      <div className="eyebrow">PDDE Básico · 2026</div>
      <h1>1ª e 2ª parcelas + localização do saldo</h1>
      <p className="lead">
        Uma leitura única para verificar se cada escola já possui pagamento informado da primeira e da segunda parcela
        e onde o saldo do PDDE está na referência pública mais recente: conta corrente, aplicação ou ambos.
      </p>

      <section className="section pdde-basic-summary" aria-label="Resumo do PDDE Básico">
        <div className="pdde-basic-summary__grid">
          <article data-tone={monitoring.firstPendingCount === 0 ? 'positive' : 'attention'}>
            <span>1ª parcela com pagamento informado</span>
            <strong>{monitoring.firstPaidCount} de {monitoring.schoolCount}</strong>
            <small>
              {monitoring.firstPendingCount === 0 ? 'Todas as escolas cobertas' : `${monitoring.firstPendingCount} ainda sem pagamento informado`}
              {' · '}{monitoring.firstRegularCount} PDDE Básico + {monitoring.firstInfancyCount} Primeira Infância
            </small>
          </article>
          <article data-tone={monitoring.secondPaidCount > 0 ? 'positive' : 'waiting'}>
            <span>2ª parcela com pagamento informado</span>
            <strong>{monitoring.secondPaidCount} de {monitoring.schoolCount}</strong>
            <small>
              {monitoring.secondPendingCount} ainda sem pagamento informado
              {' · '}{monitoring.secondRegularCount} PDDE Básico + {monitoring.secondInfancyCount} Primeira Infância
            </small>
          </article>
          <article data-tone="positive">
            <span>Saldo positivo do PDDE</span>
            <strong>{monitoring.balancePositiveCount} escolas</strong>
            <small>{formatMoney(monitoring.totalBalanceCents)} na posição pública</small>
          </article>
          <article data-tone="checking">
            <span>Valor em conta corrente</span>
            <strong>{monitoring.checkingPositiveCount} escolas</strong>
            <small>{formatMoney(monitoring.checkingCents)}</small>
          </article>
          <article data-tone="application">
            <span>Valor em aplicação</span>
            <strong>{monitoring.applicationsPositiveCount} escolas</strong>
            <small>{formatMoney(monitoring.applicationsCents)}</small>
          </article>
          <article data-tone={monitoring.noPositionCount > 0 ? 'attention' : 'neutral'}>
            <span>Sem posição publicada</span>
            <strong>{monitoring.noPositionCount}</strong>
            <small>Ausência de posição não é tratada como saldo zero</small>
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
            “Pagamento informado” é o registro do FNDE. A posição em conta/aplicação usa o saldo público mais recente
            da conta PDDE e não deve ser confundida com confirmação bancária do repasse específico.
          </p>
        </div>

        <div className="data-table-shell">
          <table className="data-table data-table--pdde-basic">
            <thead>
              <tr>
                <th>Escola</th>
                <th>Modalidade 1ª</th>
                <th>1ª parcela</th>
                <th>Valor 1ª</th>
                <th>Modalidade 2ª</th>
                <th>2ª parcela</th>
                <th>Valor 2ª</th>
                <th>Em conta corrente</th>
                <th>Em aplicação</th>
                <th>Saldo total PDDE</th>
                <th>Onde está o saldo</th>
                <th>Referência</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.inep} data-first-pending={row.first.state !== 'PAID_INFORMED' || undefined}>
                  <td>
                    <Link to={`/unidades/${row.inep}#contas-saldos`}><strong>{row.name}</strong></Link>
                    <small>SME {row.sme} · INEP {row.inep}</small>
                  </td>
                  <td>{row.first.track}</td>
                  <td>
                    <span className="pdde-basic-status" data-tone={installmentTone(row.first)}>
                      {pddeBasicInstallmentStateLabel(row.first.state)}
                    </span>
                    <small>{row.first.paymentInformedDate ? formatDate(row.first.paymentInformedDate) : ''}</small>
                  </td>
                  <td data-money-state={moneyTone(row.first.paymentInformedCents)}>
                    <strong>{formatMoney(row.first.paymentInformedCents)}</strong>
                    <small>Programado {formatMoney(row.first.programmedCents)}</small>
                  </td>
                  <td>{row.second.track}</td>
                  <td>
                    <span className="pdde-basic-status" data-tone={installmentTone(row.second)}>
                      {pddeBasicInstallmentStateLabel(row.second.state)}
                    </span>
                    <small>{row.second.paymentInformedDate ? formatDate(row.second.paymentInformedDate) : ''}</small>
                  </td>
                  <td data-money-state={moneyTone(row.second.paymentInformedCents)} data-expected-positive={row.second.programmedCents > 0 && row.second.paymentInformedCents === 0 || undefined}>
                    <strong>{formatMoney(row.second.paymentInformedCents)}</strong>
                    <small>Programado {formatMoney(row.second.programmedCents)}</small>
                  </td>
                  <td data-money-state={moneyTone(row.balance.checkingCents)}>
                    <strong>{formatMoney(row.balance.checkingCents)}</strong>
                  </td>
                  <td data-money-state={moneyTone(row.balance.applicationsCents)} data-money-kind="application">
                    <strong>{formatMoney(row.balance.applicationsCents)}</strong>
                  </td>
                  <td data-money-state={moneyTone(row.balance.totalCents)}>
                    <strong>{formatMoney(row.balance.totalCents)}</strong>
                  </td>
                  <td>
                    <span className="pdde-basic-location" data-location={row.balance.location.toLowerCase()}>
                      {pddeBasicBalanceLocationLabel(row.balance.location)}
                    </span>
                  </td>
                  <td>{formatDate(row.balance.referenceDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
