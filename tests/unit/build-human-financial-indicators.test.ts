import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

function fiscalSchool(inep: string, sme: string, name: string, paid: number, account: boolean) {
  return {
    school: { inep, sme, name, uex: `UEx ${name}`, cnpj: `0${inep}00000100`.slice(0, 14) },
    repasses: [{
      programCode: '02', action: 'PDDE / PDDE Básico',
      installments: [{
        installment: '1ª Parcela', amountProgrammedCents: 100000, amountPaidInformedCents: paid,
        pddeInfoDate: paid > 0 ? '2026-08-04' : null,
        account: account ? { bank: '001', agency: '0249', number: `0000${inep}` } : null,
        bankCredit: {
          presentationStatus: paid > 0 ? 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA' : 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO',
          technicalStatus: 'INCONCLUSIVO', date: null, amountCents: null, document: null,
        },
        note: null,
      }],
    }],
    statements: [],
  };
}

describe('indicadores acionáveis da visão humana', () => {
  it('todo indicador quantitativo informa nominalmente as unidades que compõem o total', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [
          fiscalSchool('33069247', '0410001', 'ESCOLA A', 100000, true),
          fiscalSchool('33069433', '0410003', 'ESCOLA B', 0, false),
        ],
      } as never,
      publicReports: {
        attendance: [], accounting: [], balances: [], artifacts: [],
        balanceReferenceMonth: null, coverageThrough: null,
        failures: [{ kind: 'ACCOUNTING', schoolInep: '33069433', error: 'indisponível' }],
      } as never,
    });

    const firstPayment = view.indicators.find((item) => item.label === '1ª parcela com pagamento informado');
    expect(firstPayment).toEqual(expect.objectContaining({ count: 1 }));
    expect(firstPayment?.units).toEqual([
      { sme: '0410001', name: 'ESCOLA A', inep: '33069247' },
    ]);

    const partial = view.indicators.find((item) => item.label === 'Informação parcial');
    expect(partial).toEqual(expect.objectContaining({ count: 1 }));
    expect(partial?.units).toEqual([
      { sme: '0410003', name: 'ESCOLA B', inep: '33069433' },
    ]);

    for (const indicator of view.indicators) {
      expect(indicator.count).toBe(indicator.units.length);
      expect(new Set(indicator.units.map((unit) => unit.inep)).size).toBe(indicator.units.length);
    }
  });
});
