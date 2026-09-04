import ExcelJS from 'exceljs';
import type { HumanFinancialPortfolioView, HumanFinancialSchoolView } from '../application/build-human-financial-view';
import {
  derivePddeBasicPortfolio,
  pddeBasicBalanceLocationLabel,
  pddeBasicEvidenceStateLabel,
  type PddeBasicSchoolReading,
} from '../../shared/pdde-basic-monitoring';
import {
  derivePddeBasicFirstCycleReleaseEvidence,
  pddeBasicReleaseEvidenceLabel,
  type PddeBasicReleaseEvidenceReading,
} from '../../shared/pdde-basic-release-evidence';
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
const PALE_BLUE = 'E8F2FA';
const MONEY = 'R$ #,##0.00';

function reais(cents: number | null): number | null {
  return cents === null ? null : cents / 100;
}

function brDate(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
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

function balanceComparable(row: PddeBasicSchoolReading): boolean {
  return row.first.state === 'PAID_INFORMED'
    && Boolean(row.first.paymentInformedDate)
    && Boolean(row.balance.referenceDate)
    && row.balance.totalCents !== null
    && (row.balance.referenceDate as string) >= (row.first.paymentInformedDate as string);
}

function releaseEvidenceMap(view: HumanFinancialPortfolioView): Map<string, PddeBasicReleaseEvidenceReading> {
  return new Map(view.schools.map((school) => [
    school.school.inep,
    derivePddeBasicFirstCycleReleaseEvidence(school),
  ]));
}

function rebuildManagerialOverview(
  workbook: ExcelJS.Workbook,
  view: HumanFinancialPortfolioView,
): void {
  const sheet = workbook.getWorksheet('Visão Geral');
  if (!sheet) return;
  resetSheet(sheet);

  const monitoring = derivePddeBasicPortfolio(view.schools);
  const releaseByInep = releaseEvidenceMap(view);
  const independentCount = monitoring.rows.filter((row) => (
    releaseByInep.get(row.inep)?.hasIndependentSigefEvidence === true
  )).length;
  const comparable = monitoring.rows.filter(balanceComparable);
  const staleExtractCount = monitoring.rows.filter((row) => (
    releaseByInep.get(row.inep)?.extractFreshness === 'STALE_BEFORE_RELEASE'
  )).length;
  const checkingCount = comparable.filter((row) => (row.balance.checkingCents ?? 0) > 0).length;
  const applicationCount = comparable.filter((row) => (row.balance.applicationsCents ?? 0) > 0).length;
  const bothCount = comparable.filter((row) => (
    (row.balance.checkingCents ?? 0) > 0 && (row.balance.applicationsCents ?? 0) > 0
  )).length;
  const evidenceGapCount = monitoring.firstPaidCount - independentCount;

  sheet.mergeCells('A1:C1');
  sheet.getCell('A1').value = 'Painel Gerencial · PDDE 2026 · 4ª CRE';
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getCell('A1').font = { bold: true, color: { argb: WHITE }, size: 16 };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:C2');
  sheet.getCell('A2').value = `${view.referenceLabel}. Pagamento informado, liberação/OB, crédito no extrato e posição de saldo são evidências distintas e datadas.`;
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
    'Para quem o FNDE informa pagamento do 1º ciclo?',
    `${monitoring.firstPaidCount} de ${monitoring.schoolCount}`,
    `${monitoring.firstRegularCount} no PDDE Básico regular + ${monitoring.firstInfancyCount} em Primeira Infância/P1.`,
    monitoring.firstPendingCount === 0 ? 'positive' : 'attention',
  );
  answerRow(
    sheet,
    6,
    'Quantas têm evidência independente do 1º ciclo no SIGEF?',
    `${independentCount} de ${monitoring.firstPaidCount}`,
    'Conta crédito localizado no extrato ou liberação/OB localizada no SIGEF. Liberação não é confundida com crédito bancário.',
    evidenceGapCount === 0 ? 'positive' : 'attention',
  );
  answerRow(
    sheet,
    7,
    'Quantas têm posição de saldo comparável ao pagamento do 1º ciclo?',
    `${comparable.length} de ${monitoring.firstPaidCount}`,
    `${monitoring.firstPaidCount - comparable.length} ainda não têm posição pública de saldo posterior ou igual à data do pagamento.`,
    comparable.length === monitoring.firstPaidCount ? 'positive' : 'attention',
  );
  answerRow(
    sheet,
    8,
    'Onde há valor nas posições temporalmente comparáveis?',
    `${checkingCount} em conta · ${applicationCount} em aplicações`,
    `${bothCount} escolas aparecem simultaneamente em conta corrente e aplicações.`,
    'neutral',
  );
  answerRow(
    sheet,
    9,
    'Para quem o FNDE informa pagamento do 2º ciclo?',
    `${monitoring.secondPaidCount} de ${monitoring.schoolCount}`,
    `${monitoring.secondPendingCount} ainda sem pagamento informado da 2ª parcela/P2.`,
    monitoring.secondPaidCount > 0 ? 'positive' : 'neutral',
  );
  answerRow(
    sheet,
    10,
    'Quantos extratos SIGEF estão defasados em relação à liberação?',
    staleExtractCount,
    'Se o extrato termina antes da liberação, ausência de crédito não é ausência de repasse. O caso continua aberto para fonte mais recente.',
    staleExtractCount > 0 ? 'attention' : 'positive',
  );
  answerRow(
    sheet,
    11,
    'Quantas têm inconsistência temporalmente comparável?',
    monitoring.trueInconsistencyCount,
    'Só há alerta quando a posição é posterior/igual ao pagamento, permanece zerada e a cadeia de evidências continua incompleta.',
    monitoring.trueInconsistencyCount > 0 ? 'attention' : 'positive',
  );
  answerRow(
    sheet,
    12,
    'Quantas ainda precisam de reforço de evidência?',
    monitoring.rows.filter((row) => (
      row.firstEvidence.needsSourceEscalation
      || releaseByInep.get(row.inep)?.needsFreshExtract === true
      || (row.first.state === 'PAID_INFORMED' && releaseByInep.get(row.inep)?.hasIndependentSigefEvidence !== true)
    )).length,
    'O sistema continua procurando extrato mais novo, posição posterior ou fonte pública complementar em vez de transformar lacuna em conclusão.',
    'attention',
  );

  sheet.getRow(14).values = ['Onde está o saldo nas posições comparáveis'];
  sheet.mergeCells('A14:C14');
  sheet.getCell('A14').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
  sheet.getCell('A14').font = { bold: true, color: { argb: NAVY } };
  const compositionHeader = sheet.getRow(15);
  compositionHeader.values = ['Composição', 'Escolas', 'Valor total'];
  header(compositionHeader);
  const checkingTotal = comparable.reduce((sum, row) => sum + (row.balance.checkingCents ?? 0), 0);
  const applicationsTotal = comparable.reduce((sum, row) => sum + (row.balance.applicationsCents ?? 0), 0);
  const total = comparable.reduce((sum, row) => sum + (row.balance.totalCents ?? 0), 0);
  sheet.getRow(16).values = ['Conta corrente', checkingCount, reais(checkingTotal)];
  sheet.getRow(17).values = ['Aplicações', applicationCount, reais(applicationsTotal)];
  sheet.getRow(18).values = ['Saldo total PDDE', comparable.length, reais(total)];
  for (const rowNumber of [16, 17, 18]) sheet.getRow(rowNumber).getCell(3).numFmt = MONEY;
  sheet.getRow(18).font = { bold: true, color: { argb: DARK } };

  sheet.getRow(20).values = ['Próximas leituras'];
  sheet.mergeCells('A20:C20');
  sheet.getCell('A20').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sheet.getCell('A20').font = { bold: true, color: { argb: NAVY } };
  sheet.getRow(21).values = [
    { text: 'Abrir PDDE Básico', hyperlink: "#'PDDE Básico'!A1" },
    'Escola por escola: pagamento, evidência SIGEF, conta e localização temporalmente válida.',
    '',
  ];
  sheet.getRow(22).values = [
    { text: 'Abrir Lacunas e Exceções', hyperlink: "#'Lacunas e Exceções'!A1" },
    'Casos que ainda exigem fonte complementar, extrato mais novo ou nova referência de saldo.',
    '',
  ];

  styleRows(sheet, 4);
  sheet.columns = [{ width: 46 }, { width: 29 }, { width: 78 }];
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
}

function accountLabel(release: PddeBasicReleaseEvidenceReading): string {
  const account = release.destinationAccount;
  return account ? `${account.bank} · ag. ${account.agency} · cc ${account.number}` : 'Não identificada';
}

function currentLocation(row: PddeBasicSchoolReading): string {
  return balanceComparable(row)
    ? pddeBasicBalanceLocationLabel(row.balance.location)
    : 'Localização atual não comprovada';
}

function latestPositionLabel(row: PddeBasicSchoolReading): string {
  if (!row.balance.referenceDate) return 'Sem posição pública de saldo.';
  const suffix = row.first.state === 'PAID_INFORMED' && !balanceComparable(row)
    ? ' · histórica, anterior ao pagamento'
    : ' · temporalmente comparável ao pagamento';
  return `${brDate(row.balance.referenceDate)} · ${pddeBasicBalanceLocationLabel(row.balance.location)} · total ${reais(row.balance.totalCents)?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) ?? 'não informado'}${suffix}`;
}

function coverageLabel(release: PddeBasicReleaseEvidenceReading): string {
  if (release.extractFreshness === 'STALE_BEFORE_RELEASE') {
    return `Extrato SIGEF defasado${release.statementCoverageThrough ? ` até ${brDate(release.statementCoverageThrough)}` : ''}`;
  }
  if (release.extractFreshness === 'CURRENT_THROUGH_RELEASE') {
    return release.statementCoverageThrough
      ? `Extrato cobre pelo menos ${brDate(release.statementCoverageThrough)}`
      : 'Crédito localizado em data compatível com a liberação';
  }
  if (release.extractFreshness === 'NO_STATEMENT') return 'Extrato da conta sem cobertura utilizável nesta coleta';
  return 'Cobertura do extrato não determinada';
}

function gapForEvidence(row: PddeBasicSchoolReading): FinancialGapKind | null {
  if (row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT') return 'BALANCE_REFERENCE_BEFORE_PAYMENT';
  if (row.firstEvidence.state === 'ZERO_BALANCE_AFTER_PAYMENT') return 'ZERO_BALANCE_AFTER_PAYMENT';
  if (row.firstEvidence.state === 'NO_BALANCE_POSITION') return 'NO_BALANCE_POSITION';
  if (row.firstEvidence.state === 'POSITIVE_BALANCE_AFTER_PAYMENT' || row.firstEvidence.state === 'PAYMENT_DATE_UNAVAILABLE') return 'PAYMENT_NO_CREDIT';
  return null;
}

function nextAction(
  row: PddeBasicSchoolReading,
  release: PddeBasicReleaseEvidenceReading,
): string {
  if (release.extractFreshness === 'STALE_BEFORE_RELEASE') {
    return 'Buscar extrato público com cobertura posterior à liberação e posição de saldo posterior ao pagamento; não concluir ausência de crédito com extrato defasado.';
  }
  if (release.hasIndependentSigefEvidence && !balanceComparable(row) && row.first.state === 'PAID_INFORMED') {
    return 'Buscar posição de saldo posterior ou igual ao pagamento para localizar o recurso entre conta corrente e aplicações.';
  }
  const gap = gapForEvidence(row);
  if (gap) return resolutionPlanForGap(gap).primaryAction;
  if (release.state === 'CREDIT_LOCATED') return 'Crédito localizado; manter monitoramento de novas parcelas e posições de saldo.';
  if (row.first.state !== 'PAID_INFORMED') return 'Aguardar pagamento informado e manter monitoramento.';
  return 'Manter monitoramento e cruzamento das fontes públicas.';
}

function suggestedSources(row: PddeBasicSchoolReading): string {
  const gap = gapForEvidence(row);
  if (!gap) return '';
  return resolutionPlanForGap(gap).steps
    .map((step) => `${step.source} [${step.state}]`)
    .join(' → ');
}

function rebuildPddeBasicSheet(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const sheet = workbook.getWorksheet('PDDE Básico');
  if (!sheet) return;
  resetSheet(sheet);
  const monitoring = derivePddeBasicPortfolio(view.schools);
  const releaseByInep = releaseEvidenceMap(view);

  sheet.mergeCells('A1:P1');
  sheet.getCell('A1').value = 'PDDE Básico 2026 · pagamento, evidência e localização do recurso';
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getCell('A1').font = { bold: true, color: { argb: WHITE }, size: 16 };
  sheet.getRow(1).height = 32;
  sheet.mergeCells('A2:P2');
  sheet.getCell('A2').value = 'Saldo anterior ao pagamento é preservado como histórico, mas não responde onde o repasse está hoje. Extrato anterior à liberação é marcado como defasado.';
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sheet.getCell('A2').font = { color: { argb: MUTED } };

  const headerRow = sheet.getRow(3);
  headerRow.values = [
    'SME', 'Unidade escolar', 'INEP', 'Pagamento 1º ciclo', 'Data pagamento', 'Conta destinatária',
    'Evidência SIGEF do 1º ciclo', 'Pagamento 2º ciclo', 'Onde está o recurso?', 'Última posição oficial',
    'Leitura temporal / coerência', 'Próxima ação recomendada', 'Cobertura do extrato SIGEF', 'Fontes sugeridas',
    'Modalidade 1º ciclo', 'Modalidade 2º ciclo',
  ];
  header(headerRow);

  for (const item of monitoring.rows) {
    const release = releaseByInep.get(item.inep) ?? derivePddeBasicFirstCycleReleaseEvidence({ programs: [] });
    const row = sheet.addRow([
      item.sme,
      item.name,
      item.inep,
      reais(item.first.paymentInformedCents),
      brDate(item.first.paymentInformedDate),
      accountLabel(release),
      pddeBasicReleaseEvidenceLabel(release),
      reais(item.second.paymentInformedCents),
      currentLocation(item),
      latestPositionLabel(item),
      pddeBasicEvidenceStateLabel(item.firstEvidence.state),
      nextAction(item, release),
      coverageLabel(release),
      suggestedSources(item),
      item.first.track,
      item.second.track,
    ]);
    row.getCell(4).numFmt = MONEY;
    row.getCell(8).numFmt = MONEY;
    if (item.first.paymentInformedCents > 0) {
      row.getCell(4).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_GREEN } };
      row.getCell(4).font = { bold: true, color: { argb: GREEN } };
    }
    if (!balanceComparable(item) && item.first.state === 'PAID_INFORMED') {
      row.getCell(9).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_BLUE } };
      row.getCell(10).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_BLUE } };
    }
    if (release.extractFreshness === 'STALE_BEFORE_RELEASE') {
      row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
      row.getCell(13).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    }
    if (item.firstEvidence.isContradiction) {
      row.getCell(11).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
      row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    }
  }

  styleRows(sheet, 4);
  for (const index of [1, 3]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 40 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 31 },
    { width: 58 }, { width: 18 }, { width: 34 }, { width: 62 }, { width: 62 }, { width: 76 },
    { width: 42 }, { width: 72 }, { width: 28 }, { width: 28 },
  ];
  sheet.views = [{ state: 'frozen', ySplit: 3 }];
  sheet.autoFilter = { from: 'A3', to: 'P3' };
}

function schoolByInep(view: HumanFinancialPortfolioView): Map<string, HumanFinancialSchoolView> {
  return new Map(view.schools.map((school) => [school.school.inep, school]));
}

function buildGapSheet(workbook: ExcelJS.Workbook, view: HumanFinancialPortfolioView): void {
  const existing = workbook.getWorksheet('Lacunas e Exceções');
  if (existing) workbook.removeWorksheet(existing.id);
  const monitoring = derivePddeBasicPortfolio(view.schools);
  const releaseByInep = releaseEvidenceMap(view);
  const schools = schoolByInep(view);
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
    'SME', 'Unidade escolar', 'INEP', 'Pagamento 1º ciclo', 'Data pagamento', 'Conta destinatária',
    'Evidência SIGEF', 'Cobertura extrato', 'Contradição?', 'Última posição', 'Próxima ação', 'Observação',
  ]));

  for (const item of monitoring.rows) {
    const release = releaseByInep.get(item.inep) ?? derivePddeBasicFirstCycleReleaseEvidence({ programs: [] });
    const needsGap = item.firstEvidence.needsSourceEscalation
      || release.needsFreshExtract
      || (item.first.state === 'PAID_INFORMED' && !release.hasIndependentSigefEvidence)
      || (item.first.state === 'PAID_INFORMED' && !balanceComparable(item));
    if (!needsGap) continue;
    const school = schools.get(item.inep);
    const observation = item.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT'
      ? 'A posição disponível é anterior ao pagamento; buscar posição posterior ou igual ao repasse antes de concluir onde está o recurso.'
      : release.extractFreshness === 'STALE_BEFORE_RELEASE'
        ? 'O extrato termina antes da liberação; buscar cobertura posterior. Ausência de crédito neste extrato não prova ausência de repasse.'
        : !release.hasIndependentSigefEvidence
          ? 'Pagamento informado ainda sem segunda evidência SIGEF suficiente nesta coleta.'
          : 'Caso permanece aberto até obter evidência temporalmente comparável.';
    const row = sheet.addRow([
      item.sme,
      item.name,
      item.inep,
      reais(item.first.paymentInformedCents),
      brDate(item.first.paymentInformedDate),
      accountLabel(release),
      pddeBasicReleaseEvidenceLabel(release),
      coverageLabel(release),
      item.firstEvidence.isContradiction ? 'Sim' : 'Não',
      latestPositionLabel(item),
      nextAction(item, release),
      observation,
    ]);
    row.getCell(4).numFmt = MONEY;
    if (item.firstEvidence.isContradiction) {
      row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_YELLOW } };
    } else if (release.extractFreshness === 'STALE_BEFORE_RELEASE' || !balanceComparable(item)) {
      row.getCell(8).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_BLUE } };
      row.getCell(12).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE_BLUE } };
    }
    if (!school) row.getCell(12).value = `${observation} Cadastro detalhado da escola não foi encontrado na visão humana.`;
  }

  styleRows(sheet, 4);
  for (const index of [1, 3]) sheet.getColumn(index).numFmt = '@';
  sheet.columns = [
    { width: 12 }, { width: 40 }, { width: 13 }, { width: 18 }, { width: 16 }, { width: 31 },
    { width: 58 }, { width: 42 }, { width: 15 }, { width: 62 }, { width: 76 }, { width: 72 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'L3' };
}

export function applyManagerialWorkbookLayer(
  workbook: ExcelJS.Workbook,
  view: HumanFinancialPortfolioView,
): ExcelJS.Workbook {
  rebuildManagerialOverview(workbook, view);
  rebuildPddeBasicSheet(workbook, view);
  buildGapSheet(workbook, view);
  return workbook;
}

export function buildManagerialHumanFinancialWorkbook(
  view: HumanFinancialPortfolioView,
  options: BuildHumanFinancialWorkbookOptions = {},
): ExcelJS.Workbook {
  return applyManagerialWorkbookLayer(buildHumanFinancialWorkbook(view, options), view);
}
