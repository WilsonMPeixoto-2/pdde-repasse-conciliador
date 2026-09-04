import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  derivePddeBasicPortfolio,
  pddeBasicBalanceLocationLabel,
  pddeBasicEvidenceStateLabel,
  pddeBasicInstallmentStateLabel,
  type PddeBasicSchoolReading,
} from '../../../shared/pdde-basic-monitoring';
import {
  derivePddeBasicFirstCycleReleaseEvidence,
  pddeBasicReleaseEvidenceLabel,
} from '../../../shared/pdde-basic-release-evidence';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

type FilterMode =
  | 'all'
  | 'first_pending'
  | 'second_paid'
  | 'sigef_evidence'
  | 'current_location_unknown'
  | 'comparable_checking'
  | 'comparable_application'
  | 'coherence_alert';

function installmentTone(row: PddeBasicSchoolReading['first']): 'paid' | 'waiting' | 'missing' {
  if (row.state === 'PAID_INFORMED') return 'paid';
  if (row.state === 'PROGRAMMED') return 'waiting';
  return 'missing';
}

function balanceIsComparable(row: PddeBasicSchoolReading): boolean {
  return row.first.state === 'PAID_INFORMED'
    && Boolean(row.first.paymentInformedDate)
    && Boolean(row.balance.referenceDate)
    && row.balance.totalCents !== null
    && (row.balance.referenceDate as string) >= (row.first.paymentInformedDate as string);
}

function comparableLocationLabel(row: PddeBasicSchoolReading): string {
  if (!balanceIsComparable(row)) return 'Localização atual não comprovada';
  return pddeBasicBalanceLocationLabel(row.balance.location);
}

function locationDetail(row: PddeBasicSchoolReading): string {
  if (!balanceIsComparable(row)) {
    if (row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT') {
      return 'A última posição oficial é anterior ao pagamento informado.';
    }
    if (row.firstEvidence.state === 'NO_BALANCE_POSITION') {
      return 'Não existe posição de saldo publicada para comparação.';
    }
    if (row.firstEvidence.state === 'PAYMENT_DATE_UNAVAILABLE') {
      return 'Falta data válida do pagamento para comparação temporal.';
    }
    return 'As fontes públicas ainda não permitem afirmar a localização corrente.';
  }
  const pieces: string[] = [];
  if ((row.balance.checkingCents ?? 0) > 0) pieces.push(`conta ${formatMoney(row.balance.checkingCents)}`);
  if ((row.balance.applicationsCents ?? 0) > 0) pieces.push(`aplicações ${formatMoney(row.balance.applicationsCents)}`);
  if (pieces.length === 0) pieces.push(`saldo ${formatMoney(row.balance.totalCents)}`);
  return `${pieces.join(' · ')} · posição ${formatDate(row.balance.referenceDate)}`;
}

function matchesFilter(
  row: PddeBasicSchoolReading,
  filter: FilterMode,
  hasSigefEvidence: boolean,
): boolean {
  if (filter === 'first_pending') return row.first.state !== 'PAID_INFORMED';
  if (filter === 'second_paid') return row.second.state === 'PAID_INFORMED';
  if (filter === 'sigef_evidence') return hasSigefEvidence;
  if (filter === 'current_location_unknown') return row.first.state === 'PAID_INFORMED' && !balanceIsComparable(row);
  if (filter === 'comparable_checking') return balanceIsComparable(row) && (row.balance.checkingCents ?? 0) > 0;
  if (filter === 'comparable_application') return balanceIsComparable(row) && (row.balance.applicationsCents ?? 0) > 0;
  if (filter === 'coherence_alert') return row.firstEvidence.isContradiction;
  return true;
}

export function PddeBasicOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');
  const schools = details.status === 'ready' ? details.schools : [];
  const monitoring = useMemo(() => derivePddeBasicPortfolio(schools), [schools]);
  const releaseEvidenceByInep = useMemo(() => new Map(schools.map((school) => [
    school.school.inep,
    derivePddeBasicFirstCycleReleaseEvidence(school),
  ])), [schools]);

  const comparableRows = useMemo(() => monitoring.rows.filter(balanceIsComparable), [monitoring.rows]);
  const currentLocationUnknownCount = monitoring.rows.filter((row) => (
    row.first.state === 'PAID_INFORMED' && !balanceIsComparable(row)
  )).length;
  const comparableCheckingCount = comparableRows.filter((row) => (row.balance.checkingCents ?? 0) > 0).length;
  const comparableApplicationCount = comparableRows.filter((row) => (row.balance.applicationsCents ?? 0) > 0).length;
  const comparableBothCount = comparableRows.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;
  const sigefEvidenceCount = monitoring.rows.filter((row) => (
    releaseEvidenceByInep.get(row.inep)?.hasIndependentSigefEvidence === true
  )).length;
  const sigefEvidenceGapCount = monitoring.firstPaidCount - sigefEvidenceCount;

  const visibleRows = useMemo(() => monitoring.rows
    .filter((row) => schoolMatchesSearch(row, query))
    .filter((row) => matchesFilter(
      row,
      filter,
      releaseEvidenceByInep.get(row.inep)?.hasIndependentSigefEvidence === true,
    )), [filter, monitoring.rows, query, releaseEvidenceByInep]);

  if (details.status === 'loading') return <main className="page loading"><p>Carregando acompanhamento do PDDE Básico…</p></main>;
  if (details.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir o acompanhamento do PDDE Básico.</strong><span>{details.error}</span></div></main>;

  const filters: Array<{ key: FilterMode; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: monitoring.schoolCount },
    { key: 'first_pending', label: '1º ciclo sem pagamento informado', count: monitoring.firstPendingCount },
    { key: 'second_paid', label: '2º ciclo com pagamento informado', count: monitoring.secondPaidCount },
    { key: 'sigef_evidence', label: 'Evidência SIGEF do 1º ciclo', count: sigefEvidenceCount },
    { key: 'current_location_unknown', label: 'Localização atual não comprovada', count: currentLocationUnknownCount },
    { key: 'comparable_checking', label: 'Posição comparável com valor em conta', count: comparableCheckingCount },
    { key: 'comparable_application', label: 'Posição comparável com valor aplicado', count: comparableApplicationCount },
    { key: 'coherence_alert', label: 'Inconsistência temporal real', count: monitoring.trueInconsistencyCount },
  ];

  return (
    <main className="page data-overview-page pdde-basic-page">
      <div className="eyebrow">PDDE Básico · 2026 · leitura para gestão</div>
      <h1>Quem recebeu, qual é a evidência e onde o dinheiro pode ser localizado</h1>
      <p className="lead">
        A leitura não mistura mais datas incompatíveis. “Pagamento informado” pelo FNDE, liberação/OB,
        crédito encontrado no extrato e posição de saldo são evidências diferentes. Se a posição de saldo
        for anterior ao pagamento, ela fica identificada como histórica e não responde “onde está hoje?”.
      </p>

      <section className="section pdde-basic-summary" aria-label="Perguntas gerenciais do PDDE Básico">
        <div className="pdde-basic-summary__grid">
          <article data-tone={monitoring.firstPendingCount === 0 ? 'positive' : 'attention'}>
            <span>FNDE informa pagamento do 1º ciclo</span>
            <strong>{monitoring.firstPaidCount} de {monitoring.schoolCount}</strong>
            <small>{monitoring.firstRegularCount} PDDE Básico regular + {monitoring.firstInfancyCount} Primeira Infância/P1.</small>
          </article>
          <article data-tone={sigefEvidenceGapCount === 0 ? 'positive' : 'attention'}>
            <span>1º ciclo com evidência independente no SIGEF</span>
            <strong>{sigefEvidenceCount} de {monitoring.firstPaidCount}</strong>
            <small>{monitoring.firstCreditLocatedCount} com crédito no extrato; os demais podem ter liberação/OB localizada. {sigefEvidenceGapCount} sem essa segunda evidência.</small>
          </article>
          <article data-tone={currentLocationUnknownCount === 0 ? 'positive' : 'attention'}>
            <span>Posição de saldo temporalmente comparável ao 1º ciclo</span>
            <strong>{comparableRows.length} de {monitoring.firstPaidCount}</strong>
            <small>{currentLocationUnknownCount} pagamentos ainda não têm uma posição pública de saldo posterior ou igual à data do pagamento.</small>
          </article>
          <article data-tone="checking">
            <span>Nas posições comparáveis: valor em conta corrente</span>
            <strong>{comparableCheckingCount} escolas</strong>
            <small>{comparableApplicationCount} têm valor aplicado; {comparableBothCount} aparecem simultaneamente em conta e aplicações.</small>
          </article>
          <article data-tone={monitoring.secondPaidCount > 0 ? 'positive' : 'waiting'}>
            <span>FNDE informa pagamento do 2º ciclo</span>
            <strong>{monitoring.secondPaidCount} de {monitoring.schoolCount}</strong>
            <small>{monitoring.secondPendingCount} ainda sem pagamento informado da 2ª parcela/P2.</small>
          </article>
          <article data-tone={monitoring.trueInconsistencyCount > 0 ? 'attention' : 'positive'}>
            <span>Inconsistência temporalmente comparável</span>
            <strong>{monitoring.trueInconsistencyCount}</strong>
            <small>Zero só é tratado como alerta quando a posição é posterior/igual ao pagamento e a cadeia de evidências continua incompleta.</small>
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
            A coluna “onde está” só usa posição de saldo temporalmente comparável. A última posição oficial
            continua visível para auditoria, mesmo quando é antiga demais para responder à pergunta corrente.
          </p>
        </div>

        <div className="data-table-shell">
          <table className="data-table data-table--pdde-basic">
            <thead>
              <tr>
                <th>Escola</th>
                <th>1º ciclo informado</th>
                <th>Evidência de transferência</th>
                <th>Conta destinatária</th>
                <th>Onde está na posição comparável</th>
                <th>Última posição oficial</th>
                <th>2º ciclo informado</th>
                <th>Confiança / próxima leitura</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const release = releaseEvidenceByInep.get(row.inep);
                const comparable = balanceIsComparable(row);
                const account = release?.destinationAccount;
                return (
                  <tr
                    key={row.inep}
                    data-first-pending={row.first.state !== 'PAID_INFORMED' || undefined}
                    data-coherence-alert={row.firstEvidence.isContradiction || undefined}
                  >
                    <td>
                      <Link to={`/unidades/${row.inep}#contas-saldos`}><strong>{row.name}</strong></Link>
                      <small>SME {row.sme} · INEP {row.inep}</small>
                    </td>
                    <td>
                      <span className="pdde-basic-status" data-tone={installmentTone(row.first)}>
                        {pddeBasicInstallmentStateLabel(row.first.state)}
                      </span>
                      <strong>{formatMoney(row.first.paymentInformedCents)}</strong>
                      <small>{row.first.track} · {row.first.paymentInformedDate ? formatDate(row.first.paymentInformedDate) : 'sem data válida'}</small>
                    </td>
                    <td>
                      <span className="pdde-basic-evidence" data-state={(release?.state ?? 'NO_RELEASE_EVIDENCE').toLowerCase()}>
                        {pddeBasicReleaseEvidenceLabel(release?.state ?? 'NO_RELEASE_EVIDENCE')}
                      </span>
                    </td>
                    <td>
                      <strong>{account ? `${account.bank} · ag. ${account.agency} · cc ${account.number}` : 'Não identificada'}</strong>
                      <small>{release?.state === 'RELEASE_ACCOUNT_RECOVERED' ? 'Conta recuperada na consulta de Liberações.' : 'Conta exibida/preservada pelas fontes quando disponível.'}</small>
                    </td>
                    <td data-current-location={comparable ? 'known' : 'unknown'}>
                      <strong>{comparable ? comparableLocationLabel(row) : 'Localização atual não comprovada'}</strong>
                      <small>{locationDetail(row)}</small>
                    </td>
                    <td>
                      <strong>{formatDate(row.balance.referenceDate)}</strong>
                      <small>
                        {row.balance.referenceDate
                          ? `${pddeBasicBalanceLocationLabel(row.balance.location)} · total ${formatMoney(row.balance.totalCents)}`
                          : 'Sem posição pública.'}
                      </small>
                    </td>
                    <td>
                      <span className="pdde-basic-status" data-tone={installmentTone(row.second)}>
                        {pddeBasicInstallmentStateLabel(row.second.state)}
                      </span>
                      <strong>{formatMoney(row.second.paymentInformedCents)}</strong>
                      <small>Programado {formatMoney(row.second.programmedCents)}</small>
                    </td>
                    <td>
                      <span className="pdde-basic-evidence" data-state={row.firstEvidence.state.toLowerCase()}>
                        {pddeBasicEvidenceStateLabel(row.firstEvidence.state)}
                      </span>
                      {!release?.hasIndependentSigefEvidence && row.first.state === 'PAID_INFORMED'
                        ? <small>Continuar escalonamento para fonte complementar permitida.</small>
                        : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
