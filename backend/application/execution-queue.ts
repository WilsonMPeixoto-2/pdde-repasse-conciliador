import type {
  ExecutionJob,
  ExecutionJobKind,
} from '../core/execution-job';

export class ExecutionLeaseLostError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExecutionLeaseLostError';
  }
}

export function isExecutionLeaseLostError(cause: unknown): cause is Error {
  return cause instanceof ExecutionLeaseLostError
    || (cause instanceof Error && cause.name === 'ExecutionLeaseLostError');
}

export interface EnqueueExecutionJobInput {
  jobId: string;
  runId: string;
  kind: ExecutionJobKind;
  idempotencyKey: string;
  fiscalYear: number;
  requestHash: string;
  payload: Record<string, unknown>;
  requestedAt: string;
  maxAttempts: number;
}

export interface ExecutionJobQueue {
  enqueue(input: EnqueueExecutionJobInput): Promise<ExecutionJob>;
  claim(input: { workerId: string; leaseSeconds: number }): Promise<ExecutionJob | null>;
  renewLease(input: {
    jobId: string;
    workerId: string;
    attempt: number;
    leaseSeconds: number;
  }): Promise<ExecutionJob>;
  complete(input: {
    jobId: string;
    workerId: string;
    attempt: number;
    status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
    error?: string;
  }): Promise<ExecutionJob>;
}
