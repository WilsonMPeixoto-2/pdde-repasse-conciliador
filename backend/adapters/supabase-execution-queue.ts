import { z } from 'zod';
import {
  executionJobSchema,
  type ExecutionJob,
} from '../core/execution-job';
import type {
  EnqueueExecutionJobInput,
  ExecutionJobQueue,
} from '../application/execution-queue';

interface SupabaseResult {
  data: unknown;
  error: unknown;
}

interface SupabaseRpcClient {
  rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<SupabaseResult>;
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function rowRecord(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : null;
}

function toJob(raw: unknown): ExecutionJob {
  const row = rowRecord(raw);
  if (!row) throw new Error('Fila de execuções: resposta vazia ou inválida do Postgres.');
  return executionJobSchema.parse({
    jobId: row.job_id,
    runId: row.run_id,
    kind: row.job_kind,
    status: row.status,
    idempotencyKey: row.idempotency_key,
    requestHash: row.request_hash,
    payload: row.request_payload,
    requestedAt: row.requested_at,
    startedAt: row.started_at ?? null,
    completedAt: row.completed_at ?? null,
    lastError: row.last_error ?? null,
  });
}

async function rpcJob(
  client: SupabaseRpcClient,
  name: string,
  parameters: Record<string, unknown> = {},
  allowEmpty = false,
): Promise<ExecutionJob | null> {
  const { data, error } = await client.rpc(name, parameters);
  if (error) throw new Error(`Fila de execuções (${name}): ${message(error)}.`);
  const row = rowRecord(data);
  if (allowEmpty && (!row || row.job_id === null || row.job_id === undefined)) return null;
  return toJob(data);
}

export class SupabaseExecutionQueue implements ExecutionJobQueue {
  private readonly client: SupabaseRpcClient;

  constructor(client: unknown) {
    this.client = client as SupabaseRpcClient;
  }

  async enqueue(input: EnqueueExecutionJobInput): Promise<ExecutionJob> {
    z.string().uuid().parse(input.jobId);
    const result = await rpcJob(this.client, 'enqueue_execution_job', {
      p_job_id: input.jobId,
      p_run_id: input.runId,
      p_job_kind: input.kind,
      p_idempotency_key: input.idempotencyKey,
      p_fiscal_year: input.fiscalYear,
      p_request_hash: input.requestHash,
      p_request_payload: input.payload,
      p_requested_at: input.requestedAt,
    });
    if (!result) throw new Error('Fila de execuções: enqueue não retornou o job.');
    return result;
  }

  async recoverInterrupted(): Promise<number> {
    const { data, error } = await this.client.rpc('recover_interrupted_execution_jobs');
    if (error) {
      throw new Error(`Fila de execuções (recover_interrupted_execution_jobs): ${message(error)}.`);
    }
    const value = Number(Array.isArray(data) ? data[0] : data);
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error('Fila de execuções: recuperação retornou contagem inválida.');
    }
    return value;
  }

  claim(): Promise<ExecutionJob | null> {
    return rpcJob(this.client, 'claim_execution_job', {}, true);
  }

  async complete(input: {
    jobId: string;
    status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
    error?: string;
  }): Promise<ExecutionJob> {
    const result = await rpcJob(this.client, 'complete_execution_job', {
      p_job_id: input.jobId,
      p_status: input.status,
      p_error: input.error ?? null,
    });
    if (!result) throw new Error('Fila de execuções: conclusão não retornou o job.');
    return result;
  }
}
