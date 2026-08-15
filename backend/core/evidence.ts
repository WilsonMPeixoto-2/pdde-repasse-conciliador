import { z } from 'zod';
import { isoTimestampSchema } from './time';

export const evidenceIdentifierSchema = z.string()
  .min(1, 'identificador obrigatório')
  .max(160, 'identificador excede 160 caracteres')
  .regex(
    /^[A-Za-z0-9._:-]+$/,
    'identificador contém caracteres inválidos',
  );

export const evidenceSourceSchema = z.enum([
  'PDDEINFO',
  'SIGEF_LIBERACOES',
  'SIGEF_MOVIMENTACOES',
  'SIGEF_EXTRATO',
  'DADOS_ABERTOS_FNDE',
  'PORTAL_TRANSPARENCIA',
  'EXTRATO_BANCARIO_AUTORIZADO',
  'CONCILIADOR',
]);

export const evidenceEventTypeSchema = z.enum([
  'EXECUTION_REQUESTED',
  'EXECUTION_STARTED',
  'EXECUTION_FINISHED',
  'SOURCE_ATTEMPT_RECORDED',
  'ARTIFACT_PRESERVED',
  'OBSERVATION_RECORDED',
  'FINDING_RECORDED',
]);

const commonFields = {
  eventId: evidenceIdentifierSchema,
  runId: evidenceIdentifierSchema,
  occurredAt: isoTimestampSchema,
  source: evidenceSourceSchema,
  fiscalYear: z.number().int().min(2000).max(2100),
  schoolInep: z.string().regex(/^\d{8}$/).optional(),
};

const executionRequestedSchema = z.object({
  ...commonFields,
  type: z.literal('EXECUTION_REQUESTED'),
  payload: z.object({
    jobKind: z.enum(['PDDEINFO', 'MONITORING', 'RECONCILIATION']),
    idempotencyKey: z.string().min(1).max(200),
    requestHash: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido'),
  }).passthrough(),
}).strict();

const executionStartedSchema = z.object({
  ...commonFields,
  type: z.literal('EXECUTION_STARTED'),
  payload: z.object({
    portfolioSize: z.number().int().nonnegative().optional(),
    parserVersion: z.string().min(1).optional(),
  }).passthrough(),
}).strict();

const executionFinishedSchema = z.object({
  ...commonFields,
  type: z.literal('EXECUTION_FINISHED'),
  payload: z.object({
    status: z.enum(['COMPLETE', 'PARTIAL', 'FAILED']),
    succeeded: z.number().int().nonnegative().optional(),
    failed: z.number().int().nonnegative().optional(),
  }).passthrough(),
}).strict();

const sourceAttemptSchema = z.object({
  ...commonFields,
  type: z.literal('SOURCE_ATTEMPT_RECORDED'),
  payload: z.object({
    status: z.enum(['SUCCESS', 'FAILED']),
    attempts: z.number().int().positive().optional(),
    httpStatus: z.number().int().min(100).max(599).optional(),
    responseBytes: z.number().int().nonnegative().optional(),
    error: z.string().min(1).optional(),
  }).passthrough(),
}).strict();

const artifactSchema = z.object({
  ...commonFields,
  type: z.literal('ARTIFACT_PRESERVED'),
  payload: z.object({
    kind: z.enum([
      'RAW_HTML',
      'RAW_FILE',
      'NORMALIZED_JSON',
      'MANIFEST',
      'REPORT',
    ]),
    path: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido'),
    bytes: z.number().int().nonnegative(),
    mediaType: z.string().min(1).optional(),
    provider: z.enum(['LOCAL', 'SUPABASE_STORAGE']).optional(),
    bucket: z.string().min(1).max(160).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
  }).strict(),
}).strict();

const observationSchema = z.object({
  ...commonFields,
  type: z.literal('OBSERVATION_RECORDED'),
  payload: z.object({
    observationKind: z.string().min(1),
    observedAt: isoTimestampSchema.optional(),
    data: z.record(z.string(), z.unknown()),
  }).strict(),
}).strict();

const findingSchema = z.object({
  ...commonFields,
  type: z.literal('FINDING_RECORDED'),
  payload: z.object({
    status: z.string().min(1),
    reasonCode: z.string().min(1),
    requiresHumanReview: z.boolean(),
    data: z.record(z.string(), z.unknown()).optional(),
  }).strict(),
}).strict();

export const evidenceEventInputSchema = z.discriminatedUnion('type', [
  executionRequestedSchema,
  executionStartedSchema,
  executionFinishedSchema,
  sourceAttemptSchema,
  artifactSchema,
  observationSchema,
  findingSchema,
]);

export type EvidenceSource = z.infer<typeof evidenceSourceSchema>;
export type EvidenceEventType = z.infer<typeof evidenceEventTypeSchema>;
export type EvidenceEventInput = z.infer<typeof evidenceEventInputSchema>;

const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido');

export const persistedEvidenceEventSchema = evidenceEventInputSchema.and(z.object({
  sequence: z.number().int().positive(),
  previousHash: sha256Schema.nullable(),
  eventHash: sha256Schema,
}));

export type PersistedEvidenceEvent = z.infer<typeof persistedEvidenceEventSchema>;

export interface EvidenceIntegrityResult {
  valid: boolean;
  events: number;
  brokenAtSequence?: number;
  reason?: string;
}
