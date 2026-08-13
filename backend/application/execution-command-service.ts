import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { ExecutionJobKind } from '../core/execution-job';
import { INSTITUTIONAL_ARTIFACT_BUCKET } from './artifact-store';
import type { ExecutionJobQueue } from './execution-queue';

const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  'data e hora inválidas',
);
const idempotencyKeySchema = z.string().trim().min(1, 'chave de idempotência obrigatória').max(200)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'chave de idempotência inválida');
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(`${value}T00:00:00Z`)),
  'data ISO inválida',
);
const storagePathSchema = z.string().min(1).max(900).refine(
  (value) => value.startsWith('runs/')
    && !value.includes('\\')
    && value.split('/').every((segment) => /^[A-Za-z0-9._-]+$/.test(segment)),
  'caminho/path institucional inválido',
);
const artifactReferenceSchema = z.object({
  bucket: z.literal(INSTITUTIONAL_ARTIFACT_BUCKET),
  path: storagePathSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido'),
}).strict();
const pddeInfoArtifactReferenceSchema = artifactReferenceSchema.refine(
  (value) => value.path.toLowerCase().endsWith('.json'),
  'artefato PDDEInfo deve usar extensão .json',
);
const movementsArtifactReferenceSchema = artifactReferenceSchema.refine(
  (value) => value.path.toLowerCase().endsWith('.csv'),
  'artefato de Movimentações deve usar extensão .csv',
);
const releaseArtifactReferenceSchema = artifactReferenceSchema.refine(
  (value) => value.path.toLowerCase().endsWith('.xls'),
  'artefato de Liberações deve usar extensão .xls',
);

export const pddeInfoJobRequestSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  schoolIneps: z.array(z.string().regex(/^\d{8}$/, 'INEP inválido')).min(1).max(163)
    .refine((values) => new Set(values).size === values.length, 'INEP duplicado')
    .optional(),
  batchSize: z.number().int().min(1).max(20).default(3),
  batchDelayMs: z.number().int().min(0).max(60_000).default(1_500),
}).strict();

export const reconciliationJobRequestSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  requestedThrough: isoDateSchema,
  pddeInfoArtifact: pddeInfoArtifactReferenceSchema,
  movementsArtifact: movementsArtifactReferenceSchema,
  releaseArtifacts: z.array(releaseArtifactReferenceSchema).max(1_000).default([]),
  title: z.string().min(1).max(200).optional(),
}).strict();

export type PddeInfoJobRequest = z.input<typeof pddeInfoJobRequestSchema>;
export type ReconciliationJobRequest = z.input<typeof reconciliationJobRequestSchema>;

export interface ExecutionCommandReceipt {
  jobId: string;
  runId: string;
  kind: ExecutionJobKind;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETE' | 'PARTIAL' | 'FAILED';
}

interface CommandServiceOptions {
  now?: () => string;
  randomUuid?: () => string;
  maxAttempts?: number;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function deterministicRunId(kind: ExecutionJobKind, idempotencyKey: string): string {
  const digest = createHash('sha256')
    .update(`${kind}\u0000${idempotencyKey}`, 'utf8')
    .digest('hex')
    .slice(0, 32);
  return `${kind === 'PDDEINFO' ? 'pddeinfo' : 'reconciliation'}-${digest}`;
}

export class ExecutionCommandService {
  private readonly now: () => string;
  private readonly randomUuid: () => string;
  private readonly maxAttempts: number;

  constructor(
    private readonly queue: ExecutionJobQueue,
    options: CommandServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.randomUuid = options.randomUuid ?? randomUUID;
    this.maxAttempts = z.number().int().min(1).max(20).parse(options.maxAttempts ?? 3);
  }

  async requestPddeInfo(
    rawIdempotencyKey: string,
    rawRequest: PddeInfoJobRequest,
  ): Promise<ExecutionCommandReceipt> {
    return this.enqueue('PDDEINFO', rawIdempotencyKey, pddeInfoJobRequestSchema.parse(rawRequest));
  }

  async requestReconciliation(
    rawIdempotencyKey: string,
    rawRequest: ReconciliationJobRequest,
  ): Promise<ExecutionCommandReceipt> {
    return this.enqueue(
      'RECONCILIATION',
      rawIdempotencyKey,
      reconciliationJobRequestSchema.parse(rawRequest),
    );
  }

  private async enqueue(
    kind: ExecutionJobKind,
    rawIdempotencyKey: string,
    payload: Record<string, unknown>,
  ): Promise<ExecutionCommandReceipt> {
    const idempotencyKey = idempotencyKeySchema.parse(rawIdempotencyKey);
    const requestedAt = timestampSchema.parse(this.now());
    const job = await this.queue.enqueue({
      jobId: z.string().uuid().parse(this.randomUuid()),
      runId: deterministicRunId(kind, idempotencyKey),
      kind,
      idempotencyKey,
      fiscalYear: z.number().int().min(2000).max(2100).parse(payload.fiscalYear),
      requestHash: sha256(payload),
      payload,
      requestedAt,
      maxAttempts: this.maxAttempts,
    });
    return {
      jobId: job.jobId,
      runId: job.runId,
      kind: job.kind,
      status: job.status,
    };
  }
}
