import ExcelJS from 'exceljs';
import type {
  ReleaseAssistantFileAudit,
  ReleaseAssistantPending,
  ReleaseAssistantResult,
} from '../application/assist-sigef-release-exports';

function safeText(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function styleHeader(row: ExcelJS.Row): void {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  row.height = 26;
}

function applyTableBasics(sheet: ExcelJS.Worksheet, widths: number[]): void {
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: 'A1', to: sheet.getRow(1).getCell(widths.length).address };
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
  sheet.eachRow((row, rowNumber) => {
    row.alignment = { vertical: 'top', wrapText: true };
    if (rowNumber === 1) styleHeader(row);
  });
}

function addResumo(workbook: ExcelJS.Workbook, result: ReleaseAssistantResult): void {
  const sheet = workbook.addWorksheet('Resumo');
  sheet.columns = [
    { key: 'item', width: 34 },
    { key: 'value', width: 68 },
  ];
  sheet.addRow(['Assistente de Liberações', `Controle ${result.fiscalYear}`]);
  sheet.addRow(['Gerado em', safeText(result.generatedAt)]);
  sheet.addRow(['Exercício', result.fiscalYear]);
  sheet.addRow(['Escolas', result.summary.schools]);
  sheet.addRow(['Pares esperados', result.summary.expectedPairs]);
  sheet.addRow(['Pares disponíveis', result.summary.availablePairs]);
  sheet.addRow(['Pares faltantes', result.summary.missingPairs]);
  sheet.addRow(['Arquivos processados', result.summary.processedFiles]);
  sheet.addRow(['Conflitos', result.summary.conflicts]);
  sheet.addRow(['Erros/pendências de arquivo', result.summary.errors]);
  sheet.addRow(['Pasta canônica', safeText(result.workspace.releasesDirectory)]);
  sheet.addRow(['Pasta de originais', safeText(result.workspace.originalsDirectory)]);
  sheet.getColumn(1).font = { bold: true };
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F4E78' } };
  sheet.getRow(1).height = 28;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function addCobertura(workbook: ExcelJS.Workbook, result: ReleaseAssistantResult): void {
  const sheet = workbook.addWorksheet('Cobertura');
  sheet.addRow([
    'SME', 'Escola', 'CNPJ', 'Exercício', 'Programa', 'Situação',
    'Registros', 'Data da consulta', 'Arquivo canônico',
  ]);
  for (const row of result.coverage) {
    sheet.addRow([
      safeText(row.sme),
      safeText(row.schoolName),
      safeText(row.cnpj),
      result.fiscalYear,
      safeText(row.programCode),
      safeText(row.status),
      row.records ?? '',
      safeText(row.queryDate),
      safeText(row.canonicalPath),
    ]);
  }
  applyTableBasics(sheet, [12, 36, 18, 11, 11, 15, 11, 17, 54]);
}

function fileRow(file: ReleaseAssistantFileAudit): Array<string> {
  return [
    safeText(file.sourcePath),
    safeText(file.sha256),
    safeText(file.cnpj),
    safeText(file.programCode),
    safeText(file.queryDate),
    safeText(file.status),
    safeText(file.originalPath),
    safeText(file.canonicalPath),
    file.sha256 ? safeText(file.sha256.slice(0, 12)) : '',
    safeText(file.message),
  ];
}

function addArquivos(workbook: ExcelJS.Workbook, result: ReleaseAssistantResult): void {
  const sheet = workbook.addWorksheet('Arquivos');
  sheet.addRow([
    'Arquivo de origem', 'SHA-256', 'CNPJ', 'Programa', 'Data da consulta',
    'Resultado', 'Original preservado', 'Arquivo canônico', 'Hash curto', 'Mensagem',
  ]);
  result.files.forEach((file) => sheet.addRow(fileRow(file)));
  applyTableBasics(sheet, [48, 66, 18, 11, 17, 25, 52, 52, 16, 58]);
}

function pendingRow(item: ReleaseAssistantPending): Array<string> {
  return [
    safeText(item.kind),
    safeText(item.cnpj),
    safeText(item.programCode),
    safeText(item.sourcePath),
    safeText(item.message),
  ];
}

function addPendencias(workbook: ExcelJS.Workbook, result: ReleaseAssistantResult): void {
  const sheet = workbook.addWorksheet('Pendências');
  sheet.addRow(['Tipo', 'CNPJ', 'Programa', 'Arquivo de origem', 'Descrição']);
  result.pending.forEach((item) => sheet.addRow(pendingRow(item)));
  applyTableBasics(sheet, [28, 18, 11, 52, 68]);
}

export async function buildReleaseAssistantWorkbook(
  result: ReleaseAssistantResult,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Assistente de Liberações PDDE';
  workbook.created = new Date(result.generatedAt);
  workbook.modified = new Date(result.generatedAt);
  workbook.calcProperties.fullCalcOnLoad = false;

  addResumo(workbook, result);
  addCobertura(workbook, result);
  addArquivos(workbook, result);
  addPendencias(workbook, result);

  const bytes = await workbook.xlsx.writeBuffer();
  return Buffer.from(bytes);
}
