import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../scripts/assist-releases.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('CLI releases:assist', () => {
  test('converte os argumentos obrigatórios em opções do assistente', async () => {
    const module = await loadSubject();
    expect(module, 'a CLI do Assistente ainda não foi implementada').not.toBeNull();
    if (!module) return;
    const parsed = (module.parseArguments as Function)([
      '--pdde-info', '/dados/pddeinfo.json',
      '--workspace', '/dados/liberacoes',
      '--year', '2026',
      '--generated-at', '2026-08-12T10:00:00-03:00',
    ]);
    expect((module.optionsFromArguments as Function)(parsed)).toEqual({
      pddeInfoPath: '/dados/pddeinfo.json',
      workspacePath: '/dados/liberacoes',
      fiscalYear: 2026,
      generatedAt: '2026-08-12T10:00:00-03:00',
    });
  });

  test('rejeita argumento desconhecido e valores obrigatórios ausentes', async () => {
    const module = await loadSubject();
    expect(module).not.toBeNull();
    if (!module) return;
    expect(() => (module.parseArguments as Function)(['--inventado', 'x']))
      .toThrow(/desconhecido/i);
    const parsed = (module.parseArguments as Function)([
      '--pdde-info', '/dados/pddeinfo.json',
      '--year', '2026',
    ]);
    expect(() => (module.optionsFromArguments as Function)(parsed))
      .toThrow(/--workspace/i);
  });

  test('rejeita exercício que não seja inteiro', async () => {
    const module = await loadSubject();
    expect(module).not.toBeNull();
    if (!module) return;
    const parsed = (module.parseArguments as Function)([
      '--pdde-info', '/dados/pddeinfo.json',
      '--workspace', '/dados/liberacoes',
      '--year', 'vinte-vinte-e-seis',
    ]);
    expect(() => (module.optionsFromArguments as Function)(parsed))
      .toThrow(/year.*inteiro|exerc[ií]cio.*inteiro/i);
  });
});
