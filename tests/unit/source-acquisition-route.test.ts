import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/application/source-acquisition-route.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('rota de aquisição em camadas', () => {
  test('usa structured -> HTTP -> browser e para no primeiro sucesso', async () => {
    const subject = await loadSubject();
    expect(subject, 'a rota de aquisição ainda não foi implementada').not.toBeNull();
    if (!subject) return;

    const Unavailable = subject.AcquisitionUnavailableError as new (message: string) => Error;
    const acquire = subject.acquireWithFallback as (strategies: unknown[]) => Promise<Record<string, unknown>>;
    const structured = vi.fn(async () => { throw new Unavailable('API indisponível'); });
    const http = vi.fn(async () => ({ source: 'HTTP', value: 42 }));
    const browser = vi.fn(async () => ({ source: 'BROWSER', value: 99 }));

    const result = await acquire([
      { kind: 'STRUCTURED_API', run: structured },
      { kind: 'HTTP', run: http },
      { kind: 'BROWSER_ASSISTED', run: browser },
    ]);

    expect(result).toMatchObject({ via: 'HTTP', value: { source: 'HTTP', value: 42 } });
    expect(structured).toHaveBeenCalledTimes(1);
    expect(http).toHaveBeenCalledTimes(1);
    expect(browser).not.toHaveBeenCalled();
  });

  test('não mascara erro definitivo como motivo para trocar de fonte', async () => {
    const subject = await loadSubject();
    expect(subject, 'a rota de aquisição ainda não foi implementada').not.toBeNull();
    if (!subject) return;

    const acquire = subject.acquireWithFallback as (strategies: unknown[]) => Promise<unknown>;
    const definitive = new Error('resposta estruturalmente inválida');
    const browser = vi.fn(async () => ({ ok: true }));

    await expect(acquire([
      { kind: 'STRUCTURED_API', run: async () => { throw definitive; } },
      { kind: 'BROWSER_ASSISTED', run: browser },
    ])).rejects.toBe(definitive);
    expect(browser).not.toHaveBeenCalled();
  });
});
