import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../scripts/collect-pddeinfo.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

describe('CLI collect-pddeinfo', () => {
  test('interpreta workspace, exercício e parâmetros operacionais conservadores', async () => {
    const subject = await loadSubject();
    expect(subject, 'a CLI de coleta PDDEInfo ainda não foi implementada').not.toBeNull();
    if (!subject) return;

    const parseArguments = subject.parseArguments as (args: string[]) => Record<string, unknown>;
    const optionsFromArguments = subject.optionsFromArguments as (
      parsed: Record<string, unknown>,
    ) => Record<string, unknown>;

    const parsed = parseArguments([
      '--workspace', '/tmp/pddeinfo',
      '--year', '2026',
      '--batch-size', '3',
      '--batch-delay-ms', '1500',
    ]);
    expect(optionsFromArguments(parsed)).toEqual({
      workspacePath: '/tmp/pddeinfo',
      fiscalYear: 2026,
      batchSize: 3,
      batchDelayMs: 1500,
    });
  });

  test('define arquivo append-only de evidências dentro do workspace', async () => {
    const subject = await loadSubject();
    expect(subject).not.toBeNull();
    if (!subject) return;
    expect(subject.evidenceStorePath).toBeTypeOf('function');
    const evidenceStorePath = subject.evidenceStorePath as (workspacePath: string) => string;
    expect(evidenceStorePath('/tmp/pddeinfo')).toMatch(/[/\\]tmp[/\\]pddeinfo[/\\]evidence[/\\]events\.jsonl$/);
  });

  test('carrega a lista-mestre embutida com exatamente 163 INEPs únicos', async () => {
    const subject = await loadSubject();
    expect(subject, 'a CLI de coleta PDDEInfo ainda não foi implementada').not.toBeNull();
    if (!subject) return;

    const loadMasterSchools = subject.loadMasterSchools as () => Promise<Array<{ inep: string; sme: string; nome: string }>>;
    const schools = await loadMasterSchools();
    expect(schools).toHaveLength(163);
    expect(new Set(schools.map((school) => school.inep)).size).toBe(163);
    expect(new Set(schools.map((school) => school.sme)).size).toBe(163);
    expect(schools[0]).toMatchObject({
      inep: expect.stringMatching(/^\d{8}$/),
      sme: expect.stringMatching(/^\d{7}$/),
      nome: expect.any(String),
    });
  });

  test('rejeita argumento desconhecido em vez de ignorá-lo silenciosamente', async () => {
    const subject = await loadSubject();
    expect(subject, 'a CLI de coleta PDDEInfo ainda não foi implementada').not.toBeNull();
    if (!subject) return;
    const parseArguments = subject.parseArguments as (args: string[]) => unknown;
    expect(() => parseArguments(['--workspace', '/tmp/x', '--year', '2026', '--paralelismo', '99']))
      .toThrow(/desconhecido/i);
  });
});
