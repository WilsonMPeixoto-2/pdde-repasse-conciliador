import { Buffer } from 'node:buffer';
import { z } from 'zod';
import {
  createRateLimitedQueue,
  type RateLimitedQueueOptions,
} from '../runtime/rate-limited-queue';

const documentsByFavoredSchema = z.object({
  codigoPessoa: z.string().min(1).max(32),
  fase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  ano: z.literal(2026),
  ug: z.string().min(1).optional(),
  gestao: z.string().min(1).optional(),
  ordenacaoResultado: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]).optional(),
  pagina: z.number().int().positive().default(1),
}).strict();

const receivedResourcesSchema = z.object({
  mesAnoInicio: z.string().regex(/^(0[1-9]|1[0-2])\/2026$/),
  mesAnoFim: z.string().regex(/^(0[1-9]|1[0-2])\/2026$/),
  codigoFavorecido: z.string().regex(/^\d{14}$/),
  pagina: z.number().int().positive().default(1),
  uf: z.string().regex(/^[A-Z]{2}$/).optional(),
  codigoIBGE: z.string().min(1).optional(),
  orgaoSuperior: z.string().min(1).optional(),
  orgao: z.string().min(1).optional(),
  unidadeGestora: z.string().min(1).optional(),
}).strict();

const apiArraySchema = z.array(z.record(z.string(), z.unknown()));

export type PortalDocumentsByFavoredQuery = z.input<typeof documentsByFavoredSchema>;
export type PortalReceivedResourcesQuery = z.input<typeof receivedResourcesSchema>;

export interface PortalTransparenciaResponse {
  data: Array<Record<string, unknown>>;
  rawBytes: Buffer;
  sourceUrl: string;
  queriedAt: string;
  httpStatus: number;
  responseBytes: number;
  attempts: number;
}

export class PortalTransparenciaCredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PortalTransparenciaCredentialError';
  }
}

export interface PortalTransparenciaClientOptions {
  apiKey: string;
  fetchImpl?: typeof fetch;
  now?: () => string;
  sleep?: (milliseconds: number) => Promise<void>;
  timeoutMs?: number;
  maxAttempts?: number;
  retryBackoffMs?: number;
  rateLimit?: RateLimitedQueueOptions;
}

const BASE_URL = 'https://api.portaldatransparencia.gov.br/api-de-dados';

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function setDefined(params: URLSearchParams, key: string, value: string | number | undefined): void {
  if (value !== undefined) params.set(key, String(value));
}

function retryAfterMilliseconds(response: Response, fallback: number): number {
  const raw = response.headers.get('retry-after');
  if (!raw) return fallback;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(60_000, Math.ceil(seconds * 1_000));
  const date = Date.parse(raw);
  if (!Number.isNaN(date)) return Math.max(0, Math.min(60_000, date - Date.now()));
  return fallback;
}

export class PortalTransparenciaClient {
  private readonly apiKey: string;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => string;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly timeoutMs: number;
  private readonly maxAttempts: number;
  private readonly retryBackoffMs: number;
  private readonly queue: ReturnType<typeof createRateLimitedQueue>;

  constructor(options: PortalTransparenciaClientOptions) {
    this.apiKey = options.apiKey.trim();
    if (!this.apiKey) throw new PortalTransparenciaCredentialError('A chave da API do Portal da Transparência não foi configurada.');
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? (() => new Date().toISOString());
    this.sleep = options.sleep ?? defaultSleep;
    this.timeoutMs = options.timeoutMs ?? 25_000;
    this.maxAttempts = options.maxAttempts ?? 3;
    this.retryBackoffMs = options.retryBackoffMs ?? 750;
    if (!Number.isSafeInteger(this.maxAttempts) || this.maxAttempts < 1 || this.maxAttempts > 8) {
      throw new RangeError('maxAttempts do Portal deve estar entre 1 e 8.');
    }
    this.queue = createRateLimitedQueue(options.rateLimit ?? {
      concurrency: 2,
      intervalCap: 30,
      intervalMs: 60_000,
      strict: true,
    });
  }

  private async request(path: string, params: URLSearchParams, signal?: AbortSignal): Promise<PortalTransparenciaResponse> {
    signal?.throwIfAborted();
    const url = new URL(`${BASE_URL}${path}`);
    url.search = params.toString();

    const task = this.queue.add(async () => {
      let lastError: Error | null = null;
      for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
        signal?.throwIfAborted();
        try {
          const timeoutSignal = AbortSignal.timeout(this.timeoutMs);
          const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
          const response = await this.fetchImpl(url, {
            method: 'GET',
            headers: {
              Accept: 'application/json',
              'chave-api-dados': this.apiKey,
              'User-Agent': '4CRE-PDDE-Conciliador/0.5',
            },
            signal: requestSignal,
          });
          const rawBytes = Buffer.from(await response.arrayBuffer());
          if (response.status === 401 || response.status === 403) {
            throw new PortalTransparenciaCredentialError(
              `Portal da Transparência recusou a credencial com HTTP ${response.status}.`,
            );
          }
          if (!response.ok) {
            const error = new Error(`Portal da Transparência retornou HTTP ${response.status}.`);
            const transient = response.status === 408 || response.status === 425 || response.status === 429 || response.status >= 500;
            if (!transient || attempt === this.maxAttempts) throw error;
            lastError = error;
            await this.sleep(retryAfterMilliseconds(response, this.retryBackoffMs * attempt));
            continue;
          }
          let parsed: unknown;
          try {
            parsed = JSON.parse(rawBytes.toString('utf8'));
          } catch (cause) {
            throw new Error('Portal da Transparência retornou JSON inválido.', { cause });
          }
          const data = apiArraySchema.parse(parsed);
          return {
            data,
            rawBytes,
            sourceUrl: response.url || url.toString(),
            queriedAt: this.now(),
            httpStatus: response.status,
            responseBytes: rawBytes.byteLength,
            attempts: attempt,
          };
        } catch (cause) {
          signal?.throwIfAborted();
          if (cause instanceof PortalTransparenciaCredentialError) throw cause;
          const error = cause instanceof Error ? cause : new Error(String(cause));
          if (/Portal da Transparência retornou HTTP \d{3}/.test(error.message) || /JSON inválido/.test(error.message)) throw error;
          if (attempt === this.maxAttempts) throw error;
          lastError = error;
          await this.sleep(this.retryBackoffMs * attempt);
        }
      }
      throw lastError ?? new Error('Consulta ao Portal da Transparência não concluída.');
    }, signal ? { signal } : undefined) as Promise<PortalTransparenciaResponse>;

    return task;
  }

  documentsByFavored(rawQuery: PortalDocumentsByFavoredQuery, signal?: AbortSignal): Promise<PortalTransparenciaResponse> {
    const query = documentsByFavoredSchema.parse(rawQuery);
    const params = new URLSearchParams();
    params.set('codigoPessoa', query.codigoPessoa);
    params.set('fase', String(query.fase));
    params.set('ano', String(query.ano));
    setDefined(params, 'ug', query.ug);
    setDefined(params, 'gestao', query.gestao);
    setDefined(params, 'ordenacaoResultado', query.ordenacaoResultado);
    params.set('pagina', String(query.pagina));
    return this.request('/despesas/documentos-por-favorecido', params, signal);
  }

  receivedResources(rawQuery: PortalReceivedResourcesQuery, signal?: AbortSignal): Promise<PortalTransparenciaResponse> {
    const query = receivedResourcesSchema.parse(rawQuery);
    const params = new URLSearchParams();
    params.set('mesAnoInicio', query.mesAnoInicio);
    params.set('mesAnoFim', query.mesAnoFim);
    params.set('codigoFavorecido', query.codigoFavorecido);
    setDefined(params, 'uf', query.uf);
    setDefined(params, 'codigoIBGE', query.codigoIBGE);
    setDefined(params, 'orgaoSuperior', query.orgaoSuperior);
    setDefined(params, 'orgao', query.orgao);
    setDefined(params, 'unidadeGestora', query.unidadeGestora);
    params.set('pagina', String(query.pagina));
    return this.request('/despesas/recursos-recebidos', params, signal);
  }
}
