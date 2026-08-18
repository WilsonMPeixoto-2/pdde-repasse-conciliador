import { canonicalCnpj } from '../core/normalization';
import {
  parseSigefReleaseHtml,
  type SigefReleaseHtmlResult,
} from './sigef-releases-html';
import { decodeSigefHtml } from './sigef-public-statement';

export interface SigefPublicReleaseCollection extends SigefReleaseHtmlResult {
  rawBytes: Buffer;
  sourceUrl: string;
}

const BASE = 'https://www.fnde.gov.br/sigefweb/index.php/liberacoes/resultado-entidade';

export function buildSigefPublicReleaseUrl(input: {
  cnpj: string;
  programCode: string;
  fiscalYear: number;
}): string {
  const cnpj = canonicalCnpj(input.cnpj);
  if (!/^\d{14}$/.test(cnpj)) throw new Error(`CNPJ inválido para Liberações SIGEF: ${input.cnpj}.`);
  const programCode = input.programCode.trim().toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!programCode) throw new Error('Programa vazio para Liberações SIGEF.');
  if (!Number.isInteger(input.fiscalYear) || input.fiscalYear < 2000 || input.fiscalYear > 2100) {
    throw new Error(`Exercício inválido para Liberações SIGEF: ${input.fiscalYear}.`);
  }
  return `${BASE}/ano/${input.fiscalYear}/programa/${programCode}/cnpj/${cnpj}`;
}

async function fetchReleasePage(url: string, signal?: AbortSignal): Promise<{
  rawBytes: Buffer;
  html: string;
  sourceUrl: string;
}> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('Timeout SIGEF Liberações.')), 25_000);
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
        },
      });
      const rawBytes = Buffer.from(await response.arrayBuffer());
      if (rawBytes.byteLength > 8 * 1024 * 1024) throw new Error('SIGEF Liberações excedeu 8 MiB.');
      const html = decodeSigefHtml(rawBytes, response.headers.get('content-type'));
      const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').toUpperCase();
      if (/\bCAPTCHA\b/.test(text)) throw new Error('SIGEF Liberações solicitou CAPTCHA; coleta interrompida.');
      if (!response.ok) throw new Error(`SIGEF Liberações respondeu HTTP ${response.status}.`);
      if (!text.includes('DATA DE PAGAMENTO') || !text.includes('CONTA CORRENTE')) {
        throw new Error('SIGEF Liberações retornou conteúdo inesperado.');
      }
      return { rawBytes, html, sourceUrl: response.url };
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
  throw lastError instanceof Error ? lastError : new Error('Falha desconhecida no SIGEF Liberações.');
}

export async function collectSigefPublicReleases(input: {
  cnpj: string;
  programCode: string;
  fiscalYear: number;
  targetCnpjs?: string[];
  signal?: AbortSignal;
}): Promise<SigefPublicReleaseCollection> {
  const url = buildSigefPublicReleaseUrl(input);
  const fetched = await fetchReleasePage(url, input.signal);
  const parsed = parseSigefReleaseHtml(fetched.rawBytes, {
    fiscalYear: input.fiscalYear,
    programCode: input.programCode,
    targetCnpjs: input.targetCnpjs ?? [input.cnpj],
    sourceUrl: fetched.sourceUrl,
  });
  return { ...parsed, rawBytes: fetched.rawBytes, sourceUrl: fetched.sourceUrl };
}
