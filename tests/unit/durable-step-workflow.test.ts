import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/orchestration/durable-step-workflow.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('workflow durável neutro', () => {
  test('executa etapas com IDs estáveis e entrega resultados às etapas seguintes', async () => {
    const subject = await loadSubject();
    expect(subject, 'o workflow durável ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const run = subject.runDurableSteps as (runner: any, steps: any[]) => Promise<Record<string, unknown>>;
    const calls: string[] = [];
    const runner = {
      run: vi.fn(async (id: string, handler: () => Promise<unknown>) => {
        calls.push(id);
        return handler();
      }),
    };

    const result = await run(runner, [
      { id: 'pddeinfo', run: async () => ({ schools: 163 }) },
      { id: 'conciliacao', run: async (results: Record<string, any>) => ({ schools: results.pddeinfo.schools, ok: true }) },
    ]);

    expect(calls).toEqual(['pddeinfo', 'conciliacao']);
    expect(result).toEqual({
      pddeinfo: { schools: 163 },
      conciliacao: { schools: 163, ok: true },
    });
  });

  test('falha interrompe as etapas posteriores', async () => {
    const subject = await loadSubject();
    expect(subject, 'o workflow durável ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const run = subject.runDurableSteps as (runner: any, steps: any[]) => Promise<unknown>;
    const later = vi.fn();
    const failure = new Error('SIGEF indisponível');
    const runner = { run: async (_id: string, handler: () => Promise<unknown>) => handler() };

    await expect(run(runner, [
      { id: 'sigef', run: async () => { throw failure; } },
      { id: 'relatorio', run: later },
    ])).rejects.toBe(failure);
    expect(later).not.toHaveBeenCalled();
  });
});
