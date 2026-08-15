import { describe, expect, test } from 'vitest';

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
});
