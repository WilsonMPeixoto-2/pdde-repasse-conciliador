import ExcelJS from 'exceljs';
import type {
  HumanFinancialPortfolioView,
  HumanFinancialSchoolView,
} from '../application/build-human-financial-view';
import { assertCurrentFiscalYear } from '../core/fiscal-scope';

const NAVY = '183B56';
const BLUE = '2F6F91';
const PALE = 'EAF2F6';
const PALE_GREEN = 'E7F4EC';
const PALE_YELLOW = 'FFF5DD';
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

function overview(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Visão Geral', { views: [{ state: 'frozen', ySplit: 2 }] });
  title(sheet, 'Plataforma de Inteligência Financeira das Verbas do PDDE/2026', 6);
  subtitle(sheet, `4ª Coordenadoria Regional de Educação · ${view.referenceLabel}`, 6);

  const installments = view.schools.flatMap((school) => (
    school.programs.flatMap((program) => program.installments)
  ));
  const accounts = view.schools.flatMap((school) => school.accounts);
  const movements = accounts.flatMap((account) => account.movements);
  const latestBalances = view.schools.map(latestSchoolPosition);

  sheet.addRow([]);
  header(sheet.addRow([
    'Unidades',
    'Contas acompanhadas',
    'Movimentações em 2026',
    'Previsto',
    'Pagamento informado',
    'Saldo informado mais recente',
  ]));
  const metrics = sheet.addRow([
    view.schools.length,
    accounts.length,
    movements.length,
    reais(installments.reduce((sum, item) => sum + item.programmedCents, 0)),
    reais(installments.reduce((sum, item) => sum + item.paymentInformedCents, 0)),
    reais(sumKnown(latestBalances.map((item) => item.cents))),
  ]);
  metrics.font = { bold: true, color: { argb: DARK }, size: 14 };
  metrics.alignment = { horizontal: 'center', vertical: 'middle' };
  metrics.height = 28;
  moneyColumns(sheet, [4, 5, 6]);

  sheet.addRow([]);
  const sourceTitle = sheet.addRow(['Como ler as informações']);
  sheet.mergeCells(sourceTitle.number, 1, sourceTitle.number, 6);
  sourceTitle.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
  sourceTitle.getCell(1).font = { bold: true, color: { argb: NAVY } };
  const notes: Array<[string, string]> = [
    ['PDDEInfo', 'Repasses informados, contas vinculadas, posição de saldo e aplicações e situação da prestação de contas.'],
    ['SIGEF', 'Movimentações da conta e créditos compatíveis localizados no extrato.'],
    ['Data de referência', 'O saldo corresponde à posição publicada para a data indicada e não representa automaticamente o saldo do dia da consulta.'],
    ['Aplicações', 'Fundos, poupança e RDB/CDB representam posição aplicada. O valor aplicado não deve ser interpretado como rendimento.'],
  ];
  for (const [label, text] of notes) {
    const row = sheet.addRow([label, text]);
    sheet.mergeCells(row.number, 2, row.number, 6);
    row.getCell(1).font = { bold: true, color: { argb: NAVY } };
    row.getCell(2).font = { color: { argb: DARK } };
    row.alignment = { vertical: 'top', wrapText: true };
  }
  sheet.columns = [
    { width: 21 }, { width: 24 }, { width: 24 }, { width: 21 }, { width: 22 }, { width: 25 },
  ];
}

function units(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
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

function transfers(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Repasses', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Repasses e parcelas · PDDE 2026', 10);
  subtitle(sheet, '“Pagamento informado” é o registro do PDDEInfo. A evidência de crédito é apresentada separadamente.', 10);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'Programa / ação', 'Parcela', 'Previsto',
    'Pagamento informado', 'Data da ordem', 'Conta', 'Situação do crédito', 'Crédito localizado',
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
          reais(installment.paymentInformedCents), brDate(installment.paymentOrderDate), safeText(account),
          safeText(installment.creditEvidence.status), reais(installment.creditEvidence.amountCents),
        ]);
      }
    }
  }
  moneyColumns(sheet, [5, 6, 10]);
  formatData(sheet);
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 38 }, { width: 17 }, { width: 18 },
    { width: 20 }, { width: 16 }, { width: 35 }, { width: 46 }, { width: 20 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'J3' };
}

function balances(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
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

function movements(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
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

function accounting(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
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

export function buildHumanFinancialWorkbook(view: HumanFinancialPortfolioView): ExcelJS.Workbook {
  assertCurrentFiscalYear(view.fiscalYear);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Inteligência Financeira PDDE | 4ª CRE';
  workbook.subject = 'Acompanhamento financeiro das verbas do PDDE/2026';
  workbook.created = new Date();
  workbook.calcProperties.fullCalcOnLoad = true;

  overview(workbook, view);
  units(workbook, view);
  transfers(workbook, view);
  balances(workbook, view);
  movements(workbook, view);
  accounting(workbook, view);
  return workbook;
}
