import { afterEach, describe, expect, test, vi } from 'vitest';

const portfolio = {
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  metrics: {
    schoolCount: 1,
    accountsTotal: 0,
    accountsWithPosition: 0,
    programmedCents: 0,
    paymentInformedCents: 0,
    creditLocatedCents: 0,
    reportedBalanceCents: null,
    applicationsCents: null,
  },
  indicators: [],
  sources: [{ name: 'PDDEInfo', information: 'Dados financeiros.' }],
  schoolCount: 1,
  schools: [{ inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA' }],
};

const school = {
  fiscalYear: 2026,
  school: {
    inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA', uex: '', cnpj: '',
  },
  programs: [],
  accounts: [],
  accounting: [],
  followUp: [],
};

async function api() {
  return import('../../src/product/api');
}

afterEach(() => vi.unstubAllGlobals());

describe('cliente web do Modo Sessão', () => {
  test('inicia consulta temporária enviando a chave somente no Authorization', async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), init });
      return Response.json({ sessionId: 'web-session-abc', state: 'QUEUED' }, { status: 202 });
    }));
    const { startTemporarySession } = await api();

    await expect(startTemporarySession('access-key-12345678901234567890', ['33069247']))
      .resolves.toEqual({ sessionId: 'web-session-abc', state: 'QUEUED' });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.url).toBe('/api/session');
    expect(new Headers(calls[0]?.init?.headers).get('authorization'))
      .toBe('Bearer access-key-12345678901234567890');
    expect(String(calls[0]?.init?.body)).not.toContain('access-key');
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({ ineps: ['33069247'] });
  });

  test('acompanha estado e valida portfólio/prontuário da sessão pelo mesmo contrato humano', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('resource=portfolio')) return Response.json(portfolio);
      if (url.includes('resource=school')) return Response.json(school);
      return Response.json({ state: 'COMPLETE', ready: true, temporary: true, schoolCount: 1 });
    }));
    const { loadTemporarySessionStatus, loadTemporaryPortfolio, loadTemporarySchool } = await api();
    const key = 'access-key-12345678901234567890';

    await expect(loadTemporarySessionStatus(key, 'web-session-abc')).resolves.toMatchObject({
      state: 'COMPLETE', ready: true, temporary: true,
    });
    await expect(loadTemporaryPortfolio(key, 'web-session-abc')).resolves.toEqual(portfolio);
    await expect(loadTemporarySchool(key, 'web-session-abc', '33069247')).resolves.toEqual(school);
  });

  test('baixa o Excel temporário como blob sem colocar a chave na URL', async () => {
    const calls: Array<{ url: string; auth: string | null }> = [];
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      calls.push({ url: String(input), auth: new Headers(init?.headers).get('authorization') });
      return new Response(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), {
        headers: { 'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      });
    }));
    const { loadTemporaryWorkbook } = await api();
    const blob = await loadTemporaryWorkbook('access-key-12345678901234567890', 'web-session-abc');

    expect(blob.type).toContain('spreadsheetml');
    expect(calls[0]?.url).toContain('resource=export');
    expect(calls[0]?.url).not.toContain('access-key');
    expect(calls[0]?.auth).toBe('Bearer access-key-12345678901234567890');
  });
});
