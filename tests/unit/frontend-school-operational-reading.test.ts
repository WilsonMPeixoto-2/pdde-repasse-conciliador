import { describe, expect, it } from 'vitest';
import { deriveSchoolOperationalReading } from '../../src/product/visual/school-operational-reading';
import { humanSchoolSchema } from '../../src/product/types';

const sourceUnavailable = 'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.';
const missingPosition = 'Há conta sem posição pública de saldo disponível na data desta consulta.';

const schoolWithAttention = humanSchoolSchema.parse({
  fiscalYear: 2026,
  school: {
    inep: '33069247',
    sme: '0410001',
    name: 'EM EMA NEGRAO DE LIMA',
    uex: 'CEC EMA NEGRAO DE LIMA',
    cnpj: '01872287000102',
  },
  programs: [{
    name: 'PDDE / PDDE Básico',
    installments: [{
      installment: '1ª Parcela',
      programmedCents: 100_000,
      paymentInformedCents: 100_000,
      paymentInformedDate: '2026-08-04',
      paymentOrderDate: null,
      account: null,
      creditEvidence: {
        status: 'Crédito ainda não correlacionado automaticamente',
        date: null,
        amountCents: null,
        document: null,
      },
      note: null,
    }],
  }],
  accounts: [{
    program: 'PDDE',
    bank: '001',
    agency: '0249',
    account: '0000549797',
    positions: [],
    latestPosition: null,
    movements: [],
    note: null,
  }],
  accounting: [{
    program: 'PDDE',
    status: 'INADIMPLENTE',
    paymentSuspended: true,
    expectedTotalCents: 100_000,
  }],
  followUp: [missingPosition, sourceUnavailable],
});

describe('leitura operacional da escola', () => {
  it('transforma fatos simultâneos em ações únicas e ordenadas sem elevar lacuna de correlação', () => {
    const reading = deriveSchoolOperationalReading(schoolWithAttention);

    expect(reading.tone).toBe('attention');
    expect(reading.statusLabel).toBe('Acompanhamento necessário');
    expect(reading.attentionItems.map(({ title, target }) => [title, target])).toEqual([
      ['Pagamento suspenso informado', '#prestacao-contas'],
      ['Pagamento informado sem conta exibida', '#repasses'],
      ['Conta sem posição pública de saldo', '#contas-saldos'],
      ['Informação de fonte ainda não disponível', null],
    ]);
  });

  it('mantém não correlação automática como informação neutra quando não há outro fato de atenção', () => {
    const schoolWithCorrelationGapOnly = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [{
        name: 'PDDE Básico',
        installments: [{
          ...schoolWithAttention.programs[0].installments[0],
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: {
            status: 'Crédito ainda não correlacionado automaticamente',
            date: null,
            amountCents: null,
            document: null,
          },
        }],
      }],
      accounts: [],
      accounting: [],
      followUp: [],
    });

    expect(deriveSchoolOperationalReading(schoolWithCorrelationGapOnly)).toEqual({
      tone: 'clear',
      statusLabel: 'Sem apontamento no retrato atual',
      attentionItems: [],
    });
  });

  it('mantém cobertura anterior ao pagamento como informação neutra', () => {
    const schoolWithCoverageGapOnly = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [{
        name: 'PDDE Básico',
        installments: [{
          ...schoolWithAttention.programs[0].installments[0],
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: {
            status: 'Extrato ainda não cobre a data do pagamento',
            date: null,
            amountCents: null,
            document: null,
          },
        }],
      }],
      accounts: [],
      accounting: [],
      followUp: [],
    });

    expect(deriveSchoolOperationalReading(schoolWithCoverageGapOnly)).toEqual({
      tone: 'clear',
      statusLabel: 'Sem apontamento no retrato atual',
      attentionItems: [],
    });
  });

  it('usa estado neutro sem transformar ausência de apontamento em regularidade', () => {
    const schoolWithoutAttention = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [],
      accounts: [],
      accounting: [],
      followUp: [],
    });

    expect(deriveSchoolOperationalReading(schoolWithoutAttention)).toEqual({
      tone: 'clear',
      statusLabel: 'Sem apontamento no retrato atual',
      attentionItems: [],
    });
  });

  it('distingue crédito que requer conferência de consulta inconclusiva', () => {
    const schoolWithInconclusiveCredits = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [{
        name: 'PDDE / PDDE Básico',
        installments: [
          {
            ...schoolWithAttention.programs[0].installments[0],
            account: { bank: '001', agency: '0249', number: '0000549797' },
            creditEvidence: {
              status: 'Requer conferência', date: null, amountCents: null, document: null,
            },
          },
          {
            ...schoolWithAttention.programs[0].installments[0],
            installment: '2ª Parcela',
            account: { bank: '001', agency: '0249', number: '0000549797' },
            creditEvidence: {
              status: 'Consulta inconclusiva', date: null, amountCents: null, document: null,
            },
          },
        ],
      }],
      accounts: [],
      accounting: [],
      followUp: [],
    });

    expect(deriveSchoolOperationalReading(schoolWithInconclusiveCredits).attentionItems).toEqual([
      {
        key: 'credit-requires-review',
        title: 'Crédito compatível requer conferência',
        description: 'Há mais de um crédito compatível possível; confira as evidências da parcela.',
        target: '#repasses',
      },
      {
        key: 'account-query-inconclusive',
        title: 'Consulta da conta inconclusiva',
        description: 'A consulta não foi suficiente para concluir se há crédito compatível para a parcela.',
        target: '#repasses',
      },
    ]);
  });

  it('preserva apontamento residual sem inventar destino', () => {
    const residualMessage = 'A posição complementar desta unidade precisa ser consultada novamente.';
    const schoolWithResidualMessage = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [],
      accounts: [],
      accounting: [],
      followUp: [residualMessage],
    });

    expect(deriveSchoolOperationalReading(schoolWithResidualMessage).attentionItems).toEqual([{
      key: 'follow-up-0',
      title: 'Outro ponto de acompanhamento',
      description: residualMessage,
      target: null,
    }]);
  });

  it('não descarta mensagem conhecida quando o fato estruturado correspondente está ausente', () => {
    const schoolWithOrphanKnownMessage = humanSchoolSchema.parse({
      ...schoolWithAttention,
      programs: [],
      accounts: [],
      accounting: [],
      followUp: [missingPosition],
    });

    expect(deriveSchoolOperationalReading(schoolWithOrphanKnownMessage).attentionItems).toEqual([
      {
        key: 'follow-up-0',
        title: 'Outro ponto de acompanhamento',
        description: missingPosition,
        target: null,
      },
    ]);
  });
});
