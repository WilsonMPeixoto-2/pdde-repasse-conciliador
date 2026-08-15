import { describe, expect, test, vi } from 'vitest';

const subjectUrl = new URL('../../backend/adapters/browser-assisted-source.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('browser assistido com intervenção humana', () => {
  test('detecta CAPTCHA/desafio por sinais explícitos sem tentar resolvê-lo', async () => {
    const subject = await loadSubject();
    expect(subject, 'o adaptador de browser assistido ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const detect = subject.detectInteractiveChallenge as (snapshot: Record<string, unknown>) => Record<string, unknown>;

    const result = detect({
      url: 'https://exemplo.gov.br/consulta',
      text: 'Confirme que você não é um robô para continuar. reCAPTCHA',
      matchingSelectors: ['iframe[src*="recaptcha"]'],
    });

    expect(result.detected).toBe(true);
    expect(result.reasons).toEqual(expect.arrayContaining([expect.stringMatching(/captcha|robô/i)]));
  });

  test('pausa no desafio, chama o operador e retoma após a mesma sessão ficar liberada', async () => {
    const subject = await loadSubject();
    expect(subject, 'o adaptador de browser assistido ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const resolve = subject.resolveInteractiveChallenge as (options: Record<string, unknown>) => Promise<Record<string, unknown>>;
    const onIntervention = vi.fn().mockResolvedValue(undefined);
    const snapshots = [
      { url: 'https://gov.br', text: 'captcha', matchingSelectors: ['#captcha'] },
      { url: 'https://gov.br/resultado', text: 'Consulta concluída', matchingSelectors: [] },
    ];

    const result = await resolve({
      initialSnapshot: snapshots[0],
      onIntervention,
      refreshSnapshot: vi.fn(async () => snapshots[1]),
      maxHumanAttempts: 1,
    });

    expect(onIntervention).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ resolved: true, interventions: 1 });
  });

  test('não pede intervenção em página normal', async () => {
    const subject = await loadSubject();
    expect(subject, 'o adaptador de browser assistido ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    const detect = subject.detectInteractiveChallenge as (snapshot: Record<string, unknown>) => Record<string, unknown>;
    expect(detect({ url: 'https://gov.br/resultado', text: 'Dados públicos', matchingSelectors: [] })).toMatchObject({ detected: false });
  });
});
