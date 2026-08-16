import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loadHumanSchool } from '../api';
import { Disclosure } from '../components/Disclosure';
import { MetricValue } from '../components/MetricValue';
import { Timeline2026 } from '../components/Timeline2026';
import { buildAccountTimeline2026, deriveSchoolSummary } from '../derive';
import { formatAccount, formatCnpj, formatDate, formatMoney } from '../format';
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
  const summary = deriveSchoolSummary(school);

  return (
    <main className="page">
      <header className="entity-header">
        <div>
          <div className="eyebrow">Prontuário financeiro · 2026</div>
          <h1 className="entity-title">{school.school.name}</h1>
          <div className="entity-meta">SME {school.school.sme} · INEP {school.school.inep}</div>
        </div>
        <button className="info-button" type="button" aria-label="Mostrar informações da unidade executora" aria-expanded={infoOpen} onClick={() => setInfoOpen((value) => !value)}>i</button>
      </header>

      {infoOpen ? (
        <section style={{ padding: '1.4rem 0', borderBottom: '1px solid var(--ink-100)' }} aria-label="Informações da unidade executora">
          <strong>Unidade executora</strong>
          <p style={{ margin: '.45rem 0 0', color: 'var(--ink-600)' }}>{school.school.uex || 'Não informada'} · CNPJ {formatCnpj(school.school.cnpj)}</p>
        </section>
      ) : null}

      <section className="section" aria-labelledby="school-position-title">
        <div className="section-heading">
          <div><div className="eyebrow">Posição da unidade</div><h2 id="school-position-title">Leitura financeira</h2></div>
          <p>{summary.balanceReferenceDate ? `Saldo informado com referência mais recente em ${formatDate(summary.balanceReferenceDate)}.` : 'Ainda não há posição de saldo disponível para esta unidade.'}</p>
        </div>
        <div className="metrics-band">
          <MetricValue label="Previsto em 2026" valueCents={summary.programmedCents} />
          <MetricValue label="Pagamento informado" valueCents={summary.paymentInformedCents} tone="paid" meta="Registro no PDDEInfo" />
          <MetricValue label="Crédito compatível localizado" valueCents={summary.creditLocatedCents} tone="credit" />
          <MetricValue label="Saldo informado" valueCents={summary.reportedBalanceCents} tone="balance" meta={summary.balanceReferenceDate ? `Posição ${formatDate(summary.balanceReferenceDate)}` : undefined} />
        </div>
      </section>

      <div className="two-column section">
        <div>
          <section aria-labelledby="programs-title">
            <div className="section-heading">
              <div><div className="eyebrow">Programas e parcelas</div><h2 id="programs-title">Repasses</h2></div>
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

          <section className="section" aria-labelledby="accounts-title">
            <div className="section-heading">
              <div><div className="eyebrow">Contas e aplicações</div><h2 id="accounts-title">Posição e evolução</h2></div>
              <p>Cada linha temporal mostra somente os meses efetivamente observados para aquela conta.</p>
            </div>
            <div className="program-list">
              {school.accounts.map((account) => (
                <Disclosure
                  key={`${account.bank}-${account.agency}-${account.account}-${account.program}`}
                  title={account.program}
                  summary={`${formatAccount(account.bank, account.agency, account.account)} · ${formatMoney(account.latestPosition?.totalReportedBalanceCents ?? null)}`}
                  defaultOpen={school.accounts.length === 1}
                >
                  {account.latestPosition ? (
                    <div className="metrics-band" style={{ marginBottom: '1rem' }}>
                      <MetricValue label="Saldo informado" valueCents={account.latestPosition.totalReportedBalanceCents} tone="balance" meta={`Posição ${formatDate(account.latestPosition.referenceDate)}`} />
                      <MetricValue label="Em aplicações" valueCents={account.latestPosition.applications.totalCents} />
                      <MetricValue label="Em conta" valueCents={account.latestPosition.checkingBalanceCents} />
                      <MetricValue label="Fundos" valueCents={account.latestPosition.applications.fundsCents} />
                    </div>
                  ) : <p>Não há posição de saldo publicada para esta conta.</p>}
                  <Timeline2026 months={buildAccountTimeline2026(account.positions)} title="Evolução do saldo informado" />
                  {account.movements.length > 0 ? (
                    <div style={{ marginTop: '2rem' }}>
                      <h3>Movimentações recentes</h3>
                      <div className="school-list">
                        {account.movements.slice(0, 8).map((movement, index) => (
                          <div className="school-row" key={`${movement.date}-${movement.document ?? index}`}>
                            <span><span className="school-row__name">{movement.description}</span><span className="school-row__meta">{formatDate(movement.date)}{movement.category ? ` · ${movement.category}` : ''}</span></span>
                            <span className="numeric">{movement.creditCents !== null ? `+ ${formatMoney(movement.creditCents)}` : movement.debitCents !== null ? `− ${formatMoney(movement.debitCents)}` : '—'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </Disclosure>
              ))}
              {school.accounts.length === 0 ? <p>Não há conta apresentada para esta unidade no retrato corrente.</p> : null}
            </div>
          </section>

          {school.accounting.length > 0 ? (
            <section className="section" aria-labelledby="accounting-title">
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
          ) : <p style={{ color: 'var(--ink-600)' }}>Nenhum apontamento de acompanhamento no retrato atual.</p>}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--ink-200)', color: 'var(--ink-600)', fontSize: '.82rem' }}>
            <strong style={{ color: 'var(--ink-950)' }}>Como interpretar</strong>
            <p style={{ marginTop: '.5rem' }}>Pagamento informado, ordem FNDE, crédito localizado e saldo publicado representam evidências diferentes. A tela mantém essas etapas separadas.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

export function SchoolPage() {
  const { inep = '' } = useParams();
  const [state, setState] = useState<State>({ status: 'loading', data: null, error: null });
  useEffect(() => {
    const controller = new AbortController();
    setState({ status: 'loading', data: null, error: null });
    loadHumanSchool(inep, controller.signal)
      .then((data) => setState({ status: 'ready', data, error: null }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setState({ status: 'error', data: null, error: error instanceof Error ? error.message : 'Não foi possível abrir a unidade.' });
      });
    return () => controller.abort();
  }, [inep]);

  if (state.status === 'loading') return <main className="page loading"><p>Carregando o prontuário financeiro…</p></main>;
  if (state.status === 'error') return <main className="page error-state"><div><strong>Não foi possível abrir esta unidade.</strong><span>{state.error}</span></div></main>;
  return <SchoolContent school={state.data} />;
}
