import type {
  ExecutionJob,
  ExecutionJobKind,
} from '../core/execution-job';

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
    leaseSeconds: number;
  }): Promise<ExecutionJob>;
  complete(input: {
    jobId: string;
    workerId: string;
    status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
    error?: string;
  }): Promise<ExecutionJob>;
}
