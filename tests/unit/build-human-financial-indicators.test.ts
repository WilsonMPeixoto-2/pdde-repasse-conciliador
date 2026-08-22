import { describe, expect, it } from 'vitest';
import { buildHumanFinancialView } from '../../backend/application/build-human-financial-view';

type PresentationStatus =
  | 'PAGAMENTO_INFORMADO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE'
  | 'PAGAMENTO_INFORMADO_COBERTURA_ANTERIOR_AO_PAGAMENTO'
  | 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO'
  | 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO';

function fiscalSchool(
  inep: string,
  sme: string,
  name: string,
  paid: number,
  account: boolean,
  presentationStatus?: PresentationStatus,
) {
  const defaultStatus: PresentationStatus = paid > 0 && !account
    ? 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO'
    : paid > 0
      ? 'PAGAMENTO_INFORMADO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE'
      : 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO';
  return {
    school: { inep, sme, name, uex: `UEx ${name}`, cnpj: `0${inep}00000100`.slice(0, 14) },
    repasses: [{
      programCode: '02', action: 'PDDE / PDDE Básico',
      installments: [{
        installment: '1ª Parcela', amountProgrammedCents: 100000, amountPaidInformedCents: paid,
        pddeInfoDate: paid > 0 ? '2026-08-04' : null,
        account: account ? { bank: '001', agency: '0249', number: `0000${inep}` } : null,
        bankCredit: {
          presentationStatus: presentationStatus ?? defaultStatus,
          technicalStatus: 'INCONCLUSIVO', date: null, amountCents: null, document: null,
        },
        note: null,
      }],
    }],
    statements: [],
  };
}

describe('indicadores acionáveis da visão humana', () => {
  it('não transforma ausência de correlação automática em indicador ou follow-up da escola', () => {
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

    expect(view.schools[0]?.programs[0]?.installments[0]?.creditEvidence.status)
      .toBe('Crédito ainda não correlacionado automaticamente');
    expect(view.schools[0]?.followUp).toEqual([]);
    expect(view.indicators.some((item) => /crédito.*não.*localizado/i.test(item.label))).toBe(false);

    const missingAccount = view.indicators.find((item) => item.label === 'Pagamento informado sem conta do repasse exibida');
    expect(missingAccount).toEqual(expect.objectContaining({ count: 0, units: [] }));

    const partial = view.indicators.find((item) => item.label === 'Outra informação parcial');
    expect(partial).toEqual(expect.objectContaining({ count: 1 }));
    expect(partial?.units).toEqual([
      { sme: '0410003', name: 'ESCOLA B', inep: '33069433' },
    ]);

    for (const indicator of view.indicators) {
      expect(indicator.count).toBe(indicator.units.length);
      expect(new Set(indicator.units.map((unit) => unit.inep)).size).toBe(indicator.units.length);
    }
  });

  it('explica quando o extrato ainda não alcança a data do pagamento sem criar follow-up', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [fiscalSchool(
          '33069247',
          '0410001',
          'ESCOLA A',
          100000,
          true,
          'PAGAMENTO_INFORMADO_COBERTURA_ANTERIOR_AO_PAGAMENTO',
        )],
      } as never,
      publicReports: {
        attendance: [], accounting: [], balances: [], artifacts: [], failures: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    expect(view.schools[0]?.programs[0]?.installments[0]?.creditEvidence.status)
      .toBe('Extrato ainda não cobre a data do pagamento');
    expect(view.schools[0]?.followUp).toEqual([]);
  });

  it('sinaliza nominalmente somente pagamento informado cuja conta não foi exibida', () => {
    const view = buildHumanFinancialView({
      fiscalView: {
        fiscalYear: 2026,
        schools: [
          fiscalSchool('33069247', '0410001', 'PROGRAMADA SEM PAGAMENTO', 0, false),
          fiscalSchool('33069433', '0410003', 'PAGA SEM CONTA', 100000, false),
        ],
      } as never,
      publicReports: {
        attendance: [], accounting: [], balances: [], artifacts: [], failures: [],
        balanceReferenceMonth: null, coverageThrough: null,
      } as never,
    });

    const missingAccount = view.indicators.find((item) => item.label === 'Pagamento informado sem conta do repasse exibida');
    expect(missingAccount).toEqual({
      label: 'Pagamento informado sem conta do repasse exibida',
      count: 1,
      units: [{ sme: '0410003', name: 'PAGA SEM CONTA', inep: '33069433' }],
    });
  });
});
