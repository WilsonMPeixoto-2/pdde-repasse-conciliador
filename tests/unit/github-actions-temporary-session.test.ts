import { zipSync } from 'fflate';
import { describe, expect, test } from 'vitest';

type BridgeModule = {
  createGithubActionsTemporarySessionClient?: (options: {
    token: string;
    owner: string;
    repo: string;
    workflow: string;
    ref: string;
    fetch: typeof fetch;
  }) => {
    dispatch(input: { sessionId: string; ineps: 'all' | string[] }): Promise<void>;
    getStatus(sessionId: string): Promise<{ state: string; runId?: number }>;
    readArtifactFile(sessionId: string, path: string): Promise<Uint8Array>;
  };
};

async function loadBridge(): Promise<BridgeModule> {
  try {
    return await import('../../backend/infrastructure/github-actions-temporary-session') as unknown as BridgeModule;
  } catch {
    return {};
  }
}

function json(value: unknown, status = 200, headers?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json', ...Object.fromEntries(new Headers(headers).entries()) },
  });
}

describe('ponte de sessão via GitHub Actions', () => {
  test('dispara workflow manual com sessão opaca e INEPs validados', async () => {
    const module = await loadBridge();
    expect(module.createGithubActionsTemporarySessionClient).toBeTypeOf('function');
    if (!module.createGithubActionsTemporarySessionClient) return;

    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      return new Response(null, { status: 204 });
    };
    const client = module.createGithubActionsTemporarySessionClient({
      token: 'github_pat_test_secret_value_1234567890',
      owner: 'WilsonMPeixoto-2',
      repo: 'pdde-repasse-conciliador',
      workflow: 'temporary-session-run.yml',
      ref: 'main',
      fetch: fakeFetch,
    });

    await client.dispatch({ sessionId: 'session-abc123', ineps: ['33069247', '33069093'] });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toContain('/actions/workflows/temporary-session-run.yml/dispatches');
    expect(calls[0]?.init?.method).toBe('POST');
    expect(new Headers(calls[0]?.init?.headers).get('authorization')).toBe('Bearer github_pat_test_secret_value_1234567890');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      ref: 'main',
      inputs: { session_id: 'session-abc123', ineps: '33069247,33069093' },
    });
  });

  test('localiza somente o run cujo título corresponde exatamente à sessão', async () => {
    const module = await loadBridge();
    expect(module.createGithubActionsTemporarySessionClient).toBeTypeOf('function');
    if (!module.createGithubActionsTemporarySessionClient) return;

    const fakeFetch: typeof fetch = async () => json({
      workflow_runs: [
        { id: 41, display_title: 'PDDE Session session-abc123-old', status: 'completed', conclusion: 'success' },
        { id: 42, display_title: 'PDDE Session session-abc123', status: 'in_progress', conclusion: null },
      ],
    });
    const client = module.createGithubActionsTemporarySessionClient({
      token: 'github_pat_test_secret_value_1234567890', owner: 'o', repo: 'r', workflow: 'w.yml', ref: 'main', fetch: fakeFetch,
    });

    await expect(client.getStatus('session-abc123')).resolves.toEqual({ state: 'RUNNING', runId: 42 });
  });

  test('baixa ZIP por redirect sem encaminhar o Bearer ao blob assinado', async () => {
    const module = await loadBridge();
    expect(module.createGithubActionsTemporarySessionClient).toBeTypeOf('function');
    if (!module.createGithubActionsTemporarySessionClient) return;

    const archive = zipSync({
      'portfolio.json': new TextEncoder().encode('{"fiscalYear":2026}'),
      'session.json': new TextEncoder().encode('{"status":"COMPLETE"}'),
    });
    const calls: Array<{ url: string; authorization: string | null; redirect?: RequestRedirect }> = [];
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({
        url,
        authorization: new Headers(init?.headers).get('authorization'),
        ...(init?.redirect ? { redirect: init.redirect } : {}),
      });
      if (url.includes('/actions/workflows/')) {
        return json({ workflow_runs: [{ id: 42, display_title: 'PDDE Session session-abc123', status: 'completed', conclusion: 'success' }] });
      }
      if (url.endsWith('/actions/runs/42/artifacts')) {
        return json({ artifacts: [{ id: 99, name: 'pdde-session-session-abc123', expired: false }] });
      }
      if (url.endsWith('/actions/artifacts/99/zip')) {
        return new Response(null, { status: 302, headers: { location: 'https://blob.example/signed.zip' } });
      }
      if (url === 'https://blob.example/signed.zip') {
        return new Response(archive, { status: 200, headers: { 'content-type': 'application/zip' } });
      }
      return new Response(null, { status: 404 });
    };
    const client = module.createGithubActionsTemporarySessionClient({
      token: 'github_pat_test_secret_value_1234567890', owner: 'o', repo: 'r', workflow: 'w.yml', ref: 'main', fetch: fakeFetch,
    });

    const bytes = await client.readArtifactFile('session-abc123', 'portfolio.json');
    expect(new TextDecoder().decode(bytes)).toBe('{"fiscalYear":2026}');
    const githubZipCall = calls.find((call) => call.url.endsWith('/actions/artifacts/99/zip'));
    const blobCall = calls.find((call) => call.url === 'https://blob.example/signed.zip');
    expect(githubZipCall).toMatchObject({ authorization: 'Bearer github_pat_test_secret_value_1234567890', redirect: 'manual' });
    expect(blobCall?.authorization).toBeNull();
  });
});
