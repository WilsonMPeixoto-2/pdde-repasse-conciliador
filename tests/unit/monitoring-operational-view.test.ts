import { describe, expect, test } from 'vitest';
import {
  buildMonitoringOperationalView,
  refineOperationalMovementClass,
} from '../../backend/application/build-monitoring-operational-view';

const account = { bank: '001', agency: '0249', number: '000056267X' };
const counterparty = {
  document: null,
  name: null,
  bank: null,
  agency: null,
  account: null,
};

function movement(
  id: string,
  operation: 'credit' | 'debit',
  amountCents: number,
  movementDate: string,
  history: string,
  classification: string,
) {
  return {
    id,
    schoolCnpj: '01226403000116',
    programCode: '02',
    operation,
    amountCents,
    movementDate,
    account,
    document: id,
    history,
    classification,
    counterparty,
    sourceUrl: 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/exemplo',
  };
}

function rawWithPaidRepasse(coverageThrough: string | null) {
  return {
    version: 2,
    generatedAt: '2026-08-22T06:00:00Z',
    fiscalYear: 2026,
    status: 'COMPLETE',
    sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
    coverage: { requestedSchools: 1, pddeInfoSchoolsCollected: 1 },
    summary: {},
    schools: [{
      inep: '33069247',
      sme: '0410001',
      name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CEC EMA',
      cnpj: '04.500.463/0001-73',
      repasses: [{
        programCode: '02',
        action: 'PDDE Básico',
        installment: '1ª Parcela',
        programadoCents: 418_500,
        pagoInformadoCents: 418_500,
        dataOrdem: '2026-08-05',
        account,
      }],
      accounts: [{
        inep: '33069247',
        programCode: '02',
        programLabel: 'PDDE',
        account,
        saldoPddeInfoCents: 0,
        status: 'COMPLETE',
        error: null,
        pagesFetched: 1,
        declaredTotal: 0,
        uniqueMovements: 0,
        movementsInYear: 0,
        coverageThrough,
        totals: {},
        movements: [],
      }],
      unknownProgramAccounts: [],
    }],
  };
}

describe('visão operacional do monitoramento', () => {
  test('refina somente históricos com semântica suficiente', () => {
    expect(refineOperationalMovementClass(
      'MOVIMENTO_NAO_CLASSIFICADO', 'debit', 'TV POR ASSINATURA',
    )).toBe('PAGAMENTO_TRANSFERENCIA');
    expect(refineOperationalMovementClass(
      'MOVIMENTO_NAO_CLASSIFICADO', 'credit', 'TED TRANSFERENCIA ELETR.DISPON',
    )).toBe('ENTRADA_TERCEIRO');
    expect(refineOperationalMovementClass(
      'MOVIMENTO_NAO_CLASSIFICADO', 'credit', 'TRANSFERIDO DA POUPANCA',
    )).toBe('RESGATE_APLICACAO');
    expect(refineOperationalMovementClass(
      'MOVIMENTO_NAO_CLASSIFICADO', 'credit', 'MOVIMENTO DO DIA',
    )).toBe('MOVIMENTO_NAO_CLASSIFICADO');
  });

  test('separa pagamento informado de crédito bancário confirmado e pendências', () => {
    const raw = {
      version: 2,
      generatedAt: '2026-08-14T05:25:46Z',
      fiscalYear: 2026,
      status: 'COMPLETE',
      sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
      coverage: { requestedSchools: 2, pddeInfoSchoolsCollected: 2 },
      summary: {},
      schools: [
        {
          inep: '33069271',
          sme: '0410005',
          name: 'EM JOAO BARBALHO',
          uex: 'CEC JOAO BARBALHO',
          cnpj: '01.226.403/0001-16',
          repasses: [
            {
              programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
              programadoCents: 857_500, pagoInformadoCents: 857_500,
              dataOrdem: '2026-04-30', account,
            },
            {
              programCode: '02', action: 'PDDE Básico', installment: '2ª Parcela',
              programadoCents: 857_500, pagoInformadoCents: 0,
              dataOrdem: null, account,
            },
          ],
          accounts: [{
            inep: '33069271', programCode: '02', programLabel: 'PDDE', account,
            saldoPddeInfoCents: 870_642, status: 'COMPLETE', error: null,
            pagesFetched: 1, declaredTotal: 5, uniqueMovements: 5,
            movementsInYear: 5, coverageThrough: '2026-05-03', totals: {},
            movements: [
              movement('ob-1', 'credit', 857_500, '2026-05-03', 'ORDEM BANCARIA', 'REPASSE_FNDE'),
              movement('app-1', 'debit', 857_500, '2026-05-03', 'BB-APLIC C.PRZ-APL.AUT', 'APLICACAO_FINANCEIRA'),
              movement('tv-1', 'debit', 13_538, '2026-03-03', 'TV POR ASSINATURA', 'MOVIMENTO_NAO_CLASSIFICADO'),
              movement('ted-1', 'credit', 2_099, '2026-03-01', 'TED TRANSFERENCIA ELETR.DISPON', 'MOVIMENTO_NAO_CLASSIFICADO'),
              movement('opaque-1', 'credit', 120_641, '2026-03-02', 'MOVIMENTO DO DIA', 'MOVIMENTO_NAO_CLASSIFICADO'),
            ],
          }],
          unknownProgramAccounts: [],
        },
        {
          inep: '33069247',
          sme: '0410001',
          name: 'EM EMA NEGRAO DE LIMA',
          uex: 'CEC EMA',
          cnpj: '04.500.463/0001-73',
          repasses: [{
            programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
            programadoCents: 418_500, pagoInformadoCents: 418_500,
            dataOrdem: '2026-08-05', account: null,
          }],
          accounts: [],
          unknownProgramAccounts: [],
        },
      ],
    };

    const view = buildMonitoringOperationalView(raw);
    expect(view.summary.repasseStatusCounts).toMatchObject({
      CREDITO_CONFIRMADO: 1,
      PROGRAMADO_NAO_PAGO: 1,
      PAGO_SEM_CONTA_ATUAL: 1,
    });
    expect(view.repasses[0]).toMatchObject({
      bankCreditStatus: 'CREDITO_CONFIRMADO',
      bankCreditDate: '2026-05-03',
      bankCreditAmountCents: 857_500,
      daysAfterOrder: 3,
    });
    expect(view.summary.classificationCounts.PAGAMENTO_TRANSFERENCIA).toBe(1);
    expect(view.summary.classificationCounts.ENTRADA_TERCEIRO).toBe(1);
    expect(view.summary.classificationCounts.MOVIMENTO_NAO_CLASSIFICADO).toBe(1);
    expect(view.alerts.some((alert) => (
      alert.kind === 'REPASSE' && alert.schoolInep === '33069247'
    ))).toBe(true);
    expect(view.alerts.some((alert) => (
      alert.kind === 'MOVIMENTO_REVISAR' && alert.schoolInep === '33069271'
    ))).toBe(true);
  });

  test('não procura crédito em período que o extrato ainda não cobre', () => {
    const view = buildMonitoringOperationalView(rawWithPaidRepasse('2026-07-31'));
    expect(view.repasses[0]?.bankCreditStatus).toBe('PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO');
  });

  test('distingue ausência de correlação automática quando a cobertura alcança o pagamento', () => {
    const view = buildMonitoringOperationalView(rawWithPaidRepasse('2026-08-31'));
    expect(view.repasses[0]?.bankCreditStatus).toBe('PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE');
  });
});
