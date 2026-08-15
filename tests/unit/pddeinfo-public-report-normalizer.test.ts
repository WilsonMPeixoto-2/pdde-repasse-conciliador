import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pddeinfo-public-report-normalizer.ts', import.meta.url).href;

async function subject(): Promise<Record<string, any> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, any>;
  } catch {
    return null;
  }
}

describe('normalização dos relatórios públicos PDDEInfo', () => {
  test('normaliza atendimento sem confundir ordem de pagamento com crédito bancário', async () => {
    const mod = await subject();
    expect(mod, 'normalizador ainda não implementado').not.toBeNull();
    if (!mod) return;
    const record = mod.normalizeAttendanceRow({
      Ano: '2026',
      'Código Escola': '33069247',
      'CNPJ Executora': '04500463000173',
      'Nome Escola': '0410001 EM EMA NEGRAO DE LIMA',
      Programa: 'PDDE',
      'Destinação': 'PDDE Básico - 1ª Parcela',
      'Valor Custeio': '837,00',
      'Valor Capital': '3.348,00',
      'Valor Total': '4.185,00',
      'Data da Ord. de Pagamento': '04/08/2026',
    });
    expect(record).toMatchObject({
      fiscalYear: 2026,
      schoolInep: '33069247',
      uexCnpj: '04500463000173',
      costCents: 83_700,
      capitalCents: 334_800,
      totalCents: 418_500,
      paymentOrderDate: '2026-08-04',
    });
    expect(record).not.toHaveProperty('bankCreditDate');
  });

  test('normaliza saldo e aplicações em centavos inteiros com cobertura explícita', async () => {
    const mod = await subject();
    expect(mod, 'normalizador ainda não implementado').not.toBeNull();
    if (!mod) return;
    const record = mod.normalizeBalanceRow({
      CNPJ: '04500463000173', Banco: '001', 'Agência': '0249', Conta: '0000546402',
      'Mês/Ano': '6', 'Saldo Conta': '0,00', 'Saldo Fundos': '3.186,99',
      'Saldo Poupança': '12,01', 'Saldo RDB/CDB': '100,00',
      'Descrição Programa FNDE': 'PDDE QUALIDADE',
    }, '2026-06-30');
    expect(record).toMatchObject({
      coverageThrough: '2026-06-30',
      uexCnpj: '04500463000173',
      bank: '001', agency: '0249', account: '0000546402',
      checkingBalanceCents: 0,
      fundBalanceCents: 318_699,
      savingsBalanceCents: 1_201,
      rdbCdbBalanceCents: 10_000,
      investmentBalanceCents: 329_900,
      totalReportedBalanceCents: 329_900,
      programName: 'PDDE QUALIDADE',
    });
    expect(Number.isSafeInteger(record.totalReportedBalanceCents)).toBe(true);
  });

  test('normaliza prestação de contas 2026 preservando situação e suspensão', async () => {
    const mod = await subject();
    expect(mod, 'normalizador ainda não implementado').not.toBeNull();
    if (!mod) return;
    const record = mod.normalizeAccountingRow({
      Ano: '2026', Programa: 'PDDE QUALIDADE', 'Código da Escola': '33069247',
      'CNPJ da Executora': '04500463000173',
      'Situação Prestação de Contas UEx': 'Adimplente',
      'Suspensão de Pagamento UEx': 'NAO',
      'Valor Total Previsto': '3.328,00',
    });
    expect(record).toEqual({
      fiscalYear: 2026,
      programName: 'PDDE QUALIDADE',
      schoolInep: '33069247',
      uexCnpj: '04500463000173',
      accountingStatus: 'Adimplente',
      paymentSuspended: false,
      expectedTotalCents: 332_800,
    });
  });
});
