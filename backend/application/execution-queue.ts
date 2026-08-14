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
}

/**
 * Fila institucional intencionalmente simples: um único trabalho ativo por
 * vez. Se o processo reiniciar durante RUNNING, a execução interrompida é
 * marcada como FAILED antes de novas tarefas serem reclamadas.
 */
export interface ExecutionJobQueue {
  enqueue(input: EnqueueExecutionJobInput): Promise<ExecutionJob>;
  recoverInterrupted(): Promise<number>;
  claim(): Promise<ExecutionJob | null>;
  complete(input: {
    jobId: string;
    status: 'COMPLETE' | 'PARTIAL' | 'FAILED';
    error?: string;
  }): Promise<ExecutionJob>;
}
