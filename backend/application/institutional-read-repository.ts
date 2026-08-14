import type { PersistedEvidenceEvent } from '../core/evidence';
import type { EvidenceRunProjection } from './evidence-history';

export interface ExecutionPage {
  items: EvidenceRunProjection[];
  nextCursor?: string;
}

export interface FindingReadModel {
  eventId: string;
  sequence: number;
  runId: string;
  schoolInep: string | null;
  occurredAt: string;
  status: string;
  reasonCode: string;
  requiresHumanReview: boolean;
  [key: string]: unknown;
}

export interface ExecutionReadQuery {
  limit: number;
  cursor?: string;
}

export interface FindingReadQuery extends ExecutionReadQuery {
  schoolInep?: string;
  runId?: string;
  requiresHumanReview?: boolean;
}

export interface SchoolEventReadQuery extends ExecutionReadQuery {
  schoolInep: string;
}

export interface SchoolEventPage {
  items: PersistedEvidenceEvent[];
  total: number;
  nextCursor?: string;
}

export interface InstitutionalReadRepository {
  listExecutions(query: ExecutionReadQuery): Promise<ExecutionPage>;
  listFindings(query: FindingReadQuery): Promise<{
    items: FindingReadModel[];
    total: number;
    nextCursor?: string;
  }>;
  listSchoolEvents(query: SchoolEventReadQuery): Promise<SchoolEventPage>;
  listExecutionsByRuns(runIds: string[]): Promise<EvidenceRunProjection[]>;
}

export function toFindingReadModel(event: PersistedEvidenceEvent): FindingReadModel {
  const value = event.payload as Record<string, unknown>;
  const data = value.data && typeof value.data === 'object' && !Array.isArray(value.data)
    ? value.data as Record<string, unknown>
    : {};
  return {
    ...data,
    eventId: event.eventId,
    sequence: event.sequence,
    runId: event.runId,
    schoolInep: event.schoolInep ?? null,
    occurredAt: event.occurredAt,
    status: String(value.status),
    reasonCode: String(value.reasonCode),
    requiresHumanReview: value.requiresHumanReview === true,
  };
}
