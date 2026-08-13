import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { InstitutionalReadService } from '../../backend/application/institutional-read-service';

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' },
  { inep: '33069093', sme: '0410002', nome: 'EM ALBINO SOUZA CRUZ' },
];

let store: JsonlEvidenceStore;
let service: InstitutionalReadService;

beforeEach(async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pdde-read-service-'));
  store = new JsonlEvidenceStore(join(directory, 'events.jsonl'));
  await store.append({
    eventId: 'requested-a', runId: 'run-a', type: 'EXECUTION_REQUESTED',
    occurredAt: '2026-08-13T10:00:00Z', source: 'PDDEINFO', fiscalYear: 2026,
    payload: { jobKind: 'PDDEINFO', idempotencyKey: 'a', requestHash: 'a'.repeat(64) },
  });
  await store.append({
    eventId: 'start-a', runId: 'run-a', type: 'EXECUTION_STARTED',
    occurredAt: '2026-08-13T10:01:00Z', source: 'PDDEINFO', fiscalYear: 2026,
    payload: { portfolioSize: 2 },
  });
  await store.append({
    eventId: 'attempt-a', runId: 'run-a', type: 'SOURCE_ATTEMPT_RECORDED',
    occurredAt: '2026-08-13T10:02:00Z', source: 'PDDEINFO', fiscalYear: 2026,
    schoolInep: '33069247', payload: { status: 'SUCCESS', attempts: 1 },
  });
  await store.append({
    eventId: 'artifact-a', runId: 'run-a', type: 'ARTIFACT_PRESERVED',
    occurredAt: '2026-08-13T10:02:01Z', source: 'PDDEINFO', fiscalYear: 2026,
    schoolInep: '33069247', payload: {
      kind: 'RAW_HTML', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
      path: 'runs/run-a/schools/33069247/raw.html', sha256: 'b'.repeat(64), bytes: 123,
      mediaType: 'text/html', metadata: { sourceUrl: 'https://example.test' },
    },
  });
  await store.append({
    eventId: 'finish-a', runId: 'run-a', type: 'EXECUTION_FINISHED',
    occurredAt: '2026-08-13T10:03:00Z', source: 'PDDEINFO', fiscalYear: 2026,
    payload: { status: 'COMPLETE', succeeded: 2, failed: 0 },
  });
  await store.append({
    eventId: 'requested-b', runId: 'run-b', type: 'EXECUTION_REQUESTED',
    occurredAt: '2026-08-13T11:00:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
    payload: { jobKind: 'RECONCILIATION', idempotencyKey: 'b', requestHash: 'c'.repeat(64) },
  });
  await store.append({
    eventId: 'start-b', runId: 'run-b', type: 'EXECUTION_STARTED',
    occurredAt: '2026-08-13T11:01:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
    payload: { sourceCollectionRunId: 'run-a' },
  });
  await store.append({
    eventId: 'finding-b', runId: 'run-b', type: 'FINDING_RECORDED',
    occurredAt: '2026-08-13T11:02:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
    schoolInep: '33069247', payload: {
      status: 'DIVERGENCIA_REVISAO_NECESSARIA', reasonCode: 'ACCOUNT_MISMATCH',
      requiresHumanReview: true, data: { amountPaidCents: 506_500 },
    },
  });
  service = new InstitutionalReadService(store, schools);
});

describe('InstitutionalReadService', () => {
  test('expõe catálogo e histórico enriquecido por INEP', async () => {
    expect(service.listSchools()).toEqual({ items: schools, total: 2 });
    expect(service.getSchool('33069247')).toEqual(schools[0]);
    expect(service.getSchool('99999999')).toBeNull();
    await expect(service.getSchoolHistory('33069247')).resolves.toMatchObject({
      school: schools[0],
      events: expect.arrayContaining([
        expect.objectContaining({ eventId: 'attempt-a' }),
        expect.objectContaining({ eventId: 'finding-b' }),
      ]),
      executions: expect.arrayContaining([
        expect.objectContaining({ runId: 'run-a', status: 'COMPLETE' }),
        expect.objectContaining({ runId: 'run-b', status: 'RUNNING' }),
      ]),
      total: 3,
    });
  });

  test('pagina o histórico escolar por sequência sem perder projeções relacionadas', async () => {
    const first = await service.getSchoolHistory('33069247', { limit: 1 });
    expect(first).toMatchObject({
      events: [expect.objectContaining({ eventId: 'finding-b', sequence: 8 })],
      executions: [expect.objectContaining({ runId: 'run-b' })],
      total: 3,
      nextCursor: '8',
    });

    await expect(service.getSchoolHistory('33069247', {
      limit: 1,
      cursor: first!.nextCursor,
    })).resolves.toMatchObject({
      events: [expect.objectContaining({ eventId: 'artifact-a', sequence: 4 })],
      executions: [expect.objectContaining({ runId: 'run-a' })],
      total: 3,
      nextCursor: '4',
    });
  });

  test('não varre o log inteiro quando a escola ainda não tem histórico', async () => {
    const listAll = vi.spyOn(store, 'listAll');

    await expect(service.getSchoolHistory('33069093')).resolves.toEqual({
      school: schools[1],
      events: [],
      executions: [],
      total: 0,
    });
    expect(listAll).not.toHaveBeenCalled();
  });

  test('lista e detalha execuções com paginação por cursor', async () => {
    const first = await service.listExecutions({ limit: 1 });
    expect(first.items).toEqual([expect.objectContaining({ runId: 'run-b', status: 'RUNNING' })]);
    expect(first.nextCursor).toMatch(/^\d+$/);
    await expect(service.listExecutions({ limit: 1, cursor: first.nextCursor! })).resolves.toMatchObject({
      items: [expect.objectContaining({ runId: 'run-a', status: 'COMPLETE' })],
    });
    await expect(service.getExecution('run-b')).resolves.toMatchObject({
      execution: expect.objectContaining({ sourceCollectionRunId: 'run-a' }),
      findings: [expect.objectContaining({ eventId: 'finding-b' })],
      artifacts: [],
    });
  });

  test('rejeita cursor não seguro e runId inválido antes de consultar o log', async () => {
    const listAll = vi.spyOn(store, 'listAll');
    const listByRun = vi.spyOn(store, 'listByRun');

    await expect(service.listExecutions({ cursor: '9'.repeat(100) }))
      .rejects.toThrow(/cursor|seguro|inválid/i);
    await expect(service.listFindings({ runId: '../outro-run' }))
      .rejects.toThrow(/runid|identificador|inválid/i);
    await expect(service.getExecution('x'.repeat(161)))
      .rejects.toThrow(/runid|identificador|inválid/i);
    await expect(service.listArtifacts('run/com/barra'))
      .rejects.toThrow(/runid|identificador|inválid/i);

    expect(listAll).not.toHaveBeenCalled();
    expect(listByRun).not.toHaveBeenCalled();
  });

  test('mantém artefatos de lote consultáveis sem criar uma execução sintética', async () => {
    await store.append({
      eventId: 'upload-requested', runId: 'input-batch', type: 'OBSERVATION_RECORDED',
      occurredAt: '2026-08-13T12:00:00Z', source: 'SIGEF_MOVIMENTACOES', fiscalYear: 2026,
      payload: {
        observationKind: 'ARTIFACT_UPLOAD_REQUESTED',
        data: { uploadId: '00000000-0000-5000-8000-000000000001' },
      },
    });
    await store.append({
      eventId: 'upload-preserved', runId: 'input-batch', type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T12:01:00Z', source: 'SIGEF_MOVIMENTACOES', fiscalYear: 2026,
      payload: {
        kind: 'RAW_FILE', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
        path: 'runs/input-batch/input.csv', sha256: 'd'.repeat(64), bytes: 42,
        mediaType: 'text/csv', metadata: { role: 'SIGEF_MOVEMENTS_CSV' },
      },
    });

    const executions = await service.listExecutions({ limit: 10 });
    expect(executions.items.map((execution) => execution.runId)).not.toContain('input-batch');
    await expect(service.getExecution('input-batch')).resolves.toBeNull();
    await expect(service.listArtifacts('input-batch')).resolves.toEqual([
      expect.objectContaining({
        eventId: 'upload-preserved', runId: 'input-batch', path: 'runs/input-batch/input.csv',
      }),
    ]);
  });

  test('filtra achados/exceções e projeta referências de artefato', async () => {
    await expect(service.listFindings({ schoolInep: '33069247', requiresHumanReview: true }))
      .resolves.toMatchObject({
        total: 1,
        items: [expect.objectContaining({
          runId: 'run-b',
          status: 'DIVERGENCIA_REVISAO_NECESSARIA',
          amountPaidCents: 506_500,
        })],
      });
    await expect(service.listArtifacts('run-a')).resolves.toEqual([
      expect.objectContaining({
        eventId: 'artifact-a', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
        path: 'runs/run-a/schools/33069247/raw.html', sha256: 'b'.repeat(64),
      }),
    ]);
  });

  test('expõe somente achados da tentativa mais recente sem apagar o histórico anterior', async () => {
    await store.append({
      eventId: 'start-b-attempt-2', runId: 'run-b', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T11:03:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { attempt: 2, sourceCollectionRunId: 'run-a' },
    });
    await store.append({
      eventId: 'finding-b-attempt-2', runId: 'run-b', type: 'FINDING_RECORDED',
      occurredAt: '2026-08-13T11:04:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
      schoolInep: '33069247', payload: {
        status: 'REPASSE_CONFIRMADO', reasonCode: 'EXACT_MATCH',
        requiresHumanReview: false, data: { amountPaidCents: 506_500 },
      },
    });

    await expect(service.listFindings({ runId: 'run-b' })).resolves.toMatchObject({
      total: 1,
      items: [expect.objectContaining({ eventId: 'finding-b-attempt-2' })],
    });
    await expect(service.getExecution('run-b')).resolves.toMatchObject({
      execution: expect.objectContaining({
        counts: expect.objectContaining({ findings: 1, humanReview: 0 }),
      }),
      findings: [expect.objectContaining({ eventId: 'finding-b-attempt-2' })],
      events: expect.arrayContaining([
        expect.objectContaining({ eventId: 'finding-b' }),
        expect.objectContaining({ eventId: 'finding-b-attempt-2' }),
      ]),
    });
  });
});
