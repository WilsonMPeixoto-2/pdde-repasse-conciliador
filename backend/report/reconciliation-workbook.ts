import ExcelJS from 'exceljs';
import type {
  PortfolioReconciliationResult,
  PortfolioRow,
} from '../core/portfolio-reconciliation';
import { RECONCILIATION_STATUS_LABELS, type ReconciliationStatus } from '../core/types';

export interface ReconciliationWorkbookInput {
  portfolio: PortfolioReconciliationResult;
  generatedAt: string;
  title?: string;
}

interface ReportColumn {
  key: string;
  header: string;
  width: number;
  kind?: 'currency' | 'date' | 'identifier' | 'long-text';
}

const COLUMNS: ReportColumn[] = [
  { key: 'inep', header: 'INEP', width: 13, kind: 'identifier' },
  { key: 'sme', header: 'SME', width: 12, kind: 'identifier' },
  { key: 'school', header: 'Unidade escolar', width: 36, kind: 'long-text' },
  { key: 'uex', header: 'UEx', width: 38, kind: 'long-text' },
  { key: 'cnpj', header: 'CNPJ', width: 18, kind: 'identifier' },
  { key: 'fiscalYear', header: 'Exercício', width: 11 },
  { key: 'programCode', header: 'Código programa', width: 15, kind: 'identifier' },
  { key: 'programName', header: 'Programa', width: 22 },
  { key: 'actionCode', header: 'Código ação', width: 18, kind: 'identifier' },
  { key: 'actionName', header: 'Ação', width: 30, kind: 'long-text' },
  { key: 'installmentCode', header: 'Código parcela', width: 15, kind: 'identifier' },
  { key: 'installmentLabel', header: 'Parcela', width: 17 },
  { key: 'amountOriginalDue', header: 'Valor original devido', width: 20, kind: 'currency' },
  { key: 'adjustment', header: 'Ajuste', width: 15, kind: 'currency' },
  { key: 'amountFinalDue', header: 'Valor final devido', width: 19, kind: 'currency' },
  { key: 'amountPaidPddeInfo', header: 'Valor pago PDDEInfo', width: 20, kind: 'currency' },
  { key: 'paymentDatePddeInfo', header: 'Data pagamento PDDEInfo', width: 20, kind: 'date' },
  { key: 'pddeBank', header: 'Banco PDDEInfo', width: 17, kind: 'identifier' },
  { key: 'pddeAgency', header: 'Agência PDDEInfo', width: 18, kind: 'identifier' },
  { key: 'pddeAccount', header: 'Conta PDDEInfo', width: 20, kind: 'identifier' },
  { key: 'releaseAmount', header: 'Valor liberação SIGEF', width: 21, kind: 'currency' },
  { key: 'releaseDate', header: 'Data liberação SIGEF', width: 20, kind: 'date' },
  { key: 'orderBank', header: 'Ordem bancária', width: 18, kind: 'identifier' },
  { key: 'releaseBank', header: 'Banco liberação SIGEF', width: 21, kind: 'identifier' },
  { key: 'releaseAgency', header: 'Agência liberação SIGEF', width: 22, kind: 'identifier' },
  { key: 'releaseAccount', header: 'Conta liberação SIGEF', width: 23, kind: 'identifier' },
  { key: 'rawSigefProgram', header: 'Programa bruto SIGEF', width: 42, kind: 'long-text' },
  { key: 'movementCount', header: 'Qtd. créditos localizados', width: 23 },
  { key: 'movementTotal', header: 'Valor créditos localizados', width: 23, kind: 'currency' },
  { key: 'movementDates', header: 'Datas dos créditos', width: 24, kind: 'long-text' },
  { key: 'movementDocuments', header: 'Documentos dos créditos', width: 28, kind: 'long-text' },
  { key: 'movementHistories', header: 'Históricos dos créditos', width: 34, kind: 'long-text' },
  { key: 'effectiveBank', header: 'Banco efetivo', width: 15, kind: 'identifier' },
  { key: 'effectiveAgency', header: 'Agência efetiva', width: 16, kind: 'identifier' },
  { key: 'effectiveAccount', header: 'Conta efetiva', width: 19, kind: 'identifier' },
  { key: 'accountSource', header: 'Origem da conta', width: 22 },
  { key: 'accountCorrespondence', header: 'Correspondência da conta', width: 25 },
  { key: 'status', header: 'Status', width: 42, kind: 'long-text' },
  { key: 'reasonCode', header: 'Código do motivo', width: 35, kind: 'identifier' },
  { key: 'reason', header: 'Motivo', width: 55, kind: 'long-text' },
  { key: 'humanReview', header: 'Revisão humana', width: 17 },
  { key: 'differences', header: 'Diferenças', width: 55, kind: 'long-text' },
  { key: 'pddeQueriedAt', header: 'PDDEInfo consultado em', width: 27 },
  { key: 'releasesQueriedAt', header: 'Liberações consultadas em', width: 27 },
  { key: 'movementsQueriedAt', header: 'Movimentações consultadas em', width: 29 },
  { key: 'pddeCoverage', header: 'Cobertura PDDEInfo até', width: 22, kind: 'date' },
  { key: 'releasesCoverage', header: 'Cobertura liberações até', width: 23, kind: 'date' },
  { key: 'movementsCoverage', header: 'Cobertura movimentações até', width: 26, kind: 'date' },
  { key: 'pddeUrl', header: 'URL PDDEInfo', width: 45, kind: 'long-text' },
  { key: 'releaseUrl', header: 'URL liberação SIGEF', width: 45, kind: 'long-text' },
  { key: 'paymentId', header: 'ID pagamento', width: 30, kind: 'identifier' },
  { key: 'releaseId', header: 'ID liberação', width: 30, kind: 'identifier' },
  { key: 'movementIds', header: 'IDs movimentos', width: 42, kind: 'long-text' },
];

export const RECONCILIATION_WORKBOOK_HEADERS = COLUMNS.map((column) => column.header);

const COLORS = {
  navy: '17365D',
  white: 'FFFFFF',
  text: '1F2937',
  border: 'CBD5E1',
  stripe: 'F8FAFC',
  confirmed: 'D1FAE5',
  confirmedText: '065F46',
  warning: 'FEF3C7',
  warningText: '92400E',
  divergent: 'FEE2E2',
  divergentText: '991B1B',
  inconclusive: 'EDE9FE',
  inconclusiveText: '5B21B6',
  noPayment: 'E2E8F0',
  noPaymentText: '334155',
} as const;

type CellRecord = Record<string, ExcelJS.CellValue>;

function dateCell(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T12:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) throw new Error(`Data inválida no relatório: ${value}`);
  return date;
}

function safeText(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const clean = value.replace(/\u0000/g, '');
  return /^[\u0001-\u0020]*[=+\-@]/u.test(clean) ? `'${clean}` : clean;
}

function money(cents: number | null | undefined): number | null {
  return cents === null || cents === undefined ? null : cents / 100;
}

function joined(values: string[]): string | null {
  return safeText(values.join(' | '));
}

function differencesText(row: PortfolioRow): string | null {
  return joined(row.reconciliation.differences.map((difference) => (
    `${difference.field}: PDDEInfo=${String(difference.pddeInfo ?? 'vazio')}; `
      + `SIGEF=${String(difference.sigef ?? 'vazio')}; ${difference.detail}`
  )));
}

function reportRecord(row: PortfolioRow): CellRecord {
  const { payment, matchedRelease, matchedMovements, accountResolution, reconciliation, sources } = row;
  return {
    inep: safeText(payment.school.inep),
    sme: safeText(payment.school.sme),
    school: safeText(payment.school.name),
    uex: safeText(payment.school.uex),
    cnpj: safeText(payment.school.cnpj),
    fiscalYear: payment.fiscalYear,
    programCode: safeText(payment.programCode),
    programName: safeText(payment.programName),
    actionCode: safeText(payment.actionCode),
    actionName: safeText(payment.actionName),
    installmentCode: safeText(payment.installmentCode),
    installmentLabel: safeText(payment.installmentLabel),
    amountOriginalDue: money(payment.amountOriginalDueCents),
    adjustment: money(payment.adjustmentCents),
    amountFinalDue: money(payment.amountFinalDueCents),
    amountPaidPddeInfo: money(payment.amountPaidCents),
    paymentDatePddeInfo: dateCell(payment.paymentDate),
    pddeBank: safeText(payment.account?.bank),
    pddeAgency: safeText(payment.account?.agency),
    pddeAccount: safeText(payment.account?.number),
    releaseAmount: money(matchedRelease?.amountCents),
    releaseDate: dateCell(matchedRelease?.paymentDate),
    orderBank: safeText(matchedRelease?.orderBank),
    releaseBank: safeText(matchedRelease?.destinationAccount.bank),
    releaseAgency: safeText(matchedRelease?.destinationAccount.agency),
    releaseAccount: safeText(matchedRelease?.destinationAccount.number),
    rawSigefProgram: safeText(matchedRelease?.sourceReference.rawProgram),
    movementCount: matchedMovements.length,
    movementTotal: money(reconciliation.movementTotalCents),
    movementDates: joined(matchedMovements.map((movement) => movement.movementDate)),
    movementDocuments: joined(matchedMovements.map((movement) => movement.document)),
    movementHistories: joined(matchedMovements.map((movement) => movement.history)),
    effectiveBank: safeText(accountResolution.effectiveAccount?.bank),
    effectiveAgency: safeText(accountResolution.effectiveAccount?.agency),
    effectiveAccount: safeText(accountResolution.effectiveAccount?.number),
    accountSource: safeText(accountResolution.source),
    accountCorrespondence: safeText(accountResolution.correspondence),
    status: safeText(reconciliation.statusLabel),
    reasonCode: safeText(reconciliation.reasonCode),
    reason: safeText(reconciliation.reason),
    humanReview: reconciliation.requiresHumanReview ? 'SIM' : 'NÃO',
    differences: differencesText(row),
    pddeQueriedAt: safeText(sources.pddeInfo.queriedAt),
    releasesQueriedAt: safeText(sources.sigefReleases.queriedAt),
    movementsQueriedAt: safeText(sources.sigefMovements.queriedAt),
    pddeCoverage: dateCell(sources.pddeInfo.coverageThrough),
    releasesCoverage: dateCell(sources.sigefReleases.coverageThrough),
    movementsCoverage: dateCell(sources.sigefMovements.coverageThrough),
    pddeUrl: safeText(payment.sourceReference.url),
    releaseUrl: safeText(matchedRelease?.sourceReference.url),
    paymentId: safeText(payment.id),
    releaseId: safeText(matchedRelease?.id),
    movementIds: joined(reconciliation.matchedMovementIds),
  };
}

function fill(color: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function border(): Partial<ExcelJS.Borders> {
  const side: ExcelJS.Border = { style: 'thin', color: { argb: COLORS.border } };
  return { top: side, left: side, bottom: side, right: side };
}

function statusColors(status: ReconciliationStatus): { background: string; foreground: string } {
  if (status === 'REPASSE_CONFIRMADO') {
    return { background: COLORS.confirmed, foreground: COLORS.confirmedText };
  }
  if (status === 'DIVERGENCIA_REVISAO_NECESSARIA') {
    return { background: COLORS.divergent, foreground: COLORS.divergentText };
  }
  if (status === 'CONSULTA_INCONCLUSIVA') {
    return { background: COLORS.inconclusive, foreground: COLORS.inconclusiveText };
  }
  if (status === 'SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA') {
    return { background: COLORS.noPayment, foreground: COLORS.noPaymentText };
  }
  return { background: COLORS.warning, foreground: COLORS.warningText };
}

function configureDataSheet(
  worksheet: ExcelJS.Worksheet,
  rows: PortfolioRow[],
): void {
  worksheet.columns = COLUMNS.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));
  worksheet.views = [{ state: 'frozen', xSplit: 5, ySplit: 1, showGridLines: false }];
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: COLUMNS.length },
  };

  const header = worksheet.getRow(1);
  header.height = 48;
  header.eachCell((cell) => {
    cell.fill = fill(COLORS.navy);
    cell.font = { name: 'Carlito', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = border();
  });

  const statusColumn = COLUMNS.findIndex((column) => column.key === 'status') + 1;
  const reviewColumn = COLUMNS.findIndex((column) => column.key === 'humanReview') + 1;
  for (const [index, item] of rows.entries()) {
    const excelRow = worksheet.addRow(reportRecord(item));
    excelRow.height = 36;
    excelRow.font = { name: 'Carlito', size: 9, color: { argb: COLORS.text } };
    excelRow.alignment = { vertical: 'middle' };
    if (index % 2 === 1) {
      excelRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = fill(COLORS.stripe);
      });
    }
    excelRow.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.border = border();
      const definition = COLUMNS[columnNumber - 1];
      if (definition.kind === 'currency') {
        cell.numFmt = 'R$ #,##0.00;[Red]-R$ #,##0.00';
        cell.alignment = { horizontal: 'right', vertical: 'middle' };
      } else if (definition.kind === 'date') {
        cell.numFmt = 'dd/mm/yyyy';
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      } else if (definition.kind === 'identifier') {
        cell.numFmt = '@';
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      } else if (definition.kind === 'long-text') {
        cell.alignment = { vertical: 'middle', wrapText: true };
      }
    });

    const colors = statusColors(item.reconciliation.status);
    const statusCell = excelRow.getCell(statusColumn);
    statusCell.fill = fill(colors.background);
    statusCell.font = {
      name: 'Carlito', size: 9, bold: true, color: { argb: colors.foreground },
    };
    const reviewCell = excelRow.getCell(reviewColumn);
    if (item.reconciliation.requiresHumanReview) {
      reviewCell.fill = fill(COLORS.warning);
      reviewCell.font = {
        name: 'Carlito', size: 9, bold: true, color: { argb: COLORS.warningText },
      };
    }
  }
}

function distinctRows<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function minimumCoverage(values: Array<string | undefined>): string | undefined {
  const present = values.filter((value): value is string => Boolean(value)).sort();
  return present[0];
}

function configureMetadataSheet(
  worksheet: ExcelJS.Worksheet,
  input: ReconciliationWorkbookInput,
): void {
  const { portfolio } = input;
  worksheet.views = [{ state: 'frozen', ySplit: 1, showGridLines: false }];
  worksheet.columns = [
    { header: 'Campo', key: 'field', width: 48 },
    { header: 'Valor', key: 'value', width: 68 },
    { header: 'Detalhe', key: 'detail', width: 100 },
  ];
  const header = worksheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = fill(COLORS.navy);
    cell.font = { name: 'Carlito', size: 10, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = border();
  });

  const summary = portfolio.summary;
  const releaseSnapshots = portfolio.rows.map((row) => row.sources.sigefReleases);
  const movementSnapshots = portfolio.rows.map((row) => row.sources.sigefMovements);
  const pddeSnapshots = portfolio.rows.map((row) => row.sources.pddeInfo);
  const entries: Array<[string, ExcelJS.CellValue, string?]> = [
    ['Título', safeText(input.title ?? 'Conciliação de repasses PDDE'), 'Relatório de evidências por parcela.'],
    ['Gerado em', safeText(input.generatedAt), 'Instante informado pela execução; nenhuma função VOLÁTIL do Excel é usada.'],
    ['Total de repasses', summary.total],
    ['Repasses confirmados', summary.confirmed],
    ['Ordens bancárias sem crédito localizado', summary.orderBankWithoutCredit],
    ['Pagamentos somente no PDDEInfo', summary.pddeInfoOnly],
    ['Divergências', summary.divergent],
    ['Sem pagamento registrado', summary.noPayment],
    ['Consultas inconclusivas', summary.inconclusive],
    ['Revisões humanas', summary.requiringHumanReview],
    ['Contas confirmadas pelas duas fontes', summary.accountsConfirmedByBoth],
    ['Contas somente do PDDEInfo', summary.accountsFromPddeInfoOnly],
    ['Contas completadas pelo SIGEF', summary.accountsCompletedFromSigef],
    ['Divergências de conta', summary.accountDivergences],
    ['Contas ausentes', summary.accountsMissing],
    [
      'Regra de confirmação',
      'PDDEInfo + Liberações SIGEF + crédito correspondente em Movimentações SIGEF.',
      'Identidade, parcela, valor, data, ordem bancária e conta são comparados; nenhuma liberação ambígua é escolhida arbitrariamente.',
    ],
    [
      'Unidade monetária',
      'Real (R$)',
      'O cálculo ocorre em centavos inteiros; a divisão por 100 acontece apenas na apresentação.',
    ],
    [
      'Fórmulas',
      'Nenhuma',
      'O relatório contém valores materializados. Textos iniciados por =, +, - ou @ são neutralizados.',
    ],
    [
      'Cobertura PDDEInfo',
      dateCell(minimumCoverage(pddeSnapshots.map((snapshot) => snapshot.coverageThrough))),
      `${distinctRows(pddeSnapshots.map((snapshot) => snapshot.status)).join(', ') || 'sem linhas'}; `
        + `consultas: ${distinctRows(pddeSnapshots.map((snapshot) => snapshot.queriedAt)).join(', ') || 'nenhuma'}`,
    ],
    [
      'Cobertura SIGEF Liberações',
      dateCell(minimumCoverage(releaseSnapshots.map((snapshot) => snapshot.coverageThrough))),
      `Disponíveis: ${releaseSnapshots.filter((snapshot) => snapshot.status === 'available').length}; `
        + `parciais: ${releaseSnapshots.filter((snapshot) => snapshot.status === 'partial').length}; `
        + `indisponíveis: ${releaseSnapshots.filter((snapshot) => snapshot.status === 'unavailable').length}.`,
    ],
    [
      'Cobertura SIGEF Movimentações',
      dateCell(minimumCoverage(movementSnapshots.map((snapshot) => snapshot.coverageThrough))),
      `${distinctRows(movementSnapshots.map((snapshot) => snapshot.status)).join(', ') || 'sem linhas'}; `
        + `consultas: ${distinctRows(movementSnapshots.map((snapshot) => snapshot.queriedAt)).join(', ') || 'nenhuma'}`,
    ],
    ...Object.entries(RECONCILIATION_STATUS_LABELS).map(([code, label]): [string, string, string] => [
      `Status ${code}`,
      label,
      'Classificação controlada pelo motor de conciliação.',
    ]),
  ];

  for (const [field, value, detail] of entries) {
    const row = worksheet.addRow({
      field: safeText(field),
      value: typeof value === 'string' ? safeText(value) : value,
      detail: safeText(detail),
    });
    row.height = field.startsWith('Status ') ? 54 : (detail && detail.length > 100 ? 42 : 30);
    row.font = { name: 'Carlito', size: 10, color: { argb: COLORS.text } };
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = border();
      cell.alignment = { vertical: 'middle', wrapText: true };
    });
    row.getCell(1).font = { name: 'Carlito', size: 10, bold: true, color: { argb: COLORS.text } };
    if (value instanceof Date) row.getCell(2).numFmt = 'dd/mm/yyyy';
  }
  worksheet.autoFilter = { from: 'A1', to: 'C1' };
}

function validateInput(input: ReconciliationWorkbookInput): void {
  if (!input || !input.portfolio || !Array.isArray(input.portfolio.rows)) {
    throw new Error('Carteira de conciliação ausente ou inválida.');
  }
  if (!Number.isFinite(Date.parse(input.generatedAt))) {
    throw new Error('Data e hora de geração inválidas.');
  }
  if (input.portfolio.summary.total !== input.portfolio.rows.length) {
    throw new Error('O total do resumo diverge da quantidade de repasses.');
  }
  const reviewCount = input.portfolio.rows.filter(
    (row) => row.reconciliation.requiresHumanReview,
  ).length;
  if (input.portfolio.summary.requiringHumanReview !== reviewCount) {
    throw new Error('O total de revisões humanas diverge das linhas conciliadas.');
  }
  const paymentIds = input.portfolio.rows.map((row) => row.payment.id);
  if (new Set(paymentIds).size !== paymentIds.length) {
    throw new Error('Há IDs de pagamento duplicados no relatório.');
  }
}

export async function buildReconciliationWorkbook(
  input: ReconciliationWorkbookInput,
): Promise<Buffer> {
  validateInput(input);
  const generatedDate = new Date(input.generatedAt);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Conciliador de Repasses PDDE • 4ª CRE';
  workbook.lastModifiedBy = 'Conciliador de Repasses PDDE • 4ª CRE';
  workbook.created = generatedDate;
  workbook.modified = generatedDate;
  workbook.subject = input.title ?? 'Conciliação de repasses PDDE';
  workbook.description = 'Evidências materializadas do PDDEInfo e do SIGEF, sem fórmulas.';
  workbook.properties.date1904 = false;
  workbook.calcProperties.fullCalcOnLoad = false;

  const allRows = workbook.addWorksheet('Conciliação');
  configureDataSheet(allRows, input.portfolio.rows);
  const exceptions = workbook.addWorksheet('Exceções');
  configureDataSheet(
    exceptions,
    input.portfolio.rows.filter((row) => row.reconciliation.requiresHumanReview),
  );
  const metadata = workbook.addWorksheet('Metadados');
  configureMetadataSheet(metadata, input);

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}

export interface ReconciliationWorkbookAudit {
  sheets: number;
  rows: number;
  exceptions: number;
  columns: number;
}

function assertNoFormulas(worksheet: ExcelJS.Worksheet): void {
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.type === ExcelJS.ValueType.Formula) {
        throw new Error(`Fórmula inesperada em ${worksheet.name}!${cell.address}.`);
      }
    });
  });
}

function valueText(value: ExcelJS.CellValue): string {
  return value === null || value === undefined ? '' : String(value);
}

function assertHeaders(worksheet: ExcelJS.Worksheet): void {
  if (worksheet.columnCount !== COLUMNS.length) {
    throw new Error(
      `Quantidade de colunas inválida em ${worksheet.name}: ${worksheet.columnCount}.`,
    );
  }
  for (let index = 0; index < COLUMNS.length; index += 1) {
    const actual = valueText(worksheet.getRow(1).getCell(index + 1).value);
    if (actual !== COLUMNS[index].header) {
      throw new Error(
        `Cabeçalho inválido em ${worksheet.name}, coluna ${index + 1}: ${actual}.`,
      );
    }
  }
}

function columnNumber(key: string): number {
  const index = COLUMNS.findIndex((column) => column.key === key);
  if (index < 0) throw new Error(`Coluna interna inexistente: ${key}.`);
  return index + 1;
}

function assertCellType(
  cell: ExcelJS.Cell,
  expected: 'string' | 'number' | 'date',
  context: string,
): void {
  if (cell.value === null || cell.value === undefined || cell.value === '') return;
  const valid = expected === 'date' ? cell.value instanceof Date : typeof cell.value === expected;
  if (!valid) throw new Error(`Tipo inválido em ${context}: esperado ${expected}.`);
}

function assertDataTypes(worksheet: ExcelJS.Worksheet, dataRows: number): void {
  const identifierColumns = COLUMNS
    .map((column, index) => column.kind === 'identifier' ? index + 1 : null)
    .filter((index): index is number => index !== null);
  const currencyColumns = COLUMNS
    .map((column, index) => column.kind === 'currency' ? index + 1 : null)
    .filter((index): index is number => index !== null);
  const dateColumns = COLUMNS
    .map((column, index) => column.kind === 'date' ? index + 1 : null)
    .filter((index): index is number => index !== null);

  for (let rowNumber = 2; rowNumber <= dataRows + 1; rowNumber += 1) {
    for (const column of identifierColumns) {
      assertCellType(
        worksheet.getRow(rowNumber).getCell(column),
        'string',
        `${worksheet.name}!${worksheet.getRow(rowNumber).getCell(column).address}`,
      );
    }
    for (const column of currencyColumns) {
      assertCellType(
        worksheet.getRow(rowNumber).getCell(column),
        'number',
        `${worksheet.name}!${worksheet.getRow(rowNumber).getCell(column).address}`,
      );
    }
    for (const column of dateColumns) {
      assertCellType(
        worksheet.getRow(rowNumber).getCell(column),
        'date',
        `${worksheet.name}!${worksheet.getRow(rowNumber).getCell(column).address}`,
      );
    }
  }
}

function assertRowsMatch(
  worksheet: ExcelJS.Worksheet,
  expectedRows: PortfolioRow[],
): void {
  if (worksheet.rowCount !== expectedRows.length + 1) {
    throw new Error(
      `Quantidade de linhas inválida em ${worksheet.name}: ${worksheet.rowCount}.`,
    );
  }
  const paymentIdColumn = columnNumber('paymentId');
  const inepColumn = columnNumber('inep');
  const cnpjColumn = columnNumber('cnpj');
  const paidColumn = columnNumber('amountPaidPddeInfo');
  const statusColumn = columnNumber('status');
  const reviewColumn = columnNumber('humanReview');
  for (const [index, expected] of expectedRows.entries()) {
    const row = worksheet.getRow(index + 2);
    const comparisons: Array<[number, ExcelJS.CellValue, string]> = [
      [paymentIdColumn, safeText(expected.payment.id), 'ID de pagamento'],
      [inepColumn, safeText(expected.payment.school.inep), 'INEP'],
      [cnpjColumn, safeText(expected.payment.school.cnpj), 'CNPJ'],
      [paidColumn, money(expected.payment.amountPaidCents), 'valor pago'],
      [statusColumn, safeText(expected.reconciliation.statusLabel), 'status'],
      [reviewColumn, expected.reconciliation.requiresHumanReview ? 'SIM' : 'NÃO', 'revisão humana'],
    ];
    for (const [column, expectedValue, label] of comparisons) {
      if (row.getCell(column).value !== expectedValue) {
        throw new Error(`${label} divergente em ${worksheet.name}, linha ${index + 2}.`);
      }
    }
  }
}

export async function validateReconciliationWorkbook(
  bytes: Buffer,
  expected: PortfolioReconciliationResult,
): Promise<ReconciliationWorkbookAudit> {
  if (bytes.length < 1_000 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Conteúdo XLSX ausente ou com assinatura inválida.');
  }
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes as unknown as Parameters<typeof workbook.xlsx.load>[0]);
  const expectedSheets = ['Conciliação', 'Exceções', 'Metadados'];
  if (workbook.worksheets.map((worksheet) => worksheet.name).join('|') !== expectedSheets.join('|')) {
    throw new Error('As abas obrigatórias do relatório estão ausentes ou fora de ordem.');
  }
  const allRows = workbook.getWorksheet('Conciliação');
  const exceptions = workbook.getWorksheet('Exceções');
  const metadata = workbook.getWorksheet('Metadados');
  if (!allRows || !exceptions || !metadata) throw new Error('Abas obrigatórias ausentes.');

  assertHeaders(allRows);
  assertHeaders(exceptions);
  assertNoFormulas(allRows);
  assertNoFormulas(exceptions);
  assertNoFormulas(metadata);
  assertRowsMatch(allRows, expected.rows);
  const expectedExceptions = expected.rows.filter(
    (row) => row.reconciliation.requiresHumanReview,
  );
  assertRowsMatch(exceptions, expectedExceptions);
  assertDataTypes(allRows, expected.rows.length);
  assertDataTypes(exceptions, expectedExceptions.length);

  return {
    sheets: workbook.worksheets.length,
    rows: expected.rows.length,
    exceptions: expectedExceptions.length,
    columns: COLUMNS.length,
  };
}
