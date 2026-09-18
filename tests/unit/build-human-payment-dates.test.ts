import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

describe('datas financeiras na visão humana', () => {
  it('não chama a data do pagamento informado de ordem FNDE', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA',
            uex: 'CONSELHO ESCOLA COMUNIDADE', cnpj: '04500463000173',
          },
          repasses: [{
            programCode: '02', action: 'PDDE Básico',
            installments: [{
              installment: '1ª Parcela',
              amountProgrammedCents: 418500,
              amountPaidInformedCents: 418500,
              pddeInfoDate: '2026-08-05',
              account: null,
              bankCredit: {
                presentationStatus: 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO',
                technicalStatus: 'PAGO_SEM_CONTA_ATUAL',
                date: null, amountCents: null, document: null,
              },
              note: 'Pagamento informado no PDDEInfo.',
            }],
          }],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [{
          fiscalYear: 2026,
          schoolInep: '33069247',
          uexCnpj: '04500463000173',
          schoolName: 'EM EMA NEGRAO DE LIMA',
          programName: 'PDDE',
          destination: 'PDDE Básico - 1ª Parcela',
          costCents: 83700,
          capitalCents: 334800,
          totalCents: 418500,
          paymentOrderDate: '2026-08-04',
        }],
        accounting: [], balances: [], failures: [], artifacts: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    const installment = view.schools[0].programs[0].installments[0];
    expect(installment.paymentInformedDate).toBe('2026-08-05');
    expect(installment.paymentOrderDate).toBe('2026-08-04');
    expect(installment.paymentInformedDate).not.toBe(installment.paymentOrderDate);
  });

  it('reconhece ordem P2 sem inventar pagamento quando atendimento confirma total e composição', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33136947', sme: '0410601', name: 'EM EXEMPLO PRIMEIRA INFANCIA',
            uex: 'CEC', cnpj: '12345678000190',
          },
          repasses: [{
            programCode: '02',
            action: 'PDDE Básico — Primeira Infância',
            installments: [{
              installment: 'P2',
              amountProgrammedCents: 277500,
              amountPaidInformedCents: 0,
              pddeInfoDate: null,
              breakdown: {
                programmedCusteioCents: 111000,
                programmedCapitalCents: 166500,
                adjustmentCusteioCents: 0,
                adjustmentCapitalCents: 0,
                paidCusteioCents: null,
                paidCapitalCents: null,
              },
              account: null,
              bankCredit: {
                presentationStatus: 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO',
                technicalStatus: 'PROGRAMADO_NAO_PAGO',
                date: null, amountCents: null, document: null,
              },
              note: null,
            }],
          }],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [{
          fiscalYear: 2026,
          schoolInep: '33136947',
          uexCnpj: '12345678000190',
          schoolName: 'EM EXEMPLO PRIMEIRA INFANCIA',
          programName: 'PDDE',
          destination: 'PDDE Básico - Primeira Infância - P2',
          costCents: 111000,
          capitalCents: 166500,
          totalCents: 277500,
          paymentOrderDate: '2026-09-14',
        }],
        accounting: [], balances: [], failures: [], artifacts: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    const installment = view.schools[0].programs[0].installments[0];
    expect(installment.paymentOrderDate).toBe('2026-09-14');
    expect(installment.paymentInformedDate).toBeNull();
    expect(installment.paymentInformedCents).toBe(0);
  });

  it('rejeita associação de ordem quando a composição custeio/capital diverge', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33136947', sme: '0410601', name: 'EM EXEMPLO PRIMEIRA INFANCIA',
            uex: 'CEC', cnpj: '12345678000190',
          },
          repasses: [{
            programCode: '02',
            action: 'PDDE Básico — Primeira Infância',
            installments: [{
              installment: 'P2',
              amountProgrammedCents: 277500,
              amountPaidInformedCents: 0,
              pddeInfoDate: null,
              breakdown: {
                programmedCusteioCents: 111000,
                programmedCapitalCents: 166500,
                adjustmentCusteioCents: 0,
                adjustmentCapitalCents: 0,
                paidCusteioCents: null,
                paidCapitalCents: null,
              },
              account: null,
              bankCredit: {
                presentationStatus: 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO',
                technicalStatus: 'PROGRAMADO_NAO_PAGO',
                date: null, amountCents: null, document: null,
              },
              note: null,
            }],
          }],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [{
          fiscalYear: 2026,
          schoolInep: '33136947',
          uexCnpj: '12345678000190',
          schoolName: 'EM EXEMPLO PRIMEIRA INFANCIA',
          programName: 'PDDE',
          destination: 'PDDE Básico - Primeira Infância - P2',
          costCents: 100000,
          capitalCents: 177500,
          totalCents: 277500,
          paymentOrderDate: '2026-09-14',
        }],
        accounting: [], balances: [], failures: [], artifacts: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    expect(view.schools[0].programs[0].installments[0].paymentOrderDate).toBeNull();
  });

  it('não atribui a ordem da 1ª parcela à 2ª parcela de mesmo valor', () => {
    const fiscalInstallment = {
      amountProgrammedCents: 418500,
      amountPaidInformedCents: 0,
      pddeInfoDate: null,
      account: null,
      bankCredit: {
        presentationStatus: 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO',
        technicalStatus: 'PROGRAMADO_NAO_PAGO',
        date: null, amountCents: null, document: null,
      },
      note: null,
    };
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [{
          school: {
            inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA',
            uex: 'CEC', cnpj: '04500463000173',
          },
          repasses: [{
            programCode: '02', action: 'PDDE Básico',
            installments: [
              { ...fiscalInstallment, installment: '1ª Parcela', amountPaidInformedCents: 418500, pddeInfoDate: '2026-08-05' },
              { ...fiscalInstallment, installment: '2ª Parcela' },
            ],
          }],
          statements: [],
        }],
      } as never,
      publicReports: {
        attendance: [{
          fiscalYear: 2026, schoolInep: '33069247', uexCnpj: '04500463000173',
          schoolName: 'EM EMA NEGRAO DE LIMA', programName: 'PDDE',
          destination: 'PDDE Básico - 1ª Parcela', costCents: 83700, capitalCents: 334800,
          totalCents: 418500, paymentOrderDate: '2026-08-04',
        }],
        accounting: [], balances: [], failures: [], artifacts: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    expect(view.schools[0].programs[0].installments[0].paymentOrderDate).toBe('2026-08-04');
    expect(view.schools[0].programs[0].installments[1].paymentOrderDate).toBeNull();
  });
});
