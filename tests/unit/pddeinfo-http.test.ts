import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/pddeinfo-http.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('cliente HTTP do PDDEInfo', () => {
  test('monta a rota pública individual da 4ª CRE de forma determinística', async () => {
    const subject = await loadSubject();
    expect(subject, 'o cliente HTTP do PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    expect(subject.buildPddeInfoSchoolUrl).toBeTypeOf('function');

    const url = (subject.buildPddeInfoSchoolUrl as (options: Record<string, unknown>) => string)({
      fiscalYear: 2026,
      inep: '33069247',
    });

    expect(url).toBe('https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar/ano/2026/co_escola/33069247/cnpj//co_esfera_adm/2/sg_uf/RJ/co_municipio_fnde/330455/consultar/Consultar/page/1');
  });

  test('repete falhas transitórias e preserva os bytes recebidos na resposta bem-sucedida', async () => {
    const subject = await loadSubject();
    expect(subject, 'o cliente HTTP do PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    expect(subject.fetchPddeInfoSchoolHtml).toBeTypeOf('function');

    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response('indisponível', { status: 503 }))
      .mockResolvedValueOnce(new Response('ocupado', { status: 429 }))
      .mockResolvedValueOnce(new Response('<html>ok</html>', {
        status: 200,
        headers: { 'content-type': 'text/html; charset=UTF-8' },
      }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    const result = await (subject.fetchPddeInfoSchoolHtml as (
      options: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>)({
      fiscalYear: 2026,
      inep: '33069247',
      fetchImpl,
      sleep,
      now: () => '2026-08-12T22:50:00-03:00',
      maxAttempts: 3,
      timeoutMs: 5_000,
    });

    expect(result).toMatchObject({
      html: '<html>ok</html>',
      attempts: 3,
      queriedAt: '2026-08-12T22:50:00-03:00',
      sourceUrl: expect.stringContaining('/ano/2026/co_escola/33069247/'),
    });
    expect(result.rawBytes).toEqual(Buffer.from('<html>ok</html>', 'utf8'));
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  test('não mascara erro HTTP definitivo como indisponibilidade transitória', async () => {
    const subject = await loadSubject();
    expect(subject, 'o cliente HTTP do PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;

    const fetchImpl = vi.fn().mockResolvedValue(new Response('não encontrado', { status: 404 }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect((subject.fetchPddeInfoSchoolHtml as (
      options: Record<string, unknown>,
    ) => Promise<unknown>)({
      fiscalYear: 2026,
      inep: '33069247',
      fetchImpl,
      sleep,
      maxAttempts: 3,
    })).rejects.toThrow(/404/);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('interrompe sem retry quando o corpo excede o limite real de bytes', async () => {
    const subject = await loadSubject();
    expect(subject, 'o cliente HTTP do PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;

    const fetchImpl = vi.fn().mockResolvedValue(new Response(new Uint8Array(101).fill(120), {
      status: 200,
      headers: { 'content-type': 'text/html; charset=UTF-8' },
    }));
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect((subject.fetchPddeInfoSchoolHtml as (
      options: Record<string, unknown>,
    ) => Promise<unknown>)({
      fiscalYear: 2026,
      inep: '33069247',
      fetchImpl,
      sleep,
      maxAttempts: 3,
      maxResponseBytes: 100,
    })).rejects.toThrow(/resposta.*excede.*100 bytes/i);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });
});
