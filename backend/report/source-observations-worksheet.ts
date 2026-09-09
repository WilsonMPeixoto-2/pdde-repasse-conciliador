import ExcelJS from 'exceljs';
import type { SourceObservation } from '../../shared/source-observation';

const SHEET_NAME = 'Observações das Fontes';
const NAVY = '183B56';
const BLUE = '2F6F91';
const PALE = 'EAF2F6';
const WHITE = 'FFFFFF';
const DARK = '203746';
const MUTED = '617784';
const BORDER = 'D8E2E8';

const SOURCE_LABELS: Record<SourceObservation['source'], string> = {
  PDDEINFO: 'PDDEInfo',
  SIGEF_EXTRATO: 'SIGEF · Extrato',
  SIGEF_LIBERACOES: 'SIGEF · Liberações',
};

const COLLECTION_LABELS: Record<SourceObservation['collectionStatus'], string> = {
  COMPLETE: 'Completa',
  PARTIAL: 'Parcial',
  FAILED: 'Falhou',
  NOT_ATTEMPTED: 'Não tentada',
};

const BASIS_LABELS: Record<SourceObservation['observationBasis'], string> = {
  QUERY_TIMESTAMP: 'Momento da consulta',
  LATEST_MOVEMENT_RETURNED: 'Último movimento devolvido',
  LATEST_RELEASE_RETURNED: 'Última liberação devolvida',
};

const METRIC_LABELS: Record<string, string> = {
  schoolsCollected: 'Escolas coletadas',
  failures: 'Falhas',
  accountsQueried: 'Contas consultadas',
  accountsComplete: 'Contas completas',
  accountsPartial: 'Contas parciais',
  accountsFailed: 'Contas com falha',
  movementsInFiscalYear: 'Movimentações do exercício',
  queriesAttempted: 'Consultas tentadas',
  queriesSucceeded: 'Consultas concluídas',
  queriesFailed: 'Consultas com falha',
  releaseRows: 'Liberações devolvidas',
  releaseMatches: 'Liberações conciliadas',
  recoveredAccounts: 'Contas recuperadas',
  confirmedAccounts: 'Contas confirmadas',
  accountMismatches: 'Divergências de conta',
  ambiguousMatches: 'Associações ambíguas',
  notFound: 'Não localizadas',
  errors: 'Erros',
};

function brDate(value: string | null): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function brDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'medium',
    timeZone: 'America/Sao_Paulo',
  }).format(parsed);
}

function header(row: ExcelJS.Row): void {
  row.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLUE } };
    cell.font = { bold: true, color: { argb: WHITE }, size: 10 };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = { bottom: { style: 'thin', color: { argb: BORDER } } };
  });
  row.height = 32;
}

export function appendSourceObservationsWorksheet(
  workbook: ExcelJS.Workbook,
  observations: readonly SourceObservation[] | undefined,
): void {
  if (!observations || observations.length === 0 || workbook.getWorksheet(SHEET_NAME)) return;

  const sheet = workbook.addWorksheet(SHEET_NAME, { views: [{ state: 'frozen', ySplit: 3 }] });
  sheet.mergeCells('A1:I1');
  sheet.getCell('A1').value = 'Observações das fontes · coleta e cobertura factual';
  sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  sheet.getCell('A1').font = { bold: true, color: { argb: WHITE }, size: 16 };
  sheet.getRow(1).height = 32;

  sheet.mergeCells('A2:I2');
  sheet.getCell('A2').value = 'Datas e contagens abaixo descrevem o que cada fonte efetivamente devolveu. Defasagem observada não comprova desatualização nem ausência financeira; por isso o frescor permanece não inferido.';
  sheet.getCell('A2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
  sheet.getCell('A2').font = { color: { argb: MUTED }, size: 10 };
  sheet.getCell('A2').alignment = { vertical: 'middle', wrapText: true };
  sheet.getRow(2).height = 36;

  header(sheet.addRow([
    'Fonte', 'Status da coleta', 'Coletado em', 'Base da observação', 'Observado até',
    'Defasagem observada (dias)', 'Conclusão de frescor', 'Métrica', 'Quantidade',
  ]));

  for (const observation of observations) {
    const metrics = Object.entries(observation.metrics).sort(([left], [right]) => left.localeCompare(right));
    const rows = metrics.length > 0 ? metrics : [['', 0] as [string, number]];
    for (const [metric, quantity] of rows) {
      sheet.addRow([
        SOURCE_LABELS[observation.source],
        COLLECTION_LABELS[observation.collectionStatus],
        brDateTime(observation.collectedAt),
        BASIS_LABELS[observation.observationBasis],
        brDate(observation.observedThrough),
        observation.observedLagDays,
        'Frescor não inferido',
        metric ? (METRIC_LABELS[metric] ?? metric) : '',
        quantity,
      ]);
    }
  }

  for (let rowNumber = 4; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.alignment = { vertical: 'top', wrapText: true };
    row.eachCell((cell) => {
      cell.font = { color: { argb: DARK }, size: 10 };
      cell.border = { bottom: { style: 'hair', color: { argb: BORDER } } };
    });
  }
  sheet.columns = [
    { width: 22 }, { width: 18 }, { width: 23 }, { width: 31 }, { width: 16 },
    { width: 23 }, { width: 23 }, { width: 30 }, { width: 13 },
  ];
  sheet.autoFilter = { from: 'A3', to: 'I3' };
}
