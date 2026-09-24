import { describe, expect, it } from 'vitest';

import { compareAttendanceWithSnapshot } from '../../scripts/watch-pddeinfo-attendance';

const schools = [{
  inep: '33069247',
  sme: '0410001',
  nome: 'EM TESTE',
}];

const observation = {
  fiscalYear: 2026 as const,
  schoolInep: '33069247',
  uexCnpj: '04500463000173',
  schoolName: 'EM TESTE',
  programName: 'PDDE',
  destination: 'PDDE Básico - 2ª Parcela',
  studentCount: 100,
  costCents: 4000,
  capitalCents: 6000,
  totalCents: 10000,
  paymentOrderDate: '2026-09-17',
};

describe('sentinela financeiro do Atendimento FNDE', () => {
  it('não dispara quando valor e data da ordem já estão no snapshot', () => {
    const deltas = compareAttendanceWithSnapshot([observation], schools, {
      schools: {
        '33069247': {
          programs: [{
            name: 'PDDE Básico',
            installments: [{
              installment: '2ª Parcela',
              programmedCents: 10000,
              paymentInformedCents: 10000,
              paymentInformedDate: '2026-09-17',
              paymentOrderDate: null,
            }],
          }],
        },
      },
    });

    expect(deltas).toEqual([]);
  });

  it('dispara quando a fonte pública traz ordem/valor ausente do snapshot', () => {
    const deltas = compareAttendanceWithSnapshot([observation], schools, {
      schools: {
        '33069247': {
          programs: [{
            name: 'PDDE Básico',
            installments: [{
              installment: '2ª Parcela',
              programmedCents: 10000,
              paymentInformedCents: 0,
              paymentInformedDate: null,
              paymentOrderDate: null,
            }],
          }],
        },
      },
    });

    expect(deltas).toEqual([expect.objectContaining({
      inep: '33069247',
      sme: '0410001',
      totalCents: 10000,
      paymentOrderDate: '2026-09-17',
      reason: 'NEW_OR_CHANGED_PAYMENT_ORDER',
    })]);
  });
});
