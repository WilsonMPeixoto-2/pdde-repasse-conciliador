import { describe, expect, it } from 'vitest';
import { deriveSchoolSummary } from '../../src/product/derive';
import { humanSchoolSchema } from '../../src/product/types';

const position = (referenceDate: string, balance: number, applications: number) => ({
  referenceDate,
  checkingBalanceCents: balance - applications,
  applications: {
    fundsCents: applications,
    savingsCents: 0,
    rdbCdbCents: 0,
    totalCents: applications,
  },
  totalReportedBalanceCents: balance,
});

describe('cobertura temporal do resumo financeiro da escola', () => {
  it('não mistura conta de maio no total rotulado com referência de junho', () => {
    const june = position('2026-06-30', 100_000, 90_000);
    const may = position('2026-05-31', 50_000, 40_000);
    const school = humanSchoolSchema.parse({
      fiscalYear: 2026,
      school: {
        inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102',
      },
      programs: [],
      accounts: [
        {
          program: 'PDDE', bank: '001', agency: '0249', account: '100',
          positions: [june], latestPosition: june, movements: [], note: null,
        },
        {
          program: 'PDDE QUALIDADE', bank: '001', agency: '0249', account: '200',
          positions: [may], latestPosition: may, movements: [], note: null,
        },
      ],
      accounting: [],
      followUp: [],
    });

    expect(deriveSchoolSummary(school)).toMatchObject({
      balanceReferenceDate: '2026-06-30',
      reportedBalanceCents: 100_000,
      applicationsCents: 90_000,
    });
  });
});
