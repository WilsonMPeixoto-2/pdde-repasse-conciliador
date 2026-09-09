import { canonicalCnpj } from '../core/normalization';
import { parseSigefLegacyReleaseHtml } from './sigef-legacy-releases-html';
import {
  parseSigefReleaseHtml,
  type SigefReleaseHtmlResult,
} from './sigef-releases-html';
import { decodeSigefHtml } from './sigef-public-statement';

export interface SigefPublicReleaseCollection extends SigefReleaseHtmlResult {
  rawBytes: Buffer;
  sourceUrl: string;
  route: 'modern' | 'legacy';
}

const BASE = 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes/resultado-entidade';
const LEGACY_BASE = 'https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_result_pc';

interface ReleaseQueryInput {
  cnpj: string;
  programCode: string;
  fiscalYear: number;
}

export interface CollectSigefPublicReleasesInput extends ReleaseQueryInput {
  targetCnpjs?: string[];
  signal?: AbortSignal;
}

function normalizeReleaseQuery(input: ReleaseQueryInput): {
  cnpj: string;
  programCode: string;
  fiscalYear: number;
} {
  const cnpj = canonicalCnpj(input.cnpj);
  if (!/^\d{14}$/.test(cnpj)) throw new Error(`CNPJ inválido para Liberações SIGEF: ${input.cnpj}.`);
  const programCode = input.programCode.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!programCode) throw new Error('Programa vazio para Liberações SIGEF.');
  if (!Number.isInteger(input.fiscalYear) || input.fiscalYear < 2000 || input.fiscalYear > 2100) {
    throw new Error(`Exercício inválido para Liberações SIGEF: ${input.fiscalYear}.`);
  }
  return { cnpj, programCode, fiscalYear: input.fiscalYear };
}

export function buildSigefPublicReleaseUrl(input: ReleaseQueryInput): string {
  const query = normalizeReleaseQuery(input);
  return `${BASE}/ano/${query.fiscalYear}/programa/${query.programCode}/cnpj/${query.cnpj}`;
}

/**
 * A aplicação Oracle histórica ainda expõe uma rota de resultado diretamente
 * consultável por CNPJ. Ela aponta para o mesmo SIGEF (`p_verifica=sigef` no
 * formulário de origem), portanto é fallback de transporte, não nova fonte.
 */
export function buildSigefLegacyReleaseUrl(input: ReleaseQueryInput): string {
  const query = normalizeReleaseQuery(input);
  const url = new URL(LEGACY_BASE);
  url.searchParams.set('p_ano', String(query.fiscalYear));
  url.searchParams.set('p_cgc', query.cnpj);
  url.searchParams.set('p_municipio', '');
  url.searchParams.set('p_programa', query.programCode);
  url.searchParams.set('p_tp_entidade', '');
  url.searchParams.set('p_uf', '');
  return url.toString();
}

async function fetchReleasePage(
  url: string,
  signal: AbortSignal | undefined,
  route: 'modern' | 'legacy',
): Promise<{
  rawBytes: Buffer;
  html: string;
  sourceUrl: string;
  queriedAt: string;
}> {
  let lastError: unknown;
  const label = route === 'modern' ? 'SIGEF Liberações' : 'SIGEF Liberações legadas';

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error(`Timeout ${label}.`)), 25_000);
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36 PDDE-4CRE/0.6',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
          'Cache-Control': 'no-cache, no-store, max-age=0',
          Pragma: 'no-cache',
        },
      });
      const rawBytes = Buffer.from(await response.arrayBuffer());
      if (rawBytes.byteLength > 8 * 1024 * 1024) throw new Error(`${label} excedeu 8 MiB.`);
      const html = decodeSigefHtml(rawBytes, response.headers.get('content-type'));
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toUpperCase();
      if (/\bCAPTCHA\b/.test(text)) throw new Error(`${label} solicitou CAPTCHA; coleta interrompida.`);
      if (!response.ok) throw new Error(`${label} respondeu HTTP ${response.status}.`);

      const expectedContent = route === 'modern'
        ? text.includes('DATA DE PAGAMENTO') && text.includes('CONTA CORRENTE')
        : text.includes('DATA PGTO') && text.includes('ENTIDADE') && text.includes('C/C');
      if (!expectedContent) throw new Error(`${label} retornou conteúdo inesperado.`);

      return {
        rawBytes,
        html,
        sourceUrl: response.url || url,
        queriedAt: new Date().toISOString(),
      };
    } catch (error) {
      lastError = error;
      signal?.throwIfAborted();
      const permanent = error instanceof Error && (
        error.message.includes('CAPTCHA')
        || error.message.includes('conteúdo inesperado')
        || error.message.includes('8 MiB')
      );
      if (permanent || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, 700 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250)));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(`Falha desconhecida em ${label}.`);
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export async function collectSigefLegacyReleases(
  input: CollectSigefPublicReleasesInput,
): Promise<SigefPublicReleaseCollection> {
  const targets = input.targetCnpjs ?? [input.cnpj];
  const legacyUrl = buildSigefLegacyReleaseUrl(input);
  const fetched = await fetchReleasePage(legacyUrl, input.signal, 'legacy');
  const parsed = parseSigefLegacyReleaseHtml(fetched.html, {
    fiscalYear: input.fiscalYear,
    programCode: input.programCode,
    targetCnpjs: targets,
    sourceUrl: fetched.sourceUrl,
    queriedAt: fetched.queriedAt,
  });
  return {
    ...parsed,
    rawBytes: fetched.rawBytes,
    sourceUrl: fetched.sourceUrl,
    route: 'legacy',
  };
}

export async function collectSigefPublicReleases(
  input: CollectSigefPublicReleasesInput,
): Promise<SigefPublicReleaseCollection> {
  const targets = input.targetCnpjs ?? [input.cnpj];
  const modernUrl = buildSigefPublicReleaseUrl(input);

  try {
    const fetched = await fetchReleasePage(modernUrl, input.signal, 'modern');
    const parsed = parseSigefReleaseHtml(fetched.rawBytes, {
      fiscalYear: input.fiscalYear,
      programCode: input.programCode,
      targetCnpjs: targets,
      sourceUrl: fetched.sourceUrl,
    });
    return {
      ...parsed,
      rawBytes: fetched.rawBytes,
      sourceUrl: fetched.sourceUrl,
      route: 'modern',
    };
  } catch (modernCause) {
    input.signal?.throwIfAborted();
    try {
      return await collectSigefLegacyReleases(input);
    } catch (legacyCause) {
      input.signal?.throwIfAborted();
      throw new Error(
        `SIGEF Liberações indisponível nas rotas moderna e legada. Moderna: ${errorText(modernCause)} Legada: ${errorText(legacyCause)}`,
      );
    }
  }
}
