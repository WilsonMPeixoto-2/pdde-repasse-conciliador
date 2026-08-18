import { describe, expect, it } from 'vitest';
import { buildHumanFinancialWorkbook } from '../../backend/report/human-financial-workbook';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';

const latestPosition = {
  referenceDate: '2026-06-30', checkingBalanceCents: 0,
  applications: { fundsCents: 318699, savingsCents: 0, rdbCdbCents: 0, totalCents: 318699 },
  totalReportedBalanceCents: 318699,
};

const view: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 418500,
    paymentInformedCents: 418500,
    creditLocatedCents: 418500,
    reportedBalanceCents: 318699,
    applicationsCents: 318699,
  },
  sources: [
    {
      name: 'PDDEInfo',
      information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.',
    },
    {
      name: 'SIGEF',
      information: 'Movimentações das contas e créditos compatíveis localizados no extrato.',
    },
  ],
  indicators: [{
    label: '1ª parcela com pagamento informado',
    count: 1,
    units: [{ sme: '0410001', name: 'EM EMA NEGRAO DE LIMA', inep: '33069247' }],
  }],
  schools: [{
    school: {
      inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CONSELHO ESCOLA COMUNIDADE', cnpj: '04500463000173',
    },
    programs: [{
      name: 'PDDE / PDDE Básico',
      installments: [{
        installment: '1ª Parcela', programmedCents: 418500, paymentInformedCents: 418500,
        paymentInformedDate: '2026-08-05', paymentOrderDate: '2026-08-04',
        account: { bank: '001', agency: '0249', number: '0000546402' },
        creditEvidence: {
          status: 'Crédito compatível localizado no extrato SIGEF',
          date: '2026-08-05', amountCents: 418500, document: 'DOC123',
        },
        note: 'Conta recuperada no SIGEF Liberações pela OB 019072.',
      }],
    }],
    accounts: [{
      program: 'PDDE QUALIDADE', bank: '001', agency: '0249', account: '0000546402',
      positions: [latestPosition],
      latestPosition,
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
      'Acompanhamento',
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

  it('faz indicadores apontarem para a lista nominal em vez de deixar números órfãos', () => {
    const workbook = buildHumanFinancialWorkbook(view);
    const overview = workbook.getWorksheet('Visão Geral');
    const followUp = workbook.getWorksheet('Acompanhamento');
    expect(overview).toBeDefined();
    expect(followUp).toBeDefined();

    const hyperlinks: string[] = [];
    overview?.eachRow((row) => row.eachCell((cell) => {
      const value = cell.value;
      if (value && typeof value === 'object' && 'hyperlink' in value) {
        hyperlinks.push(String(value.hyperlink));
      }
    }));
    expect(hyperlinks.some((value) => value.includes('Acompanhamento'))).toBe(true);

    const visibleFollowUp: string[] = [];
    followUp?.eachRow((row) => row.eachCell((cell) => visibleFollowUp.push(String(cell.value ?? ''))));
    expect(visibleFollowUp.join(' ')).toContain('EM EMA NEGRAO DE LIMA');
    expect(visibleFollowUp.join(' ')).toContain('1ª parcela com pagamento informado');
  });

  it('diferencia visualmente pagamento informado do valor previsto', () => {
    const workbook = buildHumanFinancialWorkbook(view);
    const sheet = workbook.getWorksheet('Repasses');
    expect(sheet).toBeDefined();
    const paidCell = sheet?.getCell(4, 6);
    const plannedCell = sheet?.getCell(4, 5);
    expect(paidCell?.font?.color?.argb).toBeDefined();
    expect(paidCell?.font?.color?.argb).not.toBe(plannedCell?.font?.color?.argb);
  });

  it('identifica no Excel quando a conta foi recuperada no SIGEF Liberações', () => {
    const workbook = buildHumanFinancialWorkbook(view);
    const sheet = workbook.getWorksheet('Repasses');
    const accountCell = String(sheet?.getCell(4, 9).value ?? '');
    expect(accountCell).toContain('origem SIGEF Liberações');
    expect(accountCell).toContain('0000546402');
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
    expect(visible).toContain('repasses informados');
    expect(visible).toContain('contas vinculadas');
    expect(visible).toContain('prestação de contas');
  });
});
