import { Buffer } from 'node:buffer';

const PDDEINFO_BASE_URL = 'https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar';

export interface BuildPddeInfoSchoolUrlOptions {
  fiscalYear: number;
  inep: string;
  administrationSphere?: number;
  uf?: string;
  municipalityFndeCode?: string;
}

export interface FetchPddeInfoSchoolHtmlOptions extends BuildPddeInfoSchoolUrlOptions {
  fetchImpl?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => string;
  maxAttempts?: number;
  timeoutMs?: number;
  retryBackoffMs?: number;
  maxResponseBytes?: number;
}

export interface PddeInfoHttpResult {
  html: string;
  /** Bytes exatos recebidos do endpoint, antes de qualquer decodificação. */
  rawBytes?: Buffer;
  sourceUrl: string;
  queriedAt: string;
  attempts: number;
  httpStatus: number;
  responseBytes: number;
}

function assertFiscalYear(value: number): void {
  if (!Number.isInteger(value) || value < 2000 || value > 2100) {
    throw new Error(`Exercício inválido para consulta PDDEInfo: ${value}.`);
  }
}

function assertInep(value: string): void {
  if (!/^\d{8}$/.test(value)) throw new Error(`INEP inválido para consulta PDDEInfo: ${value}.`);
}

export function buildPddeInfoSchoolUrl(options: BuildPddeInfoSchoolUrlOptions): string {
  assertFiscalYear(options.fiscalYear);
  assertInep(options.inep);
  const sphere = options.administrationSphere ?? 2;
  const uf = (options.uf ?? 'RJ').trim().toUpperCase();
  const municipality = options.municipalityFndeCode ?? '330455';
  if (!Number.isInteger(sphere) || sphere <= 0) throw new Error('Esfera administrativa inválida.');
  if (!/^[A-Z]{2}$/.test(uf)) throw new Error(`UF inválida para consulta PDDEInfo: ${uf}.`);
  if (!/^\d{6}$/.test(municipality)) {
    throw new Error(`Código FNDE do município inválido: ${municipality}.`);
  }
  return `${PDDEINFO_BASE_URL}/ano/${options.fiscalYear}/co_escola/${options.inep}/cnpj//co_esfera_adm/${sphere}/sg_uf/${uf}/co_municipio_fnde/${municipality}/consultar/Consultar/page/1`;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function decodeHtml(bytes: Buffer, contentType: string | null): string {
  const charset = contentType?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]?.toLowerCase();
  if (charset === 'utf-8' || charset === 'utf8') return bytes.toString('utf8');
  // O PDDEInfo legado normalmente entrega ISO-8859-1. Latin1 evita corromper
  // cabeçalhos como Programa/Ação e Destinação, usados pelo parser estrito.
  return bytes.toString('latin1');
}

class PddeInfoResponseTooLargeError extends Error {}

function responseTooLarge(maxResponseBytes: number): PddeInfoResponseTooLargeError {
  return new PddeInfoResponseTooLargeError(
    `Resposta do PDDEInfo excede o limite de ${maxResponseBytes} bytes.`,
  );
}

async function readResponseBytes(response: Response, maxResponseBytes: number): Promise<Buffer> {
  const contentLength = response.headers.get('content-length');
  if (contentLength && /^\d+$/.test(contentLength)) {
    const declaredBytes = Number(contentLength);
    if (!Number.isSafeInteger(declaredBytes) || declaredBytes > maxResponseBytes) {
      await response.body?.cancel().catch(() => undefined);
      throw responseTooLarge(maxResponseBytes);
    }
  }

  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > maxResponseBytes) throw responseTooLarge(maxResponseBytes);
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxResponseBytes) throw responseTooLarge(maxResponseBytes);
      chunks.push(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
    }
  } catch (cause) {
    await reader.cancel().catch(() => undefined);
    throw cause;
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, totalBytes);
}

export async function fetchPddeInfoSchoolHtml(
  options: FetchPddeInfoSchoolHtmlOptions,
): Promise<PddeInfoHttpResult> {
  const sourceUrl = buildPddeInfoSchoolUrl(options);
  const fetchImpl = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;
  const now = options.now ?? (() => new Date().toISOString());
  const maxAttempts = options.maxAttempts ?? 4;
  const timeoutMs = options.timeoutMs ?? 25_000;
  const retryBackoffMs = options.retryBackoffMs ?? 750;
  const maxResponseBytes = options.maxResponseBytes ?? 10_000_000;
  if (!Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new Error(`Número de tentativas inválido: ${maxAttempts}.`);
  }
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new Error('Timeout do PDDEInfo deve ser positivo.');
  if (!Number.isFinite(retryBackoffMs) || retryBackoffMs < 0) {
    throw new Error('Backoff do PDDEInfo não pode ser negativo.');
  }
  if (!Number.isInteger(maxResponseBytes) || maxResponseBytes < 1 || maxResponseBytes > 50_000_000) {
    throw new Error('Limite da resposta PDDEInfo deve estar entre 1 e 50000000 bytes.');
  }

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(sourceUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; 4CRE-PDDEInfo-Collector/0.5)',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!response.ok) {
        const error = new Error(`PDDEInfo retornou HTTP ${response.status} para o INEP ${options.inep}.`);
        if (!isTransientStatus(response.status) || attempt === maxAttempts) throw error;
        lastError = error;
        await response.body?.cancel().catch(() => undefined);
        await sleep(retryBackoffMs * attempt);
        continue;
      }

      const bytes = await readResponseBytes(response, maxResponseBytes);
      const html = decodeHtml(bytes, response.headers.get('content-type'));
      if (!html.trim()) throw new Error(`PDDEInfo retornou resposta vazia para o INEP ${options.inep}.`);
      return {
        html,
        rawBytes: bytes,
        sourceUrl,
        queriedAt: now(),
        attempts: attempt,
        httpStatus: response.status,
        responseBytes: bytes.byteLength,
      };
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      if (error instanceof PddeInfoResponseTooLargeError) throw error;
      const definitiveHttpError = /HTTP \d{3}/.test(error.message)
        && !/HTTP (408|425|429|5\d\d)/.test(error.message);
      if (definitiveHttpError || attempt === maxAttempts) throw error;
      lastError = error;
      await sleep(retryBackoffMs * attempt);
    }
  }

  throw lastError ?? new Error(`Consulta PDDEInfo não concluída para o INEP ${options.inep}.`);
}
