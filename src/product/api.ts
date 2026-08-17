import { z } from 'zod';
import { humanPortfolioSchema, humanSchoolSchema, type HumanPortfolio, type HumanSchool } from './types';

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

async function temporaryRequest(
  accessKey: string,
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  if (accessKey.trim().length < 24) {
    throw new Error('A chave de acesso ao Modo Sessão é inválida.');
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
    throw new Error(message);
  }
  return response;
}

export async function loadHumanPortfolio(signal?: AbortSignal): Promise<HumanPortfolio> {
  return humanPortfolioSchema.parse(await request('/api/current/human/portfolio', signal));
}

export async function loadHumanSchool(inep: string, signal?: AbortSignal): Promise<HumanSchool> {
  if (!/^\d{8}$/.test(inep)) throw new Error('INEP inválido.');
  return humanSchoolSchema.parse(await request(`/api/current/human/schools/${encodeURIComponent(inep)}`, signal));
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
