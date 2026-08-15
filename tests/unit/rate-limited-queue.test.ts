import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/runtime/rate-limited-queue.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('fila HTTP limitada', () => {
  test('limita concorrência e preserva a ordem lógica dos resultados', async () => {
    const subject = await loadSubject();
    expect(subject, 'o wrapper p-queue ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const runRateLimited = subject.runRateLimited as (
      items: number[],
      worker: (item: number) => Promise<number>,
      options: Record<string, unknown>,
    ) => Promise<number[]>;

    let active = 0;
    let maxActive = 0;
    const results = await runRateLimited(
      [1, 2, 3, 4, 5],
      async (value) => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await new Promise((resolve) => setTimeout(resolve, 8));
        active -= 1;
        return value * 10;
      },
      { concurrency: 2, intervalCap: 20, intervalMs: 1_000 },
    );

    expect(results).toEqual([10, 20, 30, 40, 50]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  test('respeita cancelamento externo antes de iniciar trabalho', async () => {
    const subject = await loadSubject();
    expect(subject, 'o wrapper p-queue ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const runRateLimited = subject.runRateLimited as (
      items: number[],
      worker: (item: number) => Promise<number>,
      options: Record<string, unknown>,
    ) => Promise<number[]>;

    const cancellation = new AbortController();
    const reason = new Error('coleta cancelada');
    cancellation.abort(reason);

    await expect(runRateLimited(
      [1],
      async (value) => value,
      { concurrency: 1, intervalCap: 1, intervalMs: 1_000, signal: cancellation.signal },
    )).rejects.toBe(reason);
  });
});
