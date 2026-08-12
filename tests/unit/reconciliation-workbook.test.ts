import ExcelJS from 'exceljs';
import { describe, expect, test } from 'vitest';
import type { PortfolioReconciliationResult, PortfolioRow } from '../../backend/core/portfolio-reconciliation';

const subjectUrl = new URL('../../backend/report/reconciliation-workbook.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const account = { bank: '001', agency: '0249', number: '00012345X' };
const availablePddeInfo = {
  source: 'PDDEINFO' as const,
  status: 'available' as const,
  queriedAt: '2026-08-11T23:45:00-03:00',
  coverageThrough: '2026-08-11',
};
const availableReleases = {
  source: 'SIGEF_LIBERACOES' as const,
  status: 'available' as const,
  queriedAt: '2026-08-11T23:46:00-03:00',
  coverageThrough: '2026-08-11',
};
const unavailableReleases = {
  source: 'SIGEF_LIBERACOES' as const,
  status: 'unavailable' as const,
  queriedAt: '2026-08-11T23:46:00-03:00',
  detail: 'A exportação não foi incorporada.',
};
const availableMovements = {
  source: 'SIGEF_MOVIMENTACOES' as const,
  status: 'available' as const,
  queriedAt: '2026-08-11T23:47:00-03:00',
  coverageThrough: '2026-05-29',
};

function row(id: string, requiresReview: boolean): PortfolioRow {
  const confirmed = !requiresReview;
  const payment = {
    id,
    school: {
      inep: id === 'payment-1' ? '03300001' : '03300002',
      sme: id === 'payment-1' ? '0041001' : '0041002',
      name: id === 'payment-1' ? 'EM Exemplo' : '=HIPERLINK("https://malicioso.invalid")',
      uex: 'CAIXA ESCOLAR EM EXEMPLO',
      cnpj: id === 'payment-1' ? '012345678000190'.slice(-14) : '02345678000191',
    },
    fiscalYear: 2026,
    programCode: '02',
    programName: 'PDDE',
    actionCode: 'PDDE_BASICO',
    actionName: 'PDDE Básico',
    installmentCode: id === 'payment-1' ? '1' : '2',
    installmentLabel: id === 'payment-1' ? '1ª Parcela' : '2ª Parcela',
    amountOriginalDueCents: 506_500,
    adjustmentCents: -500,
    amountFinalDueCents: 506_000,
    amountPaidCents: 506_000,
    paymentDate: '2026-05-22',
    account,
    sourceReference: {
      source: 'PDDEINFO' as const,
      url: 'https://www.fnde.gov.br/pddeinfo/exemplo',
      rawDestination: 'PDDE / PDDE Básico - 1ª Parcela',
    },
  };
  const release = confirmed ? {
    id: 'release-1',
    schoolCnpj: payment.school.cnpj,
    fiscalYear: 2026,
    programCode: '02',
    programName: 'PDDE',
    actionCode: 'PDDE_BASICO',
    installmentCode: '1',
    amountCents: 506_000,
    paymentDate: '2026-05-22',
    orderBank: '0000900001',
    destinationAccount: account,
    sourceReference: {
      source: 'SIGEF_LIBERACOES' as const,
      url: 'https://www.fnde.gov.br/sigefweb/liberacoes/exemplo',
      rawProgram: '@PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026',
    },
  } : null;
  const movements = confirmed ? [{
    id: 'movement-1',
    schoolCnpj: payment.school.cnpj,
    programCode: '02',
    operation: 'credit' as const,
    amountCents: 506_000,
    movementDate: '2026-05-22',
    account,
    document: '0000900001',
    history: 'ORDEM BANCARIA',
  }] : [];

  return {
    payment,
    matchedRelease: release,
    matchedMovements: movements,
    reconciliation: confirmed ? {
      status: 'REPASSE_CONFIRMADO',
      statusLabel: 'REPASSE CONFIRMADO',
      reasonCode: 'EXACT_MATCH',
      reason: 'PDDEInfo, liberação e movimentação apresentam correspondência suficiente.',
      requiresHumanReview: false,
      matchedReleaseId: 'release-1',
      matchedMovementIds: ['movement-1'],
      movementTotalCents: 506_000,
      differences: [],
    } : {
      status: 'CONSULTA_INCONCLUSIVA',
      statusLabel: 'CONSULTA INCONCLUSIVA',
      reasonCode: 'RELEASE_SOURCE_UNAVAILABLE',
      reason: 'A fonte de liberações não respondeu de forma utilizável.',
      requiresHumanReview: true,
      matchedReleaseId: null,
      matchedMovementIds: [],
      movementTotalCents: 0,
      differences: [],
    },
    accountResolution: {
      pddeInfoAccount: account,
      sigefDestinationAccount: release?.destinationAccount ?? null,
      effectiveAccount: account,
      source: confirmed ? 'PDDEINFO_E_SIGEF' : 'PDDEINFO',
      correspondence: confirmed ? 'MATCH' : 'PDDEINFO_ONLY',
    },
    sources: {
      pddeInfo: availablePddeInfo,
      sigefReleases: confirmed ? availableReleases : unavailableReleases,
      sigefMovements: availableMovements,
    },
  };
}

const portfolio: PortfolioReconciliationResult = {
  rows: [row('payment-1', false), row('payment-2', true)],
  summary: {
    total: 2,
    confirmed: 1,
    orderBankWithoutCredit: 0,
    pddeInfoOnly: 0,
    divergent: 0,
    noPayment: 0,
    inconclusive: 1,
    requiringHumanReview: 1,
    accountsFromPddeInfoOnly: 1,
    accountsConfirmedByBoth: 1,
    accountsCompletedFromSigef: 0,
    accountDivergences: 0,
    accountsMissing: 0,
  },
};

async function buildWorkbook(): Promise<ExcelJS.Workbook | null> {
  const subject = await loadSubject();
  expect(subject, 'o gerador do relatório ainda não foi implementado').not.toBeNull();
  if (!subject) return null;
  expect(subject.buildReconciliationWorkbook).toBeTypeOf('function');
  const output = await (subject.buildReconciliationWorkbook as (value: unknown) => Promise<Buffer>)({
    portfolio,
    generatedAt: '2026-08-11T23:59:00-03:00',
    title: 'Conciliação PDDE — 4ª CRE',
  });
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(output as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  return workbook;
}

describe('buildReconciliationWorkbook', () => {
  test('cria as três abas auditáveis e congela seus cabeçalhos', async () => {
    const workbook = await buildWorkbook();

    expect(workbook?.worksheets.map((sheet) => sheet.name)).toEqual([
      'Conciliação',
      'Exceções',
      'Metadados',
    ]);
    expect(workbook?.getWorksheet('Conciliação')?.views).toEqual([
      expect.objectContaining({ state: 'frozen', ySplit: 1 }),
    ]);
    expect(workbook?.getWorksheet('Conciliação')?.autoFilter).toBeDefined();
  });

  test('preserva identificadores como texto, valores como números e datas como datas', async () => {
    const workbook = await buildWorkbook();
    const sheet = workbook?.getWorksheet('Conciliação');
    const headers = new Map<string, number>();
    sheet?.getRow(1).eachCell((cell, column) => headers.set(String(cell.value), column));

    expect(sheet?.getRow(2).getCell(headers.get('INEP')!).value).toBe('03300001');
    expect(sheet?.getRow(2).getCell(headers.get('SME')!).value).toBe('0041001');
    expect(sheet?.getRow(2).getCell(headers.get('CNPJ')!).value).toBe('12345678000190');
    expect(sheet?.getRow(2).getCell(headers.get('Conta efetiva')!).value).toBe('00012345X');
    expect(sheet?.getRow(2).getCell(headers.get('Valor pago PDDEInfo')!).value).toBe(5060);
    expect(sheet?.getRow(2).getCell(headers.get('Ajuste')!).value).toBe(-5);
    expect(sheet?.getRow(2).getCell(headers.get('Data pagamento PDDEInfo')!).value).toBeInstanceOf(Date);
    expect(sheet?.getRow(2).getCell(headers.get('Ordem bancária')!).value).toBe('0000900001');
  });

  test('leva apenas revisões à aba de exceções e neutraliza fórmulas vindas das fontes', async () => {
    const workbook = await buildWorkbook();
    const allRows = workbook?.getWorksheet('Conciliação');
    const exceptions = workbook?.getWorksheet('Exceções');

    expect(allRows?.rowCount).toBe(3);
    expect(exceptions?.rowCount).toBe(2);
    expect(exceptions?.getCell('C2').value).toBe('\'=HIPERLINK("https://malicioso.invalid")');
    expect(allRows?.getCell('AA2').value).not.toEqual(expect.objectContaining({ formula: expect.anything() }));
  });

  test('registra os totais, a regra de confirmação e a cobertura das fontes', async () => {
    const workbook = await buildWorkbook();
    const metadata = workbook?.getWorksheet('Metadados');
    const rows = metadata?.getRows(1, metadata.rowCount)?.map((item) => item.values) ?? [];

    expect(rows).toContainEqual(expect.arrayContaining(['Total de repasses', 2]));
    expect(rows).toContainEqual(expect.arrayContaining(['Repasses confirmados', 1]));
    expect(rows).toContainEqual(expect.arrayContaining(['Revisões humanas', 1]));
    expect(rows).toContainEqual(expect.arrayContaining([
      'Regra de confirmação',
      expect.stringContaining('PDDEInfo'),
    ]));
    expect(rows).toContainEqual(expect.arrayContaining([
      'Cobertura SIGEF Movimentações',
      expect.any(Date),
    ]));
  });

  test('relê o arquivo serializado e audita dimensões, conteúdo e ausência de fórmulas', async () => {
    const subject = await loadSubject();
    expect(subject?.validateReconciliationWorkbook).toBeTypeOf('function');
    const output = await (subject?.buildReconciliationWorkbook as (value: unknown) => Promise<Buffer>)({
      portfolio,
      generatedAt: '2026-08-11T23:59:00-03:00',
    });

    const audit = await (subject?.validateReconciliationWorkbook as (
      bytes: Buffer,
      expected: PortfolioReconciliationResult,
    ) => Promise<Record<string, number>>)(output, portfolio);

    expect(audit).toEqual({ sheets: 3, rows: 2, exceptions: 1, columns: 53 });
  });

  test('a auditoria rejeita uma fórmula introduzida depois da geração', async () => {
    const subject = await loadSubject();
    expect(subject?.validateReconciliationWorkbook).toBeTypeOf('function');
    const output = await (subject?.buildReconciliationWorkbook as (value: unknown) => Promise<Buffer>)({
      portfolio,
      generatedAt: '2026-08-11T23:59:00-03:00',
    });
    const tampered = new ExcelJS.Workbook();
    await tampered.xlsx.load(output as unknown as Parameters<typeof tampered.xlsx.load>[0]);
    tampered.getWorksheet('Conciliação')!.getCell('A2').value = { formula: '2+2', result: 4 };
    const tamperedBytes = Buffer.from(await tampered.xlsx.writeBuffer());

    await expect((subject?.validateReconciliationWorkbook as (
      bytes: Buffer,
      expected: PortfolioReconciliationResult,
    ) => Promise<unknown>)(tamperedBytes, portfolio)).rejects.toThrow(/fórmula/i);
  });
});
