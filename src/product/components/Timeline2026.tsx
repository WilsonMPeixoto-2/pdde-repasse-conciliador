import { useMemo, useState, type KeyboardEvent } from 'react';
import { motion } from 'motion/react';
import type { TimelineMonth2026 } from '../derive';
import { formatDate, formatMoney } from '../format';
import { buildFinancialSeriesGeometry } from '../visual/financial-series-geometry';

const axisMoneyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  compactDisplay: 'short',
  maximumFractionDigits: 1,
});

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

function formatAxisMoney(cents: number): string {
  return axisMoneyFormatter.format(cents / 100);
}

function deltaLabel(deltaCents: number | null, deltaPercent: number | null): string {
  if (deltaCents === null) return 'Ainda não há duas posições publicadas para comparar.';
  const sign = deltaCents > 0 ? '+' : deltaCents < 0 ? '−' : '';
  const absoluteMoney = formatMoney(Math.abs(deltaCents));
  const percentage = deltaPercent === null ? '' : ` · ${deltaPercent > 0 ? '+' : ''}${percentFormatter.format(deltaPercent)}`;
  if (deltaCents === 0) return `Sem variação entre a primeira e a última posição${percentage}.`;
  return `${sign}${absoluteMoney}${percentage} entre a primeira e a última posição publicada.`;
}

export function Timeline2026(props: {
  months: readonly TimelineMonth2026[];
  title?: string;
}) {
  const lastObserved = [...props.months].reverse().find((month) => month.observed) ?? null;
  const [selectedMonth, setSelectedMonth] = useState<number | null>(lastObserved?.month ?? null);
  const selected = props.months.find((month) => month.month === selectedMonth) ?? null;
  const observedMonths = useMemo(
    () => props.months.filter((month) => month.observed && month.totalReportedBalanceCents !== null),
    [props.months],
  );
  const geometry = useMemo(
    () => buildFinancialSeriesGeometry(props.months),
    [props.months],
  );
  const lastPoint = geometry.lastObserved
    ? geometry.points.find((point) => point.month === geometry.lastObserved?.month) ?? null
    : null;
  const selectedPoint = selected
    ? geometry.points.find((point) => point.month === selected.month) ?? null
    : null;

  function moveSelection(event: KeyboardEvent<SVGGElement>, month: number) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const currentIndex = observedMonths.findIndex((candidate) => candidate.month === month);
    if (currentIndex < 0) return;
    const direction = event.key === 'ArrowRight' ? 1 : -1;
    const next = observedMonths[currentIndex + direction];
    if (next) setSelectedMonth(next.month);
  }

  return (
    <div className="timeline">
      <div className="timeline__heading">
        <div>
          {props.title ? <h3>{props.title}</h3> : null}
          <p className="timeline__coverage">
            {geometry.observedCount === 0
              ? 'Nenhuma posição mensal publicada em 2026.'
              : `${geometry.observedCount} ${geometry.observedCount === 1 ? 'posição publicada' : 'posições publicadas'} em 2026.`}
          </p>
        </div>
        {geometry.lastObserved ? (
          <div className="timeline__latest" aria-label={`Última posição: ${formatMoney(geometry.lastObserved.valueCents)}`}>
            <span>Última posição</span>
            <strong>{formatMoney(geometry.lastObserved.valueCents)}</strong>
          </div>
        ) : null}
      </div>

      {geometry.observedCount > 0 ? (
        <div className="timeline__delta" data-direction={geometry.deltaCents === null ? 'neutral' : geometry.deltaCents > 0 ? 'up' : geometry.deltaCents < 0 ? 'down' : 'neutral'}>
          <span className="timeline__delta-mark" aria-hidden="true" />
          <span>{deltaLabel(geometry.deltaCents, geometry.deltaPercent)}</span>
        </div>
      ) : null}

      <div className="timeline__chart-frame">
        <svg viewBox="0 0 1010 260" role="img" aria-label="Evolução mensal do saldo informado em 2026. Meses sem observação aparecem como lacunas e não são ligados pela série.">
          <g className="timeline__grid" aria-hidden="true">
            {geometry.yTicks.map((tick) => (
              <g key={tick.valueCents}>
                <line x1="72" x2="938" y1={tick.y} y2={tick.y} />
                <text x="12" y={tick.y + 4}>{formatAxisMoney(tick.valueCents)}</text>
              </g>
            ))}
          </g>

          {selectedPoint?.observed && selectedPoint.y !== null ? (
            <motion.line
              className="timeline__selection-guide"
              x1={selectedPoint.x}
              x2={selectedPoint.x}
              y1="38"
              y2="202"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
          ) : null}

          {geometry.path ? (
            <motion.path
              className="timeline__segment timeline__segment--active"
              d={geometry.path}
              initial={{ pathLength: 0, opacity: 0.45 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
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
                    aria-label={`${month.label}: saldo informado ${formatMoney(month.totalReportedBalanceCents)}, posição ${formatDate(month.referenceDate)}. Use as setas para navegar entre meses publicados.`}
                    onClick={() => setSelectedMonth(point.month)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setSelectedMonth(point.month);
                        return;
                      }
                      moveSelection(event, point.month);
                    }}
                  >
                    <circle className="timeline__hit" cx={point.x} cy={point.y} r="19" />
                    <circle className="timeline__dot" cx={point.x} cy={point.y} r="6" />
                  </g>
                ) : (
                  <g className="timeline__missing-group" aria-hidden="true">
                    <line x1={point.x} x2={point.x} y1="192" y2="202" />
                    <circle className="timeline__missing" cx={point.x} cy="197" r="5" />
                  </g>
                )}
                <text className="timeline__month" x={point.x} y="238" textAnchor="middle">{month.label}</text>
              </g>
            );
          })}

          {lastPoint?.observed && lastPoint.y !== null && geometry.lastObserved ? (
            <g className="timeline__last-label" aria-hidden="true">
              <text x={lastPoint.x - 8} y={Math.max(24, lastPoint.y - 16)} textAnchor="end">
                {formatAxisMoney(geometry.lastObserved.valueCents)}
              </text>
            </g>
          ) : null}
        </svg>
      </div>

      <div className="sr-only">
        {props.months.map((month) => (
          <div key={month.month}>{month.label}: {month.observed ? `${formatMoney(month.totalReportedBalanceCents)}, ${formatDate(month.referenceDate)}` : 'sem posição publicada'}</div>
        ))}
      </div>

      {selected?.observed ? (
        <dl className="timeline__detail" aria-live="polite">
          <div><dt>Mês selecionado</dt><dd>{selected.label}</dd></div>
          <div><dt>Posição</dt><dd>{formatDate(selected.referenceDate)}</dd></div>
          <div><dt>Saldo informado</dt><dd>{formatMoney(selected.totalReportedBalanceCents)}</dd></div>
          <div><dt>Em aplicações</dt><dd>{formatMoney(selected.applicationsCents)}</dd></div>
          <div><dt>Em conta</dt><dd>{formatMoney(selected.checkingBalanceCents)}</dd></div>
        </dl>
      ) : (
        <div className="timeline__detail timeline__detail--empty"><p>Selecione um mês com posição publicada para ver os detalhes.</p></div>
      )}
    </div>
  );
}