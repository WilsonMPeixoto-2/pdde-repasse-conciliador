import { z } from 'zod';
import type { ExecutionJob } from '../core/execution-job';
import {
  ExecutionLeaseLostError,
  isExecutionLeaseLostError,
  type ExecutionJobQueue,
} from './execution-queue';

export interface ExecutionJobResult {
  status: 'COMPLETE' | 'PARTIAL';
}

export interface ExecutionJobExecutor {
  execute(job: ExecutionJob, context: { signal: AbortSignal }): Promise<ExecutionJobResult>;
}

export interface ExecutionWorkerResult {
  jobId: string;
  runId: string;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED' | 'LEASE_LOST';
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

    const execution = new AbortController();
    let leaseLoss: ExecutionLeaseLostError | null = null;
    let renewalChain = Promise.resolve();
    const timer = setInterval(() => {
      renewalChain = renewalChain.then(async () => {
        if (leaseLoss) return;
        try {
          await this.queue.renewLease({
            jobId: job.jobId,
            workerId: this.workerId,
            attempt: job.attempts,
            leaseSeconds: this.leaseSeconds,
          });
        } catch (cause) {
          if (isExecutionLeaseLostError(cause)) {
            leaseLoss = cause instanceof ExecutionLeaseLostError
              ? cause
              : new ExecutionLeaseLostError(errorMessage(cause));
            clearInterval(timer);
            execution.abort(leaseLoss);
            return;
          }
          // Uma falha de transporte não prova perda do lease. O próximo
          // intervalo tenta novamente; a conclusão terminal, cercada por
          // worker/tentativa/validade no Postgres, decide a propriedade.
        }
      });
    }, this.heartbeatIntervalMs);

    const stopHeartbeat = async (): Promise<void> => {
      clearInterval(timer);
      await renewalChain;
    };

    const leaseLostResult = (): ExecutionWorkerResult | null => leaseLoss ? ({
      jobId: job.jobId,
      runId: job.runId,
      status: 'LEASE_LOST',
      error: errorMessage(leaseLoss),
    }) : null;

    const complete = async (
      status: 'COMPLETE' | 'PARTIAL' | 'FAILED',
      error?: string,
    ): Promise<ExecutionWorkerResult> => {
      try {
        await this.queue.complete({
          jobId: job.jobId,
          workerId: this.workerId,
          attempt: job.attempts,
          status,
          ...(error ? { error } : {}),
        });
      } catch (cause) {
        if (!isExecutionLeaseLostError(cause)) throw cause;
        leaseLoss = cause instanceof ExecutionLeaseLostError
          ? cause
          : new ExecutionLeaseLostError(errorMessage(cause));
        execution.abort(leaseLoss);
        return leaseLostResult()!;
      }
      return {
        jobId: job.jobId,
        runId: job.runId,
        status,
        ...(error ? { error } : {}),
      };
    };

    let result: ExecutionJobResult;
    try {
      result = await this.executor.execute(job, { signal: execution.signal });
    } catch (cause) {
      await stopHeartbeat();
      const lost = leaseLostResult();
      if (lost) return lost;
      const error = errorMessage(cause);
      return complete('FAILED', error);
    }

    await stopHeartbeat();
    const lost = leaseLostResult();
    if (lost) return lost;
    return complete(result.status);
  }
}
