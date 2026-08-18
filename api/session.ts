import { randomUUID, timingSafeEqual } from 'node:crypto';
import { unzipSync } from 'fflate';
import { z } from 'zod';

const sessionIdSchema = z.string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Identificador de sessão inválido.');
const inepSchema = z.string().regex(/^\d{8}$/, 'INEP inválido.');
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

type GithubTemporarySessionState = 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'FAILED';

interface GithubTemporarySessionStatus {
  state: GithubTemporarySessionState;
  runId?: number;
}

interface GithubActionsTemporarySessionClientOptions {
  token: string;
  owner: string;
  repo: string;
  workflow: string;
  ref: string;
  fetch?: typeof fetch;
}

interface GithubWorkflowRun {
  id: number;
  display_title: string;
  status: string;
  conclusion: string | null;
}

interface GithubArtifact {
  id: number;
  name: string;
  expired?: boolean;
}

interface TemporarySessionClient {
  dispatch(input: { sessionId: string; ineps: 'all' | string[] }): Promise<void>;
  getStatus(sessionId: string): Promise<GithubTemporarySessionStatus | { state: string; runId?: number }>;
  readArtifactFile(sessionId: string, path: string): Promise<Uint8Array>;
}

interface TemporarySessionApiOptions {
  accessKey: string;
  client: TemporarySessionClient;
  createSessionId?: () => string;
}

const NO_STORE = { 'cache-control': 'private, no-store, max-age=0' };

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

function createGithubActionsTemporarySessionClient(
  options: GithubActionsTemporarySessionClientOptions,
) {
  const token = z.string().min(20).parse(options.token);
  const owner = z.string().min(1).parse(options.owner);
  const repo = z.string().min(1).parse(options.repo);
  const workflow = z.string().min(1).parse(options.workflow);
  const ref = z.string().min(1).parse(options.ref);
  const fetchImpl = options.fetch ?? fetch;
  const base = `https://api.github.com/repos/${encodePath(owner)}/${encodePath(repo)}`;
  const githubHeaders = {
    accept: 'application/vnd.github+json',
    authorization: `Bearer ${token}`,
    'x-github-api-version': '2022-11-28',
  };

  async function githubRequest(url: string, init: RequestInit = {}): Promise<Response> {
    const response = await fetchImpl(url, {
      ...init,
      headers: { ...githubHeaders, ...Object.fromEntries(new Headers(init.headers).entries()) },
    });
    if (!response.ok) {
      throw new Error(`GitHub Actions respondeu ${response.status}.`);
    }
    return response;
  }

  async function matchingRun(sessionId: string): Promise<GithubWorkflowRun | null> {
    const id = sessionIdSchema.parse(sessionId);
    const url = `${base}/actions/workflows/${encodePath(workflow)}/runs?event=workflow_dispatch&branch=${encodeURIComponent(ref)}&per_page=50`;
    const response = await githubRequest(url);
    const body = z.object({
      workflow_runs: z.array(z.object({
        id: z.number().int().positive(),
        display_title: z.string(),
        status: z.string(),
        conclusion: z.string().nullable(),
      }).passthrough()),
    }).passthrough().parse(await response.json());
    return body.workflow_runs.find((run) => run.display_title === `PDDE Session ${id}`) ?? null;
  }

  async function getStatus(sessionId: string): Promise<GithubTemporarySessionStatus> {
    const run = await matchingRun(sessionId);
    if (!run) return { state: 'QUEUED' };
    if (run.status !== 'completed') {
      return {
        state: run.status === 'queued' || run.status === 'waiting' || run.status === 'pending'
          ? 'QUEUED'
          : 'RUNNING',
        runId: run.id,
      };
    }
    return {
      state: run.conclusion === 'success' ? 'COMPLETE' : 'FAILED',
      runId: run.id,
    };
  }

  async function artifactFor(sessionId: string): Promise<GithubArtifact> {
    const id = sessionIdSchema.parse(sessionId);
    const status = await getStatus(id);
    if (status.state !== 'COMPLETE' || !status.runId) {
      throw new Error(`Resultado da sessão ainda não está disponível: ${status.state}.`);
    }
    const response = await githubRequest(`${base}/actions/runs/${status.runId}/artifacts`);
    const body = z.object({
      artifacts: z.array(z.object({
        id: z.number().int().positive(),
        name: z.string(),
        expired: z.boolean().optional(),
      }).passthrough()),
    }).passthrough().parse(await response.json());
    const artifact = body.artifacts.find((item) => item.name === `pdde-session-${id}`);
    if (!artifact) throw new Error('Artefato da sessão não encontrado.');
    if (artifact.expired) throw new Error('Artefato da sessão expirou.');
    return artifact;
  }

  async function readArtifactFile(sessionId: string, path: string): Promise<Uint8Array> {
    const safePath = z.string().min(1).max(240).regex(/^(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/).parse(path);
    const artifact = await artifactFor(sessionId);
    const zipResponse = await fetchImpl(`${base}/actions/artifacts/${artifact.id}/zip`, {
      headers: githubHeaders,
      redirect: 'manual',
    });
    if (zipResponse.status < 300 || zipResponse.status >= 400) {
      throw new Error(`Download do artefato não retornou redirect esperado: ${zipResponse.status}.`);
    }
    const location = zipResponse.headers.get('location');
    if (!location) throw new Error('GitHub não informou a localização assinada do artefato.');

    const signedResponse = await fetchImpl(location, { redirect: 'follow' });
    if (!signedResponse.ok) throw new Error(`Blob do artefato respondeu ${signedResponse.status}.`);
    const archive = unzipSync(new Uint8Array(await signedResponse.arrayBuffer()));
    const file = archive[safePath];
    if (!file) throw new Error(`Arquivo ${safePath} não encontrado no resultado da sessão.`);
    return file;
  }

  return {
    async dispatch(input: { sessionId: string; ineps: 'all' | string[] }): Promise<void> {
      const sessionId = sessionIdSchema.parse(input.sessionId);
      let ineps = 'all';
      if (input.ineps !== 'all') {
        const values = z.array(inepSchema).min(1).max(163).parse(input.ineps);
        if (new Set(values).size !== values.length) throw new Error('INEP duplicado na consulta temporária.');
        ineps = values.join(',');
      }
      await githubRequest(`${base}/actions/workflows/${encodePath(workflow)}/dispatches`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ref, inputs: { session_id: sessionId, ineps } }),
      });
    },
    getStatus,
    readArtifactFile,
  };
}

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

async function handleTemporarySessionRequest(
  request: Request,
  options: TemporarySessionApiOptions,
): Promise<Response> {
  const accessKey = z.string().min(1).parse(options.accessKey);
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

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} não está configurada no ambiente do backend.`);
  return value;
}

export function temporarySessionWorkflowRef(
  environment: Record<string, string | undefined> = process.env,
): string {
  return environment.PDDE_SESSION_GITHUB_REF?.trim() || 'main';
}

export default {
  async fetch(request: Request): Promise<Response> {
    try {
      const client = createGithubActionsTemporarySessionClient({
        token: requiredEnv('PDDE_SESSION_GITHUB_TOKEN'),
        owner: 'WilsonMPeixoto-2',
        repo: 'pdde-repasse-conciliador',
        workflow: 'temporary-session-run.yml',
        ref: temporarySessionWorkflowRef(),
      });
      return handleTemporarySessionRequest(request, {
        accessKey: requiredEnv('PDDE_SESSION_ACCESS_KEY'),
        client,
      });
    } catch (cause) {
      const message = cause instanceof Error
        ? cause.message
        : 'Modo Sessão indisponível por configuração do servidor.';
      return Response.json(
        { error: message },
        {
          status: 503,
          headers: { 'cache-control': 'private, no-store, max-age=0' },
        },
      );
    }
  },
};
