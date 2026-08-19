import { gunzipSync, strFromU8 } from 'fflate';
import { z } from 'zod';
import { humanPortfolioSchema, humanSchoolSchema, type HumanPortfolio, type HumanSchool } from './types';

const publishedSnapshotManifestSchema = z.object({
  encoding: z.literal('gzip-base64-parts'),
  parts: z.array(z.string().min(1)).min(1),
}).passthrough();

const publishedSnapshotSchema = z.object({
  portfolio: humanPortfolioSchema,
  schools: z.record(z.string(), humanSchoolSchema),
}).passthrough();

const liveSchoolQueryResultSchema = z.object({
  generatedAt: z.string().min(1),
  status: z.enum(['COMPLETE', 'PARTIAL']),
  portfolio: humanPortfolioSchema,
  school: humanSchoolSchema,
}).strict();

export type LiveSchoolQueryResult = z.infer<typeof liveSchoolQueryResultSchema>;
type PublishedSnapshot = z.infer<typeof publishedSnapshotSchema>;
let publishedSnapshotPromise: Promise<PublishedSnapshot> | null = null;

const temporarySessionStartSchema = z.object({
  sessionId: z.string().min(1),
  state: z.literal('QUEUED'),
}).strict();

const temporarySessionStatusSchema = z.object({
  state: z.enum(['QUEUED', 'RUNNING', 'FINALIZING', 'COMPLETE', 'PARTIAL', 'FAILED']),
  ready: z.boolean().optional(),
  temporary: z.boolean().optional(),
  schoolCount: z.number().int().nonnegative().optional(),
}).passthrough();

export type TemporarySessionStatus = z.infer<typeof temporarySessionStatusSchema>;

export class TemporarySessionRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'TemporarySessionRequestError';
  }
}

export function isTerminalTemporarySessionError(cause: unknown): boolean {
  return cause instanceof TemporarySessionRequestError
    && [400, 401, 403, 404, 410].includes(cause.status);
}

async function readJson(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    throw new Error('O serviço financeiro respondeu em um formato inesperado.');
  }
  return response.json();
}

async function request(path: string, signal?: AbortSignal): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(path, { headers: { Accept: 'application/json' }, signal });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Não foi possível consultar os dados financeiros agora.');
  }
  if (response.status === 404) {
    throw new Error('A posição financeira de 2026 ainda não foi publicada para esta consulta.');
  }
  if (!response.ok) {
    throw new Error('Os dados financeiros estão temporariamente indisponíveis.');
  }
  return readJson(response);
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value.replace(/\s+/g, ''));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

async function loadPublishedSnapshot(signal?: AbortSignal): Promise<PublishedSnapshot> {
  if (!publishedSnapshotPromise) {
    publishedSnapshotPromise = (async () => {
      const manifest = publishedSnapshotManifestSchema.parse(
        await request('/data/pdde-2026-snapshot.json', signal),
      );

      const responses = await Promise.all(manifest.parts.map(async (part) => {
        const response = await fetch(part, { signal, headers: { Accept: 'text/plain' } });
        if (!response.ok) throw new Error('O retrato financeiro publicado está incompleto.');
        return response.text();
      }));

      const compressed = decodeBase64(responses.join(''));
      const json = strFromU8(gunzipSync(compressed));
      return publishedSnapshotSchema.parse(JSON.parse(json));
    })().catch((error) => {
      publishedSnapshotPromise = null;
      throw error;
    });
  }
  return publishedSnapshotPromise;
}

async function temporaryRequest(
  accessKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (accessKey.trim().length < 24) {
    throw new TemporarySessionRequestError('A chave de acesso ao Modo Sessão é inválida.', 400);
  }
  let response: Response;
  try {
    response = await fetch(path, {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessKey}`,
        ...Object.fromEntries(new Headers(init.headers).entries()),
      },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Não foi possível acessar a consulta temporária agora.');
  }
  if (!response.ok) {
    let message = 'A consulta temporária não pôde ser processada.';
    if ((response.headers.get('content-type') ?? '').includes('application/json')) {
      const body = await response.json().catch(() => null) as { error?: unknown } | null;
      if (typeof body?.error === 'string' && body.error.trim()) message = body.error;
    }
    throw new TemporarySessionRequestError(message, response.status);
  }
  return response;
}

export async function loadHumanPortfolio(signal?: AbortSignal): Promise<HumanPortfolio> {
  return (await loadPublishedSnapshot(signal)).portfolio;
}

export async function loadHumanSchool(inep: string, signal?: AbortSignal): Promise<HumanSchool> {
  if (!/^\d{8}$/.test(inep)) throw new Error('INEP inválido.');
  const school = (await loadPublishedSnapshot(signal)).schools[inep];
  if (!school) throw new Error('A unidade não foi localizada no retrato financeiro publicado.');
  return school;
}

export async function runLiveSchoolQuery(
  inep: string,
  signal?: AbortSignal,
): Promise<LiveSchoolQueryResult> {
  if (!/^\d{8}$/.test(inep)) throw new Error('INEP inválido.');
  let response: Response;
  try {
    response = await fetch('/api/live', {
      method: 'POST',
      signal,
      headers: {
        Accept: 'application/json',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ inep }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new Error('Não foi possível consultar a unidade agora.');
  }

  const body = await readJson(response).catch(() => null) as { error?: unknown } | null;
  if (!response.ok) {
    const message = typeof body?.error === 'string' && body.error.trim()
      ? body.error
      : `A consulta da unidade ${inep} não pôde ser concluída.`;
    throw new Error(message);
  }
  return liveSchoolQueryResultSchema.parse(body);
}

export async function startTemporarySession(
  accessKey: string,
  ineps: 'all' | string[],
  signal?: AbortSignal,
): Promise<{ sessionId: string; state: 'QUEUED' }> {
  const response = await temporaryRequest(accessKey, '/api/session', {
    method: 'POST',
    signal,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ineps }),
  });
  return temporarySessionStartSchema.parse(await readJson(response));
}

export async function loadTemporarySessionStatus(
  accessKey: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<TemporarySessionStatus> {
  const response = await temporaryRequest(
    accessKey,
    `/api/session?id=${encodeURIComponent(sessionId)}`,
    { signal },
  );
  return temporarySessionStatusSchema.parse(await readJson(response));
}

export async function loadTemporaryPortfolio(
  accessKey: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<HumanPortfolio> {
  const response = await temporaryRequest(
    accessKey,
    `/api/session?id=${encodeURIComponent(sessionId)}&resource=portfolio`,
    { signal },
  );
  return humanPortfolioSchema.parse(await readJson(response));
}

export async function loadTemporarySchool(
  accessKey: string,
  sessionId: string,
  inep: string,
  signal?: AbortSignal,
): Promise<HumanSchool> {
  if (!/^\d{8}$/.test(inep)) throw new Error('INEP inválido.');
  const response = await temporaryRequest(
    accessKey,
    `/api/session?id=${encodeURIComponent(sessionId)}&resource=school&inep=${encodeURIComponent(inep)}`,
    { signal },
  );
  return humanSchoolSchema.parse(await readJson(response));
}

export async function loadTemporaryWorkbook(
  accessKey: string,
  sessionId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await temporaryRequest(
    accessKey,
    `/api/session?id=${encodeURIComponent(sessionId)}&resource=export`,
    { signal, headers: { Accept: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' } },
  );
  return response.blob();
}
