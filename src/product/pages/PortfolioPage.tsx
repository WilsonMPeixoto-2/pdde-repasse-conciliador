import { FinancialTaskLinks } from '../components/FinancialTaskLinks';
import { GlobalSchoolFinder } from '../components/GlobalSchoolFinder';
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

function progressPercent(completed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)));
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
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? portfolio.schoolCount;
  const percentage = progressPercent(completed, total);

  return (
    <main className="page">
      <section className="portfolio-hero" aria-labelledby="portfolio-title">
        <div className="portfolio-hero__layout">
          <div className="portfolio-hero__copy">
            <div className="eyebrow">Exercício 2026 · 4ª CRE</div>
            <h1 id="portfolio-title">Inteligência financeira<br />das verbas do PDDE</h1>
            <p className="lead">Consulte rapidamente repasses, contas, saldos e movimentações das escolas da 4ª CRE. A plataforma mantém separadas as diferentes evidências financeiras para não transformar indicação em comprovação.</p>
          </div>
          <div className="live-refresh-control">
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
              <div className="live-refresh-status">
                <div className="live-refresh-status__header">
                  <strong>Atualizando dados financeiros</strong>
                  <span>{percentage}%</span>
                </div>
                <progress
                  className="live-refresh-progress"
                  value={completed}
                  max={total > 0 ? total : 1}
                  aria-label="Progresso da nova consulta"
                  aria-valuetext={`${completed} de ${total} unidades concluídas`}
                />
                <div className="live-refresh-status__meta">
                  <span aria-live="polite">{completed} de {total} unidades concluídas</span>
                  <span>Consultando PDDEInfo e SIGEF</span>
                </div>
                <small>O retrato atual permanece disponível durante a atualização.</small>
              </div>
            ) : null}
            {state.refreshError ? (
              <span className="live-refresh-message live-refresh-message--error" role="alert">
                {state.refreshError}
              </span>
            ) : null}
            {state.source === 'live' && generatedAt ? (
              <span className="live-refresh-message" aria-live="polite">
                Nova consulta concluída em {generatedAt}.
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <section className="section financial-entry" aria-labelledby="financial-entry-title">
        <div className="section-heading financial-entry__heading">
          <div>
            <div className="eyebrow">Acesso rápido</div>
            <h2 id="financial-entry-title">O que você precisa consultar?</h2>
          </div>
          <p>Comece pela escola ou abra diretamente a visão de repasses, saldos e contas.</p>
        </div>
        <div className="financial-entry__grid">
          <GlobalSchoolFinder schools={portfolio.schools} />
          <FinancialTaskLinks />
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
