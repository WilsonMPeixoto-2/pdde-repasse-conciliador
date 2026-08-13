import { describe, expect, test } from 'vitest';
import { ExecutionCommandService } from '../../backend/application/execution-command-service';
import type {
  EnqueueExecutionJobInput,
  ExecutionJobQueue,
} from '../../backend/application/execution-queue';
import type { ExecutionJob } from '../../backend/core/execution-job';

class FakeQueue implements ExecutionJobQueue {
  readonly inputs: EnqueueExecutionJobInput[] = [];
  readonly jobs = new Map<string, ExecutionJob>();

  async enqueue(input: EnqueueExecutionJobInput): Promise<ExecutionJob> {
    this.inputs.push(input);
    const key = `${input.kind}:${input.idempotencyKey}`;
    const existing = this.jobs.get(key);
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new Error('idempotency conflict');
      return existing;
    }
    const job: ExecutionJob = {
      jobId: input.jobId,
      runId: input.runId,
      kind: input.kind,
      status: 'QUEUED',
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      payload: input.payload,
      requestedAt: input.requestedAt,
      availableAt: input.requestedAt,
      claimedAt: null,
      leaseExpiresAt: null,
      completedAt: null,
      workerId: null,
      attempts: 0,
      maxAttempts: input.maxAttempts,
      lastError: null,
    };
    this.jobs.set(key, job);
    return job;
  }

  async claim() { return null; }
  async renewLease(): Promise<ExecutionJob> { throw new Error('não usado'); }
  async complete(): Promise<ExecutionJob> { throw new Error('não usado'); }
}

describe('ExecutionCommandService', () => {
  test('enfileira PDDEInfo com runId determinístico e idempotência real', async () => {
    const queue = new FakeQueue();
    let uuidCounter = 0;
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => `11111111-1111-4111-8111-${String(++uuidCounter).padStart(12, '0')}`,
    });
    const request = {
      fiscalYear: 2026,
      schoolIneps: ['33069247', '33069093'],
      batchSize: 2,
      batchDelayMs: 0,
    };

    const first = await service.requestPddeInfo('coleta-controlada-agosto', request);
    const second = await service.requestPddeInfo('coleta-controlada-agosto', request);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      kind: 'PDDEINFO',
      status: 'QUEUED',
      runId: expect.stringMatching(/^pddeinfo-[a-f0-9]{32}$/),
    });
    expect(queue.inputs[0]).toMatchObject({
      runId: first.runId,
      idempotencyKey: 'coleta-controlada-agosto',
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      payload: request,
      maxAttempts: 3,
    });
    expect(queue.inputs[1].runId).toBe(queue.inputs[0].runId);
    expect(queue.inputs[1].requestHash).toBe(queue.inputs[0].requestHash);
  });

  test('aceita conciliação somente com referências institucionais e preserva centavos como inteiros', async () => {
    const queue = new FakeQueue();
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => '22222222-2222-4222-8222-222222222222',
    });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('reconciliacao-agosto', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
      releaseArtifacts: [{ ...artifact, path: 'runs/import-1/release.xls' }],
    })).resolves.toMatchObject({ kind: 'RECONCILIATION', status: 'QUEUED' });

    expect(queue.inputs[0].payload).toMatchObject({
      fiscalYear: 2026,
      pddeInfoArtifact: { sha256: 'a'.repeat(64) },
    });
    expect(JSON.stringify(queue.inputs[0].payload)).not.toMatch(/amount|valor|cents/i);
  });

  test('rejeita chave ausente, INEP inválido e path fora do namespace de runs', async () => {
    const service = new ExecutionCommandService(new FakeQueue());
    await expect(service.requestPddeInfo('', { fiscalYear: 2026 })).rejects.toThrow(/idempot/i);
    await expect(service.requestPddeInfo('chave', {
      fiscalYear: 2026,
      schoolIneps: ['123'],
    })).rejects.toThrow(/inep/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: '../fora.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/path|caminho/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/arquivo com espaco.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/path|caminho/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/pddeinfo-2026.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
      releaseArtifacts: [{
        bucket: 'pdde-evidence', path: 'runs/x/exportacao.pdf', sha256: 'c'.repeat(64),
      }],
    })).rejects.toThrow(/\.xls|liberaç/i);
    await expect(service.requestReconciliation('outro-bucket', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'outro-bucket', path: 'runs/x/pddeinfo-2026.json', sha256: 'a'.repeat(64),
      } as never,
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/bucket/i);
  });
});
