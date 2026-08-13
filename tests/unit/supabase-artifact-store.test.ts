import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { SupabaseArtifactStore } from '../../backend/adapters/supabase-artifact-store';

class FakeBucket {
  readonly uploads: Array<{ path: string; body: Uint8Array; options: Record<string, unknown> }> = [];
  readonly signedUploads: Array<{ path: string; options: Record<string, unknown> }> = [];
  readonly objects = new Map<string, Uint8Array>();
  duplicate = false;
  signedUploadPathOverride: string | null = null;

  async upload(path: string, body: Uint8Array, options: Record<string, unknown>) {
    this.uploads.push({ path, body, options });
    if (this.duplicate || this.objects.has(path)) {
      return { data: null, error: { message: 'The resource already exists', statusCode: 409 } };
    }
    this.objects.set(path, body);
    return { data: { path }, error: null };
  }

  async download(path: string) {
    const bytes = this.objects.get(path);
    if (!bytes) return { data: null, error: { message: 'Object not found', statusCode: 404 } };
    return { data: new Blob([Uint8Array.from(bytes).buffer as ArrayBuffer]), error: null };
  }

  async createSignedUrl(path: string, expiresIn: number, options?: Record<string, unknown>) {
    return {
      data: { signedUrl: `https://storage.example/${path}?expires=${expiresIn}&download=${String(options?.download ?? '')}` },
      error: null,
    };
  }

  async createSignedUploadUrl(path: string, options: Record<string, unknown>) {
    this.signedUploads.push({ path, options });
    return {
      data: {
        signedUrl: `https://storage.example/upload/${path}?token=upload-token`,
        token: 'upload-token',
        path: this.signedUploadPathOverride ?? path,
      },
      error: null,
    };
  }
}

class FakeStorageClient {
  readonly bucket = new FakeBucket();
  readonly storage = {
    from: (name: string) => {
      expect(name).toBe('pdde-evidence');
      return this.bucket;
    },
  };
}

const bytes = new TextEncoder().encode('<html>evidência pública</html>');

describe('SupabaseArtifactStore', () => {
  test('preserva em caminho estável por runId, sem overwrite, com SHA-256 e metadados', async () => {
    const client = new FakeStorageClient();
    const store = new SupabaseArtifactStore(client);

    const artifact = await store.preserve({
      runId: 'run-2026-08-13',
      relativePath: 'schools/33069247/raw.html',
      kind: 'RAW_HTML',
      bytes,
      mediaType: 'text/html; charset=utf-8',
      schoolInep: '33069247',
      metadata: { sourceUrl: 'https://www.fnde.gov.br/pddeinfo/exemplo' },
    });

    expect(artifact).toEqual({
      provider: 'SUPABASE_STORAGE',
      bucket: 'pdde-evidence',
      path: 'runs/run-2026-08-13/schools/33069247/raw.html',
      kind: 'RAW_HTML',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.byteLength,
      mediaType: 'text/html; charset=utf-8',
      schoolInep: '33069247',
      metadata: { sourceUrl: 'https://www.fnde.gov.br/pddeinfo/exemplo' },
    });
    expect(client.bucket.uploads).toEqual([
      expect.objectContaining({
        path: 'runs/run-2026-08-13/schools/33069247/raw.html',
        options: expect.objectContaining({
          contentType: 'text/html',
          upsert: false,
          metadata: expect.objectContaining({
            runId: 'run-2026-08-13',
            kind: 'RAW_HTML',
            sha256: artifact.sha256,
            schoolInep: '33069247',
          }),
        }),
      }),
    ]);
  });

  test('é idempotente para o mesmo conteúdo e bloqueia conflito no mesmo caminho', async () => {
    const client = new FakeStorageClient();
    const store = new SupabaseArtifactStore(client);
    const input = {
      runId: 'run-idempotente',
      relativePath: 'manifest.json',
      kind: 'MANIFEST' as const,
      bytes,
      mediaType: 'application/json',
    };
    const expectedPath = 'runs/run-idempotente/manifest.json';
    client.bucket.objects.set(expectedPath, bytes);
    client.bucket.duplicate = true;

    await expect(store.preserve(input)).resolves.toMatchObject({ path: expectedPath });

    client.bucket.objects.set(expectedPath, new TextEncoder().encode('conteúdo diferente'));
    await expect(store.preserve(input)).rejects.toThrow(/conflito.*sha-256/i);
  });

  test('gera download assinado curto e rejeita path traversal', async () => {
    const store = new SupabaseArtifactStore(new FakeStorageClient());
    await expect(store.createSignedDownload({
      bucket: 'pdde-evidence',
      path: 'runs/run-1/report.xlsx',
      expiresInSeconds: 300,
      downloadName: 'relatorio.xlsx',
    })).resolves.toMatchObject({
      url: expect.stringContaining('expires=300'),
      expiresAt: expect.any(String),
    });

    await expect(store.preserve({
      runId: 'run-1',
      relativePath: '../fora.txt',
      kind: 'RAW_FILE',
      bytes,
      mediaType: 'text/plain',
    })).rejects.toThrow(/caminho.*inválido/i);
  });

  test('gera upload assinado imutável por duas horas sem expor credencial administrativa', async () => {
    const client = new FakeStorageClient();
    const now = new Date('2026-08-13T12:00:00Z');
    const store = new SupabaseArtifactStore(client, 'pdde-evidence', () => now);

    await expect(store.createSignedUpload({
      bucket: 'pdde-evidence',
      path: 'runs/input-2026/inputs/sigef-movimentacoes/upload-1.csv',
    })).resolves.toEqual({
      url: 'https://storage.example/upload/runs/input-2026/inputs/sigef-movimentacoes/upload-1.csv?token=upload-token',
      token: 'upload-token',
      path: 'runs/input-2026/inputs/sigef-movimentacoes/upload-1.csv',
      expiresAt: '2026-08-13T14:00:00.000Z',
    });
    expect(client.bucket.signedUploads).toEqual([{
      path: 'runs/input-2026/inputs/sigef-movimentacoes/upload-1.csv',
      options: { upsert: false },
    }]);
  });

  test('rejeita ticket assinado quando o Storage devolve outro path', async () => {
    const client = new FakeStorageClient();
    client.bucket.signedUploadPathOverride = 'runs/outro-run/objeto.csv';
    const store = new SupabaseArtifactStore(client);

    await expect(store.createSignedUpload({
      bucket: 'pdde-evidence',
      path: 'runs/input-2026/inputs/sigef-movimentacoes/upload-1.csv',
    })).rejects.toThrow(/ticket de upload inválido/i);
  });

  test('recusa download e assinatura fora do bucket institucional configurado', async () => {
    const store = new SupabaseArtifactStore(new FakeStorageClient());
    await expect(store.download({
      bucket: 'outro-bucket',
      path: 'runs/run-1/manifest.json',
    })).rejects.toThrow(/bucket.*institucional/i);
    await expect(store.createSignedDownload({
      bucket: 'outro-bucket',
      path: 'runs/run-1/report.xlsx',
      expiresInSeconds: 300,
    })).rejects.toThrow(/bucket.*institucional/i);
  });
});
