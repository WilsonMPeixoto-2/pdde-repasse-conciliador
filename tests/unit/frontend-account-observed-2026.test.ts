import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AccountObserved2026 } from '../../src/product/components/AccountObserved2026';
import { humanAccountSchema } from '../../shared/human-financial-contract';

function account(overrides: Record<string, unknown> = {}) {
  return humanAccountSchema.parse({
    program: 'PDDE Básico',
    bank: '001',
    agency: '0249',
    account: '0000549827',
    positions: [
      {
        referenceDate: '2026-05-31',
        checkingBalanceCents: 315500,
        applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
        totalReportedBalanceCents: 315500,
      },
      {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 315500,
        applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
        totalReportedBalanceCents: 315500,
      },
    ],
    latestPosition: {
      referenceDate: '2026-07-31',
      checkingBalanceCents: 315500,
      applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
      totalReportedBalanceCents: 315500,
    },
    movements: [{
      date: '2026-05-03',
      description: 'ORDEM BANCARIA',
      document: '00000001974995000852',
      category: 'Crédito FNDE',
      kind: 'FNDE_CREDIT',
      creditCents: 315500,
      debitCents: null,
      counterparty: null,
    }],
    coverage: {
      positionCount: 2,
      firstPositionDate: '2026-05-31',
      latestPositionDate: '2026-07-31',
      movementCollectionStatus: 'COMPLETE',
      latestMovementDate: '2026-05-03',
    },
    activity: {
      movementCount: 1,
      creditsObservedCents: 315500,
      debitsObservedCents: 0,
      fndeCreditsCents: 315500,
      applicationsCents: 0,
      redemptionsCents: 0,
      paymentsAndTransfersCents: 0,
      financialIncomeCents: 0,
      thirdPartyEntriesCents: 0,
      bankFeesCents: 0,
      otherCreditsCents: 0,
      otherDebitsCents: 0,
    },
    contextFlags: [],
    note: 'Saldo informado pelo FNDE com posição até 31/07/2026.',
    ...overrides,
  });
}

describe('leitura observada da conta em 2026', () => {
  it('resume cobertura e atividade sem recalcular o extrato', () => {
    const html = renderToStaticMarkup(createElement(AccountObserved2026, { account: account() }));

    for (const text of [
      'O que foi observado em 2026',
      'Primeira posição observada',
      'Última posição observada',
      'Aplicações',
      'Pagamentos / transferências',
      'Créditos observados',
      'Débitos observados',
    ]) expect(html).toContain(text);

    expect(html).toContain('Crédito observado em 2026; a posição mais recente informa o valor em conta na data indicada.');
    expect(html).toContain('31/07/2026');
    expect(html).toContain('R$ 3.155,00');
  });

  it('explica valor aplicado sem atribuir origem quando não há evento de aplicação observado em 2026', () => {
    const applied = account({
      program: 'PDDE Qualidade',
      account: '0000546461',
      positions: [{
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { fundsCents: 345973, savingsCents: 0, rdbCdbCents: 0, totalCents: 345973 },
        totalReportedBalanceCents: 345973,
      }],
      latestPosition: {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { fundsCents: 345973, savingsCents: 0, rdbCdbCents: 0, totalCents: 345973 },
        totalReportedBalanceCents: 345973,
      },
      movements: [],
      coverage: {
        positionCount: 1,
        firstPositionDate: '2026-07-31',
        latestPositionDate: '2026-07-31',
        movementCollectionStatus: 'COMPLETE',
        latestMovementDate: null,
      },
      activity: {
        movementCount: 0,
        creditsObservedCents: 0,
        debitsObservedCents: 0,
        fndeCreditsCents: 0,
        applicationsCents: 0,
        redemptionsCents: 0,
        paymentsAndTransfersCents: 0,
        financialIncomeCents: 0,
        thirdPartyEntriesCents: 0,
        bankFeesCents: 0,
        otherCreditsCents: 0,
        otherDebitsCents: 0,
      },
      contextFlags: [
        'NONZERO_POSITION_WITHOUT_2026_INFLOW',
        'NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT',
      ],
    });

    const html = renderToStaticMarkup(createElement(AccountObserved2026, { account: applied }));
    expect(html).toContain('Há valor aplicado na posição mais recente, mas nenhum evento de aplicação foi observado no extrato de 2026. A origem pode estar fora do recorte e requer consulta separada.');
    expect(html).not.toContain('saldo reprogramado');
    expect(html).not.toContain('rendimento acumulado');
  });

  it('prioriza a limitação da coleta e não conclui ausência de evento em extrato parcial', () => {
    const partial = account({
      coverage: {
        positionCount: 2,
        firstPositionDate: '2026-05-31',
        latestPositionDate: '2026-07-31',
        movementCollectionStatus: 'PARTIAL',
        latestMovementDate: '2026-05-03',
      },
      contextFlags: ['MOVEMENT_COLLECTION_PARTIAL'],
    });

    const html = renderToStaticMarkup(createElement(AccountObserved2026, { account: partial }));
    expect(html).toContain('Coleta de movimentações parcial');
    expect(html).not.toContain('nenhum evento de aplicação foi observado');
  });
});
