import { Link } from 'react-router-dom';
import { IndicatorLink } from '../components/IndicatorLink';
import { MetricValue } from '../components/MetricValue';
import { SourceInfo } from '../components/SourceInfo';
import { usePortfolio } from '../PortfolioContext';

function Loading() {
  return <main className="page loading"><p>Carregando a posição financeira de 2026…</p></main>;
}

export function PortfolioPage() {
  const state = usePortfolio();
  if (state.status === 'loading') return <Loading />;
  if (state.status === 'error') {
    return <main className="page error-state"><div><strong>Não foi possível abrir a visão financeira.</strong><span>{state.error}</span></div></main>;
  }

  const portfolio = state.data;
  const visibleIndicators = portfolio.indicators.filter((item) => item.count > 0).slice(0, 6);
  const previewSchools = portfolio.schools.slice(0, 6);

  return (
    <main className="page">
      <section aria-labelledby="portfolio-title">
        <div className="eyebrow">Exercício 2026 · 4ª CRE</div>
        <h1 id="portfolio-title">Inteligência financeira<br />das verbas do PDDE</h1>
        <p className="lead">Uma leitura consolidada dos repasses, contas, saldos e movimentações das unidades da 4ª CRE. Os valores abaixo mantêm separados pagamento informado, crédito localizado e posição de saldo publicada.</p>
      </section>

      <section className="section" aria-labelledby="position-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Posição financeira</div>
            <h2 id="position-title">2026 em números</h2>
          </div>
          <p>{portfolio.referenceLabel}</p>
        </div>
        <div className="metrics-band">
          <MetricValue label="Previsto em 2026" valueCents={portfolio.metrics.programmedCents} meta={`${portfolio.schoolCount} unidades`} />
          <MetricValue label="Pagamento informado" valueCents={portfolio.metrics.paymentInformedCents} tone="paid" meta="Registro no PDDEInfo" />
          <MetricValue label="Crédito compatível localizado" valueCents={portfolio.metrics.creditLocatedCents} tone="credit" meta="Evidência localizada no extrato" />
          <MetricValue label="Saldo informado" valueCents={portfolio.metrics.reportedBalanceCents} tone="balance" meta={portfolio.referenceLabel.replace(/^Posição financeira pública disponível /, '')} />
        </div>
        <div className="reference-note" aria-label={portfolio.referenceLabel}>
          <div>
            <span className="reference-note__eyebrow">Referência dos saldos</span>
            <strong>{portfolio.referenceLabel}</strong>
          </div>
          <span className="reference-note__coverage">{portfolio.metrics.accountsWithPosition} de {portfolio.metrics.accountsTotal} contas com posição nessa referência</span>
        </div>
      </section>

      {visibleIndicators.length > 0 ? (
        <section className="section" aria-labelledby="attention-title">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Acompanhamento</div>
              <h2 id="attention-title">Onde vale olhar agora</h2>
            </div>
            <p>Cada número abre exatamente as unidades que o compõem. O destaque indica necessidade de consulta, não uma conclusão automática de irregularidade.</p>
          </div>
          <div className="indicator-list">
            {visibleIndicators.map((indicator) => <IndicatorLink key={indicator.label} indicator={indicator} />)}
          </div>
        </section>
      ) : null}

      <section className="section" aria-labelledby="schools-title">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Carteira da 4ª CRE</div>
            <h2 id="schools-title">Unidades escolares</h2>
          </div>
          <Link className="text-link" to="/unidades">Ver as {portfolio.schoolCount} unidades</Link>
        </div>
        <div className="school-list">
          {previewSchools.map((school) => (
            <Link className="school-row" key={school.inep} to={`/unidades/${school.inep}`}>
              <span><span className="school-row__name">{school.sme} · {school.name}</span><span className="school-row__meta">INEP {school.inep}</span></span>
              <span className="school-row__arrow" aria-hidden="true">→</span>
            </Link>
          ))}
        </div>
      </section>

      <SourceInfo sources={portfolio.sources} />
    </main>
  );
}
