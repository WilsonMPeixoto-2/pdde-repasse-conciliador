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
      startedAt: null,
      completedAt: null,
      lastError: null,
    };
    this.jobs.set(key, job);
    return job;
  }

  async recoverInterrupted() { return 0; }
  async claim() { return null; }
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
  role: string;
  sha256?: string;
  fiscalYear?: number;
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
      metadata: { role: input.role },
    },
    sequence: 1,
    previousHash: null,
    eventHash: 'e'.repeat(64),
  };
}

function reconciliationEvidence(): FakeArtifactEvidence {
  return new FakeArtifactEvidence([
    artifactEvent({
      eventId: 'pddeinfo-artifact', runId: 'coleta-1',
      path: 'runs/coleta-1/pddeinfo-2026.json', source: 'PDDEINFO',
      kind: 'NORMALIZED_JSON', role: 'PDDEINFO_JSON',
    }),
    artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1',
      path: 'runs/import-1/movements.csv', source: 'SIGEF_MOVIMENTACOES',
      kind: 'RAW_FILE', role: 'SIGEF_MOVEMENTS_CSV',
    }),
    artifactEvent({
      eventId: 'release-artifact', runId: 'import-1',
      path: 'runs/import-1/release.xls', source: 'SIGEF_LIBERACOES',
      kind: 'RAW_FILE', role: 'SIGEF_RELEASE_XLS',
    }),
  ]);
}

const artifact = {
  bucket: 'pdde-evidence' as const,
  path: 'runs/coleta-1/pddeinfo-2026.json',
  sha256: 'a'.repeat(64),
};

const reconciliationRequest = {
  fiscalYear: 2026,
  requestedThrough: '2026-08-13',
  pddeInfoArtifact: artifact,
  movementsArtifact: { ...artifact, path: 'runs/import-1/movements.csv' },
  releaseArtifacts: [{ ...artifact, path: 'runs/import-1/release.xls' }],
};

describe('ExecutionCommandService', () => {
  test('enfileira PDDEInfo com runId determinístico e idempotência', async () => {
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
      kind: 'PDDEINFO', status: 'QUEUED', runId: expect.stringMatching(/^pddeinfo-[a-f0-9]{32}$/),
    });
    expect(queue.inputs[0]).toMatchObject({
      runId: first.runId,
      idempotencyKey: 'coleta-controlada-agosto',
      requestHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      payload: request,
    });
    expect(queue.inputs[0]).not.toHaveProperty('maxAttempts');
  });

  test('aceita conciliação com arquivos institucionais exatos sem exigir genealogia técnica', async () => {
    const queue = new FakeQueue();
    const service = new ExecutionCommandService(queue, {
      now: () => '2026-08-13T12:00:00Z',
      randomUuid: () => '22222222-2222-4222-8222-222222222222',
      artifactEvidence: reconciliationEvidence(),
    });

    await expect(service.requestReconciliation(
      'reconciliacao-agosto', reconciliationRequest,
    )).resolves.toMatchObject({ kind: 'RECONCILIATION', status: 'QUEUED' });

    expect(queue.inputs[0].payload).toMatchObject({
      fiscalYear: 2026,
      pddeInfoArtifact: { sha256: 'a'.repeat(64) },
    });
    expect(queue.inputs[0].payload).not.toHaveProperty('sourceCollectionRunId');
  });

  test('recusa referência sem ARTIFACT_PRESERVED correspondente', async () => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    evidence.events.splice(
      evidence.events.findIndex((event) => event.eventId === 'release-artifact'), 1,
    );
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });

    await expect(service.requestReconciliation(
      'artefato-ausente', reconciliationRequest,
    )).rejects.toThrow(/preservad|evidência/i);
    expect(queue.inputs).toEqual([]);
  });

  test.each([
    ['origem', artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1', path: 'runs/import-1/movements.csv',
      source: 'PDDEINFO', kind: 'RAW_FILE', role: 'SIGEF_MOVEMENTS_CSV',
    })],
    ['papel', artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1', path: 'runs/import-1/movements.csv',
      source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE', role: 'PDDEINFO_JSON',
    })],
    ['SHA-256', artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1', path: 'runs/import-1/movements.csv',
      source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE', role: 'SIGEF_MOVEMENTS_CSV',
      sha256: 'b'.repeat(64),
    })],
    ['exercício', artifactEvent({
      eventId: 'movements-artifact', runId: 'import-1', path: 'runs/import-1/movements.csv',
      source: 'SIGEF_MOVIMENTACOES', kind: 'RAW_FILE', role: 'SIGEF_MOVEMENTS_CSV',
      fiscalYear: 2025,
    })],
  ])('recusa arquivo institucional com %s divergente', async (_label, replacement) => {
    const queue = new FakeQueue();
    const evidence = reconciliationEvidence();
    const index = evidence.events.findIndex((event) => event.eventId === 'movements-artifact');
    evidence.events[index] = replacement;
    const service = new ExecutionCommandService(queue, { artifactEvidence: evidence });

    await expect(service.requestReconciliation(
      'arquivo-divergente', reconciliationRequest,
    )).rejects.toThrow(/evidência|preserved/i);
    expect(queue.inputs).toEqual([]);
  });

  test('não aceita sourceCollectionRunId fornecido pelo cliente', async () => {
    const service = new ExecutionCommandService(new FakeQueue(), {
      artifactEvidence: reconciliationEvidence(),
    });
    await expect(service.requestReconciliation('campo-interno', {
      ...reconciliationRequest,
      sourceCollectionRunId: 'nao-permitido',
    } as never)).rejects.toThrow();
  });

  test('rejeita data civil impossível', async () => {
    const service = new ExecutionCommandService(new FakeQueue(), {
      artifactEvidence: reconciliationEvidence(),
    });
    await expect(service.requestReconciliation('data-invalida', {
      ...reconciliationRequest,
      requestedThrough: '2026-02-31',
    })).rejects.toThrow(/data/i);
  });
});
