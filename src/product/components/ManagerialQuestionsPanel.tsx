import { Link } from 'react-router-dom';
import { derivePddeBasicPortfolio } from '../../../shared/pdde-basic-monitoring';
import { usePortfolioSchoolDetails } from '../usePortfolioSchoolDetails';

function unitLabel(value: number): string {
  return `${value} ${value === 1 ? 'escola' : 'escolas'}`;
}

export function ManagerialQuestionsPanel() {
  const details = usePortfolioSchoolDetails();

  if (details.status === 'loading') {
    return (
      <section className="section managerial-questions" aria-busy="true">
        <div className="eyebrow">Leitura gerencial</div>
        <h2>Respondendo às perguntas principais…</h2>
      </section>
    );
  }

  if (details.status === 'error') {
    return (
      <section className="section managerial-questions managerial-questions--error">
        <div className="eyebrow">Leitura gerencial</div>
        <h2>Não foi possível montar a síntese gerencial.</h2>
        <p>{details.error}</p>
      </section>
    );
  }

  const monitoring = derivePddeBasicPortfolio(details.schools);
  const checkingOnly = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) <= 0
  )).length;
  const applicationOnly = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) <= 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;
  const both = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;
  const staleZero = monitoring.rows.filter((row) => (
    row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT'
    && row.balance.totalCents === 0
  )).length;
  const evidenceGap = monitoring.firstNeedsSourceEscalationCount;

  return (
    <section className="section managerial-questions" aria-labelledby="managerial-questions-title">
      <div className="section-heading managerial-questions__heading">
        <div>
          <div className="eyebrow">Leitura gerencial</div>
          <h2 id="managerial-questions-title">As perguntas que precisam de resposta</h2>
        </div>
        <p>
          Primeiro a conclusão operacional. Fontes, registros intermediários e detalhes técnicos ficam abaixo,
          para quando forem necessários à auditoria.
        </p>
      </div>

      <div className="managerial-questions__grid">
        <Link className="managerial-answer" data-tone={monitoring.firstPendingCount === 0 ? 'positive' : 'attention'} to="/pdde-basico">
          <span>Para quem o FNDE informa pagamento da 1ª parcela / P1?</span>
          <strong>{monitoring.firstPaidCount} de {monitoring.schoolCount}</strong>
          <small>{monitoring.firstPendingCount === 0 ? 'Todas as escolas têm pagamento informado.' : `${monitoring.firstPendingCount} ainda sem pagamento informado.`}</small>
        </Link>
        <Link className="managerial-answer" data-tone={monitoring.secondPaidCount > 0 ? 'positive' : 'neutral'} to="/pdde-basico">
          <span>Para quem o FNDE informa pagamento da 2ª parcela / P2?</span>
          <strong>{monitoring.secondPaidCount} de {monitoring.schoolCount}</strong>
          <small>{monitoring.secondPendingCount} ainda sem pagamento informado.</small>
        </Link>
        <Link className="managerial-answer" data-tone="evidence" to="/pdde-basico">
          <span>Em quantas a evidência bancária foi localizada?</span>
          <strong>{monitoring.firstCreditLocatedCount} de {monitoring.firstPaidCount}</strong>
          <small>Crédito compatível localizado no SIGEF para o primeiro ciclo.</small>
        </Link>
        <Link className="managerial-answer" data-tone="balance" to="/pdde-basico">
          <span>Quantas têm saldo PDDE positivo?</span>
          <strong>{monitoring.balancePositiveCount} de {monitoring.schoolCount}</strong>
          <small>{checkingOnly} só em conta · {applicationOnly} só aplicado · {both} nos dois.</small>
        </Link>
      </div>

      <div className="managerial-coherence" data-has-alert={monitoring.trueInconsistencyCount > 0 ? 'true' : 'false'}>
        <div className="managerial-coherence__headline">
          <span>Coerência cronológica</span>
          <strong>{monitoring.trueInconsistencyCount} inconsistência(s) temporalmente comparável(is)</strong>
        </div>
        <div className="managerial-coherence__facts">
          <p>
            <strong>{unitLabel(monitoring.balanceBeforePaymentCount)}</strong> têm pagamento informado depois da referência de saldo disponível.
            Nesses casos, o saldo anterior não pode confirmar nem negar o repasse.
          </p>
          <p>
            <strong>{unitLabel(staleZero)}</strong> aparecem com saldo zero justamente porque a posição de saldo é anterior ao pagamento.
            Isso é defasagem de referência, não evidência de dinheiro ausente.
          </p>
          <p>
            <strong>{unitLabel(evidenceGap)}</strong> ainda precisam de reforço de evidência para o primeiro ciclo porque o crédito específico não foi localizado no SIGEF.
          </p>
        </div>
        <Link className="text-link" to="/pdde-basico">Abrir escola por escola e ver a linha do tempo →</Link>
      </div>
    </section>
  );
}
