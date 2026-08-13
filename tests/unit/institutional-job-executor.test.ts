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
const evidenceStore = {} as EvidenceEventStore;

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
    startedAt: '2026-08-13T12:01:00Z',
    completedAt: null,
    lastError: null,
  };
}

function releaseHtml(): Buffer {
  return Buffer.from(`<!doctype html><html><body>
    <table id="filtros">
      <tr><td><b>CNPJ:</b></td><td>11.111.111/0001-91</td></tr>
      <tr><td><b>Data da consulta:</b></td><td>12/08/2026 08:30:00</td></tr>
    </table>
    <div class="listagem"><table>
      <thead><tr><th>Data de Pagamento</th><th>Ordem Bancária</th><th>Valor</th>
        <th>Programa</th><th>Banco</th><th>Agência</th><th>Conta Corrente</th></tr></thead>
      <tbody><tr><td>05/AGO/26</td><td>900001</td><td>5.065,00</td>
        <td>PDDE - MANUTENÇÃO ESCOLAR - 1ª PARCELA 2026</td>
        <td>BANCO DO BRASIL</td><td>0249</td><td>00012345X</td></tr></tbody>
    </table></div>
  </body></html>`, 'latin1');
}

function signal(): AbortSignal {
  return new AbortController().signal;
}

describe('InstitutionalJobExecutor', () => {
  test('executa coleta em workspace único e respeita subconjunto da lista-mestre', async () => {
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
    }), { signal: signal() })).resolves.toEqual({ status: 'COMPLETE' });

    expect(collect).toHaveBeenCalledWith(expect.objectContaining({
      schools: [schools[1]],
      fiscalYear: 2026,
      runId: 'pddeinfo-run-1',
      batchSize: 1,
      batchDelayMs: 0,
      workspacePath: resolve(root, 'jobs', '11111111-1111-4111-8111-111111111111', 'run'),
      evidenceStore,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'run',
    }));
  });

  test('rejeita INEP fora da lista institucional antes de consultar a fonte', async () => {
    const collect = vi.fn();
    const executor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-jobs',
      schools,
      evidenceStore,
      artifactStore: {} as ArtifactStore,
      collectPddeInfo: collect,
      reconcileFiles: vi.fn(),
    });
    await expect(executor.execute(job('PDDEINFO', {
      fiscalYear: 2026,
      schoolIneps: ['99999999'],
    }), { signal: signal() })).rejects.toThrow(/lista.*institucional|inep.*99999999/i);
    expect(collect).not.toHaveBeenCalled();
  });

  test('baixa entradas institucionais e prepara a conciliação sem genealogia técnica', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-job-'));
    temporaryPaths.push(root);
    const releaseBytes = releaseHtml();
    const artifactBytes = new Map([
      ['runs/coleta/pddeinfo-2026.json', Buffer.from('{"runId":"nao-confiar-no-json","schools":[]}')],
      ['runs/import/movements.csv', Buffer.from('movimentos')],
      ['runs/inputs/sigef-liberacoes/upload-id.xls', releaseBytes],
    ]);
    const artifactStore = {
      download: vi.fn(async ({ path }: { path: string }) => artifactBytes.get(path)!),
    } as unknown as ArtifactStore;
    const reconcile = vi.fn(async () => ({}));
    const executor = new InstitutionalJobExecutor({
      workspacePath: root,
      schools,
      evidenceStore,
      artifactStore,
      collectPddeInfo: vi.fn(),
      reconcileFiles: reconcile,
    });
    const ref = (path: string) => ({
      bucket: 'pdde-evidence', path, sha256: 'a'.repeat(64),
    });

    await expect(executor.execute(job('RECONCILIATION', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: ref('runs/coleta/pddeinfo-2026.json'),
      movementsArtifact: ref('runs/import/movements.csv'),
      releaseArtifacts: [ref('runs/inputs/sigef-liberacoes/upload-id.xls')],
      title: 'Relatório institucional',
    }), { signal: signal() })).resolves.toEqual({ status: 'COMPLETE' });

    const run = resolve(root, 'jobs', '11111111-1111-4111-8111-111111111111', 'run');
    expect(reconcile).toHaveBeenCalledWith(expect.objectContaining({
      pddeInfoPath: join(run, 'inputs', 'pddeinfo.json'),
      movementsPath: join(run, 'inputs', 'movements.csv'),
      releaseDirectoryPath: join(run, 'inputs', 'releases'),
      outputPath: join(run, 'reports', 'reconciliation.xlsx'),
      reconciliationRunId: 'reconciliation-run-1',
      sourceCollectionRunId: null,
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      title: 'Relatório institucional',
      evidenceStore,
      artifactStore,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'run',
    }));
    await expect(readFile(join(run, 'inputs', 'movements.csv'), 'utf8')).resolves.toBe('movimentos');
    await expect(readFile(join(run, 'inputs', 'releases', '11111111000191__02.xls')))
      .resolves.toEqual(releaseBytes);
    expect(artifactStore.download).toHaveBeenCalledTimes(3);
  });

  test('detecta duas Liberações do mesmo CNPJ/programa mesmo com uploads distintos', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-job-'));
    temporaryPaths.push(root);
    const bytes = releaseHtml();
    const artifactStore = {
      download: vi.fn(async ({ path }: { path: string }) => path.endsWith('.xls')
        ? bytes
        : Buffer.from(path.endsWith('.json') ? '{"schools":[]}' : 'movimentos')),
    } as unknown as ArtifactStore;
    const reconcile = vi.fn();
    const executor = new InstitutionalJobExecutor({
      workspacePath: root,
      schools,
      evidenceStore,
      artifactStore,
      collectPddeInfo: vi.fn(),
      reconcileFiles: reconcile,
    });
    const ref = (path: string) => ({
      bucket: 'pdde-evidence', path, sha256: 'a'.repeat(64),
    });

    await expect(executor.execute(job('RECONCILIATION', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: ref('runs/coleta/pddeinfo.json'),
      movementsArtifact: ref('runs/import/movements.csv'),
      releaseArtifacts: [
        ref('runs/inputs/sigef-liberacoes/upload-a.xls'),
        ref('runs/inputs/sigef-liberacoes/upload-b.xls'),
      ],
    }), { signal: signal() })).rejects.toThrow(/duplicad/i);
    expect(reconcile).not.toHaveBeenCalled();
  });
});
