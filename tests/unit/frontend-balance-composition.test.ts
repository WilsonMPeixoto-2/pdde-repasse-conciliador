import { describe, expect, test } from 'vitest';
import type { HumanPosition } from '../../src/product/types';

type CompositionModule = {
  buildBalanceComposition?: (position: HumanPosition) => {
    totalCents: number | null;
    checkingCents: number | null;
    applicationsCents: number | null;
    knownComponentsCents: number | null;
    differenceCents: number | null;
    checkingShare: number | null;
    applicationsShare: number | null;
    applicationBreakdown: Array<{ key: string; label: string; valueCents: number }>;
  };
};

async function loadComposition(): Promise<CompositionModule> {
  try {
    return await import('../../src/product/visual/balance-composition') as CompositionModule;
  } catch {
    return {};
  }
}

function position(overrides: Partial<HumanPosition> = {}): HumanPosition {
  return {
    referenceDate: '2026-06-30',
    checkingBalanceCents: 111,
    applications: {
      fundsCents: 415_032,
      savingsCents: 0,
      rdbCdbCents: null,
      totalCents: 415_032,
    },
    totalReportedBalanceCents: 415_143,
    ...overrides,
  };
}

describe('composição da posição financeira', () => {
  test('oferece um construtor dedicado à leitura dos componentes publicados', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
  });

  test('compõe conta e aplicações sem alterar os valores publicados', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
    if (!module.buildBalanceComposition) return;

    const result = module.buildBalanceComposition(position());

    expect(result.totalCents).toBe(415_143);
    expect(result.checkingCents).toBe(111);
    expect(result.applicationsCents).toBe(415_032);
    expect(result.knownComponentsCents).toBe(415_143);
    expect(result.differenceCents).toBe(0);
    expect(result.checkingShare).toBeCloseTo(111 / 415_143);
    expect(result.applicationsShare).toBeCloseTo(415_032 / 415_143);
  });

  test('preserva zero como informação observada no detalhamento de aplicações', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
    if (!module.buildBalanceComposition) return;

    const result = module.buildBalanceComposition(position());
    expect(result.applicationBreakdown).toEqual([
      { key: 'funds', label: 'Fundos', valueCents: 415_032 },
      { key: 'savings', label: 'Poupança', valueCents: 0 },
    ]);
  });

  test('não deriva total de aplicações a partir de subcomponentes quando a fonte não publicou o total', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
    if (!module.buildBalanceComposition) return;

    const result = module.buildBalanceComposition(position({
      applications: {
        fundsCents: 415_032,
        savingsCents: 0,
        rdbCdbCents: null,
        totalCents: null,
      },
    }));

    expect(result.applicationsCents).toBeNull();
    expect(result.knownComponentsCents).toBeNull();
    expect(result.checkingShare).toBeNull();
    expect(result.applicationsShare).toBeNull();
  });

  test('expõe divergência entre saldo e componentes em vez de normalizá-la silenciosamente', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
    if (!module.buildBalanceComposition) return;

    const result = module.buildBalanceComposition(position({
      checkingBalanceCents: 30_000,
      applications: {
        fundsCents: 60_000,
        savingsCents: null,
        rdbCdbCents: null,
        totalCents: 60_000,
      },
      totalReportedBalanceCents: 100_000,
    }));

    expect(result.knownComponentsCents).toBe(90_000);
    expect(result.differenceCents).toBe(10_000);
  });

  test('não fabrica proporção para componentes negativos ou soma igual a zero', async () => {
    const module = await loadComposition();
    expect(module.buildBalanceComposition).toBeTypeOf('function');
    if (!module.buildBalanceComposition) return;

    const negative = module.buildBalanceComposition(position({
      checkingBalanceCents: -5_000,
      applications: { fundsCents: 10_000, savingsCents: null, rdbCdbCents: null, totalCents: 10_000 },
      totalReportedBalanceCents: 5_000,
    }));
    const zero = module.buildBalanceComposition(position({
      checkingBalanceCents: 0,
      applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
      totalReportedBalanceCents: 0,
    }));

    expect(negative.checkingShare).toBeNull();
    expect(negative.applicationsShare).toBeNull();
    expect(zero.checkingShare).toBeNull();
    expect(zero.applicationsShare).toBeNull();
  });
});