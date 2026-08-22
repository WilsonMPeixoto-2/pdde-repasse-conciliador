#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
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
      return 'Crédito compatível localizado no extrato SIGEF';
    case 'PAGAMENTO_INFORMADO_COBERTURA_ANTERIOR_AO_PAGAMENTO':
      return 'Pagamento informado no PDDEInfo; o extrato disponível ainda não cobre a data do pagamento';
    case 'PAGAMENTO_INFORMADO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE':
      return 'Pagamento informado no PDDEInfo; crédito ainda não correlacionado automaticamente no período coberto';
    case 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO':
      return 'Pagamento informado no PDDEInfo; conta correspondente não exibida na coleta atual do PDDEInfo';
    case 'MAIS_DE_UM_CREDITO_COMPATIVEL':
      return 'Pagamento informado no PDDEInfo; mais de um crédito bancário compatível foi localizado';
    case 'CONSULTA_DA_CONTA_INCONCLUSIVA':
      return 'Pagamento informado no PDDEInfo; consulta bancária inconclusiva nesta coleta';
    case 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO':
      return 'Pagamento ainda não informado no PDDEInfo';
  }
}

function requiresRepasseReview(status: FiscalCreditPresentationStatus): boolean {
  return status === 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO'
    || status === 'MAIS_DE_UM_CREDITO_COMPATIVEL'
    || status === 'CONSULTA_DA_CONTA_INCONCLUSIVA';
}

function brDate(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function brDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(parsed);
}

const BLUE = '1F466A';
const MID_BLUE = '2F75B5';
const SOFT_BLUE = 'DCE7EE';
const PALE_BLUE = 'D9EAF7';
const PALE_GRAY = 'EEF2F5';
const WHITE = 'FFFFFF';
const DARK = '233B4D';
const MUTED = '526A7A';
const BORDER = 'D9E2F3';
const MONEY = 'R$ #,##0.00';

function styleTitle(row: ExcelJS.Row): void {
  row.height = 30;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 15 };
    cell.alignment = { vertical: 'middle' };
  });
}

function styleInfo(row: ExcelJS.Row): void {
  row.height = 28;
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GRAY } };
    cell.font = { italic: true, color: { argb: MUTED }, size: 10 };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
}

function styleSection(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT_BLUE } };
    cell.font = { bold: true, color: { argb: BLUE } };
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

function textColumn(sheet: ExcelJS.Worksheet, index: number): void {
  sheet.getColumn(index).numFmt = '@';
}

function writeSchoolHeader(sheet: ExcelJS.Worksheet, school: FiscalSchoolView['school'], lastColumn: number): void {
  const row = sheet.addRow([`${school.sme} | ${school.name} | INEP ${school.inep} | CNPJ ${school.cnpj}`]);
  sheet.mergeCells(row.number, 1, row.number, lastColumn);
  styleSchoolHeader(row);
}

function allInstallments(schools: FiscalSchoolView[]) {
  return schools.flatMap((school) => school.repasses.flatMap((repasse) => (
    repasse.installments.map((installment) => ({ school, repasse, installment }))
  )));
}

function allEntries(schools: FiscalSchoolView[]) {
  return schools.flatMap((school) => school.statements.flatMap((statement) => (
    statement.entries.map((entry) => ({ school, statement, entry }))
  )));
}

function buildDashboard(workbook: ExcelJS.Workbook, view: ReturnType<typeof buildFiscalHumanView>): void {
  const schools = view.schools;
  const installments = allInstallments(schools);
  const entries = allEntries(schools);
  const reviewCount = installments.filter(({ installment }) => (
    installment.amountPaidInformedCents > 0
    && requiresRepasseReview(installment.bankCredit.presentationStatus)
  )).length + entries.filter(({ entry }) => (
    entry.technicalClassification === 'TARIFA_BANCARIA'
    || entry.technicalClassification === 'ENTRADA_TERCEIRO'
    || entry.technicalClassification === 'MOVIMENTO_NAO_CLASSIFICADO'
  )).length;

  const sheet = workbook.addWorksheet('Visão Geral', { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells('A1:H1');
  sheet.getCell('A1').value = 'Monitoramento Financeiro PDDE 2026 · 4ª CRE';
  styleTitle(sheet.getRow(1));
  sheet.mergeCells('A2:H2');
  sheet.getCell('A2').value = `Fontes: PDDEInfo + SIGEF · Coleta ${brDateTime(view.sourceGeneratedAt)} (Brasília) · leitura principal por escola, com bases técnicas para análises adicionais.`;
  styleInfo(sheet.getRow(2));

  const accounts = schools.reduce((sum, item) => sum + item.statements.length, 0);
  const movements = entries.length;
  const programmed = installments.reduce((sum, item) => sum + item.installment.amountProgrammedCents, 0);
  const paid = installments.reduce((sum, item) => sum + item.installment.amountPaidInformedCents, 0);
  const credited = installments.reduce((sum, item) => sum + (item.installment.bankCredit.amountCents ?? 0), 0);
  const balance = schools.reduce((sum, item) => sum + item.statements.reduce((acc, statement) => acc + (statement.saldoPddeInfoCents ?? 0), 0), 0);

  const metricHeader = sheet.addRow(['Unidades escolares', 'Contas vinculadas', 'Movimentos em 2026', 'Registros para conferência']);
  styleSection(metricHeader);
  const metricValue = sheet.addRow([schools.length, accounts, movements, reviewCount]);
  metricValue.font = { bold: true, color: { argb: DARK }, size: 18 };
  metricValue.alignment = { horizontal: 'center' };
  const metricHint = sheet.addRow(['carteira da 4ª CRE', 'contas mapeadas na coleta', 'linhas de extrato SIGEF', 'seleção factual, sem juízo']);
  metricHint.font = { color: { argb: MUTED }, size: 9 };
  metricHint.alignment = { horizontal: 'center' };

  sheet.addRow([]);
  const moneyHeader = sheet.addRow(['Previsto no PDDEInfo', 'Pagamento informado', 'Crédito localizado SIGEF', 'Saldo informado']);
  styleSection(moneyHeader);
  const moneyRow = sheet.addRow([reais(programmed), reais(paid), reais(credited), reais(balance)]);
  moneyRow.eachCell((cell) => { cell.numFmt = MONEY; cell.font = { bold: true, color: { argb: DARK }, size: 16 }; cell.alignment = { horizontal: 'center' }; });
  const moneyHint = sheet.addRow(['soma dos valores programados', 'informação do PDDEInfo', 'créditos compatíveis encontrados', 'soma dos saldos PDDEInfo']);
  moneyHint.font = { color: { argb: MUTED }, size: 9 };
  moneyHint.alignment = { horizontal: 'center' };

  sheet.addRow([]);
  const section = sheet.addRow(['Repasses por ação e parcela']);
  sheet.mergeCells(section.number, 1, section.number, 6);
  styleSection(section);
  const ph = sheet.addRow(['Ação / programa', 'Parcela', 'Registros', 'Previsto', 'Pagamento informado', 'Crédito localizado SIGEF']);
  styleColumnHeader(ph);
  const byProgram = new Map<string, { action: string; parcel: string; count: number; programmed: number; paid: number; credited: number }>();
  for (const { repasse, installment } of installments) {
    const parcel = installment.installment ?? 'Sem divisão';
    const key = `${repasse.action}\u0000${parcel}`;
    const current = byProgram.get(key) ?? { action: repasse.action, parcel, count: 0, programmed: 0, paid: 0, credited: 0 };
    current.count += 1;
    current.programmed += installment.amountProgrammedCents;
    current.paid += installment.amountPaidInformedCents;
    current.credited += installment.bankCredit.amountCents ?? 0;
    byProgram.set(key, current);
  }
  for (const item of [...byProgram.values()].sort((a, b) => a.action.localeCompare(b.action, 'pt-BR') || a.parcel.localeCompare(b.parcel, 'pt-BR'))) {
    const row = sheet.addRow([item.action, item.parcel, item.count, reais(item.programmed), reais(item.paid), reais(item.credited)]);
    for (const col of [4, 5, 6]) row.getCell(col).numFmt = MONEY;
  }

  sheet.addRow([]);
  const movementSection = sheet.addRow(['Movimentações de 2026 por categoria auxiliar']);
  sheet.mergeCells(movementSection.number, 1, movementSection.number, 4);
  styleSection(movementSection);
  const mh = sheet.addRow(['Categoria auxiliar', 'Lançamentos', 'Créditos', 'Débitos']);
  styleColumnHeader(mh);
  const movementSummary = new Map<string, { count: number; credit: number; debit: number }>();
  const labels = ['Crédito FNDE', 'Aplicação financeira', 'Resgate de aplicação', 'Pagamento / transferência', 'Pagamento por cartão', 'Rendimento financeiro', 'Entrada registrada no extrato', 'Tarifa bancária', 'Estorno / reversão', 'Sem categoria auxiliar'];
  for (const label of labels) movementSummary.set(label, { count: 0, credit: 0, debit: 0 });
  for (const { entry } of entries) {
    const label = entry.neutralCategory ?? 'Sem categoria auxiliar';
    const current = movementSummary.get(label) ?? { count: 0, credit: 0, debit: 0 };
    current.count += 1;
    current.credit += entry.creditCents ?? 0;
    current.debit += entry.debitCents ?? 0;
    movementSummary.set(label, current);
  }
  for (const label of labels) {
    const item = movementSummary.get(label)!;
    const row = sheet.addRow([label, item.count, reais(item.credit), reais(item.debit)]);
    row.getCell(3).numFmt = MONEY;
    row.getCell(4).numFmt = MONEY;
  }
  const note = sheet.addRow(['Nota sobre rendimentos', 'Zero movimentos classificados significa apenas que nenhum histórico de 2026 foi suficientemente explícito para essa categoria nesta coleta; não significa ausência de rendimento da aplicação.']);
  sheet.mergeCells(note.number, 2, note.number, 8);
  note.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF6E5' } }; cell.font = { italic: true, color: { argb: '7A5A24' } }; cell.alignment = { wrapText: true }; });

  sheet.columns = [{ width: 34 }, { width: 18 }, { width: 16 }, { width: 19 }, { width: 20 }, { width: 22 }, { width: 18 }, { width: 18 }];
}

function buildUnits(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Unidades', { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells('A1:K1');
  sheet.getCell('A1').value = 'Carteira das 163 Unidades Escolares · PDDE 2026';
  styleTitle(sheet.getRow(1));
  const header = sheet.addRow(['SME', 'Unidade Escolar', 'INEP', 'CNPJ UEx', 'Programas / ações', 'Contas', 'Movimentos 2026', 'Previsto 2026', 'Pagamento informado', 'Crédito localizado SIGEF', 'Saldo PDDEInfo']);
  styleColumnHeader(header);

  schools.forEach((item, index) => {
    const installments = item.repasses.flatMap((repasse) => repasse.installments);
    const programs = item.repasses.map((repasse) => repasse.action).join(' · ');
    const movements = item.statements.reduce((sum, statement) => sum + statement.entries.length, 0);
    const programmed = installments.reduce((sum, installment) => sum + installment.amountProgrammedCents, 0);
    const paid = installments.reduce((sum, installment) => sum + installment.amountPaidInformedCents, 0);
    const credited = installments.reduce((sum, installment) => sum + (installment.bankCredit.amountCents ?? 0), 0);
    const balance = item.statements.reduce((sum, statement) => sum + (statement.saldoPddeInfoCents ?? 0), 0);
    const row = sheet.addRow([item.school.sme, item.school.name, item.school.inep, item.school.cnpj, programs, item.statements.length, movements, reais(programmed), reais(paid), reais(credited), reais(balance)]);
    for (const col of [8, 9, 10, 11]) row.getCell(col).numFmt = MONEY;
    if (index % 2 === 0) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7FAFC' } }; });
  });
  for (const col of [1, 3, 4]) textColumn(sheet, col);
  sheet.autoFilter = { from: 'A2', to: 'K2' };
  sheet.columns = [{ width: 12 }, { width: 40 }, { width: 13 }, { width: 20 }, { width: 44 }, { width: 10 }, { width: 16 }, { width: 17 }, { width: 18 }, { width: 21 }, { width: 18 }];
}

function buildRepasses(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Repasses por Escola', { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells('A1:M1');
  sheet.getCell('A1').value = 'Repasses 2026 · leitura por unidade, ação e parcela';
  styleTitle(sheet.getRow(1));
  sheet.mergeCells('A2:M2');
  sheet.getCell('A2').value = 'Cada bloco começa pela unidade escolar; as parcelas são preservadas como aparecem no PDDEInfo. Pagamento não informado não é classificado como erro ou atraso.';
  styleInfo(sheet.getRow(2));

  for (const item of schools) {
    writeSchoolHeader(sheet, item.school, 13);
    const header = sheet.addRow(['Ação / programa', 'Parcela', 'Previsto PDDEInfo', 'Pagamento informado', 'Data no PDDEInfo', 'Banco / Agência / Conta', 'Informação disponível nas fontes', 'Data crédito SIGEF', 'Crédito SIGEF', 'Documento', 'Observação neutra', 'Código programa', 'Fonte da parcela']);
    styleColumnHeader(header);
    for (const repasse of item.repasses) {
      for (const installment of repasse.installments) {
        const row = sheet.addRow([
          repasse.action,
          installment.installment ?? '—',
          reais(installment.amountProgrammedCents),
          reais(installment.amountPaidInformedCents),
          brDate(installment.pddeInfoDate),
          accountText(installment.account),
          creditStatusText(installment.bankCredit.presentationStatus),
          brDate(installment.bankCredit.date),
          reais(installment.bankCredit.amountCents),
          installment.bankCredit.document ?? '',
          installment.note ?? '',
          repasse.programCode,
          installment.installment ?? 'Sem divisão de parcela na fonte',
        ]);
        for (const col of [3, 4, 9]) row.getCell(col).numFmt = MONEY;
        for (const col of [1, 6, 7, 10, 11, 13]) row.getCell(col).alignment = { vertical: 'top', wrapText: true };
        row.getCell(10).numFmt = '@';
        row.getCell(12).numFmt = '@';
      }
    }
    sheet.addRow([]);
  }
  sheet.columns = [{ width: 32 }, { width: 14 }, { width: 17 }, { width: 18 }, { width: 16 }, { width: 34 }, { width: 50 }, { width: 16 }, { width: 16 }, { width: 26 }, { width: 48 }, { width: 14 }, { width: 28 }];
}

function buildStatements(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('Extratos por Escola', { views: [{ state: 'frozen', ySplit: 2 }] });
  sheet.mergeCells('A1:L1');
  sheet.getCell('A1').value = 'Extratos 2026 · histórico original do SIGEF em ordem cronológica';
  styleTitle(sheet.getRow(1));
  sheet.mergeCells('A2:L2');
  sheet.getCell('A2').value = 'Leitura: unidade → conta/programa → lançamentos. Crédito e débito aparecem em colunas separadas; o histórico da fonte é preservado e a categoria auxiliar não substitui o texto do SIGEF.';
  styleInfo(sheet.getRow(2));

  for (const item of schools) {
    writeSchoolHeader(sheet, item.school, 12);
    if (item.statements.length === 0) {
      const row = sheet.addRow(['Nenhuma conta exibida na coleta atual do PDDEInfo.']);
      sheet.mergeCells(row.number, 1, row.number, 12);
      row.getCell(1).font = { italic: true, color: { argb: DARK } };
      sheet.addRow([]);
      continue;
    }
    for (const statement of item.statements) {
      const accountRow = sheet.addRow([`${statement.programLabel} (${statement.programCode}) | ${accountText(statement.account)} | Saldo PDDEInfo: ${statement.saldoPddeInfoCents === null ? 'não informado' : `R$ ${(statement.saldoPddeInfoCents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} | Cobertura SIGEF: ${statement.collectionStatus}${statement.coverageThrough ? ` até ${statement.coverageThrough}` : ''}`]);
      sheet.mergeCells(accountRow.number, 1, accountRow.number, 12);
      styleAccountHeader(accountRow);
      const header = sheet.addRow(['Data', 'Histórico original SIGEF', 'Documento', 'Crédito', 'Débito', 'Doc. contraparte', 'Contraparte', 'Banco', 'Agência', 'Conta', 'Categoria auxiliar', 'Fonte']);
      styleColumnHeader(header);
      if (statement.entries.length === 0) {
        const row = sheet.addRow(['Sem lançamentos de 2026 nesta conta na coleta atual.']);
        sheet.mergeCells(row.number, 1, row.number, 12);
        row.getCell(1).font = { italic: true, color: { argb: DARK } };
      } else {
        for (const entry of statement.entries) {
          const row = sheet.addRow([brDate(entry.date), entry.history, entry.document, reais(entry.creditCents), reais(entry.debitCents), entry.counterparty.document ?? '', entry.counterparty.name ?? '', entry.counterparty.bank ?? '', entry.counterparty.agency ?? '', entry.counterparty.account ?? '', entry.neutralCategory ?? '', entry.sourceUrl]);
          row.getCell(4).numFmt = MONEY;
          row.getCell(5).numFmt = MONEY;
          for (const col of [2, 3, 6, 7, 11, 12]) row.getCell(col).alignment = { vertical: 'top', wrapText: true };
          for (const col of [3, 6, 8, 9, 10]) row.getCell(col).numFmt = '@';
        }
      }
      sheet.addRow([]);
    }
    sheet.addRow([]);
  }
  sheet.columns = [{ width: 14 }, { width: 36 }, { width: 26 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 34 }, { width: 11 }, { width: 12 }, { width: 18 }, { width: 24 }, { width: 48 }];
}

type ReviewRow = [string, string, string, string, string, string, string, number | null, string, string];

function reviewRows(schools: FiscalSchoolView[]): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const item of schools) {
    for (const repasse of item.repasses) {
      for (const installment of repasse.installments) {
        if (installment.amountPaidInformedCents > 0 && requiresRepasseReview(installment.bankCredit.presentationStatus)) {
          rows.push([item.school.sme, item.school.name, item.school.inep, 'Repasse', repasse.action, installment.installment ?? '—', brDate(installment.pddeInfoDate), reais(installment.amountPaidInformedCents), creditStatusText(installment.bankCredit.presentationStatus), installment.bankCredit.document ?? '']);
        }
      }
    }
    for (const statement of item.statements) {
      for (const entry of statement.entries) {
        if (entry.technicalClassification === 'TARIFA_BANCARIA' || entry.technicalClassification === 'ENTRADA_TERCEIRO' || entry.technicalClassification === 'MOVIMENTO_NAO_CLASSIFICADO') {
          rows.push([item.school.sme, item.school.name, item.school.inep, 'Movimentação', statement.programLabel, '—', brDate(entry.date), reais(entry.creditCents ?? entry.debitCents), `${entry.history}${entry.neutralCategory ? ` | ${entry.neutralCategory}` : ' | Sem categoria auxiliar'}`, entry.document]);
        }
      }
    }
  }
  return rows.sort((a, b) => a[0].localeCompare(b[0]) || a[6].localeCompare(b[6], 'pt-BR'));
}

function buildReview(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const rows = reviewRows(schools);
  const sheet = workbook.addWorksheet('Registros para Conferência', { views: [{ state: 'frozen', ySplit: 3 }] });
  sheet.mergeCells('A1:J1');
  sheet.getCell('A1').value = 'Registros para Conferência · seleção automática de fatos que merecem leitura humana';
  styleTitle(sheet.getRow(1));
  sheet.mergeCells('A2:J2');
  sheet.getCell('A2').value = 'Esta aba não classifica regularidade. Ela apenas reúne situações objetivas das fontes para facilitar a conferência dos fiscais.';
  styleInfo(sheet.getRow(2));
  const header = sheet.addRow(['SME', 'Unidade Escolar', 'INEP', 'Tipo de registro', 'Programa / ação', 'Parcela', 'Data', 'Valor', 'Descrição factual', 'Documento / referência']);
  styleColumnHeader(header);
  rows.forEach((values, index) => {
    const row = sheet.addRow(values);
    row.getCell(8).numFmt = MONEY;
    row.getCell(10).numFmt = '@';
    row.getCell(9).alignment = { vertical: 'top', wrapText: true };
    if (index % 2 === 0) row.eachCell((cell) => { cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F7FAFC' } }; });
  });
  sheet.autoFilter = { from: 'A3', to: 'J3' };
  sheet.columns = [{ width: 12 }, { width: 40 }, { width: 13 }, { width: 18 }, { width: 30 }, { width: 14 }, { width: 14 }, { width: 16 }, { width: 64 }, { width: 26 }];
}

function buildBaseRepasses(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('BASE - Repasses', { views: [{ state: 'frozen', ySplit: 1 }] });
  const header = sheet.addRow(['SME', 'Unidade Escolar', 'INEP', 'CNPJ UEx', 'Código programa', 'Ação / programa', 'Parcela', 'Previsto PDDEInfo', 'Pagamento informado', 'Data no PDDEInfo', 'Banco', 'Agência', 'Conta', 'Informação disponível nas fontes', 'Data crédito SIGEF', 'Crédito SIGEF', 'Documento bancário', 'Status técnico']);
  styleColumnHeader(header);
  for (const item of schools) for (const repasse of item.repasses) for (const installment of repasse.installments) {
    const row = sheet.addRow([item.school.sme, item.school.name, item.school.inep, item.school.cnpj, repasse.programCode, repasse.action, installment.installment ?? 'Sem divisão', reais(installment.amountProgrammedCents), reais(installment.amountPaidInformedCents), brDate(installment.pddeInfoDate), installment.account?.bank ?? '', installment.account?.agency ?? '', installment.account?.number ?? '', creditStatusText(installment.bankCredit.presentationStatus), brDate(installment.bankCredit.date), reais(installment.bankCredit.amountCents), installment.bankCredit.document ?? '', installment.bankCredit.technicalStatus]);
    for (const col of [8, 9, 16]) row.getCell(col).numFmt = MONEY;
    for (const col of [1, 3, 4, 5, 11, 12, 13, 17, 18]) row.getCell(col).numFmt = '@';
  }
  sheet.autoFilter = { from: 'A1', to: 'R1' };
  sheet.columns = [{ width: 12 }, { width: 38 }, { width: 13 }, { width: 20 }, { width: 14 }, { width: 32 }, { width: 16 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 52 }, { width: 16 }, { width: 16 }, { width: 28 }, { width: 24 }];
}

function buildBaseMovements(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('BASE - Movimentos', { views: [{ state: 'frozen', ySplit: 1 }] });
  const header = sheet.addRow(['SME', 'Unidade Escolar', 'INEP', 'CNPJ UEx', 'Código programa', 'Programa', 'Banco', 'Agência', 'Conta', 'Data', 'Histórico original SIGEF', 'Documento', 'Crédito', 'Débito', 'Doc. contraparte', 'Contraparte', 'Banco contraparte', 'Agência contraparte', 'Conta contraparte', 'Categoria auxiliar', 'Classificação técnica', 'Fonte']);
  styleColumnHeader(header);
  for (const item of schools) for (const statement of item.statements) for (const entry of statement.entries) {
    const row = sheet.addRow([item.school.sme, item.school.name, item.school.inep, item.school.cnpj, statement.programCode, statement.programLabel, statement.account.bank, statement.account.agency, statement.account.number, brDate(entry.date), entry.history, entry.document, reais(entry.creditCents), reais(entry.debitCents), entry.counterparty.document ?? '', entry.counterparty.name ?? '', entry.counterparty.bank ?? '', entry.counterparty.agency ?? '', entry.counterparty.account ?? '', entry.neutralCategory ?? 'Sem categoria auxiliar', entry.technicalClassification, entry.sourceUrl]);
    row.getCell(13).numFmt = MONEY;
    row.getCell(14).numFmt = MONEY;
    for (const col of [1, 3, 4, 5, 7, 8, 9, 12, 15, 17, 18, 19, 21]) row.getCell(col).numFmt = '@';
  }
  sheet.autoFilter = { from: 'A1', to: 'V1' };
  sheet.columns = [{ width: 12 }, { width: 38 }, { width: 13 }, { width: 20 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 14 }, { width: 36 }, { width: 26 }, { width: 15 }, { width: 15 }, { width: 20 }, { width: 34 }, { width: 14 }, { width: 14 }, { width: 18 }, { width: 24 }, { width: 24 }, { width: 48 }];
}

function buildBaseAccounts(workbook: ExcelJS.Workbook, schools: FiscalSchoolView[]): void {
  const sheet = workbook.addWorksheet('BASE - Contas', { views: [{ state: 'frozen', ySplit: 1 }] });
  const header = sheet.addRow(['SME', 'Unidade Escolar', 'INEP', 'CNPJ UEx', 'Código programa', 'Programa', 'Banco', 'Agência', 'Conta', 'Saldo PDDEInfo', 'Status consulta SIGEF', 'Cobertura até', 'Movimentos 2026', 'Total declarado', 'Páginas consultadas']);
  styleColumnHeader(header);
  for (const item of schools) for (const statement of item.statements) {
    const row = sheet.addRow([item.school.sme, item.school.name, item.school.inep, item.school.cnpj, statement.programCode, statement.programLabel, statement.account.bank, statement.account.agency, statement.account.number, reais(statement.saldoPddeInfoCents), statement.collectionStatus, statement.coverageThrough ?? '', statement.entries.length, statement.declaredTotal, statement.pagesFetched]);
    row.getCell(10).numFmt = MONEY;
    for (const col of [1, 3, 4, 5, 7, 8, 9, 11]) row.getCell(col).numFmt = '@';
  }
  sheet.autoFilter = { from: 'A1', to: 'O1' };
  sheet.columns = [{ width: 12 }, { width: 38 }, { width: 13 }, { width: 20 }, { width: 14 }, { width: 22 }, { width: 10 }, { width: 10 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }];
}

function buildLegend(workbook: ExcelJS.Workbook): void {
  const sheet = workbook.addWorksheet('Legenda e Fontes');
  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'Como ler este arquivo';
  styleTitle(sheet.getRow(1));
  const header = sheet.addRow(['Princípio', 'Como ler', 'Regra de apresentação']);
  styleColumnHeader(header);
  const rows = [
    ['Unidade escolar', 'É o eixo principal da leitura', 'Os dados são agrupados por escola antes de programa, conta, parcela e movimentação.'],
    ['Parcela', 'Mantida conforme PDDEInfo', '1ª Parcela, 2ª Parcela, P1, P2 ou Sem divisão quando a fonte não traz parcela.'],
    ['Previsto PDDEInfo', 'Valor programado na fonte', 'Não significa que o valor já tenha sido pago ou creditado.'],
    ['Pagamento informado', 'Valor/data apresentados pelo PDDEInfo', 'É apresentado separadamente do crédito bancário.'],
    ['Crédito SIGEF', 'Lançamento compatível localizado no extrato', 'É a informação bancária encontrada; não substitui a análise documental da prestação de contas.'],
    ['Correlação automática', 'A ausência de correspondência única é uma limitação do algoritmo, não prova de ausência do pagamento', 'Só conta ausente, ambiguidade real ou consulta inconclusiva entram em Registros para Conferência.'],
    ['Pagamento ainda não informado', 'A fonte ainda não apresenta pagamento para a parcela', 'Não é mostrado como erro, atraso ou irregularidade.'],
    ['Histórico original SIGEF', 'Texto original do extrato', 'Não é reescrito. A categoria auxiliar aparece separadamente.'],
    ['Categoria auxiliar', 'Descrição neutra para facilitar leitura', 'Não representa juízo sobre regularidade, finalidade ou correção da despesa.'],
    ['Registros para Conferência', 'Seleção de fatos objetivos', 'Não são alertas de irregularidade nem conclusões automáticas.'],
    ['Rendimento financeiro', 'Apenas quando o histórico bancário permite classificação explícita', 'Zero movimentos classificados não significa ausência de rendimento; a remuneração pode não aparecer como lançamento explícito no extrato consultado.'],
    ['BASE - Repasses', 'Uma linha por ação/parcela', 'Use para filtros, tabelas dinâmicas, cruzamentos e análises próprias.'],
    ['BASE - Movimentos', 'Uma linha por lançamento SIGEF de 2026', 'Crédito e débito ficam em colunas separadas.'],
    ['BASE - Contas', 'Uma linha por conta vinculada', 'Inclui saldo PDDEInfo e cobertura da consulta SIGEF.'],
  ];
  for (const values of rows) {
    const row = sheet.addRow(values);
    row.eachCell((cell) => { cell.alignment = { vertical: 'top', wrapText: true }; });
  }
  sheet.addRow([]);
  const sourceTitle = sheet.addRow(['Fontes']);
  sheet.mergeCells(sourceTitle.number, 1, sourceTitle.number, 3);
  styleSection(sourceTitle);
  const sourceHeader = sheet.addRow(['Fonte', 'Uso neste arquivo', 'Observação']);
  styleColumnHeader(sourceHeader);
  const sourceRows = [
    ['PDDEInfo / FNDE', 'Unidade, UEx, CNPJ, programas, parcelas, valores, datas, contas e saldos', 'Retrato da fonte na data da coleta.'],
    ['SIGEF / FNDE', 'Movimentações bancárias, créditos, débitos, documentos, históricos e contrapartes quando disponíveis', 'Histórico original preservado na base e no extrato por escola.'],
  ];
  for (const values of sourceRows) {
    const row = sheet.addRow(values);
    row.eachCell((cell) => { cell.alignment = { vertical: 'top', wrapText: true }; });
  }
  sheet.columns = [{ width: 30 }, { width: 48 }, { width: 72 }];
}

const options = parseArgs(process.argv.slice(2));
const raw = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
const view = buildFiscalHumanView(raw);
const workbook = new ExcelJS.Workbook();
workbook.creator = 'PDDE Repasse Conciliador';
workbook.created = new Date();
workbook.modified = new Date();

buildDashboard(workbook, view);
buildUnits(workbook, view.schools);
buildRepasses(workbook, view.schools);
buildStatements(workbook, view.schools);
buildReview(workbook, view.schools);
buildBaseRepasses(workbook, view.schools);
buildBaseMovements(workbook, view.schools);
buildBaseAccounts(workbook, view.schools);
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
process.stdout.write(`${JSON.stringify({
  output: options.output,
  schools: view.schools.length,
  sheets: workbook.worksheets.map((sheet) => sheet.name),
}, null, 2)}\n`);
