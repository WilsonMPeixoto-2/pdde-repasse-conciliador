import { IndicatorLink } from '../components/IndicatorLink';
import { MetricValue } from '../components/MetricValue';
import { PortfolioExecutiveOverview } from '../components/PortfolioExecutiveOverview';
import { SourceInfo } from '../components/SourceInfo';
import { usePortfolio } from '../PortfolioContext';

function Loading() {
  return <main className="page loading"><p>Carregando a posição financeira de 2026…</p></main>;
}

function liveTime(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function PortfolioPage() {
  const state = usePortfolio();

  if (state.status === 'loading') return <Loading />;

  if (state.status === 'error') {
    return (
      <main className="page error-state">
        <div>
          <strong>Não foi possível abrir a visão financeira.</strong>
          <span>{state.error}</span>
          <button className="button button--primary" type="button" onClick={() => window.location.reload()}>
            Tentar novamente
          </button>
        </div>
      </main>
    );
  }

  const portfolio = state.data;
  const visibleIndicators = portfolio.indicators.filter((item) => item.count > 0).slice(0, 6);
  const generatedAt = liveTime(state.liveGeneratedAt);
  const progress = state.refreshProgress;

  return (
    <main className="page">
      <section aria-labelledby="portfolio-title">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 34rem' }}>
            <div className="eyebrow">Exercício 2026 · 4ª CRE</div>
            <h1 id="portfolio-title">Inteligência financeira<br />das verbas do PDDE</h1>
            <p className="lead">Uma leitura consolidada dos repasses, contas, saldos e movimentações das unidades da 4ª CRE. Os valores abaixo mantêm separados pagamento informado, crédito localizado e posição de saldo publicada.</p>
          </div>
          <div style={{ display: 'grid', gap: '.65rem', justifyItems: 'start', maxWidth: '25rem' }}>
            <button
              className="button button--primary"
              type="button"
              disabled={state.refreshing}
              aria-busy={state.refreshing}
              onClick={() => void state.refreshLive()}
            >
              Fazer nova consulta
            </button>
            {state.refreshing ? (
              <span style={{ color: 'var(--ink-600)', fontSize: '.86rem', lineHeight: 1.45 }} aria-live="polite">
                Consultando PDDEInfo e SIGEF. {progress ? `${progress.completed} de ${progress.total} unidades concluídas.` : 'Preparando a consulta.'} O retrato atual permanece disponível durante a atualização.
              </span>
            ) : null}
            {state.refreshError ? (
              <span style={{ color: 'var(--danger-700, #9b1c1c)', fontSize: '.86rem', lineHeight: 1.45 }} role="alert">
                {state.refreshError}
              </span>
            ) : null}
            {state.source === 'live' && generatedAt ? (
              <span style={{ color: 'var(--ink-600)', fontSize: '.86rem', lineHeight: 1.45 }} aria-live="polite">
                Nova consulta concluída em {generatedAt}.
              </span>
            ) : null}
          </div>
        </div>
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

      <PortfolioExecutiveOverview portfolio={portfolio} />

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

      <SourceInfo sources={portfolio.sources} />
    </main>
  );
}
