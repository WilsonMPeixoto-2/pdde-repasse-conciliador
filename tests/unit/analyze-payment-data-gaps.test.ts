import { describe, expect, test } from 'vitest';
import {
  analyzePaymentDataGaps,
  classifyPaymentDataGap,
  requiredBankCreditEvidenceThrough,
} from '../../backend/application/analyze-payment-data-gaps';

const account = { bank: '001', agency: '0249', number: '0000549789' };

describe('diagnóstico nominal de lacunas de pagamento', () => {
  test('exige cobertura de 30 dias para permitir uma conclusão negativa', () => {
    expect(requiredBankCreditEvidenceThrough('2026-08-05')).toBe('2026-09-04');
    expect(classifyPaymentDataGap({
      repasse: { bankCreditStatus: 'CONSULTA_INCONCLUSIVA', account, orderDate: '2026-08-05' } as never,
      statementStatus: 'COMPLETE',
      statementCoverageThrough: '2025-11-02',
    })).toBe('STATEMENT_OUT_OF_COVERAGE');
  });

  test('materializa uma linha investigável com conta, cobertura e OB da recuperação', () => {
    const operational = {
      fiscalYear: 2026,
      repasses: [{
        school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', cnpj: '04.500.463/0001-73' },
        programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
        amountProgrammedCents: 418_500, amountPaidInformedCents: 418_500,
        orderDate: '2026-08-05', account, bankCreditStatus: 'CONSULTA_INCONCLUSIVA',
        bankCreditDate: null, bankCreditAmountCents: null, bankDocument: null, daysAfterOrder: null,
      }],
    } as never;
    const raw = {
      fiscalYear: 2026,
      accountRecoveries: [{
        schoolInep: '33069247', programCode: '02', action: 'PDDE Básico', installment: '1ª Parcela',
        amountCents: 418_500, status: 'RECOVERED', paymentDate: '2026-08-05', orderBank: '019072',
        sourceUrl: 'https://www.fnde.gov.br/sigefweb/liberacoes', candidates: [],
      }],
      quality: { paymentTemporalCoverage: { rows: [{
        schoolInep: '33069247', programCode: '02', paymentDate: '2026-08-05',
        status: 'OUT_OF_COVERAGE', reason: 'COVERAGE_BEFORE_PAYMENT',
      }] } },
      schools: [{
        inep: '33069247',
        accounts: [{ programCode: '02', account, status: 'COMPLETE', coverageThrough: '2025-11-02' }],
      }],
    };

    const report = analyzePaymentDataGaps(raw, operational);
    expect(report).toMatchObject({
      status: 'GAPS_REMAIN', totalPaidRepasses: 1, confirmedBankCredits: 0, unresolvedPayments: 1,
      countsByGapReason: { STATEMENT_OUT_OF_COVERAGE: 1 }, countsByRecoveryStatus: { RECOVERED: 1 },
    });
    expect(report.rows[0]).toMatchObject({
      schoolInep: '33069247', statementCoverageThrough: '2025-11-02', requiredEvidenceThrough: '2026-09-04',
      recoveryStatus: 'RECOVERED', recoveryOrderBank: '019072', gapReason: 'STATEMENT_OUT_OF_COVERAGE',
    });
  });
});
