import { describe, expect, it } from 'vitest';
import { buildHumanFinancialWorkbook } from '../../backend/report/human-financial-workbook';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';

const view: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  schools: [{
    school: {
      inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CONSELHO ESCOLA COMUNIDADE', cnpj: '04500463000173',
    },
    programs: [{
      name: 'PDDE / PDDE Básico',
      installments: [{
        installment: '1ª Parcela', programmedCents: 418500, paymentInformedCents: 418500,
        paymentOrderDate: '2026-08-04',
        account: { bank: '001', agency: '0249', number: '0000546402' },
        creditEvidence: {
          status: 'Crédito compatível localizado no extrato SIGEF',
          date: '2026-08-05', amountCents: 418500, document: 'DOC123',
        },
        note: null,
      }],
    }],
    accounts: [{
      program: 'PDDE QUALIDADE', bank: '001', agency: '0249', account: '0000546402',
      latestPosition: {
        referenceDate: '2026-06-30', checkingBalanceCents: 0,
        applications: { fundsCents: 318699, savingsCents: 0, rdbCdbCents: 0, totalCents: 318699 },
        totalReportedBalanceCents: 318699,
      },
      movements: [{
        date: '2026-06-10', description: 'PAGAMENTO FORNECEDOR', document: '12345',
        category: 'Pagamento / transferência', creditCents: null, debitCents: 50000,
        counterparty: null,
      }],
      note: 'Saldo informado pelo FNDE com posição até 30/06/2026.',
    }],
    accounting: [{
      program: 'PDDE', status: 'Aguardando análise', paymentSuspended: false,
      expectedTotalCents: 418500,
    }],
    followUp: [],
  }],
};

describe('Excel humano da inteligência financeira', () => {
  it('separa a informação em abas curtas e compreensíveis', () => {
    const workbook = buildHumanFinancialWorkbook(view);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      'Visão Geral',
      'Unidades',
      'Repasses',
      'Contas e Saldos',
      'Movimentações',
      'Prestação de Contas',
    ]);
    for (const sheet of workbook.worksheets) {
      expect(sheet.columnCount).toBeLessThanOrEqual(10);
    }
  });

  it('não expõe metadados ou vocabulário técnico do backend', () => {
    const workbook = buildHumanFinancialWorkbook(view);
    const visible = workbook.worksheets.flatMap((sheet) => {
      const values: string[] = [];
      sheet.eachRow((row) => row.eachCell((cell) => values.push(String(cell.value ?? ''))));
      return values;
    }).join(' ').toLowerCase();

    for (const forbidden of [
      'sha256', 'parser', 'sourceurl', 'technicalclassification', 'pagesfetched',
      'requesthash', 'payload', 'retry', 'retentativa', 'hash',
    ]) {
      expect(visible).not.toContain(forbidden);
    }
    expect(visible).toContain('2026');
    expect(visible).toContain('saldo total informado');
    expect(visible).toContain('posição');
  });
});
