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
    payload: {},
  });
  await store.append({
    eventId: 'finding-b', runId: 'run-b', type: 'FINDING_RECORDED',
    occurredAt: '2026-08-13T11:02:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
    schoolInep: '33069247', payload: {
      status: 'DIVERGENCIA_REVISAO_NECESSARIA', reasonCode: 'ACCOUNT_MISMATCH',
      requiresHumanReview: true, data: { amountPaidCents: 506_500 },
    },
  });
  await store.append({
    eventId: 'report-b', runId: 'run-b', type: 'ARTIFACT_PRESERVED',
    occurredAt: '2026-08-13T11:02:30Z', source: 'CONCILIADOR', fiscalYear: 2026,
    payload: {
      kind: 'REPORT', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
      path: 'runs/run-b/run/reports/reconciliation.xlsx',
      sha256: 'd'.repeat(64), bytes: 1_000,
      mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    },
  });
  await store.append({
    eventId: 'finish-b', runId: 'run-b', type: 'EXECUTION_FINISHED',
    occurredAt: '2026-08-13T11:03:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
    payload: { status: 'COMPLETE', failed: 0 },
  });

  service = new InstitutionalReadService(store, schools);
});

describe('InstitutionalReadService', () => {
  test('expõe catálogo e histórico por INEP sem transformar histórico em estado atual', async () => {
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
        expect.objectContaining({ runId: 'run-b', status: 'COMPLETE' }),
      ]),
      total: 3,
    });
  });

  test('não varre o log inteiro quando a escola ainda não tem histórico', async () => {
    const listAll = vi.spyOn(store, 'listAll');
    await expect(service.getSchoolHistory('33069093')).resolves.toEqual({
      school: schools[1], events: [], executions: [], total: 0,
    });
    expect(listAll).not.toHaveBeenCalled();
  });

  test('lista execuções e detalha uma execução concluída', async () => {
    const page = await service.listExecutions({ limit: 10 });
    expect(page.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ runId: 'run-a', status: 'COMPLETE' }),
      expect.objectContaining({ runId: 'run-b', status: 'COMPLETE' }),
    ]));
    await expect(service.getExecution('run-b')).resolves.toMatchObject({
      execution: expect.objectContaining({ status: 'COMPLETE' }),
      findings: [expect.objectContaining({ eventId: 'finding-b' })],
      artifacts: [expect.objectContaining({ eventId: 'report-b' })],
    });
  });

  test('lista apenas achados de execuções concluídas e mantém artefatos auditáveis', async () => {
    await expect(service.listFindings({ schoolInep: '33069247', requiresHumanReview: true }))
      .resolves.toMatchObject({
        total: 1,
        items: [expect.objectContaining({
          runId: 'run-b',
          status: 'DIVERGENCIA_REVISAO_NECESSARIA',
          amountPaidCents: 506_500,
        })],
      });
    await expect(service.getCurrentReport('run-b')).resolves.toMatchObject({
      eventId: 'report-b',
      path: 'runs/run-b/run/reports/reconciliation.xlsx',
    });
    await expect(service.listArtifacts('run-a')).resolves.toEqual([
      expect.objectContaining({ eventId: 'artifact-a', provider: 'SUPABASE_STORAGE' }),
    ]);
  });

  test('não publica achado ou relatório de execução ainda em andamento', async () => {
    await store.append({
      eventId: 'requested-c', runId: 'run-c', type: 'EXECUTION_REQUESTED',
      occurredAt: '2026-08-13T12:00:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { jobKind: 'RECONCILIATION', idempotencyKey: 'c', requestHash: 'e'.repeat(64) },
    });
    await store.append({
      eventId: 'start-c', runId: 'run-c', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T12:01:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: {},
    });
    await store.append({
      eventId: 'finding-c', runId: 'run-c', type: 'FINDING_RECORDED',
      occurredAt: '2026-08-13T12:02:00Z', source: 'CONCILIADOR', fiscalYear: 2026,
      schoolInep: '33069247', payload: {
        status: 'REPASSE_CONFIRMADO', reasonCode: 'EXACT_MATCH',
        requiresHumanReview: false, data: { amountPaidCents: 506_500 },
      },
    });
    await store.append({
      eventId: 'report-c', runId: 'run-c', type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T12:02:30Z', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: {
        kind: 'REPORT', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
        path: 'runs/run-c/run/reports/reconciliation.xlsx',
        sha256: 'f'.repeat(64), bytes: 1_000,
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      },
    });

    await expect(service.getExecution('run-c')).resolves.toMatchObject({
      execution: expect.objectContaining({ status: 'RUNNING' }),
      findings: [],
    });
    await expect(service.listFindings({ runId: 'run-c' })).resolves.toMatchObject({
      total: 0, items: [],
    });
    await expect(service.getCurrentReport('run-c')).resolves.toBeNull();
    await expect(service.listArtifacts('run-c')).resolves.toEqual([
      expect.objectContaining({ eventId: 'report-c' }),
    ]);
  });

  test('mantém artefatos de upload consultáveis sem criar execução sintética', async () => {
    await store.append({
      eventId: 'upload-preserved', runId: 'input-batch', type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T13:00:00Z', source: 'SIGEF_MOVIMENTACOES', fiscalYear: 2026,
      payload: {
        kind: 'RAW_FILE', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
        path: 'runs/input-batch/input.csv', sha256: '1'.repeat(64), bytes: 42,
        mediaType: 'text/csv', metadata: { role: 'SIGEF_MOVEMENTS_CSV' },
      },
    });

    const executions = await service.listExecutions({ limit: 10 });
    expect(executions.items.map((execution) => execution.runId)).not.toContain('input-batch');
    await expect(service.getExecution('input-batch')).resolves.toBeNull();
    await expect(service.listArtifacts('input-batch')).resolves.toHaveLength(1);
  });

  test('rejeita cursor e identificadores inválidos antes da consulta', async () => {
    const listAll = vi.spyOn(store, 'listAll');
    const listByRun = vi.spyOn(store, 'listByRun');

    await expect(service.listExecutions({ cursor: '9'.repeat(100) })).rejects.toThrow(/cursor/i);
    await expect(service.listFindings({ runId: '../outro-run' })).rejects.toThrow();
    await expect(service.getExecution('x'.repeat(161))).rejects.toThrow();
    await expect(service.listArtifacts('run/com/barra')).rejects.toThrow();

    expect(listAll).not.toHaveBeenCalled();
    expect(listByRun).not.toHaveBeenCalled();
  });
});
