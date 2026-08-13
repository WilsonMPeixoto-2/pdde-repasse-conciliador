import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { EvidenceHistoryReader } from '../../backend/application/evidence-history';
import type { EvidenceEventInput } from '../../backend/core/evidence';

async function append(store: JsonlEvidenceStore, event: EvidenceEventInput) {
  await store.append(event);
}

describe('EvidenceHistoryReader', () => {
  test('não transforma um lote de artefatos sem ciclo de vida em execução UNKNOWN', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-input-batch-'));
    const store = new JsonlEvidenceStore(join(directory, 'events.jsonl'));
    await append(store, {
      eventId: 'upload-requested',
      runId: 'input-batch-2026-08-13',
      type: 'OBSERVATION_RECORDED',
      occurredAt: '2026-08-13T00:58:00-03:00',
      source: 'SIGEF_MOVIMENTACOES',
      fiscalYear: 2026,
      payload: {
        observationKind: 'ARTIFACT_UPLOAD_REQUESTED',
        data: { uploadId: '00000000-0000-5000-8000-000000000001' },
      },
    });
    await append(store, {
      eventId: 'upload-preserved',
      runId: 'input-batch-2026-08-13',
      type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T00:59:00-03:00',
      source: 'SIGEF_MOVIMENTACOES',
      fiscalYear: 2026,
      payload: {
        kind: 'RAW_FILE',
        path: 'runs/input-batch-2026-08-13/input.csv',
        sha256: 'a'.repeat(64),
        bytes: 10,
      },
    });

    await expect(new EvidenceHistoryReader(store).getRun('input-batch-2026-08-13'))
      .resolves.toBeNull();
  });

  test('projeta uma solicitação durável ainda não reclamada como QUEUED', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-queued-'));
    const store = new JsonlEvidenceStore(join(directory, 'events.jsonl'));
    await append(store, {
      eventId: 'job-requested:collect-queued',
      runId: 'collect-queued',
      type: 'EXECUTION_REQUESTED',
      occurredAt: '2026-08-13T00:59:00-03:00',
      source: 'PDDEINFO',
      fiscalYear: 2026,
      payload: {
        jobKind: 'PDDEINFO',
        idempotencyKey: 'coleta-agosto',
        requestHash: 'a'.repeat(64),
      },
    });

    await expect(new EvidenceHistoryReader(store).getRun('collect-queued')).resolves.toMatchObject({
      runId: 'collect-queued',
      source: 'PDDEINFO',
      status: 'QUEUED',
      startedAt: null,
      finishedAt: null,
      counts: { events: 1 },
    });
  });

  test('reconstrói resumo da execução e relaciona conciliação à coleta de origem', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-history-'));
    const store = new JsonlEvidenceStore(join(directory, 'events.jsonl'));

    await append(store, {
      eventId: 'c-start', runId: 'collect-1', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T01:00:00-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      payload: { portfolioSize: 163, parserVersion: '0.3.0' },
    });
    await append(store, {
      eventId: 'c-attempt', runId: 'collect-1', type: 'SOURCE_ATTEMPT_RECORDED',
      occurredAt: '2026-08-13T01:00:10-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      schoolInep: '33069247', payload: { status: 'SUCCESS', attempts: 1, httpStatus: 200 },
    });
    await append(store, {
      eventId: 'c-artifact', runId: 'collect-1', type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T01:00:11-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      schoolInep: '33069247', payload: {
        kind: 'RAW_HTML', path: 'raw/33069247.html', sha256: 'a'.repeat(64), bytes: 100,
      },
    });
    await append(store, {
      eventId: 'c-finish', runId: 'collect-1', type: 'EXECUTION_FINISHED',
      occurredAt: '2026-08-13T01:03:00-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      payload: { status: 'COMPLETE', succeeded: 163, failed: 0 },
    });

    await append(store, {
      eventId: 'r-start', runId: 'reconcile-1', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T01:10:00-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { portfolioSize: 520, sourceCollectionRunId: 'collect-1' },
    });
    await append(store, {
      eventId: 'r-finding', runId: 'reconcile-1', type: 'FINDING_RECORDED',
      occurredAt: '2026-08-13T01:10:10-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      schoolInep: '33069247', payload: {
        status: 'DIVERGENCIA_REVISAO_NECESSARIA', reasonCode: 'ACCOUNT_MISMATCH',
        requiresHumanReview: true, data: { paymentId: 'p1' },
      },
    });
    await append(store, {
      eventId: 'r-report', runId: 'reconcile-1', type: 'ARTIFACT_PRESERVED',
      occurredAt: '2026-08-13T01:11:00-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { kind: 'REPORT', path: '/tmp/result.xlsx', sha256: 'b'.repeat(64), bytes: 200 },
    });
    await append(store, {
      eventId: 'r-finish', runId: 'reconcile-1', type: 'EXECUTION_FINISHED',
      occurredAt: '2026-08-13T01:11:01-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { status: 'COMPLETE', succeeded: 520, failed: 0 },
    });

    const reader = new EvidenceHistoryReader(store);
    expect(await reader.getRun('collect-1')).toMatchObject({
      runId: 'collect-1', source: 'PDDEINFO', fiscalYear: 2026, status: 'COMPLETE',
      startedAt: '2026-08-13T01:00:00-03:00', finishedAt: '2026-08-13T01:03:00-03:00',
      sourceCollectionRunId: null,
      counts: { events: 4, attempts: 1, failedAttempts: 0, artifacts: 1, findings: 0, humanReview: 0 },
    });
    expect(await reader.getRun('reconcile-1')).toMatchObject({
      runId: 'reconcile-1', source: 'CONCILIADOR', status: 'COMPLETE',
      sourceCollectionRunId: 'collect-1',
      counts: { events: 4, attempts: 0, artifacts: 1, findings: 1, humanReview: 1 },
    });
  });

  test('monta a linha do tempo de uma escola incluindo contexto das execuções relacionadas', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-school-history-'));
    const store = new JsonlEvidenceStore(join(directory, 'events.jsonl'));
    const inep = '33069247';

    await append(store, {
      eventId: 's1', runId: 'run-a', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T01:00:00-03:00', source: 'PDDEINFO', fiscalYear: 2026, payload: {},
    });
    await append(store, {
      eventId: 's2', runId: 'run-a', type: 'SOURCE_ATTEMPT_RECORDED',
      occurredAt: '2026-08-13T01:00:01-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      schoolInep: inep, payload: { status: 'SUCCESS', attempts: 1 },
    });
    await append(store, {
      eventId: 's3', runId: 'run-a', type: 'EXECUTION_FINISHED',
      occurredAt: '2026-08-13T01:01:00-03:00', source: 'PDDEINFO', fiscalYear: 2026,
      payload: { status: 'COMPLETE', succeeded: 1, failed: 0 },
    });
    await append(store, {
      eventId: 's4', runId: 'run-b', type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T02:00:00-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { sourceCollectionRunId: 'run-a' },
    });
    await append(store, {
      eventId: 's5', runId: 'run-b', type: 'FINDING_RECORDED',
      occurredAt: '2026-08-13T02:00:01-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      schoolInep: inep,
      payload: { status: 'REPASSE_CONFIRMADO', reasonCode: 'EXACT_MATCH', requiresHumanReview: false },
    });
    await append(store, {
      eventId: 's6', runId: 'run-b', type: 'EXECUTION_FINISHED',
      occurredAt: '2026-08-13T02:01:00-03:00', source: 'CONCILIADOR', fiscalYear: 2026,
      payload: { status: 'COMPLETE', succeeded: 1, failed: 0 },
    });

    const history = await new EvidenceHistoryReader(store).getSchoolHistory(inep);
    expect(history.schoolInep).toBe(inep);
    expect(history.events.map((event) => event.eventId)).toEqual(['s2', 's5']);
    expect(history.runs.map((run) => run.runId)).toEqual(['run-a', 'run-b']);
    expect(history.runs[1]).toMatchObject({ source: 'CONCILIADOR', sourceCollectionRunId: 'run-a' });
  });
});
