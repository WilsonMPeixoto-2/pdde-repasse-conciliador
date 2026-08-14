import { z } from 'zod';
import { isoTimestampSchema } from './time';

const identifierSchema = z.string().min(1).max(160).regex(
  /^[A-Za-z0-9._:-]+$/,
  'identificador contém caracteres inválidos',
);

export const executionJobKindSchema = z.enum(['PDDEINFO', 'RECONCILIATION']);
export const executionJobStatusSchema = z.enum([
  'QUEUED',
  'RUNNING',
  'COMPLETE',
  'PARTIAL',
  'FAILED',
]);

/**
 * Execução institucional deliberadamente simples: uma tarefa pendente ou em
 * andamento e um estado terminal. Não há lease, heartbeat, tentativa interna
 * ou disputa entre múltiplos executores.
 */
export const executionJobSchema = z.object({
  jobId: z.string().uuid(),
  runId: identifierSchema,
  kind: executionJobKindSchema,
  status: executionJobStatusSchema,
  idempotencyKey: z.string().min(1).max(200),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido'),
  payload: z.record(z.string(), z.unknown()),
  requestedAt: isoTimestampSchema,
  startedAt: isoTimestampSchema.nullable(),
  completedAt: isoTimestampSchema.nullable(),
  lastError: z.string().nullable(),
}).strict();

export type ExecutionJob = z.infer<typeof executionJobSchema>;
export type ExecutionJobKind = z.infer<typeof executionJobKindSchema>;
export type ExecutionJobStatus = z.infer<typeof executionJobStatusSchema>;
