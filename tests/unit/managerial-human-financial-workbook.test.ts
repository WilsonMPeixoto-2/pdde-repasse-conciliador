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
        note: 'SIGEF Liberações localizou a liberação pela OB 019072 para a mesma conta informada; isso confirma a ordem/destino, mas não substitui a localização do crédito no extrato.',
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
  test('separa posição histórica de localização corrente e mantém a OB como evidência intermediária', () => {
    const workbook = buildManagerialHumanFinancialWorkbook(view, {
      generatedAt: new Date('2026-09-04T13:30:00Z'),
    });
    const overview = workbook.getWorksheet('Visão Geral');
    const pdde = workbook.getWorksheet('PDDE Básico');
    const gaps = workbook.getWorksheet('Lacunas e Exceções');

    expect(overview?.getCell('A1').value).toBe('Painel Gerencial · PDDE 2026 · 4ª CRE');
    expect(overview?.getCell('A5').value).toBe('Para quem o FNDE informa pagamento do 1º ciclo?');
    expect(overview?.getCell('A6').value).toBe('Quantas têm evidência independente do 1º ciclo no SIGEF?');
    expect(overview?.getCell('B5').value).toBe('1 de 1');
    expect(overview?.getCell('B6').value).toBe('1 de 1');
    expect(overview?.getCell('B7').value).toBe('0 de 1');

    expect(pdde?.getCell('A3').value).toBe('SME');
    expect(pdde?.getCell('G3').value).toBe('Evidência SIGEF do 1º ciclo');
    expect(pdde?.getCell('I3').value).toBe('Onde está o recurso?');
    expect(pdde?.getCell('I4').value).toBe('Localização atual não comprovada');
    expect(String(pdde?.getCell('J4').value)).toContain('31/07/2026');
    expect(String(pdde?.getCell('J4').value)).toContain('histórica');
    expect(String(pdde?.getCell('G4').value)).toContain('Liberação/OB localizada');

    expect(gaps).toBeDefined();
    expect(gaps?.getCell('I4').value).toBe('Não');
    expect(String(gaps?.getCell('L4').value)).toContain('posição posterior');
  });
});