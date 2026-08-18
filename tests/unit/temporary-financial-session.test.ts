import { describe, expect, test } from 'vitest';
import type { HumanFinancialPortfolioView } from '../../backend/application/build-human-financial-view';

const view: HumanFinancialPortfolioView = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Consulta temporária concluída',
  metrics: {
    schoolCount: 1,
    accountsTotal: 0,
    accountsWithPosition: 0,
    programmedCents: 0,
    paymentInformedCents: 0,
    creditLocatedCents: 0,
    reportedBalanceCents: null,
    applicationsCents: null,
  },
  sources: [{
    name: 'PDDEInfo',
    information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.',
  }],
  indicators: [],
  schools: [{
    school: {
      inep: '33069247',
      sme: '0410001',
      name: 'EM EMA NEGRAO DE LIMA',
      uex: 'CAIXA ESCOLAR EMA NEGRAO DE LIMA',
      cnpj: '04500463000173',
    },
    programs: [],
    accounts: [],
    accounting: [],
    followUp: [],
  }],
};

type SessionModule = {
  runTemporaryFinancialSession?: (options: Record<string, unknown>) => Promise<{
    status: string;
    human: HumanFinancialPortfolioView;
    portfolio: Record<string, unknown>;
    schools: Array<{ school: { inep: string }; snapshot: Record<string, unknown> }>;
    workbookBytes: Uint8Array;
    workbookFilename: string;
  }>;
  materializeTemporaryFinancialSession?: (input: {
    runId: string;
    status: 'COMPLETE' | 'PARTIAL';
    expectedSchoolCount: number;
    human: HumanFinancialPortfolioView;
  }) => Promise<{
    status: string;
    human: HumanFinancialPortfolioView;
    portfolio: Record<string, unknown>;
    schools: Array<{ school: { inep: string }; snapshot: Record<string, unknown> }>;
    workbookBytes: Uint8Array;
    workbookFilename: string;
  }>;
};

async function loadSessionModule(): Promise<SessionModule> {
  try {
    return await import('../../backend/application/temporary-financial-session') as unknown as SessionModule;
  } catch {
    return {};
  }
}

describe('Modo Sessão financeiro', () => {
  test('materializa carteira, prontuários e Excel a partir do mesmo resultado humano sem nova coleta', async () => {
    const module = await loadSessionModule();
    expect(module.materializeTemporaryFinancialSession).toBeTypeOf('function');
    if (!module.materializeTemporaryFinancialSession) return;

    const result = await module.materializeTemporaryFinancialSession({
      runId: 'full-163-real',
      status: 'COMPLETE',
      expectedSchoolCount: 1,
      human: view,
    });

    expect(result.status).toBe('COMPLETE');
    expect(result.human).toBe(view);
    expect(result.portfolio).toMatchObject({
      fiscalYear: 2026,
      schoolCount: 1,
      schools: [{ inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA' }],
    });
    expect(result.portfolio).not.toHaveProperty('runId');
    expect(result.schools).toHaveLength(1);
    expect(result.schools[0]?.snapshot).not.toHaveProperty('runId');
    expect(result.workbookFilename).toBe('inteligencia-financeira-pdde-4cre-2026.xlsx');
    expect(Array.from(result.workbookBytes.slice(0, 2))).toEqual([0x50, 0x4b]);
  });

  test('oferece execução temporária sem exigir persistência institucional', async () => {
    const module = await loadSessionModule();
    expect(module.runTemporaryFinancialSession).toBeTypeOf('function');
    if (!module.runTemporaryFinancialSession) return;

    const received: Record<string, unknown>[] = [];
    const phases: string[] = [];
    const execute = async (options: Record<string, unknown>) => {
      received.push(options);
      return { status: 'COMPLETE' as const, human: view };
    };

    const result = await module.runTemporaryFinancialSession({
      schools: [{ inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' }],
      workspacePath: '/tmp/pdde-session-test',
      runId: 'session-test-2026',
      execute,
      onProgress: (progress: { phase: string }) => phases.push(progress.phase),
    });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      fiscalYear: 2026,
      runId: 'session-test-2026',
      manageExecutionLifecycle: false,
    });
    expect(received[0]).not.toHaveProperty('artifactStore');
    expect(received[0]).not.toHaveProperty('evidenceStore');
    expect(received[0]).not.toHaveProperty('financialSnapshotStore');
    expect(result.status).toBe('COMPLETE');
    expect(result.human).toBe(view);
    expect(result.portfolio).toMatchObject({
      fiscalYear: 2026,
      schoolCount: 1,
      schools: [{ inep: '33069247', sme: '0410001', name: 'EM EMA NEGRAO DE LIMA' }],
    });
    expect(result.portfolio).not.toHaveProperty('runId');
    expect(result.schools).toHaveLength(1);
    expect(result.schools[0]?.snapshot).not.toHaveProperty('runId');
    expect(result.workbookFilename).toBe('inteligencia-financeira-pdde-4cre-2026.xlsx');
    expect(Array.from(result.workbookBytes.slice(0, 2))).toEqual([0x50, 0x4b]);
    expect(phases).toEqual(['PREPARING', 'COLLECTING', 'EXPORTING', 'COMPLETE']);
  });
});
