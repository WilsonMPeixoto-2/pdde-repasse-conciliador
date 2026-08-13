import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { EvidenceSource } from '../core/evidence';
import type {
  ArtifactKind,
  ArtifactReference,
  PreservedArtifact,
  SignedArtifactUploadStore,
} from './artifact-store';
import { INSTITUTIONAL_ARTIFACT_BUCKET } from './artifact-store';
import type { EvidenceEventStore } from './evidence-store';

const MAX_ARTIFACT_BYTES = 52_428_800;
const identifierSchema = z.string().min(1).max(160).regex(
  /^[A-Za-z0-9._:-]+$/,
  'identificador contém caracteres inválidos',
);
const idempotencyKeySchema = z.string().trim().min(1).max(200)
  .refine((value) => !/[\u0000-\u001f\u007f]/.test(value), 'chave de idempotência inválida');
const originalNameSchema = z.string().trim().min(1).max(255).refine(
  (value) => !/[\\/\u0000-\u001f\u007f]/.test(value),
  'nome original do artefato inválido',
);
const artifactInputRoleSchema = z.enum([
  'PDDEINFO_JSON',
  'SIGEF_MOVEMENTS_CSV',
  'SIGEF_RELEASE_XLS',
]);
const requestSchema = z.object({
  runId: identifierSchema,
  fiscalYear: z.number().int().min(2000).max(2100),
  role: artifactInputRoleSchema,
  originalName: originalNameSchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/i, 'sha-256 inválido')
    .transform((value) => value.toLowerCase()),
  bytes: z.number().int().min(1).max(MAX_ARTIFACT_BYTES),
}).strict();

export type ArtifactInputRole = z.infer<typeof artifactInputRoleSchema>;

interface RoleDescriptor {
  extension: string;
  directory: string;
  mediaType: string;
  kind: ArtifactKind;
  source: EvidenceSource;
}

const ROLE_DESCRIPTORS: Record<ArtifactInputRole, RoleDescriptor> = {
  PDDEINFO_JSON: {
    extension: 'json', directory: 'pddeinfo', mediaType: 'application/json',
    kind: 'NORMALIZED_JSON', source: 'PDDEINFO',
  },
  SIGEF_MOVEMENTS_CSV: {
    extension: 'csv', directory: 'sigef-movimentacoes', mediaType: 'text/csv',
    kind: 'RAW_FILE', source: 'SIGEF_MOVIMENTACOES',
  },
  SIGEF_RELEASE_XLS: {
    extension: 'xls', directory: 'sigef-liberacoes', mediaType: 'application/vnd.ms-excel',
    kind: 'RAW_FILE', source: 'SIGEF_LIBERACOES',
  },
};

export type ArtifactUploadRequest = z.input<typeof requestSchema>;

export interface ArtifactUploadTicket {
  uploadId: string;
  runId: string;
  role: ArtifactInputRole;
  kind: ArtifactKind;
  originalName: string;
  mediaType: string;
  bucket: string;
  path: string;
  sha256: string;
  bytes: number;
  upload: {
    method: 'PUT';
    url: string;
    token: string;
    expiresAt: string;
  };
}

interface ArtifactIntakeStorage extends SignedArtifactUploadStore {
  download(reference: ArtifactReference): Promise<Uint8Array>;
}

interface ArtifactIntakeServiceOptions {
  now?: () => string;
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

function digest(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function deterministicUploadId(runId: string, idempotencyKey: string): string {
  const characters = createHash('sha256')
    .update(`artifact-upload\u0000${runId}\u0000${idempotencyKey}`, 'utf8')
    .digest('hex')
    .slice(0, 32)
    .split('');
  characters[12] = '5';
  characters[16] = (8 | (Number.parseInt(characters[16], 16) & 3)).toString(16);
  const value = characters.join('');
  return [
    value.slice(0, 8),
    value.slice(8, 12),
    value.slice(12, 16),
    value.slice(16, 20),
    value.slice(20),
  ].join('-');
}

const uploadRequestDataSchema = z.object({
  uploadId: z.string().uuid(),
  idempotencyKey: idempotencyKeySchema,
  requestHash: z.string().regex(/^[a-f0-9]{64}$/),
  role: artifactInputRoleSchema,
  kind: z.enum(['RAW_HTML', 'RAW_FILE', 'NORMALIZED_JSON', 'MANIFEST', 'REPORT']),
  originalName: originalNameSchema,
  mediaType: z.string().min(1),
  bucket: z.literal(INSTITUTIONAL_ARTIFACT_BUCKET),
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  bytes: z.number().int().min(1).max(MAX_ARTIFACT_BYTES),
}).strict();

type UploadRequestData = z.infer<typeof uploadRequestDataSchema>;

export class ArtifactUploadIdempotencyConflictError extends Error {}
export class ArtifactUploadIntegrityError extends Error {}
export class ArtifactUploadNotFoundError extends Error {}

export class ArtifactIntakeService {
  private readonly now: () => string;

  constructor(
    private readonly storage: ArtifactIntakeStorage,
    private readonly evidenceStore: EvidenceEventStore,
    options: ArtifactIntakeServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async requestUpload(
    rawIdempotencyKey: string,
    rawRequest: ArtifactUploadRequest,
  ): Promise<ArtifactUploadTicket> {
    const idempotencyKey = idempotencyKeySchema.parse(rawIdempotencyKey);
    const request = requestSchema.parse(rawRequest);
    const descriptor = ROLE_DESCRIPTORS[request.role];
    if (!request.originalName.toLowerCase().endsWith(`.${descriptor.extension}`)) {
      throw new Error(
        `O artefato ${request.role} deve usar extensão .${descriptor.extension}.`,
      );
    }
    const uploadId = deterministicUploadId(request.runId, idempotencyKey);
    const occurredAt = z.string().refine((value) => Number.isFinite(Date.parse(value)))
      .parse(this.now());
    const path = `runs/${request.runId}/inputs/${descriptor.directory}/${uploadId}.${descriptor.extension}`;
    const requestHash = digest(request);
    const eventId = `artifact-upload:${uploadId}:requested`;
    const existing = await this.findRequestedUpload(request.runId, eventId);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        throw new ArtifactUploadIdempotencyConflictError(
          'Conflito de idempotência: a chave de upload já foi usada para outro artefato.',
        );
      }
      return this.issueTicket(request.runId, existing);
    }

    const data: UploadRequestData = uploadRequestDataSchema.parse({
      uploadId,
      idempotencyKey,
      requestHash,
      role: request.role,
      kind: descriptor.kind,
      originalName: request.originalName,
      mediaType: descriptor.mediaType,
      bucket: INSTITUTIONAL_ARTIFACT_BUCKET,
      path,
      sha256: request.sha256,
      bytes: request.bytes,
    });

    const ticket = await this.issueTicket(request.runId, data);
    try {
      await this.evidenceStore.append({
        eventId,
        runId: request.runId,
        type: 'OBSERVATION_RECORDED',
        occurredAt,
        source: descriptor.source,
        fiscalYear: request.fiscalYear,
        payload: {
          observationKind: 'ARTIFACT_UPLOAD_REQUESTED',
          data,
        },
      });
    } catch (cause) {
      if (!(cause instanceof Error) || !/eventId duplicado/i.test(cause.message)) throw cause;
      const concurrent = await this.findRequestedUpload(request.runId, eventId);
      if (!concurrent || concurrent.requestHash !== requestHash) {
        throw new ArtifactUploadIdempotencyConflictError(
          'Conflito de idempotência ao registrar o upload do artefato.',
        );
      }
    }
    return ticket;
  }

  async confirmUpload(runIdValue: string, uploadIdValue: string): Promise<PreservedArtifact> {
    const runId = identifierSchema.parse(runIdValue);
    const uploadId = z.string().uuid().parse(uploadIdValue);
    const requestedEventId = `artifact-upload:${uploadId}:requested`;
    const preservedEventId = `artifact-upload:${uploadId}:preserved`;
    const events = await this.evidenceStore.listByRun(runId);
    const requestedEvent = events.find(
      (candidate) => candidate.eventId === requestedEventId,
    );
    if (
      !requestedEvent
      || requestedEvent.type !== 'OBSERVATION_RECORDED'
      || requestedEvent.payload.observationKind !== 'ARTIFACT_UPLOAD_REQUESTED'
    ) {
      throw new ArtifactUploadNotFoundError('Solicitação de upload não encontrada.');
    }
    const data = uploadRequestDataSchema.parse(requestedEvent.payload.data);
    const artifact: PreservedArtifact = {
      provider: 'SUPABASE_STORAGE',
      bucket: data.bucket,
      path: data.path,
      kind: data.kind,
      sha256: data.sha256,
      bytes: data.bytes,
      mediaType: data.mediaType,
      metadata: {
        uploadId,
        role: data.role,
        originalName: data.originalName,
        requestedEventId,
      },
    };
    const existingPreserved = events.find((candidate) => candidate.eventId === preservedEventId);
    if (existingPreserved) {
      if (existingPreserved.type !== 'ARTIFACT_PRESERVED'
        || digest(existingPreserved.payload) !== digest(artifact)) {
        throw new ArtifactUploadIntegrityError(
          'O evento de preservação existente não corresponde ao upload solicitado.',
        );
      }
      return artifact;
    }
    const uploadedBytes = await this.storage.download({
      bucket: data.bucket,
      path: data.path,
    });
    if (uploadedBytes.byteLength !== data.bytes) {
      throw new ArtifactUploadIntegrityError(
        `Tamanho divergente no upload ${uploadId}: esperado ${data.bytes}, recebido ${uploadedBytes.byteLength}.`,
      );
    }
    const uploadedSha256 = createHash('sha256').update(uploadedBytes).digest('hex');
    if (uploadedSha256 !== data.sha256) {
      throw new ArtifactUploadIntegrityError(
        `SHA-256 divergente no upload ${uploadId}: esperado ${data.sha256}, recebido ${uploadedSha256}.`,
      );
    }
    try {
      await this.evidenceStore.append({
        eventId: preservedEventId,
        runId,
        type: 'ARTIFACT_PRESERVED',
        occurredAt: z.string().refine((value) => Number.isFinite(Date.parse(value))).parse(this.now()),
        source: requestedEvent.source,
        fiscalYear: requestedEvent.fiscalYear,
        payload: artifact,
      });
    } catch (cause) {
      if (!(cause instanceof Error) || !/eventId duplicado/i.test(cause.message)) throw cause;
      const concurrent = (await this.evidenceStore.listByRun(runId)).find(
        (candidate) => candidate.eventId === preservedEventId,
      );
      if (
        !concurrent
        || concurrent.type !== 'ARTIFACT_PRESERVED'
        || digest(concurrent.payload) !== digest(artifact)
      ) throw cause;
    }
    return artifact;
  }

  private async findRequestedUpload(runId: string, eventId: string): Promise<UploadRequestData | null> {
    const event = (await this.evidenceStore.listByRun(runId)).find(
      (candidate) => candidate.eventId === eventId,
    );
    if (
      !event
      || event.type !== 'OBSERVATION_RECORDED'
      || event.payload.observationKind !== 'ARTIFACT_UPLOAD_REQUESTED'
    ) return null;
    return uploadRequestDataSchema.parse(event.payload.data);
  }

  private async issueTicket(
    runId: string,
    data: UploadRequestData,
  ): Promise<ArtifactUploadTicket> {
    const signed = await this.storage.createSignedUpload({ bucket: data.bucket, path: data.path });
    return {
      uploadId: data.uploadId,
      runId,
      role: data.role,
      kind: data.kind,
      originalName: data.originalName,
      mediaType: data.mediaType,
      bucket: data.bucket,
      path: data.path,
      sha256: data.sha256,
      bytes: data.bytes,
      upload: {
        method: 'PUT',
        url: signed.url,
        token: signed.token,
        expiresAt: signed.expiresAt,
      },
    };
  }
}
