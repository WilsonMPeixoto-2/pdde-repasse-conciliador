import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/portal-transparencia-http.ts', import.meta.url).href;

async function subject(): Promise<Record<string, any> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, any>;
  } catch {
    return null;
  }
}

describe('API do Portal da Transparência', () => {
  test('consulta documentos por favorecido usando contrato OpenAPI oficial', async () => {
    const mod = await subject();
    expect(mod, 'adapter do Portal ainda não implementado').not.toBeNull();
    if (!mod) return;
    const fetchImpl = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      expect(url).toContain('/api-de-dados/despesas/documentos-por-favorecido?');
      const parsed = new URL(url);
      expect(parsed.searchParams.get('codigoPessoa')).toBe('04500463000173');
      expect(parsed.searchParams.get('fase')).toBe('3');
      expect(parsed.searchParams.get('ano')).toBe('2026');
      expect(parsed.searchParams.get('pagina')).toBe('1');
      expect(new Headers(init?.headers).get('chave-api-dados')).toBe('token-teste');
      return new Response(JSON.stringify([{ codigo: 'doc-1', valor: 4185 }]), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    });
    const client = new mod.PortalTransparenciaClient({
      apiKey: 'token-teste', fetchImpl, now: () => '2026-08-15T20:00:00-03:00',
      rateLimit: { concurrency: 1, intervalCap: 30, intervalMs: 60_000 },
    });
    const result = await client.documentsByFavored({
      codigoPessoa: '04500463000173', fase: 3, ano: 2026, pagina: 1,
    });
    expect(result.data).toEqual([{ codigo: 'doc-1', valor: 4185 }]);
    expect(result.sourceUrl).toContain('codigoPessoa=04500463000173');
    expect(result.queriedAt).toBe('2026-08-15T20:00:00-03:00');
    expect(result.rawBytes.byteLength).toBeGreaterThan(0);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  test('401 é classificado como credencial indisponível, não como ausência de dados', async () => {
    const mod = await subject();
    expect(mod, 'adapter do Portal ainda não implementado').not.toBeNull();
    if (!mod) return;
    const client = new mod.PortalTransparenciaClient({
      apiKey: 'token-invalido',
      fetchImpl: async () => new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401 }),
      rateLimit: { concurrency: 1, intervalCap: 30, intervalMs: 60_000 },
    });
    await expect(client.documentsByFavored({
      codigoPessoa: '04500463000173', fase: 3, ano: 2026, pagina: 1,
    })).rejects.toMatchObject({ name: 'PortalTransparenciaCredentialError' });
  });

  test('recursos recebidos usa período MM/AAAA e CNPJ do favorecido', async () => {
    const mod = await subject();
    expect(mod, 'adapter do Portal ainda não implementado').not.toBeNull();
    if (!mod) return;
    const fetchImpl = vi.fn(async (input: string | URL | Request) => {
      const parsed = new URL(String(input));
      expect(parsed.pathname).toContain('/despesas/recursos-recebidos');
      expect(parsed.searchParams.get('mesAnoInicio')).toBe('01/2026');
      expect(parsed.searchParams.get('mesAnoFim')).toBe('08/2026');
      expect(parsed.searchParams.get('codigoFavorecido')).toBe('04500463000173');
      return new Response('[]', { status: 200, headers: { 'content-type': 'application/json' } });
    });
    const client = new mod.PortalTransparenciaClient({
      apiKey: 'token-teste', fetchImpl,
      rateLimit: { concurrency: 1, intervalCap: 30, intervalMs: 60_000 },
    });
    await expect(client.receivedResources({
      mesAnoInicio: '01/2026', mesAnoFim: '08/2026', codigoFavorecido: '04500463000173', pagina: 1,
    })).resolves.toMatchObject({ data: [] });
  });
});
