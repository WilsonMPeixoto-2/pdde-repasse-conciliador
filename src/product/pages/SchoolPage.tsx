import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { BalanceComposition } from '../components/BalanceComposition';
import { Disclosure } from '../components/Disclosure';
import { MetricValue } from '../components/MetricValue';
import { MovementLedger } from '../components/MovementLedger';
import { SchoolSectionNav } from '../components/SchoolSectionNav';
import { Timeline2026 } from '../components/Timeline2026';
import { buildAccountTimeline2026, deriveSchoolSummary } from '../derive';
import { formatAccount, formatCnpj, formatDate, formatMoney } from '../format';
import { usePortfolio } from '../PortfolioContext';
import type { HumanSchool } from '../types';

type State =
  | { status: 'loading'; data: null; error: null }
  | { status: 'ready'; data: HumanSchool; error: null }
  | { status: 'error'; data: null; error: string };

function programTotals(program: HumanSchool['programs'][number]) {
  return program.installments.reduce((result, installment) => ({
    programmed: result.programmed + installment.programmedCents,
    paid: result.paid + installment.paymentInformedCents,
  }), { programmed: 0, paid: 0 });
}

function SchoolContent({ school }: { school: HumanSchool }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { hash } = useLocation();
  const summary = deriveSchoolSummary(school);
  const firstMovementAccountIndex = school.accounts.findIndex((account) => account.movements.length > 0);
  const hasMovements = firstMovementAccountIndex >= 0;
  const hasAccounting = school.accounting.length > 0;

  return (
    <main className="page school-financial-page">
      <header className="entity-header">
        <div>
          <div className="eyebrow">Prontuário financeiro · 2026</div>
          <h1 className="entity-title">{school.school.name}</h1>
          <div className="entity-meta">SME {school.school.sme} · INEP {school.school.inep}</div>
        </div>
        <button className="info-button" type="button" aria-label="Mostrar informações da unidade executora" aria-expanded={infoOpen} onClick={() => setInfoOpen((value) => !value)}>i</button>
      </header>

      {infoOpen ? (
        <section className="school-executor-info" aria-label="Informações da unidade executora">
          <strong>Unidade executora</strong>
          <p>{school.school.uex || 'Não informada'} · CNPJ {formatCnpj(school.school.cnpj)}</p>
        </section>
      ) : null}

      <SchoolSectionNav hasMovements={hasMovements} hasAccounting={hasAccounting} />

      <section id="resumo" tabIndex={-1} className="section school-section-target" aria-labelledby="school-position-title">
        <div className="section-heading">
          <div><div className="eyebrow">Resumo</div><h2 id="school-position-title">Posição financeira da escola</h2></div>
          <p>{summary.balanceReferenceDate ? `Saldo informado com referência mais recente em ${formatDate(summary.balanceReferenceDate)}.` : 'Ainda não há posição de saldo disponível para esta unidade.'}</p>
        </div>
        <div className="metrics-band">
          <MetricValue label="Previsto em 2026" valueCents={summary.programmedCents} />
          <MetricValue label="Pagamento informado" valueCents={summary.paymentInformedCents} tone="paid" meta="Registro no PDDEInfo" />
          <MetricValue label="Crédito compatível localizado" valueCents={summary.creditLocatedCents} tone="credit" />
          <MetricValue label="Saldo informado" valueCents={summary.reportedBalanceCents} tone="balance" meta={summary.balanceReferenceDate ? `Posição ${formatDate(summary.balanceReferenceDate)}` : undefined} />
        </div>
      </section>

      <div className="two-column section school-financial-detail">
        <div>
          <section id="repasses" tabIndex={-1} className="school-section-target" aria-labelledby="programs-title">
            <div className="section-heading">
              <div><div className="eyebrow">Programas e parcelas</div><h2 id="programs-title">Repasses</h2></div>
              <p>Consulte cada programa e parcela sem confundir pagamento informado com crédito localizado.</p>
            </div>
            <div className="program-list">
              {school.programs.map((program) => {
                const totals = programTotals(program);
                return (
                  <Disclosure key={program.name} title={program.name} summary={`${formatMoney(totals.programmed)} previstos · ${formatMoney(totals.paid)} informados`}>
                    <div className="installment-list">
                      {program.installments.map((installment, index) => {
                        const creditLocated = installment.creditEvidence.status === 'Crédito localizado';
                        const paymentInformed = installment.paymentInformedCents > 0;
                        const shownValue = paymentInformed ? installment.paymentInformedCents : installment.programmedCents;
                        return (
                          <div className="installment-row" key={`${installment.installment ?? 'repasse'}-${index}`}>
                            <div>
                              <div className="installment-row__title">{installment.installment ?? 'Repasse'}</div>
                              <div className="installment-row__date">
                                {installment.paymentInformedDate ? `Pagamento informado ${formatDate(installment.paymentInformedDate)}` : 'Pagamento ainda não informado'}
                                {installment.paymentOrderDate ? ` · Ordem FNDE ${formatDate(installment.paymentOrderDate)}` : ''}
                              </div>
                              {creditLocated ? <div className="installment-row__date">Crédito compatível localizado {installment.creditEvidence.date ? `em ${formatDate(installment.creditEvidence.date)}` : ''}</div> : null}
                            </div>
                            <div className="installment-row__amount">
                              {formatMoney(shownValue)}
                              <span className={`status-label${creditLocated ? ' status-label--credit' : paymentInformed ? ' status-label--paid' : ''}`}>
                                {creditLocated ? 'Crédito localizado' : paymentInformed ? 'Pagamento informado' : 'Previsto'}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Disclosure>
                );
              })}
              {school.programs.length === 0 ? <p className="lead">Nenhum repasse foi apresentado para esta unidade no retrato atual.</p> : null}
            </div>
          </section>

          <section id="contas-saldos" tabIndex={-1} className="section school-section-target" aria-labelledby="accounts-title">
            <div className="section-heading">
              <div><div className="eyebrow">Contas, aplicações e evolução</div><h2 id="accounts-title">Contas e saldos</h2></div>
              <p>Abra cada conta para consultar banco, agência, conta, composição e evolução do saldo informado.</p>
            </div>
            <div className="program-list">
              {school.accounts.map((account, accountIndex) => (
                <Disclosure
                  key={`${account.bank}-${account.agency}-${account.account}-${account.program}`}
                  title={account.program}
                  summary={`${formatAccount(account.bank, account.agency, account.account)} · ${formatMoney(account.latestPosition?.totalReportedBalanceCents ?? null)}`}
                  defaultOpen={
                    school.accounts.length === 1
                    || (hash === '#movimentacoes' && accountIndex === firstMovementAccountIndex)
                  }
                >
                  {account.latestPosition
                    ? <BalanceComposition position={account.latestPosition} />
                    : <p>Não há posição de saldo publicada para esta conta.</p>}
                  <Timeline2026 months={buildAccountTimeline2026(account.positions)} title="Evolução do saldo informado" />
                  {account.movements.length > 0 ? (
                    <MovementLedger
                      id={accountIndex === firstMovementAccountIndex ? 'movimentacoes' : undefined}
                      movements={account.movements}
                    />
                  ) : null}
                </Disclosure>
              ))}
              {school.accounts.length === 0 ? <p>Não há conta apresentada para esta unidade no retrato corrente.</p> : null}
            </div>
          </section>

          {hasAccounting ? (
            <section id="prestacao-contas" tabIndex={-1} className="section school-section-target" aria-labelledby="accounting-title">
              <div className="section-heading"><div><div className="eyebrow">Prestação de contas</div><h2 id="accounting-title">Situação informada</h2></div></div>
              <div className="school-list">
                {school.accounting.map((item, index) => (
                  <div className="school-row" key={`${item.program}-${index}`}>
                    <span><span className="school-row__name">{item.program}</span><span className="school-row__meta">{item.status || 'Situação não detalhada'}{item.paymentSuspended ? ' · pagamento suspenso informado' : ''}</span></span>
                    <span className="numeric">{formatMoney(item.expectedTotalCents)}</span>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <aside className="sidebar-sticky" aria-labelledby="followup-title">
          <div className="eyebrow">Acompanhamento</div>
          <h2 id="followup-title">O que merece atenção</h2>
          {school.followUp.length > 0 ? (
            <div className="followup-list">
              {school.followUp.map((item) => <div className="followup" key={item}>{item}</div>)}
            </div>
          ) : <p className="school-followup-empty">Nenhum apontamento de acompanhamento no retrato atual.</p>}
          <div className="school-reading-note">
            <strong>Como interpretar</strong>
            <p>Pagamento informado, ordem FNDE, crédito localizado e saldo publicado representam evidências diferentes. A tela mantém essas etapas separadas.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function SchoolPage() {
  const { inep = '' } = useParams();
  const portfolio = usePortfolio();
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    portfolio.loadSchool(inep, controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível abrir a unidade.' });
      });
    return () => controller.abort();
  }, [inep, portfolio.liveGeneratedAt, portfolio.loadSchool]);

  if (state.status === 'loading') return <main className="page loading"><p>Carregando o prontuário financeiro…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir esta unidade.</strong><span>{state.error}</span></div></main>;
  return <SchoolContent school={state.data} />;
}
