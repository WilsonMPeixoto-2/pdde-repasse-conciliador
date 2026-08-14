import type { ExecutionJob } from '../core/execution-job';
import type { ExecutionJobQueue } from './execution-queue';

export interface ExecutionJobResult {
  status: 'COMPLETE' | 'PARTIAL';
}

export interface ExecutionJobExecutor {
  execute(job: ExecutionJob, context: { signal: AbortSignal }): Promise<ExecutionJobResult>;
}

export interface ExecutionWorkerResult {
  jobId: string;
  runId: string;
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
  error?: string;
}

function errorMessage(cause: unknown): string {
  const value = cause instanceof Error ? cause.message : String(cause);
  return value.slice(0, 4_000) || 'Falha desconhecida na execução.';
}

export class ExecutionWorker {
  constructor(
    private readonly queue: ExecutionJobQueue,
    private readonly executor: ExecutionJobExecutor,
  ) {}

  recoverInterrupted(): Promise<number> {
    return this.queue.recoverInterrupted();
  }

  async runOnce(): Promise<ExecutionWorkerResult | null> {
    const job = await this.queue.claim();
    if (!job) return null;

    const execution = new AbortController();
    try {
      const result = await this.executor.execute(job, { signal: execution.signal });
      await this.queue.complete({ jobId: job.jobId, status: result.status });
      return { jobId: job.jobId, runId: job.runId, status: result.status };
    } catch (cause) {
      const error = errorMessage(cause);
      await this.queue.complete({ jobId: job.jobId, status: 'FAILED', error });
      return { jobId: job.jobId, runId: job.runId, status: 'FAILED', error };
    }
  }
}
