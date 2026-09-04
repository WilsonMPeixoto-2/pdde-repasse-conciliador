import { describe, expect, test } from 'vitest';
import {
  derivePddeBasicPortfolio,
  derivePddeBasicSchoolReading,
  pddeBasicEvidenceStateLabel,
} from '../../shared/pdde-basic-monitoring';

function school(input: {
  paymentDate: string | null;
  paymentCents?: number;
  referenceDate: string | null;
  balanceCents: number | null;
  checkingCents?: number | null;
  applicationsCents?: number | null;
  creditStatus?: string;
  creditAmountCents?: number | null;
}) {
  const paymentCents = input.paymentCents ?? 100_000;
  return {
    school: { inep: '33000001', sme: '0410001', name: 'ESCOLA TESTE' },
    programs: [{
      name: 'PDDE Básico',
      installments: [{
        installment: '1ª Parcela',
        programmedCents: 100_000,
        paymentInformedCents: paymentCents,
        paymentInformedDate: input.paymentDate,
        creditEvidence: {
          status: input.creditStatus ?? 'Crédito não localizado',
          amountCents: input.creditAmountCents ?? null,
          date: null,
          document: null,
        },
      }],
    }],
    accounts: [{
      program: 'PDDE',
      latestPosition: input.referenceDate === null ? null : {
        referenceDate: input.referenceDate,
        checkingBalanceCents: input.checkingCents ?? input.balanceCents,
        applications: { totalCents: input.applicationsCents ?? 0 },
        totalReportedBalanceCents: input.balanceCents,
      },
    }],
  };
}

describe('coerência temporal do PDDE Básico', () => {
  test('não chama de contradição saldo anterior ao pagamento', () => {
    const reading = derivePddeBasicSchoolReading(school({
      paymentDate: '2026-08-05',
      referenceDate: '2026-07-31',
      balanceCents: 0,
    }));

    expect(reading.firstEvidence.state).toBe('BALANCE_REFERENCE_BEFORE_PAYMENT');
    expect(reading.firstEvidence.needsFreshBalance).toBe(true);
    expect(reading.firstEvidence.needsSourceEscalation).toBe(true);
    expect(reading.firstEvidence.isContradiction).toBe(false);
    expect(pddeBasicEvidenceStateLabel(reading.firstEvidence.state)).toContain('saldo é anterior');
  });

  test('sinaliza investigação quando saldo posterior ao pagamento permanece zerado', () => {
    const reading = derivePddeBasicSchoolReading(school({
      paymentDate: '2026-04-30',
      referenceDate: '2026-07-31',
      balanceCents: 0,
    }));

    expect(reading.firstEvidence.state).toBe('ZERO_BALANCE_AFTER_PAYMENT');
    expect(reading.firstEvidence.needsSourceEscalation).toBe(true);
    expect(reading.firstEvidence.isContradiction).toBe(true);
  });

  test('classifica como coerente, sem transformar saldo positivo em prova do crédito específico', () => {
    const reading = derivePddeBasicSchoolReading(school({
      paymentDate: '2026-04-30',
      referenceDate: '2026-07-31',
      balanceCents: 105_000,
    }));

    expect(reading.firstEvidence.state).toBe('POSITIVE_BALANCE_AFTER_PAYMENT');
    expect(reading.firstEvidence.creditLocated).toBe(false);
    expect(reading.firstEvidence.isContradiction).toBe(false);
  });

  test('eleva evidência quando crédito compatível foi localizado no SIGEF', () => {
    const reading = derivePddeBasicSchoolReading(school({
      paymentDate: '2026-04-30',
      referenceDate: '2026-07-31',
      balanceCents: 105_000,
      creditStatus: 'Crédito localizado',
      creditAmountCents: 100_000,
    }));

    expect(reading.firstEvidence.state).toBe('CREDIT_LOCATED');
    expect(reading.firstEvidence.creditLocated).toBe(true);
    expect(reading.firstEvidence.needsSourceEscalation).toBe(false);
  });

  test('resume lacunas temporais e inconsistências reais separadamente', () => {
    const portfolio = derivePddeBasicPortfolio([
      school({ paymentDate: '2026-08-05', referenceDate: '2026-07-31', balanceCents: 0 }),
      {
        ...school({ paymentDate: '2026-04-30', referenceDate: '2026-07-31', balanceCents: 0 }),
        school: { inep: '33000002', sme: '0410002', name: 'ESCOLA 2' },
      },
      {
        ...school({
          paymentDate: '2026-04-30', referenceDate: '2026-07-31', balanceCents: 100_000,
          creditStatus: 'Crédito localizado', creditAmountCents: 100_000,
        }),
        school: { inep: '33000003', sme: '0410003', name: 'ESCOLA 3' },
      },
    ]);

    expect(portfolio.balanceBeforePaymentCount).toBe(1);
    expect(portfolio.trueInconsistencyCount).toBe(1);
    expect(portfolio.firstCreditLocatedCount).toBe(1);
    expect(portfolio.firstNeedsSourceEscalationCount).toBe(2);
  });
});
