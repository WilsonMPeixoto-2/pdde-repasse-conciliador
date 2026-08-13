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
    });
  });

  test('não varre o log inteiro quando a escola ainda não tem histórico', async () => {
    const listAll = vi.spyOn(store, 'listAll');

    await expect(service.getSchoolHistory('33069093')).resolves.toEqual({
      school: schools[1],
      events: [],
      executions: [],
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
});
