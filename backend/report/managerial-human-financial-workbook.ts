import ExcelJS from 'exceljs';
import type { HumanFinancialPortfolioView } from '../application/build-human-financial-view';
import {
  derivePddeBasicPortfolio,
  pddeBasicEvidenceStateLabel,
} from '../../shared/pdde-basic-monitoring';
import {
  resolutionPlanForGap,
  type FinancialGapKind,
} from '../../shared/source-resolution-policy';
import {
  buildHumanFinancialWorkbook,
  type BuildHumanFinancialWorkbookOptions,
} from './human-financial-workbook';

const NAVY = '183B56';
const BLUE = '2F6F91';
const GREEN = '18724B';
const DARK = '203746';
const MUTED = '617784';
const WHITE = 'FFFFFF';
const BORDER = 'D8E2E8';
const PALE = 'EAF2F6';
const PALE_GREEN = 'E7F4EC';
const PALE_YELLOW = 'FFF5DD';
const MONEY = 'R$ #,##0.00';

function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

function brDate(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : '';
}

function header(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
  });
  row.height = 30;
}

function styleRows(sheet: ExcelJS.Worksheet, startRow: number): void {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      if (!cell.font?.bold) cell.font = { color: { argb: DARK }, size: 10 };
      cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
    });
  }
}

function resetSheet(sheet: ExcelJS.Worksheet): void {
  for (const merged of [...sheet.model.merges]) sheet.unMergeCells(merged);
  const lastRow = Math.max(sheet.rowCount, sheet.actualRowCount);
  const lastColumn = Math.max(sheet.columnCount, sheet.actualColumnCount);
  for (let rowNumber = 1; rowNumber <= lastRow; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.height = sheet.properties.defaultRowHeight ?? 15;
    row.alignment = {};
    for (let column = 1; column <= lastColumn; column += 1) {
      const cell = row.getCell(column);
      cell.value = null;
      cell.style = {};
    }
  }
  sheet.autoFilter = undefined;
  sheet.views = [];
}

function answerRow(
  sheet: ExcelJS.Worksheet,
  rowNumber: number,
  question: string,
  answer: string | number,
  explanation: string,
  tone: 'positive' | 'attention' | 'neutral' = 'neutral',
): void {
  const row = sheet.getRow(rowNumber);
  row.values = [question, answer, explanation];
  row.height = 42;
  row.alignment = { vertical: 'middle', wrapText: true };
  row.getCell(1).font = { bold: true, color: { argb: NAVY }, size: 10 };
  row.getCell(2).font = {
    bold: true,
    color: { argb: tone === 'positive' ? GREEN : tone === 'attention' ? '8A5A00' : DARK },
    size: 13,
  };
  if (tone === 'positive') row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
  if (tone === 'attention') row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
  row.getCell(3).font = { color: { argb: MUTED }, size: 10 };
}

function rebuildManagerialOverview(
  workbook: ExcelJS.Workbook,
  view: HumanFinancialPortfolioView,
): void {
  const sheet = workbook.getWorksheet('Visão Geral');
  if (!sheet) return;
  resetSheet(sheet);

  const monitoring = derivePddeBasicPortfolio(view.schools);
  const staleZero = monitoring.rows.filter((row) => (
    row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT'
    && row.balance.totalCents === 0
  )).length;
  const checkingOnly = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) <= 0
  )).length;
  const applicationOnly = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) <= 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;
  const both = monitoring.rows.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;

  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'Painel Gerencial · PDDE 2026 · 4ª CRE';
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getCell('A1').font = { bold: true, color: { argb: WHITE }, size: 16 };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `${view.referenceLabel}. O painel prioriza perguntas gerenciais e separa pagamento informado, crédito localizado e posição de saldo.`;
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sheet.getCell('A2').font = { color: { argb: MUTED }, size: 10 };
  sheet.getCell('A2').alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 32;

  const questionHeader = sheet.getRow(4);
  questionHeader.values = ['Pergunta gerencial', 'Resposta atual', 'Como interpretar'];
  header(questionHeader);
  answerRow(
    sheet,
    5,
    'Para quem o FNDE informa pagamento da 1ª parcela / P1?',
    `${monitoring.firstPaidCount} de ${monitoring.schoolCount}`,
    `${monitoring.firstRegularCount} no PDDE Básico regular + ${monitoring.firstInfancyCount} em Primeira Infância/P1.`,
    monitoring.firstPendingCount === 0 ? 'positive' : 'attention',
  );
  answerRow(
    sheet,
    6,
    'Para quem o FNDE informa pagamento da 2ª parcela / P2?',
    `${monitoring.secondPaidCount} de ${monitoring.schoolCount}`,
    `${monitoring.secondPendingCount} ainda sem pagamento informado.`,
    monitoring.secondPaidCount > 0 ? 'positive' : 'neutral',
  );
  answerRow(
    sheet,
    7,
    'Em quantas o crédito do 1º ciclo foi localizado no SIGEF?',
    `${monitoring.firstCreditLocatedCount} de ${monitoring.firstPaidCount}`,
    'Esta é evidência bancária independente do simples registro de pagamento no PDDEInfo.',
    'positive',
  );
  answerRow(
    sheet,
    8,
    'Quantas têm saldo PDDE positivo?',
    `${monitoring.balancePositiveCount} de ${monitoring.schoolCount}`,
    `${checkingOnly} somente em conta corrente · ${applicationOnly} somente em aplicações · ${both} em ambos.`,
    'positive',
  );
  answerRow(
    sheet,
    9,
    'Quantas têm saldo publicado anterior ao pagamento?',
    monitoring.balanceBeforePaymentCount,
    `${staleZero} aparecem com saldo zero porque a posição disponível é anterior ao pagamento. Isso não é contradição.`,
    monitoring.balanceBeforePaymentCount > 0 ? 'attention' : 'neutral',
  );
  answerRow(
    sheet,
    10,
    'Quantas têm inconsistência temporalmente comparável?',
    monitoring.trueInconsistencyCount,
    'Só conta como inconsistência quando a posição de saldo é posterior/igual ao pagamento, permanece zerada e o crédito específico não foi localizado.',
    monitoring.trueInconsistencyCount > 0 ? 'attention' : 'positive',
  );
  answerRow(
    sheet,
    11,
    'Quantas ainda precisam de reforço de evidência?',
    monitoring.firstNeedsSourceEscalationCount,
    'O sistema deve continuar procurando crédito, saldo posterior ou fonte complementar em vez de transformar lacuna em conclusão.',
    monitoring.firstNeedsSourceEscalationCount > 0 ? 'attention' : 'positive',
  );

  const whereTitle = sheet.getRow(13);
  whereTitle.values = ['Onde está o saldo do PDDE Básico'];
  sheet.mergeCells('A13:C13');
  whereTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
  whereTitle.getCell(1).font = { bold: true, color: { argb: NAVY } };
  const compositionHeader = sheet.getRow(14);
  compositionHeader.values = ['Composição', 'Escolas', 'Valor total'];
  header(compositionHeader);
  sheet.getRow(15).values = ['Conta corrente', monitoring.checkingPositiveCount, reais(monitoring.checkingCents)];
  sheet.getRow(16).values = ['Aplicações', monitoring.applicationsPositiveCount, reais(monitoring.applicationsCents)];
  sheet.getRow(17).values = ['Saldo total PDDE', monitoring.balancePositiveCount, reais(monitoring.totalBalanceCents)];
  for (const rowNumber of [15, 16, 17]) sheet.getRow(rowNumber).getCell(3).numFmt = MONEY;
  sheet.getRow(17).font = { bold: true, color: { argb: DARK } };

  const linksTitle = sheet.getRow(19);
  linksTitle.values = ['Próximas leituras'];
  sheet.mergeCells('A19:C19');
  linksTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  linksTitle.getCell(1).font = { bold: true, color: { argb: NAVY } };
  sheet.getRow(20).values = [
    { text: 'Abrir PDDE Básico', hyperlink: "#'PDDE Básico'!A1" },
    'Escola por escola: parcelas, saldo e leitura temporal.',
    '',
  ];
  sheet.getRow(21).values = [
    { text: 'Abrir Lacunas e Exceções', hyperlink: "#'Lacunas e Exceções'!A1" },
    'Somente casos que ainda exigem fonte complementar ou nova referência.',
    '',
  ];

  styleRows(sheet, 4);
  sheet.columns = [{ width: 42 }, { width: 25 }, { width: 72 }];
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function gapForEvidence(state: string): FinancialGapKind | null {
  if (state === 'BALANCE_REFERENCE_BEFORE_PAYMENT') return 'BALANCE_REFERENCE_BEFORE_PAYMENT';
  if (state === 'ZERO_BALANCE_AFTER_PAYMENT') return 'ZERO_BALANCE_AFTER_PAYMENT';
  if (state === 'NO_BALANCE_POSITION') return 'NO_BALANCE_POSITION';
  if (state === 'POSITIVE_BALANCE_AFTER_PAYMENT' || state === 'PAYMENT_DATE_UNAVAILABLE') return 'PAYMENT_NO_CREDIT';
  return null;
}

function nextAction(state: string): string {
  const gap = gapForEvidence(state);
  if (!gap) return state === 'CREDIT_LOCATED'
    ? 'Crédito já localizado; manter apenas monitoramento de novas parcelas e saldos.'
    : 'Aguardar pagamento e manter monitoramento.';
  return resolutionPlanForGap(gap).primaryAction;
}

function suggestedSources(state: string): string {
  const gap = gapForEvidence(state);
  if (!gap) return '';
  return resolutionPlanForGap(gap).steps
    .map((step) => `${step.source} [${step.state}]`)
    .join(' → ');
}

function enrichPddeBasicSheet(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.getWorksheet('PDDE Básico');
  if (!sheet) return;
  const monitoring = derivePddeBasicPortfolio(view.schools);
  const byInep = new Map(monitoring.rows.map((row) => [row.inep, row]));

  sheet.getCell(3, 20).value = 'Evidência do 1º ciclo';
  sheet.getCell(3, 21).value = 'Leitura temporal / coerência';
  sheet.getCell(3, 22).value = 'Próxima ação recomendada';
  for (const column of [20, 21, 22]) {
    const cell = sheet.getCell(3, column);
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  }

  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const inep = String(sheet.getCell(rowNumber, 3).value ?? '');
    const item = byInep.get(inep);
    if (!item) continue;
    const evidenceCell = sheet.getCell(rowNumber, 20);
    const readingCell = sheet.getCell(rowNumber, 21);
    const actionCell = sheet.getCell(rowNumber, 22);
    evidenceCell.value = item.firstEvidence.creditLocated
      ? `Crédito localizado · ${reais(item.first.creditLocatedCents)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? ''}`
      : 'Crédito específico não localizado';
    readingCell.value = pddeBasicEvidenceStateLabel(item.firstEvidence.state);
    actionCell.value = nextAction(item.firstEvidence.state);
    if (item.firstEvidence.creditLocated) {
      evidenceCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
      evidenceCell.font = { bold: true, color: { argb: GREEN } };
    }
    if (item.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT') {
      readingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
      readingCell.font = { color: { argb: BLUE } };
    }
    if (item.firstEvidence.isContradiction) {
      readingCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
      readingCell.font = { bold: true, color: { argb: '8A5A00' } };
      actionCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    }
  }
  sheet.getColumn(20).width = 28;
  sheet.getColumn(21).width = 58;
  sheet.getColumn(22).width = 58;
  sheet.autoFilter = { from: 'A3', to: 'V3' };
}

function buildGapSheet(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const existing = workbook.getWorksheet('Lacunas e Exceções');
  if (existing) workbook.removeWorksheet(existing.id);
  const monitoring = derivePddeBasicPortfolio(view.schools);
  const sheet = workbook.addWorksheet('Lacunas e Exceções', { views: [{ state: 'frozen', ySplit: 3 }] });
  sheet.mergeCells('A1:L1');
  sheet.getCell('A1').value = 'Lacunas e exceções · PDDE Básico 2026';
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getCell('A1').font = { bold: true, color: { argb: WHITE }, size: 16 };
  sheet.mergeCells('A2:L2');
  sheet.getCell('A2').value = 'Apenas casos que ainda pedem evidência complementar. Defasagem temporal é separada de inconsistência real.';
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sheet.getCell('A2').font = { color: { argb: MUTED } };
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'Pagamento 1ª/P1', 'Data pagamento',
    'Saldo total PDDE', 'Referência saldo', 'Evidência', 'Contradição?',
    'Próxima ação', 'Fontes sugeridas', 'Observação',
  ]));

  for (const item of monitoring.rows.filter((row) => row.firstEvidence.needsSourceEscalation)) {
    const row = sheet.addRow([
      item.sme,
      item.name,
      item.inep,
      reais(item.first.paymentInformedCents),
      brDate(item.first.paymentInformedDate),
      reais(item.balance.totalCents),
      brDate(item.balance.referenceDate),
      pddeBasicEvidenceStateLabel(item.firstEvidence.state),
      item.firstEvidence.isContradiction ? 'Sim' : 'Não',
      nextAction(item.firstEvidence.state),
      suggestedSources(item.firstEvidence.state),
      item.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT'
        ? 'O saldo disponível é anterior ao pagamento; não interpretar zero como ausência de recurso.'
        : '',
    ]);
    if (item.firstEvidence.isContradiction) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    }
  }
  sheet.getColumn(4).numFmt = MONEY;
  sheet.getColumn(6).numFmt = MONEY;
  styleRows(sheet, 4);
  for (const index of [1, 3]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 18 }, { width: 16 },
    { width: 58 }, { width: 15 }, { width: 58 }, { width: 72 }, { width: 58 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'L3' };
}

export function applyManagerialWorkbookLayer(
  workbook: ExcelJS.Workbook,
  view: HumanFinancialPortfolioView,
): ExcelJS.Workbook {
  rebuildManagerialOverview(workbook, view);
  enrichPddeBasicSheet(workbook, view);
  buildGapSheet(workbook, view);
  return workbook;
}

export function buildManagerialHumanFinancialWorkbook(
  view: HumanFinancialPortfolioView,
  options: BuildHumanFinancialWorkbookOptions = {},
): ExcelJS.Workbook {
  return applyManagerialWorkbookLayer(buildHumanFinancialWorkbook(view, options), view);
}
