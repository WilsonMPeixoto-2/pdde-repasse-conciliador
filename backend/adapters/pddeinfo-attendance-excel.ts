import ExcelJS from 'exceljs';

import type { PddeInfoAttendanceObservation } from './pddeinfo-public-report-normalizer';

const ATTENDANCE_EXCEL_URL =
  'https://webservice.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/excel';

export interface FetchPddeInfoAttendanceExcelOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
  now?: () => string;
}

export interface PddeInfoAttendanceExcelResult {
  sourceUrl: string;
  queriedAt: string;
  httpStatus: number;
  responseBytes: number;
  rows: PddeInfoAttendanceObservation[];
}

function canonical(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function digits(value: unknown): string {
  return String(value ?? '').replace(/\D/g, '');
}

function cellText(cell: ExcelJS.Cell): string {
  const value = cell.value;
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
  }
  if (typeof value === 'object' && 'result' in value) {
    return String(value.result ?? '').trim();
  }
  return String(cell.text || value).trim();
}

function dateToIso(value: string): string {
  const normalized = value.trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  throw new Error(`Data de ordem inválida no XLSX do PDDEInfo: ${value}.`);
}

function moneyCents(value: string): number {
  const text = value
    .replace(/R\$/gi, '')
    .replace(/\u00a0/g, ' ')
    .trim();
  if (/^-?\d+(?:[.,]\d+)?$/.test(text) && !text.includes('.')) {
    const decimal = Number(text.replace(',', '.'));
    if (!Number.isFinite(decimal)) throw new Error(`Valor inválido no XLSX do PDDEInfo: ${value}.`);
    return Math.round(decimal * 100);
  }
  const br = text.match(/^-?\d{1,3}(?:\.\d{3})*,\d{2}$/);
  if (br) {
    return Math.round(Number(text.replace(/\./g, '').replace(',', '.')) * 100);
  }
  const us = text.match(/^-?\d+(?:\.\d{1,2})?$/);
  if (us) return Math.round(Number(text) * 100);
  throw new Error(`Valor monetário inválido no XLSX do PDDEInfo: ${value}.`);
}

function headerIndex(headers: string[], candidates: string[]): number {
  const wanted = candidates.map(canonical);
  const index = headers.findIndex((header) => wanted.some((candidate) => (
    header === candidate || header.includes(candidate)
  )));
  if (index < 0) {
    throw new Error(`XLSX do PDDEInfo não contém coluna esperada: ${candidates.join(' / ')}.`);
  }
  return index + 1;
}

function optionalHeaderIndex(headers: string[], candidates: string[]): number | null {
  const wanted = candidates.map(canonical);
  const index = headers.findIndex((header) => wanted.some((candidate) => (
    header === candidate || header.includes(candidate)
  )));
  return index < 0 ? null : index + 1;
}

export function buildPddeInfoPaidMunicipalAttendanceExcelUrl(): string {
  const url = new URL(ATTENDANCE_EXCEL_URL);
  url.searchParams.set('an_exercicio', '2026');
  url.searchParams.set('cnpj', '');
  url.searchParams.set('co_escola', '');
  url.searchParams.set('destinacao', '');
  url.searchParams.set('tpRelatorio', '1');
  url.searchParams.set('stpg', "'1'");
  url.searchParams.set('programas', '02');
  url.searchParams.set('sg_uf', 'RJ');
  url.searchParams.set('esferaAdm', "'2'");
  url.searchParams.set('co_municipio_fnde', '330455');
  return url.toString();
}

export async function parsePddeInfoAttendanceExcel(
  bytes: Buffer,
): Promise<PddeInfoAttendanceObservation[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('XLSX do PDDEInfo sem planilha.');

  let headerRowNumber: number | null = null;
  let headers: string[] = [];
  for (let rowNumber = 1; rowNumber <= Math.min(30, worksheet.rowCount); rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const candidate = Array.from({ length: Math.max(row.cellCount, 1) }, (_, index) => (
      canonical(cellText(row.getCell(index + 1)))
    ));
    const hasSchool = candidate.some((value) => value.includes('ESCOLA') && value.includes('COD'));
    const hasTotal = candidate.some((value) => value.includes('VALOR TOTAL'));
    const hasOrder = candidate.some((value) => value.includes('DATA') && value.includes('PAGAMENTO'));
    if (hasSchool && hasTotal && hasOrder) {
      headerRowNumber = rowNumber;
      headers = candidate;
      break;
    }
  }

  if (headerRowNumber === null) {
    throw new Error('Não foi possível localizar o cabeçalho do XLSX agregado do PDDEInfo.');
  }

  const idxInep = headerIndex(headers, ['Cód. da Escola', 'Código Escola', 'Codigo da Escola']);
  const idxSchool = headerIndex(headers, ['Nome da Escola', 'Nome Escola']);
  const idxCnpj = headerIndex(headers, ['CNPJ Executora']);
  const idxProgram = headerIndex(headers, ['Programa']);
  const idxDestination = optionalHeaderIndex(headers, ['Destinação', 'Destinacao']);
  const idxStudents = optionalHeaderIndex(headers, ['Qtd. Alunos', 'Quantidade Alunos']);
  const idxCost = headerIndex(headers, ['Valor Custeio']);
  const idxCapital = headerIndex(headers, ['Valor Capital']);
  const idxTotal = headerIndex(headers, ['Valor Total']);
  const idxOrder = headerIndex(headers, ['Data da Ord. Pagamento', 'Data da Ordem de Pagamento']);

  const rows: PddeInfoAttendanceObservation[] = [];
  for (let rowNumber = headerRowNumber + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const inep = digits(cellText(row.getCell(idxInep)));
    if (!inep) continue;
    if (!/^\d{8}$/.test(inep)) continue;

    const cnpj = digits(cellText(row.getCell(idxCnpj)));
    if (!/^\d{14}$/.test(cnpj)) {
      throw new Error(`CNPJ inválido no XLSX do PDDEInfo para INEP ${inep}.`);
    }

    const costCents = moneyCents(cellText(row.getCell(idxCost)));
    const capitalCents = moneyCents(cellText(row.getCell(idxCapital)));
    const totalCents = moneyCents(cellText(row.getCell(idxTotal)));
    if (costCents + capitalCents !== totalCents) {
      throw new Error(`Total divergente de custeio + capital no XLSX para INEP ${inep}.`);
    }

    const studentText = idxStudents ? digits(cellText(row.getCell(idxStudents))) : '';
    rows.push({
      fiscalYear: 2026,
      schoolInep: inep,
      uexCnpj: cnpj,
      schoolName: cellText(row.getCell(idxSchool)),
      programName: cellText(row.getCell(idxProgram)) || 'PDDE',
      destination: idxDestination ? cellText(row.getCell(idxDestination)) : '',
      studentCount: studentText ? Number(studentText) : null,
      costCents,
      capitalCents,
      totalCents,
      paymentOrderDate: dateToIso(cellText(row.getCell(idxOrder))),
    });
  }

  if (rows.length === 0) {
    throw new Error('XLSX agregado do PDDEInfo não retornou observações de atendimento.');
  }
  return rows;
}

export async function fetchPddeInfoPaidMunicipalAttendanceExcel(
  options: FetchPddeInfoAttendanceExcelOptions = {},
): Promise<PddeInfoAttendanceExcelResult> {
  const sourceUrl = buildPddeInfoPaidMunicipalAttendanceExcelUrl();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 30_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetchImpl(sourceUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Attendance-Sentinel/0.5)',
      Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    },
    signal,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new Error(`XLSX agregado do PDDEInfo retornou HTTP ${response.status}.`);
  }
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('spreadsheetml.sheet') || bytes.subarray(0, 2).toString('utf8') !== 'PK') {
    throw new Error('Endpoint agregado do PDDEInfo não retornou um XLSX válido.');
  }

  return {
    sourceUrl,
    queriedAt: (options.now ?? (() => new Date().toISOString()))(),
    httpStatus: response.status,
    responseBytes: bytes.byteLength,
    rows: await parsePddeInfoAttendanceExcel(bytes),
  };
}
