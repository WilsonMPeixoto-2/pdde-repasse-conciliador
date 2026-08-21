import ExcelJS from 'exceljs';
import type {
  HumanFinancialIndicator,
  HumanFinancialPortfolioView,
  HumanFinancialSchoolView,
} from '../application/build-human-financial-view';
import { assertCurrentFiscalYear } from '../core/fiscal-scope';
import {
  buildOverviewMetrics,
  consolidateIndicatorRows,
  formatGeneratedAt,
} from './human-financial-workbook-model';

const NAVY = '183B56';
const BLUE = '2F6F91';
const PALE = 'EAF2F6';
const PALE_GREEN = 'E7F4EC';
const PALE_YELLOW = 'FFF5DD';
const PAID_GREEN = '18724B';
const WHITE = 'FFFFFF';
const DARK = '203746';
const MUTED = '617784';
const BORDER = 'D8E2E8';
const MONEY = 'R$ #,##0.00';

function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

function brDate(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'string' ? value : String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function sumKnown(values: readonly (number | null)[]): number | null {
  if (values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value as number), 0);
}

function title(sheet: ExcelJS.Worksheet, text: string, lastColumn: number): void {
  sheet.mergeCells(1, 1, 1, lastColumn);
  const cell = sheet.getCell(1, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  cell.font = { bold: true, color: { argb: WHITE }, size: 16 };
  cell.alignment = { vertical: 'middle' };
  sheet.getRow(1).height = 32;
}

function subtitle(sheet: ExcelJS.Worksheet, text: string, lastColumn: number): void {
  sheet.mergeCells(2, 1, 2, lastColumn);
  const cell = sheet.getCell(2, 1);
  cell.value = text;
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  cell.font = { color: { argb: MUTED }, size: 10 };
  cell.alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 28;
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

function formatData(sheet: ExcelJS.Worksheet, startRow = 4): void {
  for (let rowNumber = startRow; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      cell.font = { color: { argb: DARK }, size: 10 };
      cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
    });
  }
}

function moneyColumns(sheet: ExcelJS.Worksheet, columns: readonly number[]): void {
  for (const column of columns) sheet.getColumn(column).numFmt = MONEY;
}

function internalLink(text: string, sheetName: string, row = 1): ExcelJS.CellHyperlinkValue {
  return { text, hyperlink: `#'${sheetName}'!A${row}` };
}

function uniquePrograms(school: HumanFinancialSchoolView): string[] {
  return [...new Set(school.programs.map((program) => program.name))]
    .sort((left, right) => left.localeCompare(right, 'pt-BR'));
}

function latestSchoolPosition(
  school: HumanFinancialSchoolView,
): { cents: number | null; date: string | null } {
  const positions = school.accounts
    .map((account) => account.latestPosition)
    .filter((position): position is NonNullable<typeof position> => position !== null)
    .sort((left, right) => right.referenceDate.localeCompare(left.referenceDate));
  if (positions.length === 0) return { cents: null, date: null };
  const latestDate = positions[0].referenceDate;
  const latest = positions.filter((position) => position.referenceDate === latestDate);
  return {
    cents: sumKnown(latest.map((position) => position.totalReportedBalanceCents)),
    date: latestDate,
  };
}

function buildFollowUp(
  sheet: ExcelJS.Worksheet,
  indicators: readonly HumanFinancialIndicator[],
): Map<string, number> {
  title(sheet, 'Acompanhamento · listas nominais', 4);
  subtitle(sheet, 'Cada unidade aparece uma única vez. Quando houver mais de uma situação, elas são apresentadas juntas.', 4);
  header(sheet.addRow(['Situações', 'SME', 'Unidade escolar', 'INEP']));
  const firstRows = new Map<string, number>();
  for (const item of consolidateIndicatorRows(indicators)) {
    const row = sheet.addRow([
      safeText(item.situations.join(' · ')),
      safeText(item.sme),
      safeText(item.name),
      safeText(item.inep),
    ]);
    for (const situation of item.situations) {
      if (!firstRows.has(situation)) firstRows.set(situation, row.number);
    }
  }
  formatData(sheet);
  sheet.columns = [
    { width: 42 }, { width: 12 }, { width: 42 }, { width: 13 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'D3' };
  return firstRows;
}

function buildOverview(
  sheet: ExcelJS.Worksheet,
  view: HumanFinancialPortfolioView,
  indicatorRows: ReadonlyMap<string, number>,
  generatedAt: Date,
): void {
  const overviewMetrics = buildOverviewMetrics(view);
  const lastColumn = overviewMetrics.length;
  title(sheet, 'Plataforma de Inteligência Financeira das Verbas do PDDE/2026', lastColumn);
  subtitle(
    sheet,
    `4ª Coordenadoria Regional de Educação · ${view.referenceLabel} · Arquivo gerado em ${formatGeneratedAt(generatedAt)}`,
    lastColumn,
  );

  sheet.addRow([]);
  const metricHeader = sheet.addRow(overviewMetrics.map((metric) => (
    internalLink(metric.label, metric.targetSheet)
  )));
  header(metricHeader);
  const metrics = sheet.addRow(overviewMetrics.map((metric) => metric.value));
  metrics.font = { bold: true, color: { argb: DARK }, size: 14 };
  metrics.alignment = { horizontal: 'center', vertical: 'middle' };
  metrics.height = 28;
  moneyColumns(sheet, overviewMetrics.flatMap((metric, index) => (
    metric.monetary ? [index + 1] : []
  )));
  const accentColumn = overviewMetrics.findIndex((metric) => metric.accent) + 1;
  if (accentColumn > 0) {
    metrics.getCell(accentColumn).font = { bold: true, color: { argb: PAID_GREEN }, size: 14 };
  }

  sheet.addRow([]);
  const followUpTitle = sheet.addRow(['Acompanhamento']);
  sheet.mergeCells(followUpTitle.number, 1, followUpTitle.number, lastColumn);
  followUpTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
  followUpTitle.getCell(1).font = { bold: true, color: { argb: NAVY }, size: 11 };
  const followUpHeader = sheet.addRow(['Situação', 'Unidades', 'Abrir lista']);
  sheet.mergeCells(followUpHeader.number, 3, followUpHeader.number, lastColumn);
  header(followUpHeader);
  for (const indicator of view.indicators) {
    const row = sheet.addRow([indicator.label, indicator.count]);
    sheet.mergeCells(row.number, 3, row.number, lastColumn);
    const targetRow = indicatorRows.get(indicator.label);
    row.getCell(2).value = targetRow
      ? internalLink(String(indicator.count), 'Acompanhamento', targetRow)
      : indicator.count;
    row.getCell(3).value = targetRow
      ? internalLink('Ver unidades', 'Acompanhamento', targetRow)
      : 'Nenhuma unidade';
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell(1).font = { color: { argb: DARK } };
    row.getCell(2).font = { bold: true, color: { argb: NAVY } };
    row.getCell(3).font = { color: { argb: BLUE }, underline: Boolean(targetRow) };
  }

  sheet.addRow([]);
  const sourceTitle = sheet.addRow(['Como ler as informações']);
  sheet.mergeCells(sourceTitle.number, 1, sourceTitle.number, lastColumn);
  sourceTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sourceTitle.getCell(1).font = { bold: true, color: { argb: NAVY } };
  const notes: Array<[string, string]> = [
    ['PDDEInfo', 'Repasses informados, contas vinculadas, posição de saldo e aplicações e situação da prestação de contas.'],
    ['SIGEF', 'Movimentações da conta e créditos compatíveis localizados no extrato.'],
    ['Data de referência', 'O saldo corresponde à posição publicada para a data indicada e não representa automaticamente o saldo do dia da consulta.'],
    ['Aplicações', 'Fundos, poupança e RDB/CDB representam posição aplicada. O valor aplicado não deve ser interpretado como rendimento.'],
  ];
  for (const [label, text] of notes) {
    const row = sheet.addRow([label, text]);
    sheet.mergeCells(row.number, 2, row.number, lastColumn);
    row.getCell(1).font = { bold: true, color: { argb: NAVY } };
    row.getCell(2).font = { color: { argb: DARK } };
    row.alignment = { vertical: 'top', wrapText: true };
  }
  sheet.columns = [
    { width: 27 }, { width: 18 }, { width: 18 }, { width: 19 }, { width: 21 }, { width: 24 }, { width: 24 },
  ];
}

function buildUnits(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Unidades', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Unidades escolares · PDDE 2026', 9);
  subtitle(sheet, 'Visão resumida da carteira. Use as demais abas para detalhar repasses, contas e movimentações.', 9);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Programas', 'Contas',
    'Saldo informado', 'Posição do saldo',
  ]));
  for (const school of view.schools) {
    const position = latestSchoolPosition(school);
    sheet.addRow([
      safeText(school.school.sme),
      safeText(school.school.name),
      safeText(school.school.inep),
      safeText(school.school.uex),
      safeText(school.school.cnpj),
      uniquePrograms(school).join(' · '),
      school.accounts.length,
      reais(position.cents),
      brDate(position.date),
    ]);
  }
  moneyColumns(sheet, [8]);
  formatData(sheet);
  for (const index of [1, 3, 5]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 42 }, { width: 13 }, { width: 38 }, { width: 18 },
    { width: 34 }, { width: 10 }, { width: 20 }, { width: 17 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'I3' };
}

function buildTransfers(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Repasses', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Repasses e parcelas · PDDE 2026', 10);
  subtitle(sheet, '“Pagamento informado” é o registro do PDDEInfo. A evidência de crédito é apresentada separadamente.', 10);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'Programa / ação', 'Parcela', 'Previsto',
    'Pagamento informado', 'Data do pagamento', 'Ordem FNDE', 'Conta', 'Situação do crédito',
  ]));
  for (const school of view.schools) {
    for (const program of school.programs) {
      for (const installment of program.installments) {
        const account = installment.account
          ? `Banco ${installment.account.bank} · Ag. ${installment.account.agency} · Conta ${installment.account.number}`
          : '';
        sheet.addRow([
          safeText(school.school.sme), safeText(school.school.name), safeText(program.name),
          safeText(installment.installment ?? 'Sem divisão'), reais(installment.programmedCents),
          reais(installment.paymentInformedCents), brDate(installment.paymentInformedDate),
          brDate(installment.paymentOrderDate), safeText(account),
          safeText(installment.creditEvidence.status),
        ]);
      }
    }
  }
  moneyColumns(sheet, [5, 6]);
  formatData(sheet);
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const paidCell = sheet.getCell(rowNumber, 6);
    paidCell.font = { bold: true, color: { argb: PAID_GREEN }, size: 10 };
    const paid = paidCell.value;
    if (typeof paid === 'number' && paid > 0) {
      paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
    }
  }
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 34 }, { width: 17 }, { width: 18 },
    { width: 20 }, { width: 17 }, { width: 15 }, { width: 32 }, { width: 24 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'J3' };
}

function buildBalances(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Contas e Saldos', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Contas, saldos e aplicações · PDDE 2026', 10);
  subtitle(sheet, 'Os valores de aplicação representam posição financeira na data indicada, não rendimento acumulado.', 10);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'Programa', 'Banco', 'Agência', 'Conta',
    'Saldo em conta', 'Aplicações', 'Saldo total informado', 'Posição',
  ]));
  for (const school of view.schools) {
    for (const account of school.accounts) {
      const position = account.latestPosition;
      sheet.addRow([
        safeText(school.school.sme), safeText(school.school.name), safeText(account.program),
        safeText(account.bank), safeText(account.agency), safeText(account.account),
        reais(position?.checkingBalanceCents ?? null),
        reais(position?.applications.totalCents ?? null),
        reais(position?.totalReportedBalanceCents ?? null),
        brDate(position?.referenceDate ?? null),
      ]);
    }
  }
  moneyColumns(sheet, [7, 8, 9]);
  formatData(sheet);
  for (const index of [1, 4, 5, 6]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 30 }, { width: 10 }, { width: 12 },
    { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 16 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'J3' };
}

function buildMovements(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Movimentações', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Movimentações financeiras · 2026', 9);
  subtitle(sheet, 'Extrato organizado para leitura. As categorias são auxiliares e não representam juízo automático de regularidade.', 9);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'Programa', 'Conta', 'Data', 'Categoria', 'Descrição', 'Crédito', 'Débito',
  ]));
  for (const school of view.schools) {
    for (const account of school.accounts) {
      for (const movement of account.movements) {
        sheet.addRow([
          safeText(school.school.sme), safeText(school.school.name), safeText(account.program),
          safeText(account.account), brDate(movement.date), safeText(movement.category ?? ''),
          safeText(movement.description), reais(movement.creditCents), reais(movement.debitCents),
        ]);
      }
    }
  }
  moneyColumns(sheet, [8, 9]);
  formatData(sheet);
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 28 }, { width: 18 }, { width: 15 },
    { width: 26 }, { width: 52 }, { width: 18 }, { width: 18 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'I3' };
}

function buildAccounting(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Prestação de Contas', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Situação da prestação de contas · 2026', 7);
  subtitle(sheet, 'Situação informada na fonte pública na data da coleta. Cada programa é acompanhado separadamente.', 7);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'Programa', 'Situação', 'Pagamento suspenso', 'Valor previsto',
  ]));
  for (const school of view.schools) {
    for (const item of school.accounting) {
      const row = sheet.addRow([
        safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
        safeText(item.program), safeText(item.status), item.paymentSuspended ? 'Sim' : 'Não',
        reais(item.expectedTotalCents),
      ]);
      if (item.paymentSuspended) {
        row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
      }
    }
  }
  moneyColumns(sheet, [7]);
  formatData(sheet);
  sheet.columns = [
    { width: 12 }, { width: 40 }, { width: 13 }, { width: 30 }, { width: 34 }, { width: 19 }, { width: 20 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'G3' };
}

export interface BuildHumanFinancialWorkbookOptions {
  generatedAt?: Date;
}

export function buildHumanFinancialWorkbook(
  view: HumanFinancialPortfolioView,
  options: BuildHumanFinancialWorkbookOptions = {},
): ExcelJS.Workbook {
  assertCurrentFiscalYear(view.fiscalYear);
  const generatedAt = options.generatedAt ?? new Date();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Inteligência Financeira PDDE | 4ª CRE';
  workbook.subject = 'Acompanhamento financeiro das verbas do PDDE/2026';
  workbook.created = generatedAt;
  workbook.modified = generatedAt;
  workbook.calcProperties.fullCalcOnLoad = true;

  const overviewSheet = workbook.addWorksheet('Visão Geral', { views: [{ state: 'frozen', ySplit: 2 }] });
  const followUpSheet = workbook.addWorksheet('Acompanhamento', { views: [{ state: 'frozen', ySplit: 3 }] });
  const indicatorRows = buildFollowUp(followUpSheet, view.indicators);
  buildOverview(overviewSheet, view, indicatorRows, generatedAt);
  buildUnits(workbook, view);
  buildTransfers(workbook, view);
  buildBalances(workbook, view);
  buildMovements(workbook, view);
  buildAccounting(workbook, view);
  return workbook;
}
