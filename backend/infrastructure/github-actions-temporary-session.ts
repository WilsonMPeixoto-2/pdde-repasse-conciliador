import { unzipSync } from 'fflate';
import { z } from 'zod';

const sessionIdSchema = z.string()
  .min(1)
  .max(120)
  .regex(/^[A-Za-z0-9._:-]+$/, 'Identificador de sessão inválido.');
const inepSchema = z.string().regex(/^\d{8}$/, 'INEP inválido.');

export type GithubTemporarySessionState = 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'FAILED';

export interface GithubTemporarySessionStatus {
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

function encodePath(value: string): string {
  return encodeURIComponent(value);
}

export function createGithubActionsTemporarySessionClient(
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
      return { state: run.status === 'queued' || run.status === 'waiting' || run.status === 'pending'
        ? 'QUEUED'
        : 'RUNNING', runId: run.id };
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
