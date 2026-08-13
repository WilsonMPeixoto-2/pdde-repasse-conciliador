import { createHash } from 'node:crypto';
import { z } from 'zod';
import type {
  ArtifactReference,
  ArtifactStore,
  PreserveArtifactInput,
  PreservedArtifact,
  SignedArtifactDownload,
  SignedArtifactUpload,
} from '../application/artifact-store';
import {
  INSTITUTIONAL_ARTIFACT_BUCKET,
  isInstitutionalArtifactPath,
  isInstitutionalArtifactRunId,
} from '../application/artifact-store';

const identifierSchema = z.string().min(1).max(160).regex(
  /^[A-Za-z0-9._:-]+$/,
  'identificador contém caracteres inválidos',
);
const runIdSchema = z.string().refine(
  isInstitutionalArtifactRunId,
  'runId institucional inválido',
);
const relativePathSchema = z.string().min(1).max(900).superRefine((value, context) => {
  const segments = value.split('/');
  if (
    value.startsWith('/')
    || value.includes('\\')
    || segments.some((segment) => !segment || segment === '.' || segment === '..')
    || segments.some((segment) => !/^[A-Za-z0-9._-]+$/.test(segment))
  ) {
    context.addIssue({ code: 'custom', message: 'caminho de artefato inválido' });
  }
});
const mediaTypeSchema = z.string().min(1).max(200).regex(
  /^[A-Za-z0-9!#$&^_.+-]+\/[A-Za-z0-9!#$&^_.+-]+(?:\s*;\s*[A-Za-z0-9!#$&^_.+-]+=[A-Za-z0-9!#$&^_.+-]+)*$/,
  'media type inválido',
);
const artifactKindSchema = z.enum([
  'RAW_HTML',
  'RAW_FILE',
  'NORMALIZED_JSON',
  'MANIFEST',
  'REPORT',
]);

interface StorageResult {
  data: unknown;
  error: unknown;
}

interface StorageBucketClient {
  upload(path: string, body: Uint8Array, options: Record<string, unknown>): PromiseLike<StorageResult>;
  download(path: string): PromiseLike<StorageResult>;
  createSignedUrl(
    path: string,
    expiresIn: number,
    options?: Record<string, unknown>,
  ): PromiseLike<StorageResult>;
  createSignedUploadUrl(
    path: string,
    options: { upsert: boolean },
  ): PromiseLike<StorageResult>;
}

interface SupabaseStorageClient {
  storage: { from(bucket: string): StorageBucketClient };
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function statusCode(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  for (const key of ['statusCode', 'status']) {
    if (key in error) {
      const value = Number((error as Record<string, unknown>)[key]);
      if (Number.isInteger(value)) return value;
    }
  }
  return null;
}

function isDuplicate(error: unknown): boolean {
  return statusCode(error) === 409 || /already exists|duplicate|resource.*exists/i.test(message(error));
}

function hash(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function dataToBytes(data: unknown): Promise<Uint8Array> {
  if (data instanceof Uint8Array) return data;
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (data && typeof data === 'object' && 'arrayBuffer' in data) {
    const arrayBuffer = await (data as { arrayBuffer(): Promise<ArrayBuffer> }).arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  throw new Error('SupabaseArtifactStore: download retornou conteúdo inválido.');
}

function validateStoragePath(path: string): string {
  if (!isInstitutionalArtifactPath(path)) {
    throw new Error(`SupabaseArtifactStore: caminho institucional inválido: ${path}.`);
  }
  return path;
}

export class SupabaseArtifactStore implements ArtifactStore {
  private readonly client: SupabaseStorageClient;

  constructor(
    client: unknown,
    private readonly bucket = INSTITUTIONAL_ARTIFACT_BUCKET,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.client = client as SupabaseStorageClient;
    identifierSchema.parse(bucket);
  }

  async preserve(rawInput: PreserveArtifactInput): Promise<PreservedArtifact> {
    const runId = runIdSchema.parse(rawInput.runId);
    const relativePath = relativePathSchema.parse(rawInput.relativePath);
    const kind = artifactKindSchema.parse(rawInput.kind);
    const mediaType = mediaTypeSchema.parse(rawInput.mediaType);
    if (!(rawInput.bytes instanceof Uint8Array)) {
      throw new Error('SupabaseArtifactStore: bytes do artefato são obrigatórios.');
    }
    if (rawInput.schoolInep && !/^\d{8}$/.test(rawInput.schoolInep)) {
      throw new Error(`SupabaseArtifactStore: INEP inválido: ${rawInput.schoolInep}.`);
    }

    const path = `runs/${runId}/${relativePath}`;
    const sha256 = hash(rawInput.bytes);
    const metadata = { ...(rawInput.metadata ?? {}) };
    const storageContentType = mediaType.split(';', 1)[0].trim();
    const bucketClient = this.client.storage.from(this.bucket);
    const { error } = await bucketClient.upload(path, rawInput.bytes, {
      cacheControl: '31536000',
      // O bucket valida o MIME sem parâmetros; o tipo completo continua
      // preservado no evento/metadado institucional.
      contentType: storageContentType,
      upsert: false,
      metadata: {
        ...metadata,
        runId,
        kind,
        sha256,
        ...(rawInput.schoolInep ? { schoolInep: rawInput.schoolInep } : {}),
      },
    });

    if (error) {
      if (!isDuplicate(error)) {
        throw new Error(`SupabaseArtifactStore: falha no upload de ${path}: ${message(error)}.`);
      }
      const existing = await this.download({ bucket: this.bucket, path });
      if (hash(existing) !== sha256) {
        throw new Error(`SupabaseArtifactStore: conflito de SHA-256 no caminho imutável ${path}.`);
      }
    }

    return {
      provider: 'SUPABASE_STORAGE',
      bucket: this.bucket,
      path,
      kind,
      sha256,
      bytes: rawInput.bytes.byteLength,
      mediaType,
      ...(rawInput.schoolInep ? { schoolInep: rawInput.schoolInep } : {}),
      metadata,
    };
  }

  async download(reference: ArtifactReference): Promise<Uint8Array> {
    const bucket = this.requireInstitutionalBucket(reference.bucket);
    const path = validateStoragePath(reference.path);
    const { data, error } = await this.client.storage.from(bucket).download(path);
    if (error) {
      throw new Error(`SupabaseArtifactStore: falha no download de ${path}: ${message(error)}.`);
    }
    const bytes = await dataToBytes(data);
    if (reference.sha256 && hash(bytes) !== reference.sha256.toLowerCase()) {
      throw new Error(`SupabaseArtifactStore: SHA-256 divergente no download de ${path}.`);
    }
    return bytes;
  }

  async createSignedDownload(input: ArtifactReference & {
    expiresInSeconds: number;
    downloadName?: string;
  }): Promise<SignedArtifactDownload> {
    const bucket = this.requireInstitutionalBucket(input.bucket);
    const path = validateStoragePath(input.path);
    const expiresInSeconds = z.number().int().min(30).max(3_600).parse(input.expiresInSeconds);
    const { data, error } = await this.client.storage.from(bucket).createSignedUrl(
      path,
      expiresInSeconds,
      input.downloadName ? { download: input.downloadName } : undefined,
    );
    if (error) {
      throw new Error(`SupabaseArtifactStore: falha ao assinar download de ${path}: ${message(error)}.`);
    }
    const signedUrl = data && typeof data === 'object' && 'signedUrl' in data
      ? String(data.signedUrl)
      : '';
    if (!signedUrl) throw new Error('SupabaseArtifactStore: URL assinada ausente na resposta.');

    return {
      url: signedUrl,
      expiresAt: new Date(this.now().getTime() + expiresInSeconds * 1_000).toISOString(),
    };
  }

  async createSignedUpload(
    input: Pick<ArtifactReference, 'bucket' | 'path'>,
  ): Promise<SignedArtifactUpload> {
    const bucket = this.requireInstitutionalBucket(input.bucket);
    const path = validateStoragePath(input.path);
    const { data, error } = await this.client.storage.from(bucket)
      .createSignedUploadUrl(path, { upsert: false });
    if (error) {
      throw new Error(`SupabaseArtifactStore: falha ao assinar upload de ${path}: ${message(error)}.`);
    }
    const value = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const url = typeof value.signedUrl === 'string' ? value.signedUrl : '';
    const token = typeof value.token === 'string' ? value.token : '';
    const returnedPath = typeof value.path === 'string' ? value.path : '';
    if (!url || !token || returnedPath !== path) {
      throw new Error('SupabaseArtifactStore: ticket de upload inválido na resposta.');
    }
    return {
      url,
      token,
      path,
      expiresAt: new Date(this.now().getTime() + 2 * 60 * 60 * 1_000).toISOString(),
    };
  }

  private requireInstitutionalBucket(rawBucket: string): string {
    const bucket = identifierSchema.parse(rawBucket);
    if (bucket !== this.bucket) {
      throw new Error(
        `SupabaseArtifactStore: bucket fora do armazenamento institucional: ${bucket}.`,
      );
    }
    return bucket;
  }
}
