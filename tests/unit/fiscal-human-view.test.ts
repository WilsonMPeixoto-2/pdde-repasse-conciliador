import { describe, expect, test } from 'vitest';
import {
  buildFiscalHumanView,
  neutralMovementCategory,
} from '../../backend/application/build-fiscal-human-view';

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

function rawFixture() {
  return {
    version: 2,
    generatedAt: '2026-08-14T05:25:46Z',
    fiscalYear: 2026,
    status: 'COMPLETE',
    sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
    coverage: { requestedSchools: 1, pddeInfoSchoolsCollected: 1 },
    summary: {},
    schools: [{
      inep: '33069271',
      sme: '0410005',
      name: 'EM JOAO BARBALHO',
      uex: 'CEC JOAO BARBALHO',
      cnpj: '01.226.403/0001-16',
      repasses: [
        {
          programCode: '02', action: 'PDDE Básico', installment: '2ª Parcela',
          programadoCents: 857_500, pagoInformadoCents: 0,
          dataOrdem: null, account,
        },
        {
          programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
          programadoCents: 857_500, pagoInformadoCents: 857_500,
          dataOrdem: '2026-04-30', account,
        },
        {
          programCode: '0B', action: 'Educação Conectada', installment: null,
          programadoCents: 300_000, pagoInformadoCents: 0,
          dataOrdem: null, account: { ...account, number: '0000540544' },
        },
      ],
      accounts: [{
        inep: '33069271', programCode: '02', programLabel: 'PDDE', account,
        saldoPddeInfoCents: 870_642, status: 'COMPLETE', error: null,
        pagesFetched: 1, declaredTotal: 4, uniqueMovements: 4,
        movementsInYear: 4, coverageThrough: '2026-05-03', totals: {},
        movements: [
          movement('later', 'debit', 857_500, '2026-05-03', 'BB-APLIC C.PRZ-APL.AUT', 'APLICACAO_FINANCEIRA'),
          movement('earlier', 'credit', 2_099, '2026-03-01', 'TED TRANSFERENCIA ELETR.DISPON', 'MOVIMENTO_NAO_CLASSIFICADO'),
          movement('ob-1', 'credit', 857_500, '2026-05-03', 'ORDEM BANCARIA', 'REPASSE_FNDE'),
          movement('opaque', 'credit', 120_641, '2026-03-02', 'MOVIMENTO DO DIA', 'MOVIMENTO_NAO_CLASSIFICADO'),
        ],
      }, {
        inep: '33069271', programCode: '0B', programLabel: 'PDDE Qualidade',
        account: { ...account, number: '0000540544' },
        saldoPddeInfoCents: 2_298_687, status: 'COMPLETE', error: null,
        pagesFetched: 1, declaredTotal: 0, uniqueMovements: 0,
        movementsInYear: 0, coverageThrough: '2026-08-14', totals: {}, movements: [],
      }],
      unknownProgramAccounts: [],
    }],
  };
}

describe('visão humana para fiscalização', () => {
  test('mantém parcelas separadas e ordenadas sem chamar a segunda parcela de repasse ausente', () => {
    const view = buildFiscalHumanView(rawFixture());
    const basic = view.schools[0].repasses.find((item) => item.action === 'PDDE Básico');
    expect(basic?.installments.map((item) => item.installment)).toEqual(['1ª Parcela', '2ª Parcela']);
    expect(basic?.installments[0]).toMatchObject({
      amountProgrammedCents: 857_500,
      amountPaidInformedCents: 857_500,
      pddeInfoDate: '2026-04-30',
      bankCredit: { presentationStatus: 'CREDITO_LOCALIZADO', date: '2026-05-03' },
    });
    expect(basic?.installments[1]).toMatchObject({
      amountProgrammedCents: 857_500,
      amountPaidInformedCents: 0,
      pddeInfoDate: null,
      bankCredit: { presentationStatus: 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO' },
      note: null,
    });
  });

  test('preserva ações sem parcela quando o próprio PDDEInfo não traz divisão', () => {
    const view = buildFiscalHumanView(rawFixture());
    const connected = view.schools[0].repasses.find((item) => item.action === 'Educação Conectada');
    expect(connected?.installments).toHaveLength(1);
    expect(connected?.installments[0].installment).toBeNull();
  });

  test('organiza o extrato por escola e conta em ordem cronológica crescente', () => {
    const view = buildFiscalHumanView(rawFixture());
    const statement = view.schools[0].statements.find((item) => item.programCode === '02');
    expect(statement?.entries.map((item) => item.date)).toEqual([
      '2026-03-01', '2026-03-02', '2026-05-03', '2026-05-03',
    ]);
    expect(statement?.entries[0]).toMatchObject({
      history: 'TED TRANSFERENCIA ELETR.DISPON',
      creditCents: 2_099,
      debitCents: null,
      neutralCategory: 'Entrada registrada no extrato',
    });
    expect(statement?.entries[1]).toMatchObject({
      history: 'MOVIMENTO DO DIA',
      neutralCategory: null,
    });
  });

  test('categorias auxiliares são descritivas e não substituem a linguagem da fonte', () => {
    expect(neutralMovementCategory('TARIFA_BANCARIA')).toBe('Tarifa bancária');
    expect(neutralMovementCategory('RENDIMENTO_FINANCEIRO')).toBe('Rendimento financeiro');
    expect(neutralMovementCategory('MOVIMENTO_NAO_CLASSIFICADO')).toBeNull();
  });
});
