import { describe, expect, test } from 'vitest';
import {
  assessPaymentTemporalCoverage,
  type PaymentTemporalCoverageInput,
} from '../../backend/core/payment-temporal-coverage';

const account = { bank: '001', agency: '0249', number: '0000549789' };

function input(overrides: Partial<PaymentTemporalCoverageInput> = {}): PaymentTemporalCoverageInput {
  return {
    payments: [
      {
        schoolInep: '33069247',
        programCode: '02',
        account,
        amountPaidCents: 418_500,
        paymentDate: '2026-08-05',
      },
    ],
    accounts: [
      {
        schoolInep: '33069247',
        programCode: '02',
        account,
        coverageThrough: '2026-08-05',
      },
    ],
    ...overrides,
  };
}

describe('cobertura temporal dos pagamentos', () => {
  test('considera suficiente quando a conta cobre a data do pagamento', () => {
    const result = assessPaymentTemporalCoverage(input());

    expect(result.status).toBe('SUFFICIENT');
    expect(result.evaluatedPaymentCount).toBe(1);
    expect(result.sufficientCount).toBe(1);
    expect(result.outOfCoverageCount).toBe(0);
    expect(result.unknownCount).toBe(0);
    expect(result.latestKnownPaymentDate).toBe('2026-08-05');
    expect(result.maxObservedCoverageThrough).toBe('2026-08-05');
  });

  test('marca fora de cobertura quando o extrato termina antes do pagamento', () => {
    const result = assessPaymentTemporalCoverage(input({
      accounts: [{
        schoolInep: '33069247',
        programCode: '02',
        account,
        coverageThrough: '2026-05-28',
      }],
    }));

    expect(result.status).toBe('OUT_OF_COVERAGE');
    expect(result.outOfCoverageCount).toBe(1);
    expect(result.rows[0]?.status).toBe('OUT_OF_COVERAGE');
  });

  test('mantém desconhecido quando falta conta forte ou data de pagamento', () => {
    const result = assessPaymentTemporalCoverage(input({
      payments: [
        {
          schoolInep: '33069247',
          programCode: '02',
          account: null,
          amountPaidCents: 418_500,
          paymentDate: '2026-08-05',
        },
        {
          schoolInep: '33069248',
          programCode: '02',
          account,
          amountPaidCents: 500_000,
          paymentDate: null,
        },
      ],
      accounts: [],
    }));

    expect(result.status).toBe('UNKNOWN');
    expect(result.unknownCount).toBe(2);
    expect(result.rows.map((row) => row.reason)).toEqual([
      'STRONG_ACCOUNT_MISSING',
      'PAYMENT_DATE_MISSING',
    ]);
  });

  test('OUT_OF_COVERAGE prevalece no agregado sobre UNKNOWN', () => {
    const result = assessPaymentTemporalCoverage(input({
      payments: [
        {
          schoolInep: '33069247',
          programCode: '02',
          account,
          amountPaidCents: 418_500,
          paymentDate: '2026-08-05',
        },
        {
          schoolInep: '33069248',
          programCode: '02',
          account: null,
          amountPaidCents: 300_000,
          paymentDate: '2026-08-05',
        },
      ],
      accounts: [{
        schoolInep: '33069247',
        programCode: '02',
        account,
        coverageThrough: '2026-05-28',
      }],
    }));

    expect(result.status).toBe('OUT_OF_COVERAGE');
    expect(result.outOfCoverageCount).toBe(1);
    expect(result.unknownCount).toBe(1);
  });

  test('ignora linhas sem pagamento positivo no denominador', () => {
    const result = assessPaymentTemporalCoverage(input({
      payments: [{
        schoolInep: '33069247',
        programCode: '02',
        account,
        amountPaidCents: 0,
        paymentDate: null,
      }],
      accounts: [],
    }));

    expect(result.evaluatedPaymentCount).toBe(0);
    expect(result.status).toBe('UNKNOWN');
  });
});
