import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { InstitutionalJobExecutor } from '../../backend/application/institutional-job-executor';
import type { ArtifactStore } from '../../backend/application/artifact-store';
import type { EvidenceEventStore } from '../../backend/application/evidence-store';
import type { ExecutionJob } from '../../backend/core/execution-job';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' },
  { inep: '33069093', sme: '0410002', nome: 'ESCOLA B' },
];

function job(kind: 'PDDEINFO' | 'RECONCILIATION', payload: Record<string, unknown>): ExecutionJob {
  return {
    jobId: '11111111-1111-4111-8111-111111111111',
    runId: kind === 'PDDEINFO' ? 'pddeinfo-run-1' : 'reconciliation-run-1',
    kind,
    status: 'RUNNING',
    idempotencyKey: 'execucao-1',
    requestHash: 'a'.repeat(64),
    payload,
    requestedAt: '2026-08-13T12:00:00Z',
    availableAt: '2026-08-13T12:00:00Z',
    claimedAt: '2026-08-13T12:01:00Z',
    leaseExpiresAt: '2026-08-13T12:06:00Z',
    completedAt: null,
    workerId: 'worker-1',
    attempts: 1,
    maxAttempts: 3,
    lastError: null,
  };
}

const evidenceStore = {} as EvidenceEventStore;

describe('InstitutionalJobExecutor', () => {
  test('executa coleta no workspace isolado da tentativa e respeita subconjunto da lista-mestre', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-job-'));
    temporaryPaths.push(root);
    const collect = vi.fn(async () => ({ status: 'COMPLETE' as const }));
    const executor = new InstitutionalJobExecutor({
      workspacePath: root,
      schools,
      evidenceStore,
      artifactStore: {} as ArtifactStore,
      collectPddeInfo: collect,
      reconcileFiles: vi.fn(),
    });

    await expect(executor.execute(job('PDDEINFO', {
      fiscalYear: 2026,
      schoolIneps: ['33069093'],
      batchSize: 1,
      batchDelayMs: 0,
    }))).resolves.toEqual({ status: 'COMPLETE' });

    expect(collect).toHaveBeenCalledWith(expect.objectContaining({
      schools: [schools[1]],
      fiscalYear: 2026,
      runId: 'pddeinfo-run-1',
      batchSize: 1,
      batchDelayMs: 0,
      workspacePath: resolve(root, 'jobs', '11111111-1111-4111-8111-111111111111', 'attempt-1'),
      evidenceStore,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'attempts/1',
    }));
  });

  test('rejeita INEP fora da lista institucional antes de consultar a fonte', async () => {
    const collect = vi.fn();
    const executor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-jobs', schools, evidenceStore,
      artifactStore: {} as ArtifactStore,
      collectPddeInfo: collect,
      reconcileFiles: vi.fn(),
    });
    await expect(executor.execute(job('PDDEINFO', {
      fiscalYear: 2026, schoolIneps: ['99999999'],
    }))).rejects.toThrow(/lista.*institucional|inep.*99999999/i);
    expect(collect).not.toHaveBeenCalled();
  });

  test('baixa e verifica entradas institucionais antes da conciliação', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-job-'));
    temporaryPaths.push(root);
    const artifactBytes = new Map([
      ['runs/coleta/pddeinfo-2026.json', Buffer.from('{"schools":[]}')],
      ['runs/import/movements.csv', Buffer.from('movimentos')],
      ['runs/import/12345678000100__PDDE_BASICO.xls', Buffer.from('liberacoes')],
    ]);
    const artifactStore = {
      download: vi.fn(async ({ path }: { path: string }) => artifactBytes.get(path)!),
    } as unknown as ArtifactStore;
    const reconcile = vi.fn(async () => ({}));
    const executor = new InstitutionalJobExecutor({
      workspacePath: root, schools, evidenceStore, artifactStore,
      collectPddeInfo: vi.fn(), reconcileFiles: reconcile,
    });
    const ref = (path: string) => ({
      bucket: 'pdde-evidence', path, sha256: 'a'.repeat(64),
    });

    await expect(executor.execute(job('RECONCILIATION', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: ref('runs/coleta/pddeinfo-2026.json'),
      movementsArtifact: ref('runs/import/movements.csv'),
      releaseArtifacts: [ref('runs/import/12345678000100__PDDE_BASICO.xls')],
      title: 'Relatório institucional',
    }))).resolves.toEqual({ status: 'COMPLETE' });

    const attempt = resolve(root, 'jobs', '11111111-1111-4111-8111-111111111111', 'attempt-1');
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      pddeInfoPath: join(attempt, 'inputs', 'pddeinfo.json'),
      movementsPath: join(attempt, 'inputs', 'movements.csv'),
      releaseDirectoryPath: join(attempt, 'inputs', 'releases'),
      outputPath: join(attempt, 'reports', 'reconciliation.xlsx'),
      reconciliationRunId: 'reconciliation-run-1',
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      title: 'Relatório institucional',
      evidenceStore,
      artifactStore,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'attempts/1',
    }));
    await expect(readFile(join(attempt, 'inputs', 'movements.csv'), 'utf8'))
      .resolves.toBe('movimentos');
    expect(artifactStore.download).toHaveBeenCalledTimes(3);
  });
});
