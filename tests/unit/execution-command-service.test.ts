import { describe, expect, test } from 'vitest';
import { ExecutionCommandService } from '../../backend/application/execution-command-service';
import type {
  EnqueueExecutionJobInput,
  ExecutionJobQueue,
} from '../../backend/application/execution-queue';
import type { ExecutionJob } from '../../backend/core/execution-job';
import type {
  EvidenceSource,
  PersistedEvidenceEvent,
} from '../../backend/core/evidence';

class FakeQueue implements ExecutionJobQueue {
  readonly inputs: EnqueueExecutionJobInput[] = [];
  readonly jobs = new Map<string, ExecutionJob>();

  async enqueue(input: EnqueueExecutionJobInput): Promise<ExecutionJob> {
    this.inputs.push(input);
    const key = `${input.kind}:${input.idempotencyKey}`;
    const existing = this.jobs.get(key);
    if (existing) {
      if (existing.requestHash !== input.requestHash) throw new Error('idempotency conflict');
      return existing;
    }
    const job: ExecutionJob = {
      jobId: input.jobId,
      runId: input.runId,
      kind: input.kind,
      status: 'QUEUED',
      idempotencyKey: input.idempotencyKey,
      requestHash: input.requestHash,
      payload: input.payload,
      requestedAt: input.requestedAt,
      availableAt: input.requestedAt,
      claimedAt: null,
      leaseExpiresAt: null,
      completedAt: null,
      workerId: null,
      attempts: 0,
      maxAttempts: input.maxAttempts,
      lastError: null,
    };
    this.jobs.set(key, job);
    return job;
  }

  async claim() { return null; }
  async renewLease(): Promise<ExecutionJob> { throw new Error('não usado'); }
  async complete(): Promise<ExecutionJob> { throw new Error('não usado'); }
}

class FakeArtifactEvidence {
  constructor(readonly events: PersistedEvidenceEvent[]) {}

  async listByRun(runId: string): Promise<PersistedEvidenceEvent[]> {
    return this.events.filter((event) => event.runId === runId);
  }
}

function artifactEvent(input: {
  eventId: string;
  runId: string;
  path: string;
  source: EvidenceSource;
  kind: 'RAW_FILE' | 'NORMALIZED_JSON';
  sha256?: string;
  fiscalYear?: number;
  role?: string;
}): PersistedEvidenceEvent {
  return {
    eventId: input.eventId,
    runId: input.runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: '2026-08-13T11:59:00Z',
    source: input.source,
    fiscalYear: input.fiscalYear ?? 2026,
    payload: {
      kind: input.kind,
      provider: 'SUPABASE_STORAGE',
      bucket: 'pdde-evidence',
      path: input.path,
      sha256: input.sha256 ?? 'a'.repeat(64),
      bytes: 100,
      ...(input.role ? { metadata: { role: input.role } } : {}),
    },
    sequence: 1,
    previousHash: null,
    eventHash: 'e'.repeat(64),
  };
}

function finishedCollection(
  runId: string,
  status: 'COMPLETE' | 'PARTIAL' | 'FAILED' = 'COMPLETE',
  fiscalYear = 2026,
): PersistedEvidenceEvent {
  return {
    eventId: `${runId}:finished`,
    runId,
    type: 'EXECUTION_FINISHED',
    occurredAt: '2026-08-13T11:58:00Z',
    source: 'PDDEINFO',
    fiscalYear,
    payload: { status },
    sequence: 2,
    previousHash: 'd'.repeat(64),
    eventHash: 'f'.repeat(64),
  };
}

function reconciliationEvidence(options: { collectionLifecycle?: boolean } = {}):
FakeArtifactEvidence {
  return new FakeArtifactEvidence([
    artifactEvent({
      eventId: 'pddeinfo-artifact', runId: 'coleta-1',
      path: 'runs/coleta-1/pddeinfo-2026.json', source: 'PDDEINFO', kind: 'NORMALIZED_JSON',
      ...(options.collectionLifecycle === false ? { role: 'PDDEINFO_JSON' } : {}),
    }),
    ...(options.collectionLifecycle === false ? [] : [finishedCollection('coleta-1')]),
    artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1',
      path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE',
    }),
    artifactEvent({
      eventId: 'release-artifact', runId: 'import-1',
      path: 'runs/import-1/release.xls', source: 'SIGEF_LIBERACOES', kind: 'RAW_FILE',
    }),
  ]);
}

describe('ExecutionCommandService', () => {
  test('enfileira PDDEInfo com runId determinístico e idempotência real', async () => {
    const queue = new FakeQueue();
    let uuidCounter = 0;
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => `11111111-1111-4111-8111-${String(++uuidCounter).padStart(12, '0')}`,
    });
    const request = {
      fiscalYear: 2026,
      schoolIneps: ['33069247', '33069093'],
      batchSize: 2,
      batchDelayMs: 0,
    };

    const first = await service.requestPddeInfo('coleta-controlada-agosto', request);
    const second = await service.requestPddeInfo('coleta-controlada-agosto', request);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      kind: 'PDDEINFO',
      status: 'QUEUED',
      runId: expect.stringMatching(/^pddeinfo-[a-f0-9]{32}$/),
    });
    expect(queue.inputs[0]).toMatchObject({
      runId: first.runId,
      idempotencyKey: 'coleta-controlada-agosto',
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      payload: request,
      maxAttempts: 3,
    });
    expect(queue.inputs[1].runId).toBe(queue.inputs[0].runId);
    expect(queue.inputs[1].requestHash).toBe(queue.inputs[0].requestHash);
  });

  test('aceita conciliação somente com referências institucionais e preserva centavos como inteiros', async () => {
    const queue = new FakeQueue();
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => '22222222-2222-4222-8222-222222222222',
      artifactEvidence: reconciliationEvidence(),
    });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'A'.repeat(64),
    };

    await expect(service.requestReconciliation('reconciliacao-agosto', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
      releaseArtifacts: [{ ...artifact, path: 'runs/import-1/release.xls' }],
    })).resolves.toMatchObject({ kind: 'RECONCILIATION', status: 'QUEUED' });

    expect(queue.inputs[0].payload).toMatchObject({
      fiscalYear: 2026,
      pddeInfoArtifact: { sha256: 'a'.repeat(64) },
      sourceCollectionRunId: 'coleta-1',
    });
    expect(JSON.stringify(queue.inputs[0].payload)).not.toMatch(/amount|valor|cents/i);
  });

  test('recusa referência sem ARTIFACT_PRESERVED correspondente antes de enfileirar', async () => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    evidence.events.splice(evidence.events.findIndex((event) => event.eventId === 'release-artifact'), 1);
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('artefato-ausente', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
      releaseArtifacts: [{ ...artifact, path: 'runs/import-1/release.xls' }],
    })).rejects.toThrow(/preservad|evidência/i);
    expect(queue.inputs).toEqual([]);
  });

  test.each([
    {
      divergence: 'origem',
      replacement: artifactEvent({
        eventId: 'movements-artifact', runId: 'import-1',
        path: 'runs/import-1/movements.csv', source: 'PDDEINFO', kind: 'RAW_FILE',
      }),
    },
    {
      divergence: 'tipo',
      replacement: artifactEvent({
        eventId: 'movements-artifact', runId: 'import-1',
        path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES',
        kind: 'NORMALIZED_JSON',
      }),
    },
    {
      divergence: 'papel declarado',
      replacement: artifactEvent({
        eventId: 'movements-artifact', runId: 'import-1',
        path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE',
        role: 'PDDEINFO_JSON',
      }),
    },
    {
      divergence: 'SHA-256',
      replacement: artifactEvent({
        eventId: 'movements-artifact', runId: 'import-1',
        path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE',
        sha256: 'b'.repeat(64),
      }),
    },
    {
      divergence: 'exercício',
      replacement: artifactEvent({
        eventId: 'movements-artifact', runId: 'import-1',
        path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE',
        fiscalYear: 2025,
      }),
    },
  ])('recusa artefato preservado com $divergence divergente', async ({ replacement }) => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    const movementIndex = evidence.events.findIndex((event) => event.eventId === 'movements-artifact');
    evidence.events[movementIndex] = replacement;
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('papel-divergente', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
    })).rejects.toThrow(/origem|papel|exercício/i);
    expect(queue.inputs).toEqual([]);
  });

  test('não fabrica vínculo de coleta para JSON preservado em lote sem ciclo de execução', async () => {
    const queue = new FakeQueue();
    const service = new ExecutionCommandService(queue, {
      artifactEvidence: reconciliationEvidence({ collectionLifecycle: false }),
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => '33333333-3333-4333-8333-333333333333',
    });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await service.requestReconciliation('json-importado', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
    });

    expect(queue.inputs[0].payload).not.toHaveProperty('sourceCollectionRunId');
  });

  test('não aceita sourceCollectionRunId fornecido pelo cliente', async () => {
    const queue = new FakeQueue();
    const service = new ExecutionCommandService(queue, {
      artifactEvidence: reconciliationEvidence(),
    });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('origem-forjada', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
      sourceCollectionRunId: 'coleta-forjada',
    } as never)).rejects.toThrow(/unrecognized|reconhecid/i);
    expect(queue.inputs).toEqual([]);
  });

  test('recusa artefato de coleta cujo ciclo conhecido terminou PARTIAL', async () => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    evidence.events.splice(
      evidence.events.findIndex((event) => event.eventId === 'coleta-1:finished'),
      1,
      finishedCollection('coleta-1', 'PARTIAL'),
    );
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('coleta-parcial', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
    })).rejects.toThrow(/complete|partial|ciclo/i);
    expect(queue.inputs).toEqual([]);
  });

  test('recusa vínculo quando artefato e ciclo PDDEInfo pertencem a exercícios diferentes', async () => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    evidence.events.splice(
      evidence.events.findIndex((event) => event.eventId === 'coleta-1:finished'),
      1,
      finishedCollection('coleta-1', 'COMPLETE', 2025),
    );
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });
    const artifact = {
      bucket: 'pdde-evidence' as const,
      path: 'runs/coleta-1/pddeinfo-2026.json',
      sha256: 'a'.repeat(64),
    };

    await expect(service.requestReconciliation('ciclo-outro-exercicio', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: artifact,
      movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
    })).rejects.toThrow(/ciclo|exercício/i);
    expect(queue.inputs).toEqual([]);
  });

  test('rejeita chave ausente, INEP inválido e path fora do namespace de runs', async () => {
    const service = new ExecutionCommandService(new FakeQueue());
    await expect(service.requestPddeInfo('', { fiscalYear: 2026 })).rejects.toThrow(/idempot/i);
    await expect(service.requestPddeInfo('chave', {
      fiscalYear: 2026,
      schoolIneps: ['123'],
    })).rejects.toThrow(/inep/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: '../fora.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/path|caminho/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/arquivo com espaco.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/path|caminho/i);
    await expect(service.requestReconciliation('chave', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/pddeinfo-2026.json', sha256: 'a'.repeat(64),
      },
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
      releaseArtifacts: [{
        bucket: 'pdde-evidence', path: 'runs/x/exportacao.pdf', sha256: 'c'.repeat(64),
      }],
    })).rejects.toThrow(/\.xls|liberaç/i);
    await expect(service.requestReconciliation('outro-bucket', {
      fiscalYear: 2026,
      requestedThrough: '2026-08-13',
      pddeInfoArtifact: {
        bucket: 'outro-bucket', path: 'runs/x/pddeinfo-2026.json', sha256: 'a'.repeat(64),
      } as never,
      movementsArtifact: {
        bucket: 'pdde-evidence', path: 'runs/x/movements.csv', sha256: 'b'.repeat(64),
      },
    })).rejects.toThrow(/bucket/i);
  });
});
