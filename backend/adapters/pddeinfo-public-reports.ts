import { Buffer } from 'node:buffer';
import { load } from 'cheerio';
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
  | 'ACCOUNT_OPENING';

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
]);

export type PddeInfoPublicReportFilter = z.input<typeof reportFilterSchema>;

const BASE_URLS: Record<PddeInfoPublicReportKind, string> = {
  ATTENDANCE: 'https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade',
  ACCOUNTING: 'https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta',
  BALANCE: 'https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade',
  ACCOUNT_OPENING: 'https://www.fnde.gov.br/pddeinfo/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade',
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
  const sourceUrl = buildPddeInfoPublicReportUrl(filter);
  const now = options.now ?? (() => new Date().toISOString());
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 25_000;
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
        const html = decodeHtml(bytes, response.headers.get('content-type'));
        const sourceError = sourceErrorMessage(html);
        if (sourceError) {
          throw new AcquisitionUnavailableError(
            `Relatório público do FNDE retornou erro da fonte: ${sourceError}`,
          );
        }
        return {
          html,
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
  };
}
