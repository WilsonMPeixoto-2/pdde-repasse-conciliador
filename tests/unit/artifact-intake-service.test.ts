import { createHash } from 'node:crypto';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import {
  ArtifactIntakeService,
  ArtifactUploadNotFoundError,
} from '../../backend/application/artifact-intake-service';
import type {
  ArtifactReference,
  SignedArtifactUpload,
} from '../../backend/application/artifact-store';

const uploadId = '2544c29b-d789-5c70-aee2-adc90cba79b7';
const movementBytes = Buffer.from('DATA;CNPJ;VALOR\n13/08/2026;04552825000170;5000,00\n', 'utf8');
const movementSha256 = createHash('sha256').update(movementBytes).digest('hex');

class FakeIntakeStorage {
  readonly objects = new Map<string, Uint8Array>();
  readonly signedRequests: Array<Pick<ArtifactReference, 'bucket' | 'path'>> = [];

  async createSignedUpload(input: Pick<ArtifactReference, 'bucket' | 'path'>): Promise<SignedArtifactUpload> {
    this.signedRequests.push(input);
    return {
      url: `https://storage.example/upload/${input.path}?token=temporary-token`,
      token: 'temporary-token',
      path: input.path,
      expiresAt: '2026-08-13T14:00:00.000Z',
    };
  }

  async download(reference: ArtifactReference): Promise<Uint8Array> {
    const bytes = this.objects.get(reference.path);
    if (!bytes) throw new Error('Object not found');
    return bytes;
  }
}

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'pdde-artifact-intake-'));
  const evidenceStore = new JsonlEvidenceStore(join(directory, 'events.jsonl'));
  const storage = new FakeIntakeStorage();
  const service = new ArtifactIntakeService(storage, evidenceStore, {
    now: () => '2026-08-13T12:00:00.000Z',
  });
  return { evidenceStore, service, storage };
}

describe('ArtifactIntakeService', () => {
  test('emite ticket imutável e registra a solicitação sem persistir o token temporário', async () => {
    const { evidenceStore, service } = await fixture();

    const ticket = await service.requestUpload('movimentacoes-agosto-2026', {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'Movimentações 13-08-2026.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    });

    expect(ticket).toEqual({
      uploadId,
      runId: 'inputs-2026-08-13',
      role: 'SIGEF_MOVEMENTS_CSV',
      kind: 'RAW_FILE',
      originalName: 'Movimentações 13-08-2026.csv',
      mediaType: 'text/csv',
      bucket: 'pdde-evidence',
      path: `runs/inputs-2026-08-13/inputs/sigef-movimentacoes/${uploadId}.csv`,
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
      upload: {
        method: 'PUT',
        url: `https://storage.example/upload/runs/inputs-2026-08-13/inputs/sigef-movimentacoes/${uploadId}.csv?token=temporary-token`,
        token: 'temporary-token',
        expiresAt: '2026-08-13T14:00:00.000Z',
      },
    });

    const events = await evidenceStore.listByRun('inputs-2026-08-13');
    expect(events).toEqual([
      expect.objectContaining({
        eventId: `artifact-upload:${uploadId}:requested`,
        type: 'OBSERVATION_RECORDED',
        source: 'SIGEF_MOVIMENTACOES',
        payload: expect.objectContaining({
          observationKind: 'ARTIFACT_UPLOAD_REQUESTED',
          data: expect.objectContaining({
            uploadId,
            requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
            path: ticket.path,
            sha256: movementSha256,
          }),
        }),
      }),
    ]);
    expect(JSON.stringify(events)).not.toContain('temporary-token');
    expect(JSON.stringify(events)).not.toContain('storage.example');
  });

  test('reutiliza o mesmo path quando a chave de idempotência é repetida', async () => {
    const { evidenceStore, service } = await fixture();
    const request = {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV' as const,
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    };

    const first = await service.requestUpload('movimentacoes-idempotente', request);
    const repeated = await service.requestUpload('movimentacoes-idempotente', request);

    expect(repeated.uploadId).toBe(first.uploadId);
    expect(repeated.path).toBe(first.path);
    expect(await evidenceStore.listByRun(request.runId)).toHaveLength(1);
  });

  test('rejeita a mesma chave de idempotência para conteúdo diferente', async () => {
    const { service } = await fixture();
    const request = {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV' as const,
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    };
    await service.requestUpload('movimentacoes-conflito', request);

    await expect(service.requestUpload('movimentacoes-conflito', {
      ...request,
      sha256: 'f'.repeat(64),
    })).rejects.toThrow(/conflito.*idempotência/i);
  });

  test('rejeita identificadores navegáveis e extensão incompatível antes de assinar o upload', async () => {
    const { service, storage } = await fixture();
    const request = {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV' as const,
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    };

    await expect(service.requestUpload('path-invalido', {
      ...request,
      runId: '../outro-run',
    })).rejects.toThrow(/identificador/i);
    await expect(service.requestUpload('segmento-pai', {
      ...request,
      runId: '..',
    })).rejects.toThrow(/identificador/i);
    await expect(service.requestUpload('nome-invalido', {
      ...request,
      originalName: '../movimentacoes.csv',
    })).rejects.toThrow(/nome original/i);
    await expect(service.requestUpload('extensao-invalida', {
      ...request,
      originalName: 'movimentacoes.xls',
    })).rejects.toThrow(/extensão \.csv/i);
    expect(storage.signedRequests).toEqual([]);
  });

  test('confirma o objeto enviado e registra a preservação institucional', async () => {
    const { evidenceStore, service, storage } = await fixture();
    const ticket = await service.requestUpload('movimentacoes-agosto-2026', {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    });
    storage.objects.set(ticket.path, movementBytes);

    const artifact = await service.confirmUpload(ticket.runId, ticket.uploadId);

    expect(artifact).toEqual({
      provider: 'SUPABASE_STORAGE',
      bucket: 'pdde-evidence',
      path: ticket.path,
      kind: 'RAW_FILE',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
      mediaType: 'text/csv',
      metadata: {
        uploadId,
        role: 'SIGEF_MOVEMENTS_CSV',
        originalName: 'movimentacoes.csv',
        requestedEventId: `artifact-upload:${uploadId}:requested`,
      },
    });
    expect(await evidenceStore.listByRun(ticket.runId)).toEqual([
      expect.objectContaining({ eventId: `artifact-upload:${uploadId}:requested` }),
      expect.objectContaining({
        eventId: `artifact-upload:${uploadId}:preserved`,
        type: 'ARTIFACT_PRESERVED',
        source: 'SIGEF_MOVIMENTACOES',
        payload: artifact,
      }),
    ]);
    expect(await evidenceStore.verifyIntegrity()).toEqual({ valid: true, events: 2 });
  });

  test('trata a confirmação repetida como idempotente', async () => {
    const { evidenceStore, service, storage } = await fixture();
    const ticket = await service.requestUpload('confirmacao-idempotente', {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    });
    storage.objects.set(ticket.path, movementBytes);

    const first = await service.confirmUpload(ticket.runId, ticket.uploadId);
    const repeated = await service.confirmUpload(ticket.runId, ticket.uploadId);

    expect(repeated).toEqual(first);
    expect(await evidenceStore.listByRun(ticket.runId)).toHaveLength(2);
  });

  test('não preserva upload cujo conteúdo diverge do sha-256 declarado', async () => {
    const { evidenceStore, service, storage } = await fixture();
    const ticket = await service.requestUpload('conteudo-adulterado', {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    });
    storage.objects.set(ticket.path, Buffer.alloc(movementBytes.byteLength, 0x78));

    await expect(service.confirmUpload(ticket.runId, ticket.uploadId))
      .rejects.toThrow(/sha-256/i);
    expect(await evidenceStore.listByRun(ticket.runId)).toHaveLength(1);
  });

  test('não preserva upload cujo tamanho diverge do declarado', async () => {
    const { evidenceStore, service, storage } = await fixture();
    const ticket = await service.requestUpload('tamanho-adulterado', {
      runId: 'inputs-2026-08-13',
      fiscalYear: 2026,
      role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'movimentacoes.csv',
      sha256: movementSha256,
      bytes: movementBytes.byteLength,
    });
    storage.objects.set(ticket.path, Buffer.concat([movementBytes, Buffer.from('\n')]));

    await expect(service.confirmUpload(ticket.runId, ticket.uploadId))
      .rejects.toThrow(/tamanho/i);
    expect(await evidenceStore.listByRun(ticket.runId)).toHaveLength(1);
  });

  test('distingue confirmação de upload inexistente', async () => {
    const { service } = await fixture();

    await expect(service.confirmUpload(
      'inputs-2026-08-13',
      '00000000-0000-5000-8000-000000000000',
    )).rejects.toBeInstanceOf(ArtifactUploadNotFoundError);
  });
});
