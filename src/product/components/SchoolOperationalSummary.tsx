import { deriveSchoolSummary } from '../derive';
import { formatDate, formatMoney } from '../format';
import type { HumanSchool } from '../types';
import {
  deriveSchoolOperationalReading,
  type SchoolAttentionTarget,
} from '../visual/school-operational-reading';

function actionLabel(target: SchoolAttentionTarget): string {
  if (target === '#repasses') return 'Ver repasses';
  if (target === '#contas-saldos') return 'Ver contas e saldos';
  return 'Ver prestação de contas';
}

export function SchoolOperationalSummary({ school }: { school: HumanSchool }) {
  const summary = deriveSchoolSummary(school);
  const reading = deriveSchoolOperationalReading(school);

  return (
    <section
      id="resumo"
      tabIndex={-1}
      className="section school-section-target school-operational"
      aria-labelledby="school-operational-title"
    >
      <header className="school-operational__heading">
        <div>
          <div className="eyebrow">Resumo financeiro</div>
          <h2 id="school-operational-title">Leitura rápida desta escola</h2>
          <p>Os valores abaixo representam etapas diferentes e não devem ser interpretados como equivalentes.</p>
        </div>
        <span className="school-operational__status" data-tone={reading.tone}>
          {reading.statusLabel}
        </span>
      </header>

      <div className="school-operational__body">
        <ol className="school-evidence-flow" aria-label="Etapas da leitura do repasse">
          <li className="school-evidence-stage">
            <span className="school-evidence-stage__label">Previsto</span>
            <strong>{formatMoney(summary.programmedCents)}</strong>
            <small>Valor programado para 2026</small>
          </li>
          <li className="school-evidence-stage" data-tone="paid">
            <span className="school-evidence-stage__label">Pagamento informado</span>
            <strong>{formatMoney(summary.paymentInformedCents)}</strong>
            <small>Registro do PDDEInfo</small>
          </li>
          <li className="school-evidence-stage" data-tone="credit">
            <span className="school-evidence-stage__label">Crédito compatível localizado</span>
            <strong>{formatMoney(summary.creditLocatedCents)}</strong>
            <small>Movimento compatível no SIGEF</small>
          </li>
        </ol>

        <div className="school-balance-context">
          <span>Saldo informado</span>
          <strong>{formatMoney(summary.reportedBalanceCents)}</strong>
          <small>
            {summary.balanceReferenceDate
              ? `Posição de ${formatDate(summary.balanceReferenceDate)}`
              : 'Ainda não há posição pública de saldo disponível'}
          </small>
        </div>
      </div>

      <aside
        className="school-operational__attention"
        data-tone={reading.tone}
        aria-labelledby="school-attention-title"
      >
        <div>
          <div className="eyebrow">Próxima leitura</div>
          <h3 id="school-attention-title">
            {reading.attentionItems.length > 0
              ? `${reading.attentionItems.length} ${reading.attentionItems.length === 1 ? 'ponto para conferir' : 'pontos para conferir'}`
              : 'Nenhum ponto de acompanhamento no retrato atual'}
          </h3>
        </div>

        {reading.attentionItems.length > 0 ? (
          <ul className="school-attention-list">
            {reading.attentionItems.map((item) => (
              <li key={item.key}>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
                {item.target ? <a href={item.target}>{actionLabel(item.target)}</a> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="school-operational__clear-note">
            A ausência de apontamentos não substitui o acompanhamento periódico das fontes oficiais.
          </p>
        )}
      </aside>
    </section>
  );
}
