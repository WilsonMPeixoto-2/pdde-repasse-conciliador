import { Buffer } from 'node:buffer';
import { load } from 'cheerio';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import {
  AcquisitionUnavailableError,
  acquireWithFallback,
  type AcquisitionStrategy,
} from '../application/source-acquisition-route';
import type { HumanInterventionHandler } from './browser-assisted-source';

export type PddeInfoPublicReportKind =
  | 'ATTENDANCE'
  | 'ACCOUNTING'
  | 'BALANCE'
  | 'ACCOUNT_OPENING'
  | 'REGISTRATION'
  | 'SUSPENSION';

const yearSchoolFilterSchema = z.object({
  fiscalYear: z.literal(2026),
  inep: z.string().regex(/^\d{8}$/),
  uf: z.string().regex(/^[A-Z]{2}$/).default('RJ'),
  administrationSphere: z.number().int().min(1).max(3).default(2),
  programCode: z.string().min(1).max(8).optional(),
});

const attendanceFilterSchema = yearSchoolFilterSchema.extend({ kind: z.literal('ATTENDANCE') }).strict();
const accountingFilterSchema = yearSchoolFilterSchema.extend({ kind: z.literal('ACCOUNTING') }).strict();
const accountOpeningFilterSchema = yearSchoolFilterSchema.extend({ kind: z.literal('ACCOUNT_OPENING') }).strict();
const registrationFilterSchema = yearSchoolFilterSchema.extend({ kind: z.literal('REGISTRATION') }).strict();
const suspensionFilterSchema = yearSchoolFilterSchema.extend({ kind: z.literal('SUSPENSION') }).strict();
const balanceFilterSchema = z.object({
  kind: z.literal('BALANCE'),
  month: z.string().regex(/^(0[1-9]|1[0-2])-2026$/),
  cnpj: z.string().regex(/^\d{14}$/),
  uf: z.string().regex(/^[A-Z]{2}$/).default('RJ'),
  administrationSphere: z.number().int().min(1).max(3).default(2),
  programCode: z.string().min(1).max(8).optional(),
}).strict();

const reportFilterSchema = z.discriminatedUnion('kind', [
  attendanceFilterSchema,
  accountingFilterSchema,
  balanceFilterSchema,
  accountOpeningFilterSchema,
  registrationFilterSchema,
  suspensionFilterSchema,
]);

export type PddeInfoPublicReportFilter = z.input<typeof reportFilterSchema>;

const BASE_URLS: Record<PddeInfoPublicReportKind, string> = {
  ATTENDANCE: 'https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade',
  ACCOUNTING: 'https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta',
  BALANCE: 'https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade',
  ACCOUNT_OPENING: 'https://www.fnde.gov.br/pddeinfo/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade',
  REGISTRATION: 'https://www.fnde.gov.br/pddeinfo/situacaocadastroentidade/situacaocadastroentidade/situacaocadastroentidade',
  SUSPENSION: 'https://www.fnde.gov.br/pddeinfo/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao',
};

export class PddeInfoPublicReportSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PddeInfoPublicReportSourceError';
  }
}

export interface ParsedPddeInfoPublicReport {
  kind: PddeInfoPublicReportKind;
  headers: string[];
  rows: Array<Record<string, string>>;
}

export interface FetchPddeInfoPublicReportOptions {
  filter: PddeInfoPublicReportFilter;
  fetchImpl?: typeof fetch;
  now?: () => string;
  timeoutMs?: number;
  browserFallback?: boolean;
  interactiveBrowser?: boolean;
  onIntervention?: HumanInterventionHandler;
  signal?: AbortSignal;
}

export interface PddeInfoPublicReportResult extends ParsedPddeInfoPublicReport {
  via: 'HTTP' | 'BROWSER_ASSISTED';
  sourceUrl: string;
  queriedAt: string;
  html: string;
  rawBytes: Buffer;
  httpStatus: number | null;
  responseBytes: number;
  coverageThrough: string | null;
  artifactKind?: 'RAW_HTML' | 'RAW_FILE';
  mediaType?: string;
  fileExtension?: 'html' | 'xlsx';
}

export interface DiscoverPddeInfoBalanceMonthsOptions {
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  signal?: AbortSignal;
}

function appendCommonSchoolParams(url: URL, filter: z.output<typeof yearSchoolFilterSchema>): void {
  url.searchParams.set('ano', String(filter.fiscalYear));
  url.searchParams.set('cnpj', '');
  url.searchParams.set('co_escola', filter.inep);
  url.searchParams.append('co_esfera_adm[]', String(filter.administrationSphere));
  url.searchParams.append('siglaUf[]', filter.uf);
  url.searchParams.set('sg_uf', '');
  url.searchParams.set('co_municipio_fnde', '');
}

export function buildPddeInfoPublicReportUrl(rawFilter: PddeInfoPublicReportFilter): string {
  const filter = reportFilterSchema.parse(rawFilter);
  const url = new URL(BASE_URLS[filter.kind]);

  if (filter.kind === 'BALANCE') {
    url.searchParams.set('mes', filter.month);
    url.searchParams.set('cnpj', filter.cnpj);
    url.searchParams.set('co_programa_fnde', filter.programCode ?? '');
    url.searchParams.append('siglaUf[]', filter.uf);
    url.searchParams.append('co_esfera_adm[]', String(filter.administrationSphere));
    url.searchParams.set('sg_uf', '');
    url.searchParams.set('co_municipio_fnde', '');
  } else {
    appendCommonSchoolParams(url, filter);
    if (filter.kind === 'ATTENDANCE') {
      url.searchParams.set('programa', filter.programCode ?? '');
      url.searchParams.set('destinacao', '');
      url.searchParams.set('tpRelatorio', '1');
    } else if (filter.kind === 'ACCOUNTING') {
      url.searchParams.set('co_programa_fnde', filter.programCode ?? '');
      url.searchParams.set('tpRelatorio', '1');
    } else if (filter.kind === 'REGISTRATION') {
      url.searchParams.set('tp_relatorio', '1');
      url.searchParams.set('st_cadstral', '');
      url.searchParams.set('ds_localizacao', '');
      url.searchParams.set('fimMandato', '');
    } else if (filter.kind === 'SUSPENSION') {
      url.searchParams.set('programa', filter.programCode ?? '');
      url.searchParams.append('tp_suspensao[]', '0');
    } else if (filter.programCode) {
      url.searchParams.append('co_programa_fnde[]', filter.programCode);
    }
  }
  url.searchParams.set('consultar', 'Consultar');
  return url.toString();
}

function cleanText(value: string): string {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function sourceErrorMessage(html: string): string | null {
  const text = cleanText(load(html).text());
  const markers = ['SQLSTATE[', 'ORA-', 'OCIStmtExecute', 'General error:'];
  if (!markers.some((marker) => text.includes(marker))) return null;
  const match = text.match(/(?:SQLSTATE\[[^\]]+\][^<]{0,240}|ORA-\d{5}[^<]{0,240})/i);
  return cleanText(match?.[0] ?? text.slice(0, 500));
}

function parseGovbrReportCards(
  html: string,
  kind: PddeInfoPublicReportKind,
): ParsedPddeInfoPublicReport {
  const $ = load(html);
  const rows: Array<Record<string, string>> = [];
  $('.govbr-report-card').each((_index, card) => {
    const record: Record<string, string> = {};
    const title = cleanText($(card).find('.govbr-report-card-header h2').first().text());
    const year = cleanText($(card).find('.govbr-report-card-header .year').first().text());
    if (year && /^\d{4}$/.test(year)) record.Ano = year;
    if (title) {
      if (kind === 'ATTENDANCE') record['Nome Escola'] = title;
      if (kind === 'REGISTRATION') record.Escola = title;
    }
    $(card).find('.govbr-report-card-item').each((_itemIndex, item) => {
      const label = cleanText($(item).find('.label').first().text());
      const value = cleanText($(item).find('.value').first().text());
      if (label) record[label] = value;
    });
    if (Object.keys(record).length > 0) rows.push(record);
  });
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { kind, headers, rows };
}

function canonicalReportHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function attendanceExcelUrl(filter: z.output<typeof attendanceFilterSchema>): string {
  const url = new URL(
    'https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/excel',
  );
  url.searchParams.set('an_exercicio', String(filter.fiscalYear));
  url.searchParams.set('cnpj', '');
  url.searchParams.set('co_escola', filter.inep);
  url.searchParams.set('destinacao', '');
  url.searchParams.set('tpRelatorio', '1');
  url.searchParams.set('stpg', "'1'");
  url.searchParams.set('programas', filter.programCode ?? '');
  url.searchParams.set('sg_uf', '');
  url.searchParams.set('esferaAdm', '');
  url.searchParams.set('co_municipio_fnde', '');
  return url.toString();
}

function excelCellText(cell: ExcelJS.Cell): string {
  return cleanText(cell.text ?? '');
}

export async function parsePddeInfoAttendanceWorkbook(
  bytes: Uint8Array,
): Promise<ParsedPddeInfoPublicReport> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(
    Buffer.from(bytes) as unknown as Parameters<typeof workbook.xlsx.load>[0],
  );
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('Excel de atendimento PDDEInfo sem planilha.');

  let headerRow = 0;
  let headers: string[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (headerRow > 0) return;
    const values = row.values instanceof Array
      ? row.values.slice(1).map((_value, index) => excelCellText(row.getCell(index + 1)))
      : [];
    const normalized = values.map((value) => canonicalReportHeader(value));
    if (
      normalized.includes('ANO')
      && normalized.includes('CODIGO ESCOLA')
      && normalized.includes('DESTINACAO')
      && normalized.includes('DATA DA ORD DE PAGAMENTO')
    ) {
      headerRow = rowNumber;
      headers = values;
    }
  });
  if (headerRow === 0) {
    throw new Error('Excel de atendimento PDDEInfo sem cabeçalho tabular reconhecível.');
  }

  const rows: Array<Record<string, string>> = [];
  for (let rowNumber = headerRow + 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = headers.map((_header, index) => excelCellText(row.getCell(index + 1)));
    if (values.every((value) => value === '')) continue;
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) record[header] = values[index] ?? '';
    });
    rows.push(record);
  }
  return { kind: 'ATTENDANCE', headers, rows };
}

export function parsePddeInfoPublicReport(
  html: string,
  kind: PddeInfoPublicReportKind,
): ParsedPddeInfoPublicReport {
  const error = sourceErrorMessage(html);
  if (error) {
    throw new PddeInfoPublicReportSourceError(`Relatório público do FNDE retornou erro da fonte: ${error}`);
  }

  const $ = load(html);
  let headers: string[] = [];
  const rows: Array<Record<string, string>> = [];
  $('table').each((_tableIndex, table) => {
    if (headers.length > 0) return;
    const candidateHeaders = $(table).find('tr').first().find('th,td').map((_index, cell) => cleanText($(cell).text())).get();
    if (candidateHeaders.length === 0) return;
    const dataRows = $(table).find('tr').slice(1);
    if (dataRows.length === 0) return;
    headers = candidateHeaders;
    dataRows.each((_rowIndex, row) => {
      const values = $(row).find('th,td').map((_index, cell) => cleanText($(cell).text())).get();
      if (values.length === 0 || values.every((value) => value === '')) return;
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        const key = header || `coluna_${index + 1}`;
        record[key] = values[index] ?? '';
      });
      rows.push(record);
    });
  });
  if (rows.length === 0) {
    const cards = parseGovbrReportCards(html, kind);
    if (cards.rows.length > 0) return cards;
    if (load(html)('.govbr-report-card').length > 0) {
      throw new PddeInfoPublicReportSourceError(
        'Relatório público do FNDE contém cards, mas o layout não pôde ser interpretado.',
      );
    }
  }
  return { kind, headers, rows };
}

function decodeHtml(bytes: Buffer, contentType: string | null): string {
  const charset = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]?.toLowerCase();
  if (charset === 'utf-8' || charset === 'utf8') return bytes.toString('utf8');
  try {
    return new TextDecoder('windows-1252').decode(bytes);
  } catch {
    return bytes.toString('latin1');
  }
}

function coverageThrough(filter: z.output<typeof reportFilterSchema>): string | null {
  if (filter.kind !== 'BALANCE') return null;
  const [month, year] = filter.month.split('-').map(Number);
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

function monthRank(value: string): number {
  const [month, year] = value.split('-').map(Number);
  return year * 100 + month;
}

export async function discoverPddeInfoBalanceMonths(
  options: DiscoverPddeInfoBalanceMonthsOptions = {},
): Promise<string[]> {
  options.signal?.throwIfAborted();
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 25_000);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
  const response = await fetchImpl(BASE_URLS.BALANCE, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Public-Reports/0.5)',
      Accept: 'text/html,application/xhtml+xml',
      'Accept-Language': 'pt-BR,pt;q=0.9',
    },
    signal,
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!response.ok) {
    throw new AcquisitionUnavailableError(
      `Formulário público de saldos PDDEInfo retornou HTTP ${response.status}.`,
    );
  }
  const html = decodeHtml(bytes, response.headers.get('content-type'));
  const error = sourceErrorMessage(html);
  if (error) {
    throw new PddeInfoPublicReportSourceError(`Formulário público do FNDE retornou erro da fonte: ${error}`);
  }
  const $ = load(html);
  const months = new Set<string>();
  $('select[name="mes"] option').each((_index, option) => {
    const value = cleanText($(option).attr('value') ?? $(option).text());
    if (/^(0[1-9]|1[0-2])-2026$/.test(value)) months.add(value);
  });
  return [...months].sort((left, right) => monthRank(right) - monthRank(left));
}

export async function fetchPddeInfoPublicReport(
  options: FetchPddeInfoPublicReportOptions,
): Promise<PddeInfoPublicReportResult> {
  const filter = reportFilterSchema.parse(options.filter);
  const now = options.now ?? (() => new Date().toISOString());
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 25_000;

  if (filter.kind === 'ATTENDANCE') {
    const sourceUrl = attendanceExcelUrl(filter);
    try {
      options.signal?.throwIfAborted();
      const timeoutSignal = AbortSignal.timeout(timeoutMs);
      const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
      const response = await fetchImpl(sourceUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Public-Reports/0.6)',
          Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/octet-stream;q=0.9,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        },
        signal,
      });
      const rawBytes = Buffer.from(await response.arrayBuffer());
      if (!response.ok) {
        throw new AcquisitionUnavailableError(
          `Excel público de atendimento PDDEInfo retornou HTTP ${response.status}.`,
        );
      }
      const parsed = await parsePddeInfoAttendanceWorkbook(rawBytes);
      return {
        ...parsed,
        via: 'HTTP',
        sourceUrl: response.url || sourceUrl,
        queriedAt: now(),
        html: '',
        rawBytes,
        httpStatus: response.status,
        responseBytes: rawBytes.byteLength,
        coverageThrough: null,
        artifactKind: 'RAW_FILE',
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileExtension: 'xlsx',
      };
    } catch (cause) {
      options.signal?.throwIfAborted();
      if (!options.browserFallback) throw cause;
      // O HTML em cards permanece como fallback quando o export oficial fica indisponível.
    }
  }

  const sourceUrl = buildPddeInfoPublicReportUrl(filter);
  const strategies: Array<AcquisitionStrategy<{
    html: string;
    rawBytes: Buffer;
    sourceUrl: string;
    queriedAt: string;
    httpStatus: number | null;
  }>> = [{
    kind: 'HTTP',
    run: async () => {
      options.signal?.throwIfAborted();
      try {
        const timeoutSignal = AbortSignal.timeout(timeoutMs);
        const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;
        const response = await fetchImpl(sourceUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Public-Reports/0.5)',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'pt-BR,pt;q=0.9',
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
          },
          signal,
        });
        const bytes = Buffer.from(await response.arrayBuffer());
        if (!response.ok) {
          const message = `Relatório público PDDEInfo retornou HTTP ${response.status}.`;
          if (response.status === 403 || response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500) {
            throw new AcquisitionUnavailableError(message);
          }
          throw new Error(message);
        }
        return {
          html: decodeHtml(bytes, response.headers.get('content-type')),
          rawBytes: bytes,
          sourceUrl: response.url || sourceUrl,
          queriedAt: now(),
          httpStatus: response.status,
        };
      } catch (cause) {
        options.signal?.throwIfAborted();
        if (cause instanceof AcquisitionUnavailableError) throw cause;
        if (cause instanceof Error && /^Relatório público PDDEInfo retornou HTTP/.test(cause.message)) throw cause;
        throw new AcquisitionUnavailableError('Consulta HTTP do relatório público PDDEInfo ficou indisponível.', { cause });
      }
    },
  }];

  if (options.browserFallback) {
    strategies.push({
      kind: 'BROWSER_ASSISTED',
      run: async () => {
        const { collectWithAssistedBrowser } = await import('./browser-assisted-source');
        const result = await collectWithAssistedBrowser({
          url: sourceUrl,
          interactive: options.interactiveBrowser ?? false,
          ...(options.onIntervention ? { onIntervention: options.onIntervention } : {}),
        });
        const rawBytes = Buffer.from(result.html, 'utf8');
        return {
          html: result.html,
          rawBytes,
          sourceUrl: result.sourceUrl,
          queriedAt: result.queriedAt,
          httpStatus: null,
        };
      },
    });
  }

  const acquired = await acquireWithFallback(strategies);
  const parsed = parsePddeInfoPublicReport(acquired.value.html, filter.kind);
  return {
    ...parsed,
    via: acquired.via as 'HTTP' | 'BROWSER_ASSISTED',
    sourceUrl: acquired.value.sourceUrl,
    queriedAt: acquired.value.queriedAt,
    html: acquired.value.html,
    rawBytes: acquired.value.rawBytes,
    httpStatus: acquired.value.httpStatus,
    responseBytes: acquired.value.rawBytes.byteLength,
    coverageThrough: coverageThrough(filter),
    artifactKind: 'RAW_HTML',
    mediaType: 'text/html',
    fileExtension: 'html',
  };
}
