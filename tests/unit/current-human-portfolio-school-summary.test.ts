import { describe, expect, it } from 'vitest';
import { buildCurrentPortfolioSchoolSummary } from '../../backend/application/current-human-financial-read-model';

const school = {
  school: {
    inep: '33069093',
    sme: '0410002',
    name: 'ESCOLA B',
    uex: 'CEC B',
    cnpj: '01872287000102',
  },
  programs: [
    {
      name: 'PDDE / PDDE Básico',
      installments: [
        {
          installment: '1ª Parcela',
          programmedCents: 500_000,
          paymentInformedCents: 500_000,
          paymentInformedDate: '2026-08-05',
          paymentOrderDate: '2026-08-04',
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: {
            status: 'Crédito localizado',
            date: '2026-08-06',
            amountCents: 500_000,
            document: 'OB123',
          },
          note: null,
        },
        {
          installment: '2ª Parcela',
          programmedCents: 500_000,
          paymentInformedCents: 0,
          paymentInformedDate: null,
          paymentOrderDate: null,
          account: null,
          creditEvidence: {
            status: 'Pagamento não informado',
            date: null,
            amountCents: null,
            document: null,
          },
          note: null,
        },
      ],
    },
  ],
  accounts: [
    {
      program: 'PDDE',
      bank: '001',
      agency: '0249',
      account: '0000549797',
      positions: [],
      latestPosition: {
        referenceDate: '2026-06-30',
        checkingBalanceCents: 1_000,
        applications: {
          fundsCents: 30_000,
          savingsCents: 0,
          rdbCdbCents: 0,
          totalCents: 30_000,
        },
        totalReportedBalanceCents: 31_000,
      },
      movements: [],
      note: null,
    },
    {
      program: 'PDDE Qualidade',
      bank: '001',
      agency: '0249',
      account: '0000546032',
      positions: [],
      latestPosition: {
        referenceDate: '2026-05-31',
        checkingBalanceCents: 2_000,
        applications: {
          fundsCents: 10_000,
          savingsCents: 0,
          rdbCdbCents: 0,
          totalCents: 10_000,
        },
        totalReportedBalanceCents: 12_000,
      },
      movements: [],
      note: null,
    },
  ],
  accounting: [
    {
      program: 'PDDE',
      status: 'INADIMPLENTE',
      paymentSuspended: true,
      expectedTotalCents: 1_000_000,
    },
  ],
  followUp: [
    'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.',
  ],
};

describe('buildCurrentPortfolioSchoolSummary', () => {
  it('resume a escola na referência global sem transformar ausência de cobertura em saldo completo', () => {
    const summary = buildCurrentPortfolioSchoolSummary(school, '2026-06-30');

    expect(summary).toEqual({
      sme: '0410002',
      name: 'ESCOLA B',
      inep: '33069093',
      programmedCents: 1_000_000,
      paymentInformedCents: 500_000,
      creditLocatedCents: 500_000,
      knownBalanceCents: 31_000,
      referenceDate: '2026-06-30',
      accountsTotal: 2,
      accountsWithReferencePosition: 1,
      followUpCount: 1,
      paymentSuspended: true,
      repasseAccountMissing: false,
      pendingCount: 2,
      registrationAttention: false,
      mandateStatus: null,
      suspensionCount: 0,
      accountOpeningIssueCount: 0,
      accountingAttentionCount: 1,
    });
  });

  it('sinaliza conta ausente somente quando já existe pagamento informado', () => {
    const paidWithoutAccount = {
      ...school,
      programs: [{
        ...school.programs[0],
        installments: [{
          ...school.programs[0].installments[1],
          paymentInformedCents: 500_000,
          paymentInformedDate: '2026-08-10',
          creditEvidence: {
            status: 'Conta não exibida',
            date: null,
            amountCents: null,
            document: null,
          },
        }],
      }],
    };

    expect(buildCurrentPortfolioSchoolSummary(paidWithoutAccount, '2026-06-30').repasseAccountMissing)
      .toBe(true);
  });

  it('preserva zero como valor conhecido e usa null quando nenhuma conta tem posição na referência', () => {
    const zeroSchool = {
      ...school,
      accounts: [{
        ...school.accounts[0],
        latestPosition: {
          ...school.accounts[0].latestPosition,
          totalReportedBalanceCents: 0,
        },
      }],
      accounting: [],
      followUp: [],
      programs: [],
    };

    expect(buildCurrentPortfolioSchoolSummary(zeroSchool, '2026-06-30').knownBalanceCents).toBe(0);
    expect(buildCurrentPortfolioSchoolSummary(zeroSchool, '2026-07-31').knownBalanceCents).toBeNull();
  });
});
