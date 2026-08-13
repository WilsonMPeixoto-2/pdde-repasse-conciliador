import { z } from 'zod';
import type { ExecutionJob } from '../core/execution-job';
import type { ExecutionJobQueue } from './execution-queue';

export interface ExecutionJobResult {
  status: 'COMPLETE' | 'PARTIAL';
}

export interface ExecutionJobExecutor {
  execute(job: ExecutionJob): Promise<ExecutionJobResult>;
}

export interface ExecutionWorkerResult {
  jobId: string;
  runId: string;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  error?: string;
}

interface ExecutionWorkerOptions {
  workerId: string;
  leaseSeconds?: number;
  heartbeatIntervalMs?: number;
}

const workerIdSchema = z.string().min(1).max(160).regex(/^[A-Za-z0-9._:-]+$/);

function errorMessage(cause: unknown): string {
  const value = cause instanceof Error ? cause.message : String(cause);
  return value.slice(0, 4_000) || 'Falha desconhecida na execução.';
}

export class ExecutionWorker {
  private readonly workerId: string;
  private readonly leaseSeconds: number;
  private readonly heartbeatIntervalMs: number;

  constructor(
    private readonly queue: ExecutionJobQueue,
    private readonly executor: ExecutionJobExecutor,
    rawOptions: ExecutionWorkerOptions,
  ) {
    this.workerId = workerIdSchema.parse(rawOptions.workerId);
    this.leaseSeconds = z.number().int().min(30).max(3_600)
      .parse(rawOptions.leaseSeconds ?? 300);
    this.heartbeatIntervalMs = z.number().int().min(1_000)
      .max(this.leaseSeconds * 1_000 - 1)
      .parse(rawOptions.heartbeatIntervalMs ?? Math.floor(this.leaseSeconds * 1_000 / 3));
  }

  async runOnce(): Promise<ExecutionWorkerResult | null> {
    const job = await this.queue.claim({
      workerId: this.workerId,
      leaseSeconds: this.leaseSeconds,
    });
    if (!job) return null;

    let heartbeatError: unknown;
    let renewalChain = Promise.resolve();
    const timer = setInterval(() => {
      renewalChain = renewalChain.then(async () => {
        if (heartbeatError) return;
        try {
          await this.queue.renewLease({
            jobId: job.jobId,
            workerId: this.workerId,
            leaseSeconds: this.leaseSeconds,
          });
        } catch (cause) {
          heartbeatError = cause;
        }
      });
    }, this.heartbeatIntervalMs);

    const stopHeartbeat = async (): Promise<void> => {
      clearInterval(timer);
      await renewalChain;
    };

    let result: ExecutionJobResult;
    try {
      result = await this.executor.execute(job);
    } catch (cause) {
      await stopHeartbeat();
      const error = errorMessage(cause);
      await this.queue.complete({
        jobId: job.jobId,
        workerId: this.workerId,
        status: 'FAILED',
        error,
      });
      return { jobId: job.jobId, runId: job.runId, status: 'FAILED', error };
    }

    await stopHeartbeat();
    if (heartbeatError) {
      const error = `Falha ao renovar o lease: ${errorMessage(heartbeatError)}`;
      await this.queue.complete({
        jobId: job.jobId,
        workerId: this.workerId,
        status: 'FAILED',
        error,
      });
      return { jobId: job.jobId, runId: job.runId, status: 'FAILED', error };
    }

    await this.queue.complete({
      jobId: job.jobId,
      workerId: this.workerId,
      status: result.status,
    });
    return { jobId: job.jobId, runId: job.runId, status: result.status };
  }
}
