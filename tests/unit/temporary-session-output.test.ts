import { describe, expect, test } from 'vitest';

type OutputModule = {
  temporarySessionOutputEntries?: (result: {
    runId: string;
    status: 'COMPLETE';
    portfolio: Record<string, unknown>;
    schools: Array<{ school: { inep: string }; snapshot: Record<string, unknown> }>;
    workbookBytes: Uint8Array;
    workbookFilename: string;
  }) => Array<{ path: string; content: string | Uint8Array }>;
};

async function loadCli(): Promise<OutputModule> {
  try {
    return await import('../../scripts/run-temporary-session') as unknown as OutputModule;
  } catch {
    return {};
  }
}

describe('pacote web do Modo Sessão', () => {
  test('publica apenas contrato web, prontuários, metadados e Excel', async () => {
    const module = await loadCli();
    expect(module.temporarySessionOutputEntries).toBeTypeOf('function');
    if (!module.temporarySessionOutputEntries) return;

    const entries = module.temporarySessionOutputEntries({
      runId: 'session-test-2026',
      status: 'COMPLETE',
      portfolio: { fiscalYear: 2026, schoolCount: 1 },
      schools: [{
        school: { inep: '33069247' },
        snapshot: { fiscalYear: 2026, school: { inep: '33069247' } },
      }],
      workbookBytes: Uint8Array.from([0x50, 0x4b, 0x03, 0x04]),
      workbookFilename: 'inteligencia-financeira-pdde-4cre-2026.xlsx',
    });

    expect(entries.map((entry) => entry.path).sort()).toEqual([
      'inteligencia-financeira-pdde-4cre-2026.xlsx',
      'portfolio.json',
      'schools/33069247.json',
      'session.json',
    ]);
    expect(entries.some((entry) => entry.path === 'human-financial.json')).toBe(false);
    const session = entries.find((entry) => entry.path === 'session.json');
    expect(typeof session?.content).toBe('string');
    expect(JSON.parse(session?.content as string)).toMatchObject({
      sessionId: 'session-test-2026',
      status: 'COMPLETE',
      temporary: true,
      schoolCount: 1,
    });
  });
});
