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

export const executionJobSchema = z.object({
  jobId: z.string().uuid(),
  runId: identifierSchema,
  kind: executionJobKindSchema,
  status: executionJobStatusSchema,
  idempotencyKey: z.string().min(1).max(200),
  requestHash: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido'),
  payload: z.record(z.string(), z.unknown()),
  requestedAt: isoTimestampSchema,
  availableAt: isoTimestampSchema,
  claimedAt: isoTimestampSchema.nullable(),
  leaseExpiresAt: isoTimestampSchema.nullable(),
  completedAt: isoTimestampSchema.nullable(),
  workerId: identifierSchema.nullable(),
  attempts: z.number().int().nonnegative(),
  maxAttempts: z.number().int().positive().max(20),
  lastError: z.string().nullable(),
}).strict();

export type ExecutionJob = z.infer<typeof executionJobSchema>;
export type ExecutionJobKind = z.infer<typeof executionJobKindSchema>;
export type ExecutionJobStatus = z.infer<typeof executionJobStatusSchema>;
