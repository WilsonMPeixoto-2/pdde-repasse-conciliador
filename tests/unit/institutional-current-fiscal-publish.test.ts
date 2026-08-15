import { describe, expect, test, vi } from 'vitest';
import { InstitutionalJobExecutor } from '../../backend/application/institutional-job-executor';
import type { ExecutionJob } from '../../backend/core/execution-job';

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' },
  { inep: '33069093', sme: '0410002', nome: 'ESCOLA B' },
];

function monitoringJob(payload: Record<string, unknown>): ExecutionJob {
  return {
    jobId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    runId: 'monitoring-full-2026',
    kind: 'MONITORING',
    status: 'RUNNING',
    idempotencyKey: 'monitoring-full',
    requestHash: 'a'.repeat(64),
    payload,
    requestedAt: '2026-08-15T03:00:00Z',
    startedAt: '2026-08-15T03:01:00Z',
    completedAt: null,
    lastError: null,
  };
}

const fiscal = {
  version: 1,
  generatedAt: '2026-08-15T03:19:47Z',
  sourceGeneratedAt: '2026-08-15T03:19:47Z',
  fiscalYear: 2026,
  sourceStatus: 'COMPLETE',
  sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
  sourceObservations: [],
  coverage: { requestedSchools: 2 },
  presentation: {},
  schools: schools.map((item) => ({
    school: { inep: item.inep, sme: item.sme, name: item.nome, uex: `CEC ${item.nome}`, cnpj: '01.872.287/0001-02' },
    repasses: [],
    statements: [],
  })),
};

describe('publicação institucional do retrato fiscal', () => {
  test('publica somente MONITORING completo que cobre toda a lista institucional', async () => {
    const publisher = { publish: vi.fn(async () => undefined) };
    const monitor = vi.fn(async () => ({ status: 'COMPLETE' as const, fiscal }));
    const executor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-current-fiscal',
      schools,
      evidenceStore: {} as any,
      artifactStore: {} as any,
      runMonitoring: monitor as any,
      currentFiscalPublisher: publisher,
    } as any);

    await expect(executor.execute(
      monitoringJob({ fiscalYear: 2026 }),
      { signal: new AbortController().signal },
    )).resolves.toEqual({ status: 'COMPLETE' });

    expect(publisher.publish).toHaveBeenCalledWith(expect.objectContaining({
      runId: 'monitoring-full-2026',
      expectedSchoolCount: 2,
      fiscal,
    }));
  });

  test('não substitui o retrato corrente por coleta parcial ou subconjunto', async () => {
    const publisher = { publish: vi.fn(async () => undefined) };
    const partialMonitor = vi.fn(async () => ({ status: 'PARTIAL' as const, fiscal: { ...fiscal, sourceStatus: 'PARTIAL' } }));
    const partialExecutor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-current-fiscal',
      schools,
      evidenceStore: {} as any,
      artifactStore: {} as any,
      runMonitoring: partialMonitor as any,
      currentFiscalPublisher: publisher,
    } as any);

    await partialExecutor.execute(
      monitoringJob({ fiscalYear: 2026 }),
      { signal: new AbortController().signal },
    );

    const subsetMonitor = vi.fn(async () => ({ status: 'COMPLETE' as const, fiscal: { ...fiscal, schools: [fiscal.schools[0]] } }));
    const subsetExecutor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-current-fiscal',
      schools,
      evidenceStore: {} as any,
      artifactStore: {} as any,
      runMonitoring: subsetMonitor as any,
      currentFiscalPublisher: publisher,
    } as any);

    await subsetExecutor.execute(
      monitoringJob({ fiscalYear: 2026, schoolIneps: [schools[0].inep] }),
      { signal: new AbortController().signal },
    );

    expect(publisher.publish).not.toHaveBeenCalled();
  });
});
