import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type {
  EvidenceSource,
  PersistedEvidenceEvent,
} from '../core/evidence';
import type { ExecutionJobKind } from '../core/execution-job';
import { isoDateSchema } from '../core/schemas';
import { isoTimestampSchema } from '../core/time';
import type { ArtifactKind } from './artifact-store';
import {
  INSTITUTIONAL_ARTIFACT_BUCKET,
  isInstitutionalArtifactPath,
} from './artifact-store';
import type { EvidenceEventStore } from './evidence-store';
import type { ExecutionJobQueue } from './execution-queue';

const idempotencyKeySchema = z.string().trim().min(1, 'chave de idempotência obrigatória').max(200)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'chave de idempotência inválida');
const identifierSchema = z.string().min(1).max(160).regex(
  /^[A-Za-z0-9._:-]+$/,
  'identificador contém caracteres inválidos',
);
const storagePathSchema = z.string().refine(
  isInstitutionalArtifactPath,
  'caminho/path institucional inválido',
);
const artifactReferenceSchema = z.object({
  bucket: z.literal(INSTITUTIONAL_ARTIFACT_BUCKET),
  path: storagePathSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido')
    .transform((value) => value.toLowerCase()),
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

export const reconciliationJobPayloadSchema = reconciliationJobRequestSchema.extend({
  sourceCollectionRunId: identifierSchema.optional(),
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
  artifactEvidence?: Pick<EvidenceEventStore, 'listByRun'>;
}

type ReconciliationArtifactReference = z.output<typeof artifactReferenceSchema>;

interface ReconciliationArtifactRequirement {
  label: string;
  reference: ReconciliationArtifactReference;
  source: EvidenceSource;
  kind: ArtifactKind;
  role: 'PDDEINFO_JSON' | 'SIGEF_MOVEMENTS_CSV' | 'SIGEF_RELEASE_XLS';
}

const EXECUTION_LIFECYCLE_TYPES = new Set([
  'EXECUTION_REQUESTED',
  'EXECUTION_STARTED',
  'EXECUTION_FINISHED',
]);

export class ReconciliationArtifactEvidenceError extends Error {}

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

function artifactProducer(event: PersistedEvidenceEvent | undefined): string | null {
  if (!event || event.type !== 'ARTIFACT_PRESERVED') return null;
  const producer = event.payload.metadata?.producer;
  return typeof producer === 'string' ? producer : null;
}

export class ExecutionCommandService {
  private readonly now: () => string;
  private readonly randomUuid: () => string;
  private readonly artifactEvidence?: Pick<EvidenceEventStore, 'listByRun'>;

  constructor(
    private readonly queue: ExecutionJobQueue,
    options: CommandServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
    this.randomUuid = options.randomUuid ?? randomUUID;
    this.artifactEvidence = options.artifactEvidence;
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
    const request = reconciliationJobRequestSchema.parse(rawRequest);
    idempotencyKeySchema.parse(rawIdempotencyKey);
    const sourceCollectionRunId = await this.validateReconciliationArtifacts(request);
    const payload = reconciliationJobPayloadSchema.parse({
      ...request,
      ...(sourceCollectionRunId ? { sourceCollectionRunId } : {}),
    });
    return this.enqueue('RECONCILIATION', rawIdempotencyKey, payload);
  }

  private async validateReconciliationArtifacts(
    request: z.output<typeof reconciliationJobRequestSchema>,
  ): Promise<string | undefined> {
    const artifactEvidence = this.artifactEvidence;
    if (!artifactEvidence) {
      throw new Error(
        'ExecutionCommandService: validação de evidência institucional não configurada.',
      );
    }
    const requirements: ReconciliationArtifactRequirement[] = [
      {
        label: 'PDDEInfo', reference: request.pddeInfoArtifact,
        source: 'PDDEINFO', kind: 'NORMALIZED_JSON', role: 'PDDEINFO_JSON',
      },
      {
        label: 'Movimentações', reference: request.movementsArtifact,
        source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE', role: 'SIGEF_MOVEMENTS_CSV',
      },
      ...request.releaseArtifacts.map((reference, index) => ({
        label: `Liberações ${index + 1}`, reference,
        source: 'SIGEF_LIBERACOES' as const,
        kind: 'RAW_FILE' as const,
        role: 'SIGEF_RELEASE_XLS' as const,
      })),
    ];
    const eventsByRun = new Map<string, Promise<PersistedEvidenceEvent[]>>();
    const loadEvents = (runId: string): Promise<PersistedEvidenceEvent[]> => {
      let pending = eventsByRun.get(runId);
      if (!pending) {
        pending = artifactEvidence.listByRun(runId);
        eventsByRun.set(runId, pending);
      }
      return pending;
    };

    let pddeInfoRunId: string | undefined;
    let pddeInfoEvents: PersistedEvidenceEvent[] = [];
    let pddeInfoArtifactEvent: PersistedEvidenceEvent | undefined;
    for (const requirement of requirements) {
      const ownerRunId = requirement.reference.path.split('/')[1];
      const events = await loadEvents(ownerRunId);
      const preserved = events
        .filter((event) => this.matchesArtifactEvidence(
          event,
          ownerRunId,
          request.fiscalYear,
          requirement,
        ))
        .sort((left, right) => right.sequence - left.sequence)[0];
      if (!preserved) {
        throw new ReconciliationArtifactEvidenceError(
          `${requirement.label}: não há evidência ARTIFACT_PRESERVED exata com origem, papel, SHA-256 e exercício correspondentes.`,
        );
      }
      if (requirement.source === 'PDDEINFO') {
        pddeInfoRunId = ownerRunId;
        pddeInfoEvents = events;
        pddeInfoArtifactEvent = preserved;
      }
    }

    if (!pddeInfoRunId || artifactProducer(pddeInfoArtifactEvent) !== 'COLLECTOR') {
      return undefined;
    }

    const knownLifecycle = pddeInfoEvents.filter((event) => event.source === 'PDDEINFO'
      && EXECUTION_LIFECYCLE_TYPES.has(event.type));
    const lifecycle = knownLifecycle
      .filter((event) => event.fiscalYear === request.fiscalYear)
      .sort((left, right) => left.sequence - right.sequence);
    if (knownLifecycle.some((event) => event.fiscalYear !== request.fiscalYear)) {
      throw new ReconciliationArtifactEvidenceError(
        `PDDEInfo: o ciclo conhecido da coleta ${pddeInfoRunId} pertence a outro exercício.`,
      );
    }
    if (lifecycle.length === 0) {
      throw new ReconciliationArtifactEvidenceError(
        `PDDEInfo: o arquivo marcado como produzido pelo coletor não possui ciclo de execução correspondente.`,
      );
    }
    const latest = lifecycle.at(-1)!;
    if (latest.type !== 'EXECUTION_FINISHED' || latest.payload.status !== 'COMPLETE') {
      const status = latest.type === 'EXECUTION_FINISHED'
        ? latest.payload.status
        : latest.type.replace('EXECUTION_', '');
      throw new ReconciliationArtifactEvidenceError(
        `PDDEInfo: o ciclo conhecido da coleta ${pddeInfoRunId} não terminou COMPLETE (estado ${status}).`,
      );
    }
    const start = lifecycle.find((event) => event.type === 'EXECUTION_STARTED');
    if (start && (!pddeInfoArtifactEvent
      || pddeInfoArtifactEvent.sequence <= start.sequence
      || pddeInfoArtifactEvent.sequence >= latest.sequence)) {
      throw new ReconciliationArtifactEvidenceError(
        `PDDEInfo: o artefato informado não pertence ao ciclo concluído da coleta ${pddeInfoRunId}.`,
      );
    }
    return pddeInfoRunId;
  }

  private matchesArtifactEvidence(
    event: PersistedEvidenceEvent,
    ownerRunId: string,
    fiscalYear: number,
    requirement: ReconciliationArtifactRequirement,
  ): boolean {
    if (
      event.type !== 'ARTIFACT_PRESERVED'
      || event.runId !== ownerRunId
      || event.source !== requirement.source
      || event.fiscalYear !== fiscalYear
      || event.schoolInep !== undefined
      || event.payload.provider !== 'SUPABASE_STORAGE'
      || event.payload.bucket !== requirement.reference.bucket
      || event.payload.path !== requirement.reference.path
      || event.payload.sha256.toLowerCase() !== requirement.reference.sha256.toLowerCase()
      || event.payload.kind !== requirement.kind
    ) return false;
    return event.payload.metadata?.role === requirement.role;
  }

  private async enqueue(
    kind: ExecutionJobKind,
    rawIdempotencyKey: string,
    payload: Record<string, unknown>,
  ): Promise<ExecutionCommandReceipt> {
    const idempotencyKey = idempotencyKeySchema.parse(rawIdempotencyKey);
    const requestedAt = isoTimestampSchema.parse(this.now());
    const job = await this.queue.enqueue({
      jobId: z.string().uuid().parse(this.randomUuid()),
      runId: deterministicRunId(kind, idempotencyKey),
      kind,
      idempotencyKey,
      fiscalYear: z.number().int().min(2000).max(2100).parse(payload.fiscalYear),
      requestHash: sha256(payload),
      payload,
      requestedAt,
    });
    return {
      jobId: job.jobId,
      runId: job.runId,
      kind: job.kind,
      status: job.status,
    };
  }
}
