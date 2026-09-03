import { describe, expect, test } from 'vitest';
import { buildHumanFinancialWorkbook } from '../../backend/report/human-financial-workbook';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';

const view: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 31/07/2026',
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 200_000,
    paymentInformedCents: 100_000,
    creditLocatedCents: 0,
    reportedBalanceCents: 105_000,
    applicationsCents: 105_000,
  },
  sources: [{ name: 'PDDEInfo', information: 'Teste' }],
  indicators: [],
  schools: [{
    school: {
      inep: '33000002',
      sme: '0410002',
      name: 'ESCOLA PRIMEIRA INFÂNCIA',
      uex: 'CEC ESCOLA',
      cnpj: '00000000000100',
    },
    programs: [{
      name: 'PDDE Básico — Primeira Infância',
      installments: [
        {
          installment: 'P1',
          programmedCents: 100_000,
          paymentInformedCents: 100_000,
          paymentInformedDate: '2026-05-22',
          paymentOrderDate: '2026-05-21',
          account: { bank: '001', agency: '1234', number: '0000000001' },
          creditEvidence: { status: 'Crédito não localizado', date: null, amountCents: null, document: null },
          note: null,
        },
        {
          installment: 'P2',
          programmedCents: 100_000,
          paymentInformedCents: 0,
          paymentInformedDate: null,
          paymentOrderDate: null,
          account: { bank: '001', agency: '1234', number: '0000000001' },
          creditEvidence: { status: 'Crédito ainda não localizado', date: null, amountCents: null, document: null },
          note: null,
        },
      ],
    }],
    accounts: [{
      program: 'PDDE',
      bank: '001',
      agency: '1234',
      account: '0000000001',
      occurrence: null,
      positions: [{
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { fundsCents: 105_000, savingsCents: 0, rdbCdbCents: 0, totalCents: 105_000 },
        totalReportedBalanceCents: 105_000,
      }],
      latestPosition: {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { fundsCents: 105_000, savingsCents: 0, rdbCdbCents: 0, totalCents: 105_000 },
        totalReportedBalanceCents: 105_000,
      },
      movements: [],
      note: null,
    }],
    registration: null,
    accountOpenings: [],
    suspensions: [],
    sourceCoverage: [],
    accounting: [],
    followUp: [],
  }],
};

describe('planilha PDDE Básico', () => {
  test('cria aba própria com parcelas e composição do saldo em destaque', () => {
    const workbook = buildHumanFinancialWorkbook(view, { generatedAt: new Date('2026-09-03T12:00:00Z') });
    const sheet = workbook.getWorksheet('PDDE Básico');

    expect(sheet).toBeDefined();
    expect(sheet!.getCell('D4').value).toBe('Primeira Infância');
    expect(sheet!.getCell('F4').value).toBe(1000);
    expect(sheet!.getCell('K4').value).toBe(0);
    expect(sheet!.getCell('P4').value).toBe(1050);
    expect(sheet!.getCell('Q4').value).toBe(1050);
    expect(sheet!.getCell('S4').value).toBe('Em aplicação');

    expect(sheet!.getCell('F4').fill).toMatchObject({ type: 'pattern', pattern: 'solid' });
    expect(sheet!.getCell('K4').fill).toMatchObject({ type: 'pattern', pattern: 'solid' });
    expect(sheet!.getCell('P4').fill).toMatchObject({ type: 'pattern', pattern: 'solid' });
  });
});
