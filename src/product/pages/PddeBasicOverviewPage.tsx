import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  derivePddeBasicPortfolio,
  type PddeBasicSchoolReading,
} from '../../../shared/pdde-basic-monitoring';
import {
  derivePddeBasicFirstCycleReleaseEvidence,
  derivePddeBasicSecondCycleReleaseEvidence,
  pddeBasicReleaseEvidenceLabel,
} from '../../../shared/pdde-basic-release-evidence';
import { SchoolSearch } from '../components/SchoolSearch';
import { schoolMatchesSearch } from '../derive';
import { formatDate, formatMoney } from '../format';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

type FilterMode = 'all' | 'regular' | 'infancy' | 'credit_located';

function rowAnnualTotal(row: PddeBasicSchoolReading): number {
  return (row.first.paymentInformedCents ?? 0) + (row.second.paymentInformedCents ?? 0);
}

function isInfancy(row: PddeBasicSchoolReading): boolean {
  return row.first.track.toLowerCase().includes('infância')
    || row.second.track.toLowerCase().includes('infância');
}

function matchesFilter(
  row: PddeBasicSchoolReading,
  filter: FilterMode,
  hasCreditLocated: boolean,
): boolean {
  if (filter === 'regular') return !isInfancy(row);
  if (filter === 'infancy') return isInfancy(row);
  if (filter === 'credit_located') return hasCreditLocated;
  return true;
}

export function PddeBasicOverviewPage() {
  const details = usePortfolioSchoolDetails();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterMode>('all');

  const schools = details.status === 'ready' ? details.schools : [];
  const monitoring = useMemo(() => derivePddeBasicPortfolio(schools), [schools]);

  const firstReleaseEvidenceByInep = useMemo(() => new Map(schools.map((school) => [
    school.school.inep,
    derivePddeBasicFirstCycleReleaseEvidence(school),
  ])), [schools]);
  const secondReleaseEvidenceByInep = useMemo(() => new Map(schools.map((school) => [
    school.school.inep,
    derivePddeBasicSecondCycleReleaseEvidence(school),
  ])), [schools]);

  const annualTotalCents = monitoring.firstPaymentInformedCents + monitoring.secondPaymentInformedCents;
  const schoolsWithBothCycles = monitoring.rows.filter((row) => (
    row.first.state === 'PAID_INFORMED' && row.second.state === 'PAID_INFORMED'
  )).length;
  const regularCount = monitoring.rows.filter((row) => !isInfancy(row)).length;
  const infancyCount = monitoring.rows.filter(isInfancy).length;
  const creditLocatedCount = monitoring.rows.filter((row) => (
    firstReleaseEvidenceByInep.get(row.inep)?.state === 'CREDIT_LOCATED'
  )).length;

  const visibleRows = useMemo(() => monitoring.rows
    .filter((row) => schoolMatchesSearch(row, query))
    .filter((row) => matchesFilter(
      row,
      filter,
      firstReleaseEvidenceByInep.get(row.inep)?.state === 'CREDIT_LOCATED',
    )), [filter, monitoring.rows, query, firstReleaseEvidenceByInep]);

  if (details.status === 'loading') {
    return <main className="page loading"><p>Carregando acompanhamento do PDDE Básico…</p></main>;
  }

  if (details.status === 'error') {
    return (
      <main className="page error-state">
        <div>
          <strong>Não foi possível abrir o acompanhamento do PDDE Básico.</strong>
          <span>{details.error}</span>
        </div>
      </main>
    );
  }

  const filters: Array<{ key: FilterMode; label: string; count: number }> = [
    { key: 'all', label: 'Todas', count: monitoring.schoolCount },
    { key: 'regular', label: 'PDDE Básico regular', count: regularCount },
    { key: 'infancy', label: 'Primeira Infância', count: infancyCount },
    { key: 'credit_located', label: 'Crédito localizado no 1º ciclo', count: creditLocatedCount },
  ];

  return (
    <main className="page data-overview-page pdde-basic-page">
      <div className="eyebrow">PDDE Básico · 2026 · visão de repasses</div>
      <h1>Repasses do PDDE Básico por unidade escolar</h1>
      <p className="lead">
        A página prioriza os fatos já confirmados pelas fontes oficiais: pagamentos informados pelo FNDE,
        conta destinatária e evidências positivas do SIGEF. Saldo bancário, cobertura de extratos e outras
        verificações ficam nas áreas próprias e não são apresentados aqui como pendências.
      </p>

      <section className="section pdde-basic-summary" aria-label="Resumo dos repasses do PDDE Básico">
        <div className="pdde-basic-summary__grid pdde-basic-summary__grid--compact">
          <article data-tone="positive">
            <span>Total de repasses em 2026</span>
            <strong>{formatMoney(annualTotalCents)}</strong>
            <small>{schoolsWithBothCycles} de {monitoring.schoolCount} unidades com os dois ciclos de repasses informados.</small>
          </article>
          <article data-tone="positive">
            <span>1º ciclo de repasses</span>
            <strong>{formatMoney(monitoring.firstPaymentInformedCents)}</strong>
            <small>{monitoring.firstPaidCount} unidades · {monitoring.firstRegularCount} regular + {monitoring.firstInfancyCount} Primeira Infância/P1.</small>
          </article>
          <article data-tone="positive">
            <span>2º ciclo de repasses</span>
            <strong>{formatMoney(monitoring.secondPaymentInformedCents)}</strong>
            <small>{monitoring.secondPaidCount} unidades · {monitoring.secondRegularPaidCount} regular + {monitoring.secondInfancyPaidCount} Primeira Infância/P2.</small>
          </article>
          <article data-tone="checking">
            <span>Transferência com evidência SIGEF</span>
            <strong>{monitoring.firstPaidCount} de {monitoring.schoolCount}</strong>
            <small>{creditLocatedCount} créditos localizados no extrato do 1º ciclo; as demais unidades possuem liberação/OB localizada.</small>
          </article>
        </div>
      </section>

      <section className="section financial-overview-controls">
        <SchoolSearch
          value={query}
          onChange={setQuery}
          visibleCount={visibleRows.length}
          totalCount={monitoring.schoolCount}
          label="Buscar escola no PDDE Básico"
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
            <div className="eyebrow">Unidade por unidade</div>
            <h2 id="pdde-basic-table-title">{visibleRows.length} unidades no recorte</h2>
          </div>
          <p>
            Para saldos, posição da conta e cobertura temporal das fontes, use{' '}
            <Link to="/saldos">Contas e saldos</Link> ou <Link to="/cobertura">Cobertura das fontes</Link>.
          </p>
        </div>

        <div className="data-table-shell">
          <table className="data-table data-table--pdde-basic data-table--pdde-basic-clean">
            <thead>
              <tr>
                <th>Escola</th>
                <th>1º ciclo de repasses</th>
                <th>2º ciclo de repasses</th>
                <th>Total 2026</th>
                <th>Conta destinatária</th>
                <th>Evidência SIGEF</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const release = firstReleaseEvidenceByInep.get(row.inep);
                const secondRelease = secondReleaseEvidenceByInep.get(row.inep);
                const account = release?.destinationAccount;
                const total = rowAnnualTotal(row);
                const evidenceLabel = release?.state === 'CREDIT_LOCATED'
                  ? 'Crédito localizado'
                  : release?.hasIndependentSigefEvidence
                    ? 'Liberação / OB localizada'
                    : 'Evidência complementar';

                return (
                  <tr key={row.inep}>
                    <td>
                      <Link to={`/unidades/${row.inep}`}>
                        <strong>{row.name}</strong>
                      </Link>
                      <small>SME {row.sme} · INEP {row.inep}</small>
                    </td>
                    <td>
                      <strong>{formatMoney(row.first.paymentInformedCents)}</strong>
                      <small>{row.first.track} · {row.first.paymentInformedDate ? formatDate(row.first.paymentInformedDate) : '—'}</small>
                    </td>
                    <td>
                      <strong>{formatMoney(row.second.paymentInformedCents)}</strong>
                      <small>{row.second.track} · {row.second.paymentInformedDate ? formatDate(row.second.paymentInformedDate) : '—'}</small>
                    </td>
                    <td>
                      <strong className="pdde-basic-total">{formatMoney(total)}</strong>
                      <small>1º + 2º ciclos de repasses</small>
                    </td>
                    <td>
                      <strong>{account ? `${account.bank} · ag. ${account.agency} · cc ${account.number}` : '—'}</strong>
                      <small>{account ? 'Conta de destino recuperada nas fontes oficiais.' : 'Consultar ficha da unidade.'}</small>
                    </td>
                    <td>
                      <span
                        className="pdde-basic-evidence"
                        data-state={(release?.state ?? 'NO_RELEASE_EVIDENCE').toLowerCase()}
                      >
                        {evidenceLabel}
                      </span>
                      {release?.orderBank ? (
                        <small>OB {release.orderBank} · {formatDate(release.releaseDate)}</small>
                      ) : null}
                      {secondRelease?.orderBank ? (
                        <small>2º ciclo · OB {secondRelease.orderBank} · {formatDate(secondRelease.releaseDate)}</small>
                      ) : null}
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
