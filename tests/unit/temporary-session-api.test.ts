import { describe, expect, test } from 'vitest';

type SessionClient = {
  dispatch(input: { sessionId: string; ineps: 'all' | string[] }): Promise<void>;
  getStatus(sessionId: string): Promise<{ state: string; runId?: number }>;
  readArtifactFile(sessionId: string, path: string): Promise<Uint8Array>;
};

type ApiModule = {
  handleTemporarySessionRequest?: (
    request: Request,
    options: { accessKey: string; client: SessionClient; createSessionId?: () => string },
  ) => Promise<Response>;
};

async function loadApi(): Promise<ApiModule> {
  try {
    return await import('../../backend/api/temporary-session-api') as unknown as ApiModule;
  } catch {
    return {};
  }
}

const encoder = new TextEncoder();
const ACCESS = 'session_access_key_12345678901234567890';

function request(url: string, init: RequestInit = {}): Request {
  return new Request(url, {
    ...init,
    headers: {
      authorization: `Bearer ${ACCESS}`,
      ...(init.headers ?? {}),
    },
  });
}

function client(overrides: Partial<SessionClient> = {}): SessionClient {
  return {
    dispatch: async () => {},
    getStatus: async () => ({ state: 'RUNNING', runId: 42 }),
    readArtifactFile: async (_sessionId, path) => {
      if (path === 'session.json') return encoder.encode('{"status":"COMPLETE","temporary":true}');
      if (path === 'portfolio.json') return encoder.encode('{"fiscalYear":2026,"schoolCount":1}');
      if (path === 'schools/33069247.json') return encoder.encode('{"fiscalYear":2026,"school":{"inep":"33069247"}}');
      return Uint8Array.from([0x50, 0x4b, 0x03, 0x04]);
    },
    ...overrides,
  };
}

describe('API temporária para Vercel', () => {
  test('recusa chamadas sem a chave de acesso do Modo Sessão', async () => {
    const module = await loadApi();
    expect(module.handleTemporarySessionRequest).toBeTypeOf('function');
    if (!module.handleTemporarySessionRequest) return;
    const response = await module.handleTemporarySessionRequest(
      new Request('https://app.example/api/session', { method: 'POST', body: '{"ineps":"all"}' }),
      { accessKey: ACCESS, client: client() },
    );
    expect(response.status).toBe(401);
  });

  test('cria sessão e devolve somente identificador opaco e estado inicial', async () => {
    const module = await loadApi();
    expect(module.handleTemporarySessionRequest).toBeTypeOf('function');
    if (!module.handleTemporarySessionRequest) return;
    const calls: unknown[] = [];
    const response = await module.handleTemporarySessionRequest(
      request('https://app.example/api/session', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ineps: ['33069247'] }),
      }),
      {
        accessKey: ACCESS,
        createSessionId: () => 'web-session-abc123',
        client: client({ dispatch: async (input) => { calls.push(input); } }),
      },
    );
    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ sessionId: 'web-session-abc123', state: 'QUEUED' });
    expect(calls).toEqual([{ sessionId: 'web-session-abc123', ineps: ['33069247'] }]);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  test('traduz conclusão do workflow para COMPLETE ou PARTIAL usando session.json', async () => {
    const module = await loadApi();
    expect(module.handleTemporarySessionRequest).toBeTypeOf('function');
    if (!module.handleTemporarySessionRequest) return;
    const response = await module.handleTemporarySessionRequest(
      request('https://app.example/api/session?id=web-session-abc123'),
      {
        accessKey: ACCESS,
        client: client({
          getStatus: async () => ({ state: 'COMPLETE', runId: 42 }),
          readArtifactFile: async (_id, path) => path === 'session.json'
            ? encoder.encode('{"status":"PARTIAL","temporary":true,"schoolCount":1}')
            : encoder.encode('{}'),
        }),
      },
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ state: 'PARTIAL', ready: true, temporary: true });
  });

  test('serve Home, prontuário e Excel diretamente do artefato efêmero', async () => {
    const module = await loadApi();
    expect(module.handleTemporarySessionRequest).toBeTypeOf('function');
    if (!module.handleTemporarySessionRequest) return;
    const options = { accessKey: ACCESS, client: client() };

    const portfolio = await module.handleTemporarySessionRequest(
      request('https://app.example/api/session?id=web-session-abc123&resource=portfolio'),
      options,
    );
    expect(portfolio.headers.get('content-type')).toContain('application/json');
    expect(await portfolio.json()).toEqual({ fiscalYear: 2026, schoolCount: 1 });

    const school = await module.handleTemporarySessionRequest(
      request('https://app.example/api/session?id=web-session-abc123&resource=school&inep=33069247'),
      options,
    );
    expect(await school.json()).toMatchObject({ school: { inep: '33069247' } });

    const excel = await module.handleTemporarySessionRequest(
      request('https://app.example/api/session?id=web-session-abc123&resource=export'),
      options,
    );
    expect(excel.headers.get('content-type')).toContain('spreadsheetml');
    expect(excel.headers.get('content-disposition')).toContain('inteligencia-financeira-pdde-4cre-2026.xlsx');
    expect(Array.from(new Uint8Array(await excel.arrayBuffer()).slice(0, 2))).toEqual([0x50, 0x4b]);
  });
});
