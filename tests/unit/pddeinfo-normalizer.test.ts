import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pddeinfo-normalizer.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const school = {
  inep: '33000001',
  sme: '0410001',
  nome: 'EM Exemplo',
  denominacaoFnde: '0410001 EM EXEMPLO',
  uex: 'CAIXA ESCOLAR EM EXEMPLO',
  cnpj: '12.345.678/0001-90',
  accounts: [
    {
      programa: 'PDDE',
      banco: '001',
      agencia: '0249',
      conta: '00012345X',
      saldo: '1.000,00',
      ocorrencia: '',
    },
    {
      programa: 'PDDE QUALIDADE',
      banco: '001',
      agencia: '0249',
      conta: '00054321X',
      saldo: '0,00',
      ocorrencia: '',
    },
  ],
  finance: [
    {
      destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
      devidoCusteio: '4.000,00',
      devidoCapital: '1.000,00',
      devidoTotal: '5.000,00',
      ajusteCusteio: '50,00',
      ajusteCapital: '15,00',
      ajusteTotal: '65,00',
      finalDevidoTotal: '5.065,00',
      pagoCusteio: '4.050,00',
      pagoCapital: '1.015,00',
      pagoTotal: '5.065,00',
      data: '05/08/2026',
    },
    {
      destinacao: 'PDDE / PDDE Básico - 2ª Parcela',
      devidoCusteio: '0,00',
      devidoCapital: '0,00',
      devidoTotal: '0,00',
      ajusteCusteio: '0,00',
      ajusteCapital: '0,00',
      ajusteTotal: '0,00',
      finalDevidoTotal: '0,00',
      pagoCusteio: '0,00',
      pagoCapital: '0,00',
      pagoTotal: '0,00',
      data: '',
    },
    {
      destinacao: 'PDDE QUALIDADE / Educação Conectada 2026',
      devidoCusteio: '1.000,00',
      devidoCapital: '0,00',
      devidoTotal: '1.000,00',
      ajusteCusteio: '0,00',
      ajusteCapital: '0,00',
      ajusteTotal: '0,00',
      finalDevidoTotal: '1.000,00',
      pagoCusteio: '0,00',
      pagoCapital: '0,00',
      pagoTotal: '0,00',
      data: '',
    },
  ],
  source: 'https://www.fnde.gov.br/pddeinfo/exemplo',
  sourceIdentity: {
    inep: '33000001',
    sme: '0410001',
    denominacao: '0410001 EM EXEMPLO',
  },
};

async function normalize(schools: unknown[]) {
  const subject = await loadSubject();
  expect(subject, 'o normalizador do PDDEInfo ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.normalizePddeInfoSchools).toBeTypeOf('function');
  return (subject.normalizePddeInfoSchools as (
    raw: unknown[],
    options: Record<string, unknown>,
  ) => Record<string, unknown>)(schools, {
    fiscalYear: 2026,
    queriedAt: '2026-08-11T23:45:00-03:00',
  });
}

describe('normalizePddeInfoSchools', () => {
  test('converte os valores brasileiros em centavos e preserva o valor final devido', async () => {
    const result = await normalize([school]);

    expect(result).toMatchObject({
      source: {
        source: 'PDDEINFO',
        status: 'available',
        queriedAt: '2026-08-11T23:45:00-03:00',
        coverageThrough: '2026-08-11',
      },
      statistics: {
        schools: 1,
        financialRecords: 3,
        paidRecords: 1,
        missingProgramAccounts: 0,
      },
    });

    expect(result?.payments).toEqual([
      expect.objectContaining({
        id: 'PDDEINFO:33000001:2026:PDDE_BASICO:1',
        school: expect.objectContaining({ cnpj: '12345678000190' }),
        fiscalYear: 2026,
        programCode: '02',
        programName: 'PDDE',
        actionCode: 'PDDE_BASICO',
        actionName: 'PDDE Básico',
        installmentCode: '1',
        installmentLabel: '1ª Parcela',
        amountOriginalDueCents: 500_000,
        amountOriginalDueCusteioCents: 400_000,
        amountOriginalDueCapitalCents: 100_000,
        adjustmentCents: 6_500,
        adjustmentCusteioCents: 5_000,
        adjustmentCapitalCents: 1_500,
        amountFinalDueCents: 506_500,
        amountFinalDueCusteioCents: 405_000,
        amountFinalDueCapitalCents: 101_500,
        amountPaidCents: 506_500,
        amountPaidCusteioCents: 405_000,
        amountPaidCapitalCents: 101_500,
        paymentDate: '2026-08-05',
        account: { bank: '001', agency: '0249', number: '00012345X' },
        sourceReference: {
          source: 'PDDEINFO',
          url: school.source,
          rawDestination: 'PDDE / PDDE Básico - 1ª Parcela',
        },
      }),
      expect.objectContaining({
        actionCode: 'PDDE_BASICO',
        installmentCode: '2',
        amountFinalDueCents: 0,
        amountPaidCents: 0,
      }),
      expect.objectContaining({
        programCode: '0B',
        programName: 'PDDE Qualidade',
        actionCode: 'EDUCACAO_CONECTADA',
        actionName: 'Educação Conectada',
        installmentCode: null,
        account: { bank: '001', agency: '0249', number: '00054321X' },
      }),
    ]);
  });

  test('mantém a conta ausente sem completar com outro programa', async () => {
    const noBasicAccount = {
      ...school,
      accounts: school.accounts.filter((account) => account.programa !== 'PDDE'),
      finance: [school.finance[0]],
    };

    const result = await normalize([noBasicAccount]);

    expect(result).toMatchObject({
      statistics: { missingProgramAccounts: 1 },
      payments: [expect.not.objectContaining({ account: expect.anything() })],
    });
  });

  test('rejeita duas contas diferentes para o mesmo programa', async () => {
    const conflictingAccounts = {
      ...school,
      accounts: [
        ...school.accounts,
        { ...school.accounts[0], conta: '00099999X' },
      ],
    };

    await expect(normalize([conflictingAccounts])).rejects.toThrow(/mais de uma conta/i);
  });

  test('rejeita destinação nova com valor relevante em vez de omiti-la', async () => {
    const unknownFinance = {
      ...school,
      finance: [{
        ...school.finance[0],
        destinacao: 'PDDE QUALIDADE / Ação Nova 2026',
      }],
    };

    await expect(normalize([unknownFinance])).rejects.toThrow(/destinação.*não mapeada/i);
  });

  test('rejeita componentes financeiros inconsistentes', async () => {
    const inconsistentFinance = {
      ...school,
      finance: [{
        ...school.finance[0],
        pagoCapital: '999,00',
      }],
    };

    await expect(normalize([inconsistentFinance])).rejects.toThrow(/pagoTotal/i);
  });
});
