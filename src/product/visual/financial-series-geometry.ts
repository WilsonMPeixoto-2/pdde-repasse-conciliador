import { extent } from 'd3-array';
import { scaleLinear, scalePoint } from 'd3-scale';
import { line } from 'd3-shape';
import type { TimelineMonth2026 } from '../derive';

export interface FinancialSeriesPoint {
  month: number;
  observed: boolean;
  x: number;
  y: number | null;
}

export interface FinancialSeriesTick {
  valueCents: number;
  y: number;
}

export interface FinancialSeriesObservation {
  month: number;
  valueCents: number;
}

export interface FinancialSeriesGeometry {
  points: FinancialSeriesPoint[];
  path: string | null;
  yTicks: FinancialSeriesTick[];
  observedCount: number;
  firstObserved: FinancialSeriesObservation | null;
  lastObserved: FinancialSeriesObservation | null;
  deltaCents: number | null;
  deltaPercent: number | null;
}

function observedValues(months: readonly TimelineMonth2026[]): FinancialSeriesObservation[] {
  return months.flatMap((month) => (
    month.observed && month.totalReportedBalanceCents !== null
      ? [{ month: month.month, valueCents: month.totalReportedBalanceCents }]
      : []
  ));
}

function valueDomain(values: readonly FinancialSeriesObservation[]): [number, number] {
  const [minimum, maximum] = extent(values, (item) => item.valueCents);
  if (minimum === undefined || maximum === undefined) return [0, 1];

  if (minimum >= 0) {
    if (maximum === 0) return [0, 100];
    const upperPadding = Math.max(maximum * 0.08, 100);
    return [0, maximum + upperPadding];
  }

  if (maximum <= 0) {
    const lowerPadding = Math.max(Math.abs(minimum) * 0.08, 100);
    return [minimum - lowerPadding, 0];
  }

  const span = maximum - minimum;
  const padding = Math.max(span * 0.09, 1);
  return [minimum - padding, maximum + padding];
}

export function buildFinancialSeriesGeometry(
  months: readonly TimelineMonth2026[],
  options: { width?: number; height?: number } = {},
): FinancialSeriesGeometry {
  const width = options.width ?? 1010;
  const height = options.height ?? 260;
  const horizontalPadding = Math.min(72, Math.max(34, width * 0.07));
  const plotTop = Math.min(54, Math.max(24, height * 0.19));
  const plotBottom = Math.max(plotTop + 1, height - Math.min(66, Math.max(36, height * 0.25)));
  const observations = observedValues(months);

  const monthScale = scalePoint<number>()
    .domain(months.map((month) => month.month))
    .range([horizontalPadding, width - horizontalPadding]);

  const balanceScale = scaleLinear()
    .domain(valueDomain(observations))
    .range([plotBottom, plotTop])
    .nice(4);

  const points = months.map((month) => ({
    month: month.month,
    observed: month.observed && month.totalReportedBalanceCents !== null,
    x: monthScale(month.month) ?? horizontalPadding,
    y: month.observed && month.totalReportedBalanceCents !== null
      ? balanceScale(month.totalReportedBalanceCents)
      : null,
  }));

  const path = line<TimelineMonth2026>()
    .defined((month) => month.observed && month.totalReportedBalanceCents !== null)
    .x((month) => monthScale(month.month) ?? horizontalPadding)
    .y((month) => balanceScale(month.totalReportedBalanceCents as number))(months);

  const yTicks = observations.length === 0
    ? []
    : balanceScale.ticks(4).map((valueCents) => ({
        valueCents,
        y: balanceScale(valueCents),
      }));

  const firstObserved = observations[0] ?? null;
  const lastObserved = observations.at(-1) ?? null;
  const deltaCents = firstObserved && lastObserved && observations.length > 1
    ? lastObserved.valueCents - firstObserved.valueCents
    : null;
  const deltaPercent = deltaCents !== null && firstObserved && firstObserved.valueCents !== 0
    ? deltaCents / Math.abs(firstObserved.valueCents)
    : null;

  return {
    points,
    path,
    yTicks,
    observedCount: observations.length,
    firstObserved,
    lastObserved,
    deltaCents,
    deltaPercent,
  };
}