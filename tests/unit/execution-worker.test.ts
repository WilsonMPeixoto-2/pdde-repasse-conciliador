import { describe, expect, test, vi } from 'vitest';
import { ExecutionWorker } from '../../backend/application/execution-worker';
import type { ExecutionJobQueue } from '../../backend/application/execution-queue';
import type { ExecutionJob } from '../../backend/core/execution-job';

const runningJob: ExecutionJob = {
  jobId: '11111111-1111-4111-8111-111111111111',
  runId: 'pddeinfo-run-1',
  kind: 'PDDEINFO',
  status: 'RUNNING',
  idempotencyKey: 'coleta-1',
  requestHash: 'a'.repeat(64),
  payload: { fiscalYear: 2026 },
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

function fixture(job: ExecutionJob | null = runningJob) {
  const queue: ExecutionJobQueue = {
    enqueue: vi.fn(),
    claim: vi.fn(async () => job),
    renewLease: vi.fn(async () => runningJob),
    complete: vi.fn(async (input) => ({
      ...runningJob,
      status: input.status,
      completedAt: '2026-08-13T12:02:00Z',
      leaseExpiresAt: null,
      lastError: input.error ?? null,
    })),
  };
  return { queue };
}

describe('ExecutionWorker', () => {
  test('retorna idle quando não há job e não chama o executor', async () => {
    const { queue } = fixture(null);
    const execute = vi.fn();
    const worker = new ExecutionWorker(queue, { execute }, {
      workerId: 'worker-1', leaseSeconds: 120, heartbeatIntervalMs: 30_000,
    });

    await expect(worker.runOnce()).resolves.toBeNull();
    expect(execute).not.toHaveBeenCalled();
    expect(queue.complete).not.toHaveBeenCalled();
  });

  test('conclui COMPLETE ou PARTIAL pelo worker proprietário', async () => {
    const { queue } = fixture();
    const execute = vi.fn(async () => ({ status: 'PARTIAL' as const }));
    const worker = new ExecutionWorker(queue, { execute }, {
      workerId: 'worker-1', leaseSeconds: 120, heartbeatIntervalMs: 30_000,
    });

    await expect(worker.runOnce()).resolves.toEqual({
      jobId: runningJob.jobId,
      runId: runningJob.runId,
      status: 'PARTIAL',
    });
    expect(execute).toHaveBeenCalledWith(runningJob);
    expect(queue.complete).toHaveBeenCalledWith({
      jobId: runningJob.jobId,
      workerId: 'worker-1',
      attempt: 1,
      status: 'PARTIAL',
    });
  });

  test('propaga falha da conclusão terminal sem tentar reclassificar o job como FAILED', async () => {
    const { queue } = fixture();
    vi.mocked(queue.complete).mockRejectedValueOnce(new Error('RPC de conclusão indisponível'));
    const worker = new ExecutionWorker(queue, {
      execute: async () => ({ status: 'COMPLETE' as const }),
    }, {
      workerId: 'worker-1', leaseSeconds: 120, heartbeatIntervalMs: 30_000,
    });

    await expect(worker.runOnce()).rejects.toThrow('RPC de conclusão indisponível');
    expect(queue.complete).toHaveBeenCalledTimes(1);
    expect(queue.complete).toHaveBeenCalledWith({
      jobId: runningJob.jobId,
      workerId: 'worker-1',
      attempt: 1,
      status: 'COMPLETE',
    });
  });

  test('persiste FAILED com mensagem clara quando o executor falha', async () => {
    const { queue } = fixture();
    const worker = new ExecutionWorker(queue, {
      execute: async () => { throw new Error('fonte indisponível'); },
    }, {
      workerId: 'worker-1', leaseSeconds: 120, heartbeatIntervalMs: 30_000,
    });

    await expect(worker.runOnce()).resolves.toEqual({
      jobId: runningJob.jobId,
      runId: runningJob.runId,
      status: 'FAILED',
      error: 'fonte indisponível',
    });
    expect(queue.complete).toHaveBeenCalledWith({
      jobId: runningJob.jobId,
      workerId: 'worker-1',
      attempt: 1,
      status: 'FAILED',
      error: 'fonte indisponível',
    });
  });

  test('renova lease durante execução demorada', async () => {
    vi.useFakeTimers();
    try {
      const { queue } = fixture();
      let finish: (() => void) | undefined;
      const execute = vi.fn(() => new Promise<{ status: 'COMPLETE' }>((resolve) => {
        finish = () => resolve({ status: 'COMPLETE' });
      }));
      const worker = new ExecutionWorker(queue, { execute }, {
        workerId: 'worker-1', leaseSeconds: 60, heartbeatIntervalMs: 20_000,
      });

      const pending = worker.runOnce();
      await vi.advanceTimersByTimeAsync(20_000);
      expect(queue.renewLease).toHaveBeenCalledWith({
        jobId: runningJob.jobId, workerId: 'worker-1', attempt: 1, leaseSeconds: 60,
      });
      finish?.();
      await expect(pending).resolves.toMatchObject({ status: 'COMPLETE' });
    } finally {
      vi.useRealTimers();
    }
  });
});
