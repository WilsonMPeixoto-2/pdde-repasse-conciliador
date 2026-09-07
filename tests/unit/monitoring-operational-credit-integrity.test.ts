import { describe, expect, test } from 'vitest';
import { buildMonitoringOperationalView } from '../../backend/application/build-monitoring-operational-view';
import { buildFiscalHumanView } from '../../backend/application/build-fiscal-human-view';

const account = { bank: '001', agency: '0249', number: '000056267X' };
const firstRepasse = {
  programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
  programadoCents: 100_000, pagoInformadoCents: 100_000,
  dataOrdem: '2026-05-01' as string | null, account,
};

function fixture() {
  return {
    version: 2, generatedAt: '2026-09-06T16:00:00Z', fiscalYear: 2026,
    status: 'COMPLETE', sources: ['PDDEINFO', 'SIGEF_EXTRATO'], coverage: {}, summary: {},
    schools: [{
      inep: '33069271', sme: '0410005', name: 'EM Exemplo', uex: 'CEC Exemplo',
      cnpj: '01226403000116', repasses: [{ ...firstRepasse }],
      accounts: [{
        programCode: '02', programLabel: 'PDDE', account, saldoPddeInfoCents: null,
        status: 'COMPLETE', error: null, pagesFetched: 1, declaredTotal: 1,
        uniqueMovements: 1, movementsInYear: 1, coverageThrough: '2026-05-05' as string | null,
        totals: {}, movements: [{
          id: 'single-credit', schoolCnpj: '01226403000116', programCode: '02',
          operation: 'credit', amountCents: 100_000, movementDate: '2026-05-05',
          account, document: 'OB123', history: 'ORDEM BANCARIA', classification: 'REPASSE_FNDE',
          counterparty: { document: null, name: null, bank: null, agency: null, account: null },
          sourceUrl: 'https://www.fnde.gov.br/sigefweb/exemplo',
        }],
      }],
    }],
  };
}

describe('integridade da associação operacional de crédito', () => {
  test('um crédito disputado por duas parcelas não confirma nenhuma delas nem duplica o total', () => {
    const raw = fixture();
    raw.schools[0].repasses.push({ ...firstRepasse, installment: '2ª Parcela', dataOrdem: '2026-05-03' });

    for (const repasses of [raw.schools[0].repasses, [...raw.schools[0].repasses].reverse()]) {
      const view = buildMonitoringOperationalView({
        ...raw, schools: [{ ...raw.schools[0], repasses }],
      });
      expect(view.repasses.map((repasse) => repasse.bankCreditStatus)).toEqual([
        'CREDITO_AMBIGUO', 'CREDITO_AMBIGUO',
      ]);
      expect(view.summary.repasseStatusAmountsCents.CREDITO_CONFIRMADO ?? 0).toBe(0);
      expect(view.repasses).toEqual(expect.arrayContaining([
        expect.objectContaining({
          bankCreditAmountCents: null, bankCreditDate: null, bankDocument: null,
          bankCreditCandidates: [{ id: 'single-credit', date: '2026-05-05', amountCents: 100_000, document: 'OB123' }],
        }),
      ]));
      expect(view.movements).toHaveLength(1);
    }
  });

  test('uma parcela com vários candidatos também impede outra parcela de confirmar crédito compartilhado', () => {
    const raw = fixture();
    raw.schools[0].repasses.push({ ...firstRepasse, installment: '2ª Parcela', dataOrdem: '2026-05-03' });
    raw.schools[0].accounts[0].movements.push({
      ...raw.schools[0].accounts[0].movements[0], id: 'earlier-credit', document: 'OB122', movementDate: '2026-05-02',
    });
    const view = buildMonitoringOperationalView(raw);
    expect(view.repasses.map((repasse) => repasse.bankCreditStatus)).toEqual([
      'CREDITO_AMBIGUO', 'CREDITO_AMBIGUO',
    ]);
  });

  test.each(['2026-04-30', null])('cobertura %s não permite concluir crédito ausente em ordem posterior', (coverageThrough) => {
    const raw = fixture();
    raw.schools[0].accounts[0].coverageThrough = coverageThrough;
    raw.schools[0].accounts[0].movements = [];
    expect(buildMonitoringOperationalView(raw).repasses[0]).toMatchObject({
      bankCreditStatus: 'CONSULTA_INCONCLUSIVA', bankCreditAmountCents: null,
    });
  });

  test('pagamento sem data não confirma um crédito apenas por conta e valor', () => {
    const raw = fixture();
    raw.schools[0].repasses[0].dataOrdem = null;
    expect(buildMonitoringOperationalView(raw).repasses[0]).toMatchObject({
      bankCreditStatus: 'CONSULTA_INCONCLUSIVA', bankCreditAmountCents: null,
    });
  });

  test('cobertura apenas até a data do pagamento ainda não permite concluir ausência de crédito', () => {
    const raw = fixture();
    raw.schools[0].accounts[0].coverageThrough = '2026-05-01';
    raw.schools[0].accounts[0].movements = [];
    expect(buildMonitoringOperationalView(raw).repasses[0].bankCreditStatus).toBe('CONSULTA_INCONCLUSIVA');
  });

  test('só conclui crédito não localizado quando o extrato cobre toda a janela de 30 dias', () => {
    const raw = fixture();
    raw.schools[0].accounts[0].coverageThrough = '2026-05-31';
    raw.schools[0].accounts[0].movements = [];
    expect(buildMonitoringOperationalView(raw).repasses[0].bankCreditStatus).toBe('PAGO_CREDITO_NAO_LOCALIZADO');
  });

  test('créditos de mesmo valor em janelas sem sobreposição continuam confirmados separadamente', () => {
    const raw = fixture();
    raw.schools[0].repasses.push({ ...firstRepasse, installment: '2ª Parcela', dataOrdem: '2026-08-03' });
    raw.schools[0].accounts[0].coverageThrough = '2026-08-05';
    raw.schools[0].accounts[0].movements.push({
      ...raw.schools[0].accounts[0].movements[0], id: 'later-credit', document: 'OB456', movementDate: '2026-08-05',
    });
    const view = buildMonitoringOperationalView(raw);
    expect(view.repasses.map((repasse) => repasse.bankCreditStatus)).toEqual([
      'CREDITO_CONFIRMADO', 'CREDITO_CONFIRMADO',
    ]);
    expect(view.summary.repasseStatusAmountsCents.CREDITO_CONFIRMADO).toBe(200_000);
  });

  test.each(['unlocated', 'ambiguous'])('mantém custeio e capital no fiscal quando o crédito é %s', (kind) => {
    const raw = fixture();
    Object.assign(raw.schools[0].repasses[0], {
      programadoCusteioCents: 80_000, programadoCapitalCents: 20_000,
      ajusteCusteioCents: 0, ajusteCapitalCents: 0,
      pagoCusteioCents: 80_000, pagoCapitalCents: 20_000,
    });
    if (kind === 'unlocated') {
      raw.schools[0].accounts[0].coverageThrough = '2026-05-31';
      raw.schools[0].accounts[0].movements = [];
    }
    else raw.schools[0].accounts[0].movements.push({
      ...raw.schools[0].accounts[0].movements[0], id: 'second-credit', document: 'OB456',
    });
    const installment = buildFiscalHumanView(raw).schools[0].repasses[0].installments[0];
    expect(installment.bankCredit.technicalStatus).toBe(kind === 'unlocated' ? 'PAGO_CREDITO_NAO_LOCALIZADO' : 'CREDITO_AMBIGUO');
    expect(installment.breakdown).toEqual({
      programmedCusteioCents: 80_000, programmedCapitalCents: 20_000,
      adjustmentCusteioCents: 0, adjustmentCapitalCents: 0,
      paidCusteioCents: 80_000, paidCapitalCents: 20_000,
    });
  });
});
