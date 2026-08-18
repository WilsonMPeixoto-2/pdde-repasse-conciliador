import { describe, expect, test } from 'vitest';

type CliModule = {
  parseTemporarySessionArgs?: (argv: string[]) => {
    ineps: 'all' | string[];
    workspace: string;
    outputDir: string;
  };
};

async function loadCli(): Promise<CliModule> {
  try {
    return await import('../../scripts/run-temporary-session') as unknown as CliModule;
  } catch {
    return {};
  }
}

describe('CLI do Modo Sessão', () => {
  test('aceita a carteira inteira ou uma lista explícita de INEPs', async () => {
    const module = await loadCli();
    expect(module.parseTemporarySessionArgs).toBeTypeOf('function');
    if (!module.parseTemporarySessionArgs) return;
    const parse = module.parseTemporarySessionArgs;

    expect(parse([
      '--ineps', 'all',
      '--workspace', '.tmp/session-a',
      '--output-dir', 'artifacts/session-a',
    ])).toMatchObject({ ineps: 'all' });

    expect(parse([
      '--ineps', '33069247,33069093',
      '--workspace', '.tmp/session-b',
      '--output-dir', 'artifacts/session-b',
    ])).toMatchObject({ ineps: ['33069247', '33069093'] });
  });

  test('rejeita INEP inválido ou duplicado antes de consultar fontes externas', async () => {
    const module = await loadCli();
    expect(module.parseTemporarySessionArgs).toBeTypeOf('function');
    if (!module.parseTemporarySessionArgs) return;
    const parse = module.parseTemporarySessionArgs;

    expect(() => parse([
      '--ineps', '123,33069247',
    ])).toThrow('INEP inválido');
    expect(() => parse([
      '--ineps', '33069247,33069247',
    ])).toThrow('INEP duplicado');
  });
});
