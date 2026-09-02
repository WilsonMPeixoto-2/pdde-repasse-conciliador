import ExcelJS from 'exceljs';
import type {
  HumanFinancialIndicator,
  HumanFinancialPortfolioView,
  HumanFinancialSchoolView,
} from '../application/build-human-financial-view';
import { assertCurrentFiscalYear } from '../core/fiscal-scope';
import {
  buildOverviewMetrics,
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
  view: HumanFinancialPortfolioView,
): Map<string, number> {
  title(sheet, 'Pendências e suspensões · PDDE 2026', 7);
  subtitle(sheet, 'Ocorrências publicadas pelas fontes e pontos de acompanhamento. Ausência de registro não é certificação de regularidade.', 7);
  header(sheet.addRow(['Situação', 'SME', 'Unidade escolar', 'INEP', 'Programa / conta', 'Detalhe', 'Fonte']));
  const firstRowBySchool = new Map<string, number>();

  const add = (
    school: HumanFinancialSchoolView,
    situation: string,
    context: string,
    detail: string,
    source: string,
  ) => {
    const row = sheet.addRow([
      safeText(situation),
      safeText(school.school.sme),
      safeText(school.school.name),
      safeText(school.school.inep),
      safeText(context),
      safeText(detail),
      safeText(source),
    ]);
    if (!firstRowBySchool.has(school.school.inep)) firstRowBySchool.set(school.school.inep, row.number);
  };

  const openingNeedsAttention = (status: string) => {
    const normalized = status.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    return Boolean(normalized) && !(
      normalized.includes('SEM PENDENCIA')
      || normalized.includes('REGULAR')
      || normalized.includes('CONCLUID')
      || normalized.includes('ABERTA')
      || normalized.includes('ATIVA')
    );
  };

  for (const school of view.schools) {
    const registrationText = [
      school.registration?.mandateStatus,
      school.registration?.registrationNote,
    ].filter(Boolean).join(' · ');
    const normalizedRegistration = registrationText.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    if (
      normalizedRegistration.includes('VENCID')
      || normalizedRegistration.includes('VENCER')
      || normalizedRegistration.includes('PENDENCIA')
      || normalizedRegistration.includes('DESATUALIZ')
    ) {
      add(school, 'Cadastro ou mandato', 'UEx', registrationText || 'Cadastro/mandato requer acompanhamento.', 'PDDEInfo · Cadastro');
    }

    for (const item of (school.suspensions ?? [])) {
      add(
        school,
        'Suspensão informada',
        [item.program, item.destination].filter(Boolean).join(' · '),
        [item.type, item.detail].filter(Boolean).join(' · '),
        'PDDEInfo · Suspensões',
      );
    }

    for (const item of (school.accountOpenings ?? []).filter((candidate) => openingNeedsAttention(candidate.status))) {
      add(
        school,
        'Abertura de conta',
        [item.program, item.bank, item.agency, item.account].filter(Boolean).join(' · '),
        item.status,
        'PDDEInfo · Abertura de Conta',
      );
    }

    for (const item of school.accounting.filter((candidate) => candidate.paymentSuspended)) {
      add(school, 'Pagamento suspenso', item.program, item.status || 'Suspensão informada.', 'PDDEInfo · Prestação de Contas');
    }

    school.followUp.forEach((message) => add(school, 'Outro ponto de acompanhamento', '', message, 'Conciliação / cobertura'));
  }

  const firstRows = new Map<string, number>();
  for (const indicator of view.indicators) {
    const row = indicator.units
      .map((unit) => firstRowBySchool.get(unit.inep))
      .find((value): value is number => value !== undefined);
    if (row) firstRows.set(indicator.label, row);
  }

  formatData(sheet);
  sheet.columns = [
    { width: 28 }, { width: 12 }, { width: 38 }, { width: 13 },
    { width: 34 }, { width: 58 }, { width: 28 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'G3' };
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
  const followUpTitle = sheet.addRow(['Pendências e acompanhamento']);
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
      ? internalLink(String(indicator.count), 'Pendências e Suspensões', targetRow)
      : indicator.count;
    row.getCell(3).value = targetRow
      ? internalLink('Ver unidades', 'Pendências e Suspensões', targetRow)
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
  const sheet = workbook.addWorksheet('Escolas', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Escolas · PDDE 2026', 13);
  subtitle(sheet, 'Visão resumida da carteira com cadastro, mandato, programas, contas, saldo e ocorrências.', 13);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Alunos', 'Localização',
    'Mandato', 'Programas', 'Contas', 'Pendências', 'Saldo informado', 'Posição do saldo',
  ]));
  for (const school of view.schools) {
    const position = latestSchoolPosition(school);
    const pending = (school.suspensions ?? []).length
      + (school.accountOpenings ?? []).filter((item) => !/SEM PENDENCIA|REGULAR|CONCLUID|ABERTA|ATIVA/i.test(item.status)).length
      + school.followUp.length
      + school.accounting.filter((item) => item.paymentSuspended).length;
    sheet.addRow([
      safeText(school.school.sme),
      safeText(school.school.name),
      safeText(school.school.inep),
      safeText(school.school.uex),
      safeText(school.school.cnpj),
      school.registration?.studentCount ?? null,
      safeText(school.registration?.location ?? ''),
      safeText(school.registration?.mandateStatus ?? ''),
      uniquePrograms(school).join(' · '),
      school.accounts.length,
      pending,
      reais(position.cents),
      brDate(position.date),
    ]);
  }
  moneyColumns(sheet, [12]);
  formatData(sheet);
  for (const index of [1, 3, 5]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 40 }, { width: 13 }, { width: 36 }, { width: 18 },
    { width: 10 }, { width: 15 }, { width: 25 }, { width: 34 }, { width: 10 },
    { width: 12 }, { width: 20 }, { width: 17 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'M3' };
}

function buildTransfers(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Repasses', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Repasses, custeio e capital · PDDE 2026', 25);
  subtitle(sheet, 'Programação, ajustes, pagamento informado, ordem FNDE e evidência de crédito permanecem separados por programa e parcela.', 25);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Programa / ação', 'Parcela',
    'Programado Custeio', 'Programado Capital', 'Ajuste Custeio', 'Ajuste Capital', 'Programado Final',
    'Pago Custeio', 'Pago Capital', 'Pagamento Informado', 'Data do pagamento', 'Ordem FNDE',
    'Banco', 'Agência', 'Conta', 'Situação do crédito', 'Data do crédito', 'Valor do crédito', 'Documento do crédito', 'Observação',
  ]));
  for (const school of view.schools) {
    for (const program of school.programs) {
      for (const installment of program.installments) {
        const b = installment.breakdown ?? null;
        sheet.addRow([
          safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
          safeText(school.school.uex), safeText(school.school.cnpj), safeText(program.name),
          safeText(installment.installment ?? 'Sem divisão'),
          reais(b?.programmedCusteioCents ?? null), reais(b?.programmedCapitalCents ?? null),
          reais(b?.adjustmentCusteioCents ?? null), reais(b?.adjustmentCapitalCents ?? null),
          reais(installment.programmedCents), reais(b?.paidCusteioCents ?? null), reais(b?.paidCapitalCents ?? null),
          reais(installment.paymentInformedCents), brDate(installment.paymentInformedDate), brDate(installment.paymentOrderDate),
          safeText(installment.account?.bank ?? ''), safeText(installment.account?.agency ?? ''), safeText(installment.account?.number ?? ''),
          safeText(installment.creditEvidence.status), brDate(installment.creditEvidence.date),
          reais(installment.creditEvidence.amountCents), safeText(installment.creditEvidence.document ?? ''),
          safeText(installment.note ?? ''),
        ]);
      }
    }
  }
  moneyColumns(sheet, [8, 9, 10, 11, 12, 13, 14, 15, 23]);
  formatData(sheet);
  for (const index of [1, 3, 5, 18, 19, 20, 24]) sheet.getColumn(index).numFmt = '@';
  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const paidCell = sheet.getCell(rowNumber, 15);
    paidCell.font = { bold: true, color: { argb: PAID_GREEN }, size: 10 };
    if (typeof paidCell.value === 'number' && paidCell.value > 0) {
      paidCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
    }
  }
  sheet.columns = [
    { width: 12 }, { width: 36 }, { width: 13 }, { width: 34 }, { width: 18 }, { width: 32 }, { width: 16 },
    { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 18 },
    { width: 16 }, { width: 16 }, { width: 20 }, { width: 17 }, { width: 15 },
    { width: 10 }, { width: 12 }, { width: 18 }, { width: 28 }, { width: 16 }, { width: 18 }, { width: 22 }, { width: 42 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'Y3' };
}

function buildBalances(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Contas e Saldos', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Contas, saldos, aplicações e abertura · PDDE 2026', 19);
  subtitle(sheet, 'Identidade da escola e da conta, situação de abertura, ocorrência e composição financeira permanecem na mesma linha.', 19);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Programa', 'Banco', 'Agência', 'Conta',
    'Situação de abertura', 'Ocorrência', 'Saldo em conta', 'Fundos', 'Poupança', 'RDB/CDB',
    'Aplicações', 'Saldo total informado', 'Posição', 'Observação',
  ]));
  for (const school of view.schools) {
    for (const account of school.accounts) {
      const position = account.latestPosition;
      const openings = school.accountOpenings ?? [];
      const opening = openings
        .filter((item) => !item.program || account.program.toUpperCase().includes(item.program.toUpperCase()) || item.program.toUpperCase().includes(account.program.toUpperCase()))
        .map((item) => item.status)
        .join(' · ');
      sheet.addRow([
        safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
        safeText(school.school.uex), safeText(school.school.cnpj), safeText(account.program),
        safeText(account.bank), safeText(account.agency), safeText(account.account),
        safeText(opening), safeText(account.occurrence ?? ''),
        reais(position?.checkingBalanceCents ?? null), reais(position?.applications.fundsCents ?? null),
        reais(position?.applications.savingsCents ?? null), reais(position?.applications.rdbCdbCents ?? null),
        reais(position?.applications.totalCents ?? null), reais(position?.totalReportedBalanceCents ?? null),
        brDate(position?.referenceDate ?? null), safeText(account.note ?? ''),
      ]);
    }
  }
  moneyColumns(sheet, [12, 13, 14, 15, 16, 17]);
  formatData(sheet);
  for (const index of [1, 3, 5, 7, 8, 9]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 36 }, { width: 13 }, { width: 34 }, { width: 18 }, { width: 28 },
    { width: 10 }, { width: 12 }, { width: 18 }, { width: 32 }, { width: 34 },
    { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 22 }, { width: 16 }, { width: 42 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'S3' };
}

function buildMonthlyHistory(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Evolução Mensal', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Evolução das posições financeiras · 2026', 17);
  subtitle(sheet, 'Uma linha por escola, conta e data de referência. Meses sem posição permanecem ausentes e não são preenchidos com zero.', 17);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'CNPJ', 'Programa', 'Banco', 'Agência', 'Conta', 'Referência',
    'Saldo em conta', 'Fundos', 'Poupança', 'RDB/CDB', 'Aplicações', 'Saldo total', 'Ocorrência', 'Observação',
  ]));
  for (const school of view.schools) {
    for (const account of school.accounts) {
      for (const position of account.positions) {
        sheet.addRow([
          safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep), safeText(school.school.cnpj),
          safeText(account.program), safeText(account.bank), safeText(account.agency), safeText(account.account),
          brDate(position.referenceDate), reais(position.checkingBalanceCents), reais(position.applications.fundsCents),
          reais(position.applications.savingsCents), reais(position.applications.rdbCdbCents),
          reais(position.applications.totalCents), reais(position.totalReportedBalanceCents),
          safeText(account.occurrence ?? ''), safeText(account.note ?? ''),
        ]);
      }
    }
  }
  moneyColumns(sheet, [10, 11, 12, 13, 14, 15]);
  formatData(sheet);
  for (const index of [1, 3, 4, 6, 7, 8]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 36 }, { width: 13 }, { width: 18 }, { width: 28 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 16 },
    { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 }, { width: 32 }, { width: 42 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'Q3' };
}

function buildMovements(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Movimentações', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Movimentações financeiras · 2026', 19);
  subtitle(sheet, 'Histórico original, documento, conta e contraparte são preservados; a categoria continua apenas auxiliar.', 19);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'CNPJ', 'Programa', 'Banco', 'Agência', 'Conta', 'Data', 'Categoria',
    'Histórico original', 'Documento', 'Contraparte', 'CPF/CNPJ contraparte', 'Banco contraparte',
    'Agência contraparte', 'Conta contraparte', 'Crédito', 'Débito',
  ]));
  for (const school of view.schools) {
    for (const account of school.accounts) {
      for (const movement of account.movements) {
        sheet.addRow([
          safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep), safeText(school.school.cnpj),
          safeText(account.program), safeText(account.bank), safeText(account.agency), safeText(account.account),
          brDate(movement.date), safeText(movement.category ?? ''), safeText(movement.description),
          safeText(movement.document ?? ''), safeText(movement.counterparty?.name ?? ''),
          safeText(movement.counterparty?.document ?? ''), safeText(movement.counterparty?.bank ?? ''),
          safeText(movement.counterparty?.agency ?? ''), safeText(movement.counterparty?.account ?? ''),
          reais(movement.creditCents), reais(movement.debitCents),
        ]);
      }
    }
  }
  moneyColumns(sheet, [18, 19]);
  formatData(sheet);
  for (const index of [1, 3, 4, 6, 7, 8, 12, 14, 15, 16, 17]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 36 }, { width: 13 }, { width: 18 }, { width: 28 }, { width: 10 }, { width: 12 }, { width: 18 }, { width: 15 }, { width: 25 },
    { width: 48 }, { width: 24 }, { width: 34 }, { width: 20 }, { width: 14 }, { width: 16 }, { width: 20 }, { width: 18 }, { width: 18 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'S3' };
}

function buildRegistration(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Cadastro e Habilitação', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Cadastro e habilitação das UEx · PDDE 2026', 17);
  subtitle(sheet, 'Cadastro, mandato e notas textuais são preservados como publicados pelo FNDE.', 17);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Alunos', 'Localização', 'Rede',
    'Mandato', 'Início mandato', 'Fim mandato', 'Atualização', 'Telefone',
    'Dados cadastrais', 'Prestação UEx', 'Adesão EEx', 'Prestação EEx',
  ]));
  for (const school of view.schools) {
    const r = school.registration;
    sheet.addRow([
      safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
      safeText(school.school.uex), safeText(school.school.cnpj), r?.studentCount ?? null,
      safeText(r?.location ?? ''), safeText(r?.network ?? ''), safeText(r?.mandateStatus ?? ''),
      brDate(r?.mandateStartDate ?? null), brDate(r?.mandateEndDate ?? null), brDate(r?.updatedDate ?? null),
      safeText(r?.phone ?? ''), safeText(r?.registrationNote ?? ''), safeText(r?.uexAccountingNote ?? ''),
      safeText(r?.eexAdhesionNote ?? ''), safeText(r?.eexAccountingNote ?? ''),
    ]);
  }
  formatData(sheet);
  sheet.columns = [
    { width: 12 }, { width: 36 }, { width: 13 }, { width: 36 }, { width: 18 }, { width: 10 },
    { width: 15 }, { width: 24 }, { width: 26 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 18 },
    { width: 58 }, { width: 58 }, { width: 58 }, { width: 58 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'Q3' };
}

function buildAccounting(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Prestação de Contas', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Situação da prestação de contas · 2026', 11);
  subtitle(sheet, 'Situação informada por programa, com suspensão e seus motivos preservados separadamente.', 11);
  header(sheet.addRow([
    'SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Programa', 'Situação',
    'Pagamento suspenso', 'Motivo(s) de suspensão', 'Detalhe(s) da suspensão', 'Valor previsto',
  ]));
  for (const school of view.schools) {
    for (const item of school.accounting) {
      const suspensions = (school.suspensions ?? []).filter((suspension) => !suspension.program || suspension.program === item.program);
      const reasons = suspensions.map((suspension) => suspension.type).join(' · ');
      const details = suspensions.map((suspension) => suspension.detail).filter(Boolean).join(' · ');
      const row = sheet.addRow([
        safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
        safeText(school.school.uex), safeText(school.school.cnpj), safeText(item.program), safeText(item.status),
        item.paymentSuspended ? 'Sim' : 'Não', safeText(reasons), safeText(details), reais(item.expectedTotalCents),
      ]);
      if (item.paymentSuspended) row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    }
  }
  moneyColumns(sheet, [11]);
  formatData(sheet);
  for (const index of [1, 3, 5]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 13 }, { width: 34 }, { width: 18 }, { width: 28 },
    { width: 34 }, { width: 19 }, { width: 42 }, { width: 52 }, { width: 20 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'K3' };
}

function buildCoverage(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.addWorksheet('Cobertura das Fontes', { views: [{ state: 'frozen', ySplit: 3 }] });
  title(sheet, 'Cobertura das fontes · PDDE 2026', 9);
  subtitle(sheet, 'Distingue dado disponível, consulta sem registro, cobertura parcial e fonte indisponível por escola.', 9);
  header(sheet.addRow(['SME', 'Unidade escolar', 'INEP', 'UEx', 'CNPJ', 'Fonte / conjunto', 'Cobertura', 'Detalhe', 'Referência geral']));
  for (const school of view.schools) {
    for (const item of (school.sourceCoverage ?? [])) {
      const label = item.status === 'AVAILABLE'
        ? 'Disponível'
        : item.status === 'EMPTY'
          ? 'Sem registro'
          : item.status === 'PARTIAL'
            ? 'Parcial'
            : 'Indisponível';
      sheet.addRow([
        safeText(school.school.sme), safeText(school.school.name), safeText(school.school.inep),
        safeText(school.school.uex), safeText(school.school.cnpj),
        safeText(item.dataset), label, safeText(item.detail ?? ''), safeText(view.referenceLabel),
      ]);
    }
  }
  formatData(sheet);
  for (const index of [1, 3, 5]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 38 }, { width: 13 }, { width: 34 }, { width: 18 },
    { width: 36 }, { width: 18 }, { width: 62 }, { width: 46 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'I3' };
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
  buildUnits(workbook, view);
  buildTransfers(workbook, view);
  buildBalances(workbook, view);
  buildMonthlyHistory(workbook, view);
  buildMovements(workbook, view);
  buildRegistration(workbook, view);
  const followUpSheet = workbook.addWorksheet('Pendências e Suspensões', { views: [{ state: 'frozen', ySplit: 3 }] });
  const indicatorRows = buildFollowUp(followUpSheet, view);
  buildAccounting(workbook, view);
  buildCoverage(workbook, view);
  buildOverview(overviewSheet, view, indicatorRows, generatedAt);
  return workbook;
}
