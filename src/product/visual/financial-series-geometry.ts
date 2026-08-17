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

export interface FinancialSeriesGeometry {
  points: FinancialSeriesPoint[];
  path: string | null;
}

function valueDomain(months: readonly TimelineMonth2026[]): [number, number] {
  const values = months
    .filter((month) => month.observed && month.totalReportedBalanceCents !== null)
    .map((month) => month.totalReportedBalanceCents as number);
  const [minimum, maximum] = extent(values);
  if (minimum === undefined || maximum === undefined) return [0, 1];
  if (minimum !== maximum) return [minimum, maximum];
  const padding = Math.max(Math.abs(minimum) * 0.05, 1);
  return [minimum - padding, maximum + padding];
}

export function buildFinancialSeriesGeometry(
  months: readonly TimelineMonth2026[],
  options: { width?: number; height?: number } = {},
): FinancialSeriesGeometry {
  const width = options.width ?? 1010;
  const height = options.height ?? 225;
  const horizontalPadding = Math.min(55, Math.max(24, width * 0.055));
  const plotTop = Math.min(55, Math.max(24, height * 0.24));
  const plotBottom = Math.max(plotTop + 1, height - Math.min(70, Math.max(25, height * 0.31)));

  const monthScale = scalePoint<number>()
    .domain(months.map((month) => month.month))
    .range([horizontalPadding, width - horizontalPadding]);
  const balanceScale = scaleLinear()
    .domain(valueDomain(months))
    .range([plotBottom, plotTop]);

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

  return { points, path };
}
