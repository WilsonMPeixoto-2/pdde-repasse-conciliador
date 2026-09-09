import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

describe('indicador humano de pagamento sem crédito sob cobertura temporal insuficiente', () => {
  it('mantém a unidade no indicador quando o pagamento está em consulta inconclusiva por falta de cobertura', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33144710',
            sme: '0431608',
            name: 'CM ARI PIMENTEL',
            uex: 'CONSELHO ESCOLA COMUNIDADE DA CM ARI PIMENTEL',
            cnpj: '12219144000112',
          },
          repasses: [{
            programCode: '02',
            action: 'PDDE Básico — Primeira Infância',
            installments: [{
              installment: 'P1',
              amountProgrammedCents: 201500,
              amountPaidInformedCents: 201500,
              pddeInfoDate: '2026-07-08',
              account: { bank: '001', agency: '3189', number: '000002483X' },
              bankCredit: {
                presentationStatus: 'CONSULTA_DA_CONTA_INCONCLUSIVA',
                technicalStatus: 'CONSULTA_INCONCLUSIVA',
                date: null,
                amountCents: null,
                document: null,
              },
              note: 'Pagamento informado no PDDEInfo; falta cobertura suficiente do extrato para concluir a associação nesta coleta.',
            }],
          }],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [],
        accounting: [],
        balances: [],
        registrations: [],
        accountOpenings: [],
        suspensions: [],
        artifacts: [],
        failures: [],
        balanceReferenceMonth: null,
        coverageThrough: null,
      } as never,
    });

    const missingCredit = view.indicators.find(
      (item) => item.label === 'Pagamento informado sem crédito compatível localizado',
    );

    expect(view.schools[0]?.programs[0]?.installments[0]?.creditEvidence.status).toBe('Consulta inconclusiva');
    expect(missingCredit).toEqual({
      label: 'Pagamento informado sem crédito compatível localizado',
      count: 1,
      units: [{ sme: '0431608', name: 'CM ARI PIMENTEL', inep: '33144710' }],
    });
  });
});
