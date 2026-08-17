import { useMemo, useState } from 'react';
import type { TimelineMonth2026 } from '../derive';
import { formatDate, formatMoney } from '../format';
import { buildFinancialSeriesGeometry } from '../visual/financial-series-geometry';

export function Timeline2026(props: {
  months: readonly TimelineMonth2026[];
  title?: string;
}) {
  const lastObserved = [...props.months].reverse().find((month) => month.observed) ?? null;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(lastObserved?.month ?? null);
  const selected = props.months.find((month) => month.month === selectedMonth) ?? null;
  const geometry = useMemo(
    () => buildFinancialSeriesGeometry(props.months),
    [props.months],
  );

  return (
    <div className="timeline">
      {props.title ? <h3>{props.title}</h3> : null}
      <svg viewBox="0 0 1010 225" role="img" aria-label="Evolução mensal do saldo informado em 2026. Meses sem observação aparecem como lacunas.">
        {geometry.path ? (
          <path className="timeline__segment timeline__segment--active" d={geometry.path} />
        ) : null}
        {geometry.points.map((point) => {
          const month = props.months.find((candidate) => candidate.month === point.month);
          if (!month) return null;
          return (
            <g key={point.month}>
              {point.observed && point.y !== null ? (
                <g
                  className="timeline__point"
                  role="button"
                  tabIndex={0}
                  data-selected={selectedMonth === point.month}
                  aria-label={`${month.label}: saldo informado ${formatMoney(month.totalReportedBalanceCents)}, posição ${formatDate(month.referenceDate)}`}
                  onClick={() => setSelectedMonth(point.month)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      setSelectedMonth(point.month);
                    }
                  }}
                >
                  <circle cx={point.x} cy={point.y} r="7" />
                </g>
              ) : (
                <circle className="timeline__missing" cx={point.x} cy={162} r="6" aria-hidden="true" />
              )}
              <text className="timeline__month" x={point.x} y={208} textAnchor="middle">{month.label}</text>
            </g>
          );
        })}
      </svg>
      <div className="sr-only">
        {props.months.map((month) => (
          <div key={month.month}>{month.label}: {month.observed ? `${formatMoney(month.totalReportedBalanceCents)}, ${formatDate(month.referenceDate)}` : 'sem posição publicada'}</div>
        ))}
      </div>
      {selected ? (
        <dl className="timeline__detail" aria-live="polite">
          <div><dt>Posição</dt><dd>{formatDate(selected.referenceDate)}</dd></div>
          <div><dt>Saldo informado</dt><dd>{formatMoney(selected.totalReportedBalanceCents)}</dd></div>
          <div><dt>Em aplicações</dt><dd>{formatMoney(selected.applicationsCents)}</dd></div>
          <div><dt>Em conta</dt><dd>{formatMoney(selected.checkingBalanceCents)}</dd></div>
        </dl>
      ) : (
        <div className="timeline__detail"><p>Selecione um mês com posição publicada para ver os detalhes.</p></div>
      )}
    </div>
  );
}
