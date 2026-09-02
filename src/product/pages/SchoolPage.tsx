import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { BalanceComposition } from '../components/BalanceComposition';
import { Disclosure } from '../components/Disclosure';
import { MovementLedger } from '../components/MovementLedger';
import { SchoolOperationalSummary } from '../components/SchoolOperationalSummary';
import { SchoolSectionNav } from '../components/SchoolSectionNav';
import { Timeline2026 } from '../components/Timeline2026';
import { buildAccountTimeline2026 } from '../derive';
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


function normalizeStatus(value: string | null | undefined): string {
  return (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function openingNeedsAttention(status: string): boolean {
  const normalized = normalizeStatus(status);
  return Boolean(normalized) && !(
    normalized.includes('SEM PENDENCIA')
    || normalized.includes('REGULAR')
    || normalized.includes('CONCLUID')
    || normalized.includes('ABERTA')
    || normalized.includes('ATIVA')
  );
}

function registrationNeedsAttention(school: HumanSchool): boolean {
  const status = normalizeStatus(school.registration?.mandateStatus);
  const note = normalizeStatus(school.registration?.registrationNote);
  return status.includes('VENCID')
    || status.includes('VENCER')
    || note.includes('PENDENCIA')
    || note.includes('DESATUALIZ');
}

function coverageStatusLabel(status: HumanSchool['sourceCoverage'][number]['status']): string {
  if (status === 'AVAILABLE') return 'Disponível';
  if (status === 'EMPTY') return 'Sem registro na consulta';
  if (status === 'PARTIAL') return 'Cobertura parcial';
  return 'Fonte indisponível';
}

export function SchoolContent({ school }: { school: HumanSchool }) {
  const [infoOpen, setInfoOpen] = useState(false);
  const { hash } = useLocation();
  const firstMovementAccountIndex = school.accounts.findIndex((account) => account.movements.length > 0);
  const hasMovements = firstMovementAccountIndex >= 0;
  const hasAccounting = school.accounting.length > 0;
  const openingIssues = school.accountOpenings.filter((item) => openingNeedsAttention(item.status));
  const hasRegistrationIssue = registrationNeedsAttention(school);

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

      <SchoolOperationalSummary school={school} />


      <section id="cadastro" tabIndex={-1} className="section school-section-target" aria-labelledby="registration-title">
        <div className="section-heading">
          <div><div className="eyebrow">Cadastro e habilitação</div><h2 id="registration-title">Situação da unidade executora</h2></div>
          <p>Informações publicadas pelo FNDE sobre cadastro, mandato e vínculo da UEx. Textos da fonte são preservados quando disponíveis.</p>
        </div>
        {school.registration ? (
          <>
            <div className="school-data-grid">
              <div><span>Quantidade de alunos</span><strong>{school.registration.studentCount ?? 'Não informada'}</strong></div>
              <div><span>Localização</span><strong>{school.registration.location ?? 'Não informada'}</strong></div>
              <div><span>Rede</span><strong>{school.registration.network ?? 'Não informada'}</strong></div>
              <div><span>Mandato</span><strong>{school.registration.mandateStatus ?? 'Não informado'}</strong></div>
              <div><span>Início do mandato</span><strong>{formatDate(school.registration.mandateStartDate)}</strong></div>
              <div><span>Fim do mandato</span><strong>{formatDate(school.registration.mandateEndDate)}</strong></div>
              <div><span>Atualização cadastral</span><strong>{formatDate(school.registration.updatedDate)}</strong></div>
              <div><span>Telefone</span><strong>{school.registration.phone ?? 'Não informado'}</strong></div>
            </div>
            <div className="school-source-notes">
              {school.registration.registrationNote ? <p><strong>Dados cadastrais:</strong> {school.registration.registrationNote}</p> : null}
              {school.registration.uexAccountingNote ? <p><strong>Prestação da UEx:</strong> {school.registration.uexAccountingNote}</p> : null}
              {school.registration.eexAdhesionNote ? <p><strong>Adesão da EEx:</strong> {school.registration.eexAdhesionNote}</p> : null}
              {school.registration.eexAccountingNote ? <p><strong>Prestação da EEx:</strong> {school.registration.eexAccountingNote}</p> : null}
            </div>
          </>
        ) : <p className="lead">A fonte não apresentou dados cadastrais estruturados nesta coleta.</p>}
      </section>

      <div className="section school-financial-detail">
        <div className="school-financial-detail__content">
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
                              {installment.breakdown ? (
                                <div className="repasse-breakdown" aria-label="Composição de custeio e capital">
                                  <span><small>Programado · custeio</small><strong>{formatMoney(installment.breakdown.programmedCusteioCents)}</strong></span>
                                  <span><small>Programado · capital</small><strong>{formatMoney(installment.breakdown.programmedCapitalCents)}</strong></span>
                                  <span><small>Ajuste · custeio</small><strong>{formatMoney(installment.breakdown.adjustmentCusteioCents)}</strong></span>
                                  <span><small>Ajuste · capital</small><strong>{formatMoney(installment.breakdown.adjustmentCapitalCents)}</strong></span>
                                  <span><small>Pago · custeio</small><strong>{formatMoney(installment.breakdown.paidCusteioCents)}</strong></span>
                                  <span><small>Pago · capital</small><strong>{formatMoney(installment.breakdown.paidCapitalCents)}</strong></span>
                                </div>
                              ) : null}
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
            {school.accountOpenings.length > 0 ? (
              <div className="account-opening-list" aria-label="Situação de abertura das contas">
                {school.accountOpenings.map((item, index) => (
                  <div className="account-opening-row" data-attention={openingNeedsAttention(item.status) || undefined} key={`${item.program ?? 'programa'}-${index}`}>
                    <span><strong>{item.program ?? 'Programa não detalhado'}</strong><small>{[item.bank, item.agency, item.account].filter(Boolean).join(' · ') || 'Conta não detalhada no relatório'}</small></span>
                    <span>{item.status}</span>
                  </div>
                ))}
              </div>
            ) : null}
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
                  {account.occurrence ? <p className="account-occurrence"><strong>Ocorrência informada:</strong> {account.occurrence}</p> : null}
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


          <section id="pendencias" tabIndex={-1} className="section school-section-target" aria-labelledby="issues-title">
            <div className="section-heading">
              <div><div className="eyebrow">Pendências e cobertura</div><h2 id="issues-title">Pontos para acompanhamento</h2></div>
              <p>Ocorrências publicadas pelas fontes e limitações da coleta são mostradas separadamente. Ausência de registro não é convertida em regularidade.</p>
            </div>
            <div className="school-issues-list">
              {hasRegistrationIssue ? (
                <div className="school-issue-card"><strong>Cadastro ou mandato</strong><p>{school.registration?.registrationNote ?? school.registration?.mandateStatus ?? 'A situação cadastral requer acompanhamento.'}</p></div>
              ) : null}
              {school.suspensions.map((item, index) => (
                <div className="school-issue-card" key={`suspension-${index}`}><strong>{item.type}</strong><p>{[item.program, item.destination, item.detail].filter(Boolean).join(' · ') || 'Suspensão informada pelo FNDE.'}</p></div>
              ))}
              {openingIssues.map((item, index) => (
                <div className="school-issue-card" key={`opening-${index}`}><strong>Abertura de conta · {item.program ?? 'Programa'}</strong><p>{item.status}</p></div>
              ))}
              {school.accounting.filter((item) => item.paymentSuspended).map((item, index) => (
                <div className="school-issue-card" key={`accounting-${index}`}><strong>Pagamento suspenso · {item.program}</strong><p>{item.status || 'Suspensão informada na prestação de contas.'}</p></div>
              ))}
              {school.followUp
                .filter((message) => message !== 'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.')
                .map((message, index) => (
                  <div className="school-issue-card school-issue-card--neutral" key={`follow-up-${index}`}><strong>Outro ponto de acompanhamento</strong><p>{message}</p></div>
                ))}
              {!hasRegistrationIssue && school.suspensions.length === 0 && openingIssues.length === 0 && !school.accounting.some((item) => item.paymentSuspended) && school.followUp.length === 0
                ? <p className="school-followup-empty">Nenhuma ocorrência de acompanhamento foi estruturada no retrato atual.</p>
                : null}
            </div>

            <div className="source-coverage" aria-labelledby="source-coverage-title">
              <h3 id="source-coverage-title">Cobertura das fontes</h3>
              {school.sourceCoverage.map((item) => (
                <div className="source-coverage-row" data-status={item.status.toLowerCase()} key={item.dataset}>
                  <span><strong>{item.dataset}</strong><small>{item.detail ?? ''}</small></span>
                  <span>{coverageStatusLabel(item.status)}</span>
                </div>
              ))}
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
