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
  startedAt: '2026-08-13T12:01:00Z',
  completedAt: null,
  lastError: null,
};

function fixture(job: ExecutionJob | null = runningJob) {
  const queue: ExecutionJobQueue = {
    enqueue: vi.fn(),
    recoverInterrupted: vi.fn(async () => 0),
    claim: vi.fn(async () => job),
    complete: vi.fn(async (input) => ({
      ...runningJob,
      status: input.status,
      completedAt: '2026-08-13T12:02:00Z',
      lastError: input.error ?? null,
    })),
  };
  return { queue };
}

describe('ExecutionWorker', () => {
  test('retorna idle quando não há trabalho', async () => {
    const { queue } = fixture(null);
    const execute = vi.fn();
    const worker = new ExecutionWorker(queue, { execute });
    await expect(worker.runOnce()).resolves.toBeNull();
    expect(execute).not.toHaveBeenCalled();
  });

  test('conclui com o estado retornado pelo trabalho', async () => {
    const { queue } = fixture();
    const worker = new ExecutionWorker(queue, {
      execute: vi.fn(async () => ({ status: 'PARTIAL' as const })),
    });
    await expect(worker.runOnce()).resolves.toMatchObject({ status: 'PARTIAL' });
    expect(queue.complete).toHaveBeenCalledWith({
      jobId: runningJob.jobId,
      status: 'PARTIAL',
    });
  });

  test('marca FAILED quando o trabalho falha', async () => {
    const { queue } = fixture();
    const worker = new ExecutionWorker(queue, {
      execute: async () => { throw new Error('fonte indisponível'); },
    });
    await expect(worker.runOnce()).resolves.toMatchObject({
      status: 'FAILED', error: 'fonte indisponível',
    });
    expect(queue.complete).toHaveBeenCalledWith({
      jobId: runningJob.jobId,
      status: 'FAILED',
      error: 'fonte indisponível',
    });
  });

  test('trata falha de persistência da conclusão de forma conservadora', async () => {
    const { queue } = fixture();
    vi.mocked(queue.complete).mockRejectedValueOnce(new Error('RPC de conclusão indisponível'));
    const worker = new ExecutionWorker(queue, {
      execute: async () => ({ status: 'COMPLETE' as const }),
    });
    await expect(worker.runOnce()).resolves.toMatchObject({
      status: 'FAILED', error: 'RPC de conclusão indisponível',
    });
    expect(queue.complete).toHaveBeenCalledTimes(2);
  });

  test('expõe recuperação manual de uma execução interrompida', async () => {
    const { queue } = fixture(null);
    vi.mocked(queue.recoverInterrupted).mockResolvedValueOnce(1);
    const worker = new ExecutionWorker(queue, { execute: vi.fn() });
    await expect(worker.recoverInterrupted()).resolves.toBe(1);
  });
});
