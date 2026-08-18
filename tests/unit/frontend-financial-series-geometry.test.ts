import { describe, expect, test } from 'vitest';
import type { TimelineMonth2026 } from '../../src/product/derive';

type GeometryModule = {
  buildFinancialSeriesGeometry?: (
    months: readonly TimelineMonth2026[],
    options?: { width?: number; height?: number },
  ) => {
    points: Array<{ month: number; observed: boolean; x: number; y: number | null }>;
    path: string | null;
    yTicks: Array<{ valueCents: number; y: number }>;
    observedCount: number;
    firstObserved: { month: number; valueCents: number } | null;
    lastObserved: { month: number; valueCents: number } | null;
    deltaCents: number | null;
    deltaPercent: number | null;
  };
};

async function loadGeometry(): Promise<GeometryModule> {
  try {
    return await import('../../src/product/visual/financial-series-geometry') as GeometryModule;
  } catch {
    return {};
  }
}

function month(month: number, value: number | null): TimelineMonth2026 {
  return {
    month,
    label: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'][month - 1]!,
    observed: value !== null,
    referenceDate: value === null ? null : `2026-${String(month).padStart(2, '0')}-28`,
    totalReportedBalanceCents: value,
    checkingBalanceCents: value,
    applicationsCents: value === null ? null : 0,
  };
}

describe('geometria da série financeira', () => {
  test('oferece um construtor visual dedicado', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
  });

  test('preserva zero como observação real e ausência como lacuna', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 0),
      month(2, null),
      month(3, 150_000),
    ]);

    expect(result.points[0]).toMatchObject({ month: 1, observed: true });
    expect(result.points[0]?.y).toBeTypeOf('number');
    expect(result.points[1]).toMatchObject({ month: 2, observed: false, y: null });
  });

  test('não desenha continuidade através de mês sem observação', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 100_000),
      month(2, null),
      month(3, 160_000),
    ]);

    expect(result.path).not.toContain('L');
  });

  test('mantém coordenadas finitas quando todos os valores observados são iguais', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 100_000),
      month(2, 100_000),
      month(3, 100_000),
    ], { width: 720, height: 180 });

    expect(result.points.every((point) => point.y === null || Number.isFinite(point.y))).toBe(true);
    expect(result.path).not.toContain('NaN');
  });

  test('entrega referências monetárias e variação sem inventar meses ausentes', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 100_000),
      month(2, null),
      month(3, 160_000),
      month(4, 140_000),
    ]);

    expect(result.observedCount).toBe(3);
    expect(result.firstObserved).toEqual({ month: 1, valueCents: 100_000 });
    expect(result.lastObserved).toEqual({ month: 4, valueCents: 140_000 });
    expect(result.deltaCents).toBe(40_000);
    expect(result.deltaPercent).toBeCloseTo(0.4);
    expect(result.yTicks.length).toBeGreaterThanOrEqual(2);
    expect(result.yTicks.every((tick) => Number.isFinite(tick.valueCents) && Number.isFinite(tick.y))).toBe(true);
  });

  test('ancora em zero a escala de uma série inteiramente não negativa', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 111),
      month(2, null),
      month(3, 102_400),
      month(6, 415_143),
    ]);

    expect(result.yTicks.length).toBeGreaterThan(0);
    expect(result.yTicks.every((tick) => tick.valueCents >= 0)).toBe(true);
    expect(result.yTicks.some((tick) => tick.valueCents === 0)).toBe(true);
  });

  test('não fabrica percentual quando a primeira posição observada é zero', async () => {
    const geometry = await loadGeometry();
    expect(geometry.buildFinancialSeriesGeometry).toBeTypeOf('function');
    if (!geometry.buildFinancialSeriesGeometry) return;

    const result = geometry.buildFinancialSeriesGeometry([
      month(1, 0),
      month(2, 50_000),
    ]);

    expect(result.deltaCents).toBe(50_000);
    expect(result.deltaPercent).toBeNull();
  });
});