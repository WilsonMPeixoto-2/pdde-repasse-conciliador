import type { EvidenceEventStore } from './evidence-store';
import type { EvidenceSource, PersistedEvidenceEvent } from '../core/evidence';

export type ProjectedExecutionStatus = 'RUNNING' | 'COMPLETE' | 'PARTIAL' | 'FAILED' | 'UNKNOWN';

export interface EvidenceRunProjection {
  runId: string;
  source: EvidenceSource;
  fiscalYear: number;
  startedAt: string | null;
  finishedAt: string | null;
  status: ProjectedExecutionStatus;
  sourceCollectionRunId: string | null;
  counts: {
    events: number;
    attempts: number;
    failedAttempts: number;
    artifacts: number;
    findings: number;
    humanReview: number;
  };
}

export interface SchoolEvidenceHistory {
  schoolInep: string;
  events: PersistedEvidenceEvent[];
  runs: EvidenceRunProjection[];
}

function payloadRecord(event: PersistedEvidenceEvent | undefined): Record<string, unknown> {
  if (!event || !event.payload || typeof event.payload !== 'object') return {};
  return event.payload as Record<string, unknown>;
}

function projectedStatus(
  start: PersistedEvidenceEvent | undefined,
  finish: PersistedEvidenceEvent | undefined,
): ProjectedExecutionStatus {
  if (!start) return 'UNKNOWN';
  if (!finish) return 'RUNNING';
  const status = payloadRecord(finish).status;
  return status === 'COMPLETE' || status === 'PARTIAL' || status === 'FAILED'
    ? status
    : 'UNKNOWN';
}

export class EvidenceHistoryReader {
  constructor(private readonly store: EvidenceEventStore) {}

  async getRun(runId: string): Promise<EvidenceRunProjection | null> {
    const events = (await this.store.listByRun(runId)).sort((left, right) => left.sequence - right.sequence);
    if (events.length === 0) return null;

    const start = events.find((event) => event.type === 'EXECUTION_STARTED');
    const finish = [...events].reverse().find((event) => event.type === 'EXECUTION_FINISHED');
    const sourceEvent = start ?? events[0];
    const startPayload = payloadRecord(start);
    const sourceCollectionRunId = typeof startPayload.sourceCollectionRunId === 'string'
      ? startPayload.sourceCollectionRunId
      : null;

    const attempts = events.filter((event) => event.type === 'SOURCE_ATTEMPT_RECORDED');
    const findings = events.filter((event) => event.type === 'FINDING_RECORDED');

    return {
      runId,
      source: sourceEvent.source,
      fiscalYear: sourceEvent.fiscalYear,
      startedAt: start?.occurredAt ?? null,
      finishedAt: finish?.occurredAt ?? null,
      status: projectedStatus(start, finish),
      sourceCollectionRunId,
      counts: {
        events: events.length,
        attempts: attempts.length,
        failedAttempts: attempts.filter((event) => payloadRecord(event).status === 'FAILED').length,
        artifacts: events.filter((event) => event.type === 'ARTIFACT_PRESERVED').length,
        findings: findings.length,
        humanReview: findings.filter(
          (event) => payloadRecord(event).requiresHumanReview === true,
        ).length,
      },
    };
  }

  async getSchoolHistory(inep: string): Promise<SchoolEvidenceHistory> {
    if (!/^\d{8}$/.test(inep)) throw new Error(`INEP inválido para histórico de evidências: ${inep}.`);
    const events = (await this.store.listBySchool(inep)).sort(
      (left, right) => left.sequence - right.sequence,
    );
    const runIds = [...new Set(events.map((event) => event.runId))];
    const projections = await Promise.all(runIds.map((runId) => this.getRun(runId)));
    const runs = projections.filter((run): run is EvidenceRunProjection => run !== null);
    return { schoolInep: inep, events, runs };
  }
}
