import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/orchestration/inngest-bridge.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('ponte Inngest opcional', () => {
  test('permanece desativada por padrão e não cria infraestrutura paralela', async () => {
    const subject = await loadSubject();
    expect(subject, 'a ponte Inngest ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const create = subject.createInngestBridge as (options?: Record<string, unknown>) => Record<string, unknown>;
    expect(create({ enabled: false, appId: 'pdde-4cre' })).toMatchObject({ enabled: false, client: null });
  });

  test('quando habilitada cria cliente explícito sem tocar na fila Supabase', async () => {
    const subject = await loadSubject();
    expect(subject, 'a ponte Inngest ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const create = subject.createInngestBridge as (options?: Record<string, unknown>) => Record<string, any>;
    const bridge = create({ enabled: true, appId: 'pdde-4cre' });
    expect(bridge.enabled).toBe(true);
    expect(bridge.client).toBeTruthy();
    expect(bridge.client.createFunction).toBeTypeOf('function');
  });

  test('recusa ativação sem identificador da aplicação', async () => {
    const subject = await loadSubject();
    expect(subject, 'a ponte Inngest ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const create = subject.createInngestBridge as (options?: Record<string, unknown>) => Record<string, unknown>;
    expect(() => create({ enabled: true, appId: '' })).toThrow(/appId/i);
  });

  test('lê ativação explicitamente do ambiente e continua desligada sem flag', async () => {
    const subject = await loadSubject();
    expect(subject, 'a ponte Inngest ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const fromEnv = subject.createInngestBridgeFromEnv as (env: Record<string, string | undefined>) => Record<string, any>;
    expect(fromEnv({ INNGEST_APP_ID: 'pdde-4cre' })).toMatchObject({ enabled: false, client: null });
    expect(fromEnv({ INNGEST_ENABLED: 'true', INNGEST_APP_ID: 'pdde-4cre' })).toMatchObject({ enabled: true });
  });

  test('adapta step.run do Inngest ao executor durável neutro', async () => {
    const subject = await loadSubject();
    expect(subject, 'a ponte Inngest ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const adapt = subject.inngestStepRunner as (step: any) => { run(id: string, handler: () => Promise<unknown>): Promise<unknown> };
    const step = { run: vi.fn(async (_id: string, handler: () => Promise<unknown>) => handler()) };
    const runner = adapt(step);
    await expect(runner.run('pddeinfo', async () => ({ ok: true }))).resolves.toEqual({ ok: true });
    expect(step.run).toHaveBeenCalledTimes(1);
    expect(step.run).toHaveBeenCalledWith('pddeinfo', expect.any(Function));
  });
});
