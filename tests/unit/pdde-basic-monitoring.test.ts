import { describe, expect, test } from 'vitest';
import {
  derivePddeBasicPortfolio,
  derivePddeBasicSchoolReading,
  pddeBasicBalanceLocationLabel,
} from '../../shared/pdde-basic-monitoring';

function regularSchool() {
  return {
    school: { inep: '33000001', sme: '0410001', name: 'ESCOLA REGULAR' },
    programs: [{
      name: 'PDDE Básico',
      installments: [
        { installment: '1ª Parcela', programmedCents: 100_000, paymentInformedCents: 100_000, paymentInformedDate: '2026-04-30' },
        { installment: '2ª Parcela', programmedCents: 100_000, paymentInformedCents: 0, paymentInformedDate: null },
      ],
    }],
    accounts: [{
      program: 'PDDE',
      latestPosition: {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 100_000,
        applications: { totalCents: 0 },
        totalReportedBalanceCents: 100_000,
      },
    }],
  };
}

function infancySchool() {
  return {
    school: { inep: '33000002', sme: '0410002', name: 'ESCOLA PRIMEIRA INFÂNCIA' },
    programs: [{
      name: 'PDDE Básico — Primeira Infância',
      installments: [
        { installment: 'P1', programmedCents: 200_000, paymentInformedCents: 200_000, paymentInformedDate: '2026-05-22' },
        { installment: 'P2', programmedCents: 200_000, paymentInformedCents: 0, paymentInformedDate: null },
      ],
    }],
    accounts: [{
      program: 'PDDE',
      latestPosition: {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { totalCents: 205_000 },
        totalReportedBalanceCents: 205_000,
      },
    }],
  };
}

describe('acompanhamento do PDDE Básico', () => {
  test('trata 1ª parcela regular e Primeira Infância P1 como primeiro atendimento', () => {
    const monitoring = derivePddeBasicPortfolio([regularSchool(), infancySchool()]);

    expect(monitoring.schoolCount).toBe(2);
    expect(monitoring.firstPaidCount).toBe(2);
    expect(monitoring.firstPendingCount).toBe(0);
    expect(monitoring.firstRegularCount).toBe(1);
    expect(monitoring.firstInfancyCount).toBe(1);
    expect(monitoring.secondPaidCount).toBe(0);
    expect(monitoring.secondPendingCount).toBe(2);
  });

  test('separa dinheiro em conta corrente e aplicação sem interpretar zero em conta como ausência de recurso', () => {
    const regular = derivePddeBasicSchoolReading(regularSchool());
    const infancy = derivePddeBasicSchoolReading(infancySchool());

    expect(regular.balance).toMatchObject({
      checkingCents: 100_000,
      applicationsCents: 0,
      totalCents: 100_000,
      location: 'CHECKING',
    });
    expect(infancy.balance).toMatchObject({
      checkingCents: 0,
      applicationsCents: 205_000,
      totalCents: 205_000,
      location: 'APPLICATION',
    });
    expect(pddeBasicBalanceLocationLabel(infancy.balance.location)).toBe('Em aplicação');
  });

  test('reconhece P2 como segunda parcela quando o FNDE passar a informar pagamento', () => {
    const school = infancySchool();
    school.programs[0].installments[1].paymentInformedCents = 200_000;
    school.programs[0].installments[1].paymentInformedDate = '2026-09-01';

    const reading = derivePddeBasicSchoolReading(school);
    expect(reading.second).toMatchObject({
      track: 'Primeira Infância',
      programmedCents: 200_000,
      paymentInformedCents: 200_000,
      state: 'PAID_INFORMED',
    });
  });
});
