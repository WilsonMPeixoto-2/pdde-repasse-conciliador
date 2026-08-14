export const INSTITUTIONAL_ARTIFACT_BUCKET = 'pdde-evidence';

const INSTITUTIONAL_RUN_ID_PATTERN = /^[A-Za-z0-9._:-]+$/;
const INSTITUTIONAL_PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;

export function isInstitutionalArtifactRunId(value: string): boolean {
  return value.length >= 1
    && value.length <= 160
    && value !== '.'
    && value !== '..'
    && INSTITUTIONAL_RUN_ID_PATTERN.test(value);
}

export function isInstitutionalArtifactPath(value: string): boolean {
  if (value.length < 1 || value.length > 900 || value.includes('\\')) return false;
  const segments = value.split('/');
  return segments.length >= 3
    && segments[0] === 'runs'
    && isInstitutionalArtifactRunId(segments[1])
    && segments.slice(2).every((segment) => segment !== '.'
      && segment !== '..'
      && INSTITUTIONAL_PATH_SEGMENT_PATTERN.test(segment));
}

export type ArtifactKind =
  | 'RAW_HTML'
  | 'RAW_FILE'
  | 'NORMALIZED_JSON'
  | 'MANIFEST'
  | 'REPORT';

export interface PreserveArtifactInput {
  runId: string;
  relativePath: string;
  kind: ArtifactKind;
  bytes: Uint8Array;
  mediaType: string;
  schoolInep?: string;
  metadata?: Record<string, unknown>;
}

export interface PreservedArtifact {
  provider: 'SUPABASE_STORAGE';
  bucket: string;
  path: string;
  kind: ArtifactKind;
  sha256: string;
  bytes: number;
  mediaType: string;
  schoolInep?: string;
  metadata: Record<string, unknown>;
}

export interface ArtifactReference {
  bucket: string;
  path: string;
  sha256?: string;
}

export interface SignedArtifactDownload {
  url: string;
  expiresAt: string;
}

export interface SignedArtifactUpload {
  url: string;
  token: string;
  path: string;
  expiresAt: string;
}

export interface ArtifactStore {
  preserve(input: PreserveArtifactInput): Promise<PreservedArtifact>;
  download(reference: ArtifactReference): Promise<Uint8Array>;
  createSignedDownload(input: ArtifactReference & {
    expiresInSeconds: number;
    downloadName?: string;
  }): Promise<SignedArtifactDownload>;
}

export interface SignedArtifactUploadStore {
  createSignedUpload(input: Pick<ArtifactReference, 'bucket' | 'path'>): Promise<SignedArtifactUpload>;
}
