export const INSTITUTIONAL_ARTIFACT_BUCKET = 'pdde-evidence';

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

export interface ArtifactStore {
  preserve(input: PreserveArtifactInput): Promise<PreservedArtifact>;
  download(reference: ArtifactReference): Promise<Uint8Array>;
  createSignedDownload(input: ArtifactReference & {
    expiresInSeconds: number;
    downloadName?: string;
  }): Promise<SignedArtifactDownload>;
}
