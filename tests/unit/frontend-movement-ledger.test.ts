import { describe, expect, test } from 'vitest';

type Movement = {
  date: string;
  description: string;
  document: string | null;
  category: string | null;
  creditCents: number | null;
  debitCents: number | null;
  counterparty: {
    document: string | null;
    name: string | null;
    bank: string | null;
    agency: string | null;
    account: string | null;
  } | null;
};

type LedgerModule = {
  buildMovementLedger?: (movements: readonly Movement[]) => {
    entries: Array<{
      direction: 'credit' | 'debit' | 'ambiguous' | 'none';
      kind: 'funding' | 'spending' | 'asset-transfer' | 'income' | 'adjustment' | 'other';
      label: string;
      signedAmountCents: number | null;
      creditCents: number | null;
      debitCents: number | null;
    }>;
    totals: {
      creditsCents: number;
      debitsCents: number;
      differenceCents: number;
      count: number;
    };
  };
};

async function loadLedger(): Promise<LedgerModule> {
  try {
    return await import('../../src/product/visual/movement-ledger') as LedgerModule;
  } catch {
    return {};
  }
}

function movement(overrides: Partial<Movement> = {}): Movement {
  return {
    date: '2026-06-21',
    description: 'PAGAMENTO PIX',
    document: 'PX1',
    category: 'PAGAMENTO_TRANSFERENCIA',
    creditCents: null,
    debitCents: 124_000,
    counterparty: null,
    ...overrides,
  };
}

describe('ledger de movimentações financeiras', () => {
  test('oferece um construtor dedicado à leitura humana das movimentações', async () => {
    const module = await loadLedger();
    expect(module.buildMovementLedger).toBeTypeOf('function');
  });

  test('traduz categorias técnicas sem confundir aplicação com gasto', async () => {
    const module = await loadLedger();
    expect(module.buildMovementLedger).toBeTypeOf('function');
    if (!module.buildMovementLedger) return;

    const result = module.buildMovementLedger([
      movement({ category: 'REPASSE_FNDE', creditCents: 506_500, debitCents: null }),
      movement({ category: 'APLICACAO_FINANCEIRA', creditCents: null, debitCents: 380_000 }),
      movement({ category: 'RESGATE_APLICACAO', creditCents: 90_000, debitCents: null }),
      movement({ category: 'PAGAMENTO_TRANSFERENCIA', creditCents: null, debitCents: 124_000 }),
      movement({ category: 'RENDIMENTO_FINANCEIRO', creditCents: 1_250, debitCents: null }),
    ]);

    expect(result.entries.map((entry) => [entry.kind, entry.label])).toEqual([
      ['funding', 'Repasse FNDE'],
      ['asset-transfer', 'Aplicação financeira'],
      ['asset-transfer', 'Resgate de aplicação'],
      ['spending', 'Pagamento / transferência'],
      ['income', 'Rendimento financeiro'],
    ]);
  });

  test('preserva créditos e débitos observados separadamente e não os chama de saldo', async () => {
    const module = await loadLedger();
    expect(module.buildMovementLedger).toBeTypeOf('function');
    if (!module.buildMovementLedger) return;

    const result = module.buildMovementLedger([
      movement({ category: 'REPASSE_FNDE', creditCents: 506_500, debitCents: null }),
      movement({ category: 'APLICACAO_FINANCEIRA', creditCents: null, debitCents: 380_000 }),
      movement({ category: 'PAGAMENTO_TRANSFERENCIA', creditCents: null, debitCents: 124_000 }),
    ]);

    expect(result.totals).toEqual({
      creditsCents: 506_500,
      debitsCents: 504_000,
      differenceCents: 2_500,
      count: 3,
    });
  });

  test('não fabrica valor líquido quando a mesma linha traz crédito e débito', async () => {
    const module = await loadLedger();
    expect(module.buildMovementLedger).toBeTypeOf('function');
    if (!module.buildMovementLedger) return;

    const result = module.buildMovementLedger([
      movement({ creditCents: 10_000, debitCents: 2_000, category: 'ESTORNO_REVERSAO' }),
    ]);

    expect(result.entries[0]).toMatchObject({
      direction: 'ambiguous',
      kind: 'adjustment',
      label: 'Estorno / reversão',
      signedAmountCents: null,
      creditCents: 10_000,
      debitCents: 2_000,
    });
    expect(result.totals).toEqual({
      creditsCents: 10_000,
      debitsCents: 2_000,
      differenceCents: 8_000,
      count: 1,
    });
  });

  test('mantém movimento não classificado explícito em vez de inferir finalidade pela descrição', async () => {
    const module = await loadLedger();
    expect(module.buildMovementLedger).toBeTypeOf('function');
    if (!module.buildMovementLedger) return;

    const result = module.buildMovementLedger([
      movement({ category: 'MOVIMENTO_NAO_CLASSIFICADO', description: 'LANCAMENTO DIVERSO' }),
    ]);

    expect(result.entries[0]).toMatchObject({
      kind: 'other',
      label: 'Movimento não classificado',
      direction: 'debit',
      signedAmountCents: -124_000,
    });
  });
});
