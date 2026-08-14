import { describe, expect, test, vi } from 'vitest';
import { executionJobKindSchema, type ExecutionJob } from '../../backend/core/execution-job';
import { ExecutionCommandService } from '../../backend/application/execution-command-service';
import type {
  EnqueueExecutionJobInput,
  ExecutionJobQueue,
} from '../../backend/application/execution-queue';
import { InstitutionalJobExecutor } from '../../backend/application/institutional-job-executor';
import type { ArtifactStore } from '../../backend/application/artifact-store';
import type { EvidenceEventStore } from '../../backend/application/evidence-store';

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
    const job = {
      jobId: input.jobId,
      runId: input.runId,
      kind: input.kind,
      status: 'QUEUED',
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      payload: input.payload,
      requestedAt: input.requestedAt,
      startedAt: null,
      completedAt: null,
      lastError: null,
    } satisfies ExecutionJob;
    this.jobs.set(key, job);
    return job;
  }

  async recoverInterrupted() { return 0; }
  async claim() { return null; }
  async complete(): Promise<ExecutionJob> { throw new Error('não usado'); }
}

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' },
  { inep: '33069093', sme: '0410002', nome: 'ESCOLA B' },
];

function monitoringJob(payload: Record<string, unknown>): ExecutionJob {
  return {
    jobId: '11111111-1111-4111-8111-111111111111',
    runId: 'monitoring-run-1',
    kind: 'MONITORING' as never,
    status: 'RUNNING',
    idempotencyKey: 'monitoramento-2026',
    requestHash: 'a'.repeat(64),
    payload,
    requestedAt: '2026-08-14T22:00:00Z',
    startedAt: '2026-08-14T22:01:00Z',
    completedAt: null,
    lastError: null,
  };
}

function signal(): AbortSignal {
  return new AbortController().signal;
}

describe('contrato institucional MONITORING', () => {
  test('MONITORING é um tipo de execução institucional válido', () => {
    expect(executionJobKindSchema.safeParse('MONITORING').success).toBe(true);
  });

  test('enfileira monitoramento 2026 com runId determinístico e idempotência', async () => {
    const queue = new FakeQueue();
    let uuidCounter = 0;
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-14T22:00:00Z',
      randomUuid: () => `11111111-1111-4111-8111-${String(++uuidCounter).padStart(12, '0')}`,
    });
    const request = {
      fiscalYear: 2026,
      schoolIneps: ['33069247', '33069093'],
    };

    const requestMonitoring = (service as unknown as {
      requestMonitoring(key: string, body: unknown): Promise<unknown>;
    }).requestMonitoring?.bind(service);

    expect(requestMonitoring).toBeTypeOf('function');
    const first = await requestMonitoring!('monitoramento-agosto', request) as Record<string, unknown>;
    const second = await requestMonitoring!('monitoramento-agosto', request) as Record<string, unknown>;

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      kind: 'MONITORING',
      status: 'QUEUED',
      runId: expect.stringMatching(/^monitoring-[a-f0-9]{32}$/),
    });
    expect(queue.inputs[0]).toMatchObject({
      kind: 'MONITORING',
      idempotencyKey: 'monitoramento-agosto',
      payload: request,
    });
  });

  test('recusa monitoramento de exercício diferente de 2026', async () => {
    const service = new ExecutionCommandService(new FakeQueue());
    const requestMonitoring = (service as unknown as {
      requestMonitoring(key: string, body: unknown): Promise<unknown>;
    }).requestMonitoring?.bind(service);

    expect(requestMonitoring).toBeTypeOf('function');
    await expect(requestMonitoring!('monitoramento-2025', {
      fiscalYear: 2025,
      schoolIneps: ['33069247'],
    })).rejects.toThrow(/2026|fiscalYear|exercício/i);
  });

  test('executor despacha MONITORING para o runner com subconjunto institucional', async () => {
    const runner = vi.fn(async () => ({ status: 'COMPLETE' as const }));
    const evidenceStore = {} as EvidenceEventStore;
    const artifactStore = {} as ArtifactStore;
    const executor = new InstitutionalJobExecutor({
      workspacePath: '/tmp/pdde-monitoring',
      schools,
      evidenceStore,
      artifactStore,
      collectPddeInfo: vi.fn(),
      reconcileFiles: vi.fn(),
      runMonitoring: runner,
    } as never);

    await expect(executor.execute(monitoringJob({
      fiscalYear: 2026,
      schoolIneps: ['33069093'],
    }), { signal: signal() })).resolves.toEqual({ status: 'COMPLETE' });

    expect(runner).toHaveBeenCalledWith(expect.objectContaining({
      schools: [schools[1]],
      fiscalYear: 2026,
      runId: 'monitoring-run-1',
      evidenceStore,
      artifactStore,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'run',
    }));
  });
});
