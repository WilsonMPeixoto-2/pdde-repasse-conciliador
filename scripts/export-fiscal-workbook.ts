#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { mkdir } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import {
  buildFiscalHumanView,
  type FiscalCreditPresentationStatus,
  type FiscalSchoolView,
} from '../backend/application/build-fiscal-human-view';

function parseArgs(argv: string[]): { input: string; output: string } {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    }
    args.set(key, value);
  }
  return {
    input: resolve(args.get('--input') ?? 'artifacts/monitor-all-163-2026.json'),
    output: resolve(args.get('--output') ?? 'artifacts/monitor-fiscal-2026.xlsx'),
  };
}

function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

function accountText(account: { bank: string; agency: string; number: string } | null): string {
  if (!account) return '';
  return `Banco ${account.bank} | Ag. ${account.agency} | Conta ${account.number}`;
}

function creditStatusText(status: FiscalCreditPresentationStatus): string {
  switch (status) {
    case 'CREDITO_LOCALIZADO':
      return 'Crédito localizado no extrato';
    case 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA':
      return 'Pagamento informado; crédito ainda não localizado nesta coleta';
    case 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO':
      return 'Pagamento informado; conta correspondente não exibida no PDDEInfo';
    case 'MAIS_DE_UM_CREDITO_COMPATIVEL':
      return 'Mais de um crédito compatível localizado';
    case 'CONSULTA_DA_CONTA_INCONCLUSIVA':
      return 'Consulta do extrato não concluída';
    case 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO':
      return 'Pagamento ainda não informado no PDDEInfo';
  }
}

const BLUE = '163A5F';
const MID_BLUE = '2F75B5';
const PALE_BLUE = 'D9EAF7';
const PALE_GRAY = 'F2F2F2';
const WHITE = 'FFFFFF';
const DARK = '1F2937';
const BORDER = 'D9E2F3';

function styleTitle(row: ExcelJS.Row): void {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 15 };
    cell.alignment = { vertical: 'middle' };
  });
}

function styleSchoolHeader(row: ExcelJS.Row): void {
  row.height = 24;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_BLUE } };
    cell.font = { bold: true, color: { argb: BLUE }, size: 11 };
    cell.alignment = { vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
  });
}

function styleAccountHeader(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GRAY } };
    cell.font = { bold: true, color: { argb: DARK } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
}

function styleColumnHeader(row: ExcelJS.Row): void {
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: MID_BLUE } };
    cell.font = { bold: true, color: { argb: WHITE } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: WHITE } },
      bottom: { style: 'thin', color: { argb: WHITE } },
    };
  });
}

function writeSchoolHeader(
  sheet: ExcelJS.Worksheet,
  school: FiscalSchoolView['school'],
  lastColumn: number,
): void {
  const row = sheet.addRow([`${school.sme} | ${school.name} | INEP ${school.inep} | CNPJ ${school.cnpj}`]);
  sheet.mergeCells(row.number, 1, row.number, lastColumn);
  styleSchoolHeader(row);
}

function buildIndex(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Índice 163 UEs', { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'Monitoramento PDDE 2026 - Índice das Unidades Escolares';
  styleTitle(sheet.getRow(1));
  const header = sheet.addRow([
    'SME', 'Unidade Escolar', 'INEP', 'CNPJ UEx', 'Ações / programas', 'Contas', 'Movimentos 2026', 'Saldo total PDDEInfo',
  ]);
  styleColumnHeader(header);

  for (const item of schools) {
    const movements = item.statements.reduce((total, statement) => total + statement.entries.length, 0);
    const balance = item.statements.reduce((total, statement) => total + (statement.saldoPddeInfoCents ?? 0), 0);
    const row = sheet.addRow([
      item.school.sme,
      item.school.name,
      item.school.inep,
      item.school.cnpj,
      item.repasses.length,
      item.statements.length,
      movements,
      balance / 100,
    ]);
    row.getCell(8).numFmt = 'R$ #,##0.00';
  }

  sheet.columns = [
    { width: 12 }, { width: 42 }, { width: 13 }, { width: 20 },
    { width: 18 }, { width: 10 }, { width: 18 }, { width: 20 },
  ];
  sheet.autoFilter = { from: 'A2', to: 'H2' };
}

function buildRepasses(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Repasses por Escola', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.mergeCells('A1:M1');
  sheet.getCell('A1').value = 'Repasses 2026 - parcelas preservadas conforme PDDEInfo';
  styleTitle(sheet.getRow(1));

  for (const item of schools) {
    sheet.addRow([]);
    writeSchoolHeader(sheet, item.school, 13);
    const header = sheet.addRow([
      'Ação / programa', 'Parcela', 'Previsto PDDEInfo', 'Pagamento informado', 'Data no PDDEInfo',
      'Banco / Agência / Conta', 'Situação do crédito bancário', 'Data crédito SIGEF', 'Crédito SIGEF',
      'Documento', 'Observação neutra', 'Código programa', 'Fonte da parcela',
    ]);
    styleColumnHeader(header);

    for (const repasse of item.repasses) {
      for (const installment of repasse.installments) {
        const row = sheet.addRow([
          repasse.action,
          installment.installment ?? '—',
          reais(installment.amountProgrammedCents),
          reais(installment.amountPaidInformedCents),
          installment.pddeInfoDate ?? '',
          accountText(installment.account),
          creditStatusText(installment.bankCredit.presentationStatus),
          installment.bankCredit.date ?? '',
          reais(installment.bankCredit.amountCents),
          installment.bankCredit.document ?? '',
          installment.note ?? '',
          repasse.programCode,
          installment.installment ?? 'Sem divisão de parcela na fonte',
        ]);
        row.getCell(3).numFmt = 'R$ #,##0.00';
        row.getCell(4).numFmt = 'R$ #,##0.00';
        row.getCell(9).numFmt = 'R$ #,##0.00';
        for (const cell of [row.getCell(1), row.getCell(6), row.getCell(7), row.getCell(10), row.getCell(11)]) {
          cell.alignment = { vertical: 'top', wrapText: true };
        }
      }
    }
  }

  sheet.columns = [
    { width: 32 }, { width: 14 }, { width: 17 }, { width: 18 }, { width: 16 },
    { width: 34 }, { width: 42 }, { width: 16 }, { width: 16 }, { width: 26 },
    { width: 48 }, { width: 14 }, { width: 28 },
  ];
}

function buildStatements(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Extratos 2026 por Escola', { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.mergeCells('A1:L1');
  sheet.getCell('A1').value = 'Movimentações 2026 - histórico original do SIGEF em ordem cronológica';
  styleTitle(sheet.getRow(1));

  for (const item of schools) {
    sheet.addRow([]);
    writeSchoolHeader(sheet, item.school, 12);

    if (item.statements.length === 0) {
      const row = sheet.addRow(['Nenhuma conta exibida na coleta atual do PDDEInfo.']);
      sheet.mergeCells(row.number, 1, row.number, 12);
      row.getCell(1).font = { italic: true, color: { argb: DARK } };
      continue;
    }

    for (const statement of item.statements) {
      const accountRow = sheet.addRow([
        `${statement.programLabel} (${statement.programCode}) | ${accountText(statement.account)} | `
          + `Saldo PDDEInfo: ${statement.saldoPddeInfoCents === null ? 'não informado' : `R$ ${(statement.saldoPddeInfoCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}`
          + ` | Cobertura SIGEF: ${statement.collectionStatus}${statement.coverageThrough ? ` até ${statement.coverageThrough}` : ''}`,
      ]);
      sheet.mergeCells(accountRow.number, 1, accountRow.number, 12);
      styleAccountHeader(accountRow);

      const header = sheet.addRow([
        'Data', 'Histórico SIGEF', 'Documento', 'Crédito', 'Débito', 'Doc. contraparte',
        'Contraparte', 'Banco', 'Agência', 'Conta', 'Categoria auxiliar', 'Fonte',
      ]);
      styleColumnHeader(header);

      if (statement.entries.length === 0) {
        const row = sheet.addRow(['Sem lançamentos de 2026 nesta conta na coleta atual.']);
        sheet.mergeCells(row.number, 1, row.number, 12);
        row.getCell(1).font = { italic: true, color: { argb: DARK } };
      } else {
        for (const entry of statement.entries) {
          const row = sheet.addRow([
            entry.date,
            entry.history,
            entry.document,
            reais(entry.creditCents),
            reais(entry.debitCents),
            entry.counterparty.document ?? '',
            entry.counterparty.name ?? '',
            entry.counterparty.bank ?? '',
            entry.counterparty.agency ?? '',
            entry.counterparty.account ?? '',
            entry.neutralCategory ?? '',
            entry.sourceUrl,
          ]);
          row.getCell(4).numFmt = 'R$ #,##0.00';
          row.getCell(5).numFmt = 'R$ #,##0.00';
          for (const column of [2, 3, 6, 7, 11, 12]) {
            row.getCell(column).alignment = { vertical: 'top', wrapText: true };
          }
        }
      }
      sheet.addRow([]);
    }
  }

  sheet.columns = [
    { width: 13 }, { width: 34 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 20 },
    { width: 34 }, { width: 10 }, { width: 12 }, { width: 17 }, { width: 24 }, { width: 44 },
  ];
}

function buildLegend(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Legenda');
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'Critérios de apresentação';
  styleTitle(sheet.getRow(1));
  const header = sheet.addRow(['Campo / categoria', 'Como ler', 'Regra']);
  styleColumnHeader(header);
  const rows = [
    ['Parcela', 'Mantida como aparece no PDDEInfo', '1ª Parcela, 2ª Parcela, P1, P2 ou sem divisão quando a fonte não traz parcela.'],
    ['Pagamento informado', 'Valor/data apresentados pelo PDDEInfo', 'Não é tratado automaticamente como crédito bancário.'],
    ['Crédito SIGEF', 'Lançamento compatível localizado no extrato', 'Apresentado separadamente do pagamento informado pelo PDDEInfo.'],
    ['Histórico SIGEF', 'Texto original do extrato', 'Não é reescrito nem substituído pela categoria auxiliar.'],
    ['Categoria auxiliar', 'Descrição neutra para facilitar leitura', 'Não representa juízo sobre regularidade, finalidade ou correção da despesa.'],
    ['Sem lançamentos de 2026', 'A conta foi consultada, mas não apresentou linhas de 2026 nesta coleta', 'Não significa ausência histórica de movimentação.'],
  ];
  for (const values of rows) {
    const row = sheet.addRow(values);
    row.eachCell((cell) => { cell.alignment = { vertical: 'top', wrapText: true }; });
  }
  sheet.columns = [{ width: 26 }, { width: 40 }, { width: 65 }];
}

const options = parseArgs(process.argv.slice(2));
const raw = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
const view = buildFiscalHumanView(raw);
const workbook = new ExcelJS.Workbook();
workbook.creator = 'PDDE Repasse Conciliador';
workbook.created = new Date();
workbook.modified = new Date();

buildIndex(workbook, view.schools);
buildRepasses(workbook, view.schools);
buildStatements(workbook, view.schools);
buildLegend(workbook);

for (const sheet of workbook.worksheets) {
  sheet.properties.defaultRowHeight = 18;
  sheet.pageSetup.orientation = 'landscape';
  sheet.pageSetup.fitToPage = true;
  sheet.pageSetup.fitToWidth = 1;
  sheet.pageSetup.fitToHeight = 0;
}

await mkdir(dirname(options.output), { recursive: true });
await workbook.xlsx.writeFile(options.output);
process.stdout.write(`${JSON.stringify({ output: options.output, schools: view.schools.length }, null, 2)}\n`);
