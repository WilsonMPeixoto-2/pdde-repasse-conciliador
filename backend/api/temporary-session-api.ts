import { randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { GithubTemporarySessionStatus } from '../infrastructure/github-actions-temporary-session';

const sessionIdSchema = z.string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9._:-]+$/);
const inepSchema = z.string().regex(/^\d{8}$/);
const createBodySchema = z.object({
  ineps: z.union([
    z.literal('all'),
    z.array(inepSchema).min(1).max(163),
  ]),
}).strict();
const terminalSessionSchema = z.object({
  status: z.enum(['COMPLETE', 'PARTIAL']),
  temporary: z.literal(true),
  schoolCount: z.number().int().nonnegative().optional(),
}).passthrough();

interface TemporarySessionClient {
  dispatch(input: { sessionId: string; ineps: 'all' | string[] }): Promise<void>;
  getStatus(sessionId: string): Promise<GithubTemporarySessionStatus | { state: string; runId?: number }>;
  readArtifactFile(sessionId: string, path: string): Promise<Uint8Array>;
}

export interface TemporarySessionApiOptions {
  accessKey: string;
  client: TemporarySessionClient;
  createSessionId?: () => string;
}

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

function json(value: unknown, status = 200): Response {
  return Response.json(value, {
    status,
    headers: NO_STORE,
  });
}

function responseBody(bytes: Uint8Array): ArrayBuffer {
  return Uint8Array.from(bytes).buffer;
}

function bearer(request: Request): string | null {
  const value = request.headers.get('authorization');
  const match = /^Bearer\s+(.+)$/i.exec(value ?? '');
  return match?.[1] ?? null;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left, 'utf8');
  const b = Buffer.from(right, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

function authorized(request: Request, accessKey: string): boolean {
  const supplied = bearer(request);
  return supplied !== null && safeEqual(supplied, accessKey);
}

function publicSessionId(createSessionId?: () => string): string {
  const generated = createSessionId?.() ?? `web-${randomUUID()}`;
  return sessionIdSchema.parse(generated);
}

async function actualStatus(
  sessionId: string,
  client: TemporarySessionClient,
): Promise<Record<string, unknown>> {
  const workflow = await client.getStatus(sessionId);
  if (workflow.state !== 'COMPLETE') {
    return { state: workflow.state, ready: false };
  }
  try {
    const bytes = await client.readArtifactFile(sessionId, 'session.json');
    const session = terminalSessionSchema.parse(JSON.parse(new TextDecoder().decode(bytes)));
    return {
      ...session,
      state: session.status,
      ready: true,
    };
  } catch (cause) {
    if (cause instanceof Error && /não encontrado|ainda não está disponível/i.test(cause.message)) {
      return { state: 'FINALIZING', ready: false };
    }
    throw cause;
  }
}

export async function handleTemporarySessionRequest(
  request: Request,
  options: TemporarySessionApiOptions,
): Promise<Response> {
  const accessKey = z.string().min(24).parse(options.accessKey);
  if (!authorized(request, accessKey)) {
    return json({ error: 'Acesso ao Modo Sessão não autorizado.' }, 401);
  }

  try {
    if (request.method === 'POST') {
      const body = createBodySchema.parse(await request.json());
      if (body.ineps !== 'all' && new Set(body.ineps).size !== body.ineps.length) {
        return json({ error: 'INEP duplicado na consulta temporária.' }, 400);
      }
      const sessionId = publicSessionId(options.createSessionId);
      await options.client.dispatch({ sessionId, ineps: body.ineps });
      return json({ sessionId, state: 'QUEUED' }, 202);
    }

    if (request.method !== 'GET') {
      return json({ error: 'Método não permitido.' }, 405);
    }

    const url = new URL(request.url);
    const sessionId = sessionIdSchema.parse(url.searchParams.get('id') ?? '');
    const resource = url.searchParams.get('resource') ?? 'status';

    if (resource === 'status') {
      return json(await actualStatus(sessionId, options.client));
    }

    if (resource === 'portfolio') {
      const bytes = await options.client.readArtifactFile(sessionId, 'portfolio.json');
      return new Response(responseBody(bytes), {
        status: 200,
        headers: { ...NO_STORE, 'content-type': 'application/json; charset=utf-8' },
      });
    }

    if (resource === 'school') {
      const inep = inepSchema.parse(url.searchParams.get('inep') ?? '');
      const bytes = await options.client.readArtifactFile(sessionId, `schools/${inep}.json`);
      return new Response(responseBody(bytes), {
        status: 200,
        headers: { ...NO_STORE, 'content-type': 'application/json; charset=utf-8' },
      });
    }

    if (resource === 'export') {
      const filename = 'inteligencia-financeira-pdde-4cre-2026.xlsx';
      const bytes = await options.client.readArtifactFile(sessionId, filename);
      return new Response(responseBody(bytes), {
        status: 200,
        headers: {
          ...NO_STORE,
          'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'content-disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    return json({ error: 'Recurso de sessão desconhecido.' }, 404);
  } catch (cause) {
    if (cause instanceof z.ZodError || cause instanceof SyntaxError) {
      return json({ error: 'Consulta temporária inválida.' }, 400);
    }
    const message = cause instanceof Error ? cause.message : 'Falha inesperada no Modo Sessão.';
    const status = /ainda não está disponível|não encontrado|expirou/i.test(message) ? 409 : 502;
    return json({ error: message }, status);
  }
}
