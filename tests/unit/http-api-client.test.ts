import { afterEach, describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../src/http-api-client.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('cliente HTTP da interface preservada', () => {
  test('GET mantém o contrato { data } e envia credenciais de mesma origem', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ ok: true, count: 163 }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const subject = await loadSubject();

    expect(subject, 'o cliente HTTP local ainda não foi implementado').not.toBeNull();
    const api = subject?.api as { get(path: string): Promise<{ data: unknown }> };
    await expect(api.get('/api/4cre-meta')).resolves.toEqual({ data: { ok: true, count: 163 } });
    expect(fetchMock).toHaveBeenCalledWith('/api/4cre-meta', expect.objectContaining({
      method: 'GET', credentials: 'same-origin', headers: { Accept: 'application/json' },
    }));
  });

  test('POST serializa JSON e transforma erro HTTP em exceção legível', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ error: 'XLSX rejeitado' }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    ));
    vi.stubGlobal('fetch', fetchMock);
    const subject = await loadSubject();
    expect(subject, 'o cliente HTTP local ainda não foi implementado').not.toBeNull();
    const api = subject?.api as { post(path: string, body: unknown): Promise<{ data: unknown }> };

    await expect(api.post('/api/save-xlsx', { content: 'abc' })).rejects.toThrow(/XLSX rejeitado/);
    expect(fetchMock).toHaveBeenCalledWith('/api/save-xlsx', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ content: 'abc' }),
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    }));
  });
});
