import { useState } from 'react';
import { Link } from 'react-router-dom';
import { IndicatorLink } from '../components/IndicatorLink';
import { MetricValue } from '../components/MetricValue';
import { SessionStartDialog } from '../components/SessionStartDialog';
import { SourceInfo } from '../components/SourceInfo';
import { usePortfolio } from '../PortfolioContext';

function Loading() {
  return <main className="page loading"><p>Carregando a posição financeira de 2026…</p></main>;
}

function sessionStepState(
  current: 'QUEUED' | 'RUNNING' | 'FINALIZING',
  step: 'QUEUED' | 'RUNNING' | 'FINALIZING',
): 'done' | 'active' | 'pending' {
  const order = ['QUEUED', 'RUNNING', 'FINALIZING'] as const;
  const currentIndex = order.indexOf(current);
  const stepIndex = order.indexOf(step);
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

function SessionProgress(props: { phase: 'QUEUED' | 'RUNNING' | 'FINALIZING' }) {
  const steps = [
    { phase: 'QUEUED' as const, label: 'Preparar consulta' },
    { phase: 'RUNNING' as const, label: 'Consultar e conciliar' },
    { phase: 'FINALIZING' as const, label: 'Organizar resultado' },
  ];

  return (
    <div className="session-progress" aria-label="Progresso da consulta">
      {steps.map((step) => {
        const status = sessionStepState(props.phase, step.phase);
        return (
          <div className="session-progress__step" data-state={status} key={step.phase}>
            <span className="session-progress__marker" aria-hidden="true" />
            <strong>{step.label}</strong>
            <span className="session-progress__state">
              {status === 'done' ? 'Concluído' : status === 'active' ? 'Em andamento' : 'Aguardando'}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function PortfolioPage() {
  const state = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (state.status === 'loading') return <Loading />;

  if (state.status === 'error') {
    return <main className="page error-state"><div><strong>Não foi possível abrir a visão financeira.</strong><span>{state.error}</span></div></main>;
  }

  if (state.status === 'idle') {
    return (
      <>
        <main className="page session-empty">
          <section className="session-empty__content" aria-labelledby="session-empty-title">
            <div className="eyebrow">Modo Sessão · 2026</div>
            <h1 id="session-empty-title">Nenhuma consulta carregada</h1>
            <p className="session-empty__lead">
              Abra uma consulta temporária para reunir a posição financeira das unidades da 4ª CRE, explorar os dados no navegador e gerar o Excel desta execução.
            </p>
            <div className="session-empty__actions">
              <button className="button button--primary" type="button" onClick={() => setDialogOpen(true)}>
                Nova consulta
              </button>
            </div>
            <p className="session-empty__note">
              O resultado desta modalidade permanece vinculado à sessão de consulta e não substitui uma publicação institucional persistente.
            </p>
          </section>
        </main>
        <SessionStartDialog open={dialogOpen} onOpenChange={setDialogOpen} onStart={state.startTemporary} />
      </>
    );
  }

  if (state.status === 'running') {
    return (
      <main className="page session-running">
        <section className="session-running__content" aria-labelledby="session-running-title" aria-live="polite">
          <div className="eyebrow">Modo Sessão · processamento</div>
          <h1 id="session-running-title">Consulta em andamento</h1>
          <p className="session-running__lead">
            Consultando e conciliando as fontes financeiras. O resultado será apresentado nesta mesma superfície assim que a execução estiver pronta.
          </p>
          <SessionProgress phase={state.phase} />
        </section>
      </main>
    );
  }

  const portfolio = state.data;
  const visibleIndicators = portfolio.indicators.filter((item) => item.count > 0).slice(0, 6);
  const previewSchools = portfolio.schools.slice(0, 6);
  const temporary = state.source === 'temporary';

  return (
    <>
      <main className="page">
        {temporary ? (
          <section className="session-ready" aria-label="Consulta temporária pronta">
            <div className="session-ready__label">
              <span className="session-ready__dot" aria-hidden="true" />
              <div>
                <strong>Consulta temporária</strong>
                <span>{portfolio.schoolCount} {portfolio.schoolCount === 1 ? 'unidade consultada' : 'unidades consultadas'} · exercício 2026</span>
              </div>
            </div>
            <div className="session-ready__actions">
              <button className="button button--secondary" type="button" onClick={() => setDialogOpen(true)}>
                Nova consulta
              </button>
              <button className="button button--primary" type="button" onClick={() => void state.downloadWorkbook()}>
                Baixar Excel
              </button>
            </div>
          </section>
        ) : null}

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
      {temporary ? <SessionStartDialog open={dialogOpen} onOpenChange={setDialogOpen} onStart={state.startTemporary} /> : null}
    </>
  );
}
