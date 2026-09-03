import { useMemo } from 'react';
import { motion } from 'motion/react';
import { formatDate, formatMoney } from '../format';
import type { HumanPosition } from '../types';
import { buildBalanceComposition } from '../visual/balance-composition';

const shareFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatShare(value: number | null): string {
  return value === null ? 'Proporção não disponível' : shareFormatter.format(value);
}

export function BalanceComposition(props: { position: HumanPosition }) {
  const model = useMemo(() => buildBalanceComposition(props.position), [props.position]);
  const canCompose = model.checkingShare !== null && model.applicationsShare !== null;
  const hasDifference = model.differenceCents !== null && model.differenceCents !== 0;

  return (
    <section className="balance-composition" aria-label={`Composição da posição financeira de ${formatDate(props.position.referenceDate)}`}>
      <div className="balance-composition__header">
        <div>
          <span className="balance-composition__eyebrow">Saldo informado</span>
          <strong className="balance-composition__total">{formatMoney(model.totalCents)}</strong>
        </div>
        <span className="balance-composition__date">Posição {formatDate(props.position.referenceDate)}</span>
      </div>

      {canCompose ? (
        <div className="balance-composition__visual">
          <div
            className="balance-composition__track"
            role="img"
            aria-label={`Composição conhecida do saldo: ${formatMoney(model.checkingCents)} em conta e ${formatMoney(model.applicationsCents)} em aplicações.`}
          >
            <motion.span
              className="balance-composition__segment balance-composition__segment--checking"
              initial={{ width: 0 }}
              animate={{ width: `${model.checkingShare! * 100}%` }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            />
            <motion.span
              className="balance-composition__segment balance-composition__segment--applications"
              initial={{ width: 0 }}
              animate={{ width: `${model.applicationsShare! * 100}%` }}
              transition={{ duration: 0.45, delay: 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>

          <div className="balance-composition__legend">
            <div className="balance-composition__legend-item">
              <span className="balance-composition__swatch balance-composition__swatch--checking" aria-hidden="true" />
              <span><small>Em conta · {formatShare(model.checkingShare)}</small><strong>{formatMoney(model.checkingCents)}</strong></span>
            </div>
            <div className="balance-composition__legend-item">
              <span className="balance-composition__swatch balance-composition__swatch--applications" aria-hidden="true" />
              <span><small>Em aplicações · {formatShare(model.applicationsShare)}</small><strong>{formatMoney(model.applicationsCents)}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        <div className="balance-composition__unavailable">
          <span>A fonte não oferece componentes não negativos suficientes para uma composição proporcional.</span>
        </div>
      )}

      {model.checkingCents === 0 && (model.applicationsCents ?? 0) > 0 ? (
        <p className="balance-composition__location-note">
          O saldo desta conta está concentrado em aplicações financeiras; saldo em conta corrente igual a zero não significa ausência de recurso.
        </p>
      ) : null}

      {model.applicationBreakdown.length > 0 ? (
        <div className="balance-composition__breakdown" aria-label="Detalhamento das aplicações publicado pela fonte">
          <span className="balance-composition__breakdown-title">Detalhamento das aplicações</span>
          <dl>
            {model.applicationBreakdown.map((item) => (
              <div key={item.key}>
                <dt>{item.label}</dt>
                <dd>{formatMoney(item.valueCents)}</dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}

      {hasDifference ? (
        <div className="balance-composition__difference" role="note">
          <strong>Componentes não conciliados com o saldo informado</strong>
          <span>
            A soma dos componentes publicados é {formatMoney(model.knownComponentsCents)} e difere do saldo informado em {formatMoney(Math.abs(model.differenceCents!))}.
          </span>
        </div>
      ) : null}
    </section>
  );
}