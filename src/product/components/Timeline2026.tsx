import { useMemo, useState } from 'react';
import type { TimelineMonth2026 } from '../derive';
import { formatDate, formatMoney } from '../format';

function pointY(value: number, min: number, max: number): number {
  if (min === max) return 105;
  return 155 - ((value - min) / (max - min)) * 100;
}

export function Timeline2026(props: {
  months: readonly TimelineMonth2026[];
  title?: string;
}) {
  const lastObserved = [...props.months].reverse().find((month) => month.observed) ?? null;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(lastObserved?.month ?? null);
  const observedValues = props.months
    .map((month) => month.totalReportedBalanceCents)
    .filter((value): value is number => value !== null);
  const min = observedValues.length ? Math.min(...observedValues) : 0;
  const max = observedValues.length ? Math.max(...observedValues) : 0;
  const selected = props.months.find((month) => month.month === selectedMonth) ?? null;

  const points = useMemo(() => props.months.map((month, index) => ({
    ...month,
    x: 55 + index * 82,
    y: month.totalReportedBalanceCents === null ? 162 : pointY(month.totalReportedBalanceCents, min, max),
  })), [props.months, min, max]);

  return (
    <div className="timeline">
      {props.title ? <h3>{props.title}</h3> : null}
      <svg viewBox="0 0 1010 225" role="img" aria-label="Evolução mensal do saldo informado em 2026. Meses sem observação aparecem como lacunas.">
        {points.slice(0, -1).map((point, index) => {
          const next = points[index + 1];
          if (!point.observed || !next.observed) return null;
          return (
            <line
              key={`segment-${point.month}`}
              className="timeline__segment timeline__segment--active"
              x1={point.x}
              y1={point.y}
              x2={next.x}
              y2={next.y}
            />
          );
        })}
        {points.map((point) => (
          <g key={point.month}>
            {point.observed ? (
              <g
                className="timeline__point"
                role="button"
                tabIndex={0}
                data-selected={selectedMonth === point.month}
                aria-label={`${point.label}: saldo informado ${formatMoney(point.totalReportedBalanceCents)}, posição ${formatDate(point.referenceDate)}`}
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
            <text className="timeline__month" x={point.x} y={208} textAnchor="middle">{point.label}</text>
          </g>
        ))}
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
