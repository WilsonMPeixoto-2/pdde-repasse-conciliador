import { describe, expect, test } from 'vitest';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';
import { buildManagerialHumanFinancialWorkbook } from '../../backend/report/managerial-human-financial-workbook';

const view: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 31/07/2026',
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 100_000,
    paymentInformedCents: 100_000,
    creditLocatedCents: 0,
    reportedBalanceCents: 0,
    applicationsCents: 0,
  },
  sources: [
    { name: 'PDDEInfo', information: 'Teste' },
    { name: 'SIGEF', information: 'Teste' },
  ],
  indicators: [],
  schools: [{
    school: {
      inep: '33000001',
      sme: '0410001',
      name: 'ESCOLA TESTE',
      uex: 'CEC ESCOLA TESTE',
      cnpj: '00000000000100',
    },
    programs: [{
      name: 'PDDE Básico',
      installments: [{
        installment: '1ª Parcela',
        programmedCents: 100_000,
        paymentInformedCents: 100_000,
        paymentInformedDate: '2026-08-05',
        paymentOrderDate: '2026-08-05',
        account: { bank: '001', agency: '1234', number: '0000000001' },
        creditEvidence: {
          status: 'Crédito não localizado',
          date: null,
          amountCents: null,
          document: null,
        },
        note: null,
      }],
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
        applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
        totalReportedBalanceCents: 0,
      }],
      latestPosition: {
        referenceDate: '2026-07-31',
        checkingBalanceCents: 0,
        applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 },
        totalReportedBalanceCents: 0,
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

describe('Excel gerencial', () => {
  test('começa pelas perguntas gerenciais e explica saldo anterior ao pagamento sem transformar pagamento informado em recebimento comprovado', () => {
    const workbook = buildManagerialHumanFinancialWorkbook(view, {
      generatedAt: new Date('2026-09-04T03:00:00Z'),
    });
    const overview = workbook.getWorksheet('Visão Geral');
    const pdde = workbook.getWorksheet('PDDE Básico');
    const gaps = workbook.getWorksheet('Lacunas e Exceções');

    expect(overview?.getCell('A1').value).toBe('Painel Gerencial · PDDE 2026 · 4ª CRE');
    expect(overview?.getCell('A5').value).toBe('Para quem o FNDE informa pagamento da 1ª parcela / P1?');
    expect(overview?.getCell('A6').value).toBe('Para quem o FNDE informa pagamento da 2ª parcela / P2?');
    expect(overview?.getCell('B5').value).toBe('1 de 1');

    expect(pdde?.getCell('T3').value).toBe('Evidência do 1º ciclo');
    expect(pdde?.getCell('U3').value).toBe('Leitura temporal / coerência');
    expect(String(pdde?.getCell('U4').value)).toContain('saldo é anterior ao pagamento');

    expect(gaps).toBeDefined();
    expect(gaps?.getCell('I4').value).toBe('Não');
    expect(String(gaps?.getCell('L4').value)).toContain('não interpretar zero como ausência de recurso');
  });
});