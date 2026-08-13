import type {
  EvidenceEventInput,
  EvidenceIntegrityResult,
  PersistedEvidenceEvent,
} from '../core/evidence';

export interface EvidenceEventWriter {
  append(event: EvidenceEventInput): Promise<PersistedEvidenceEvent>;
}

export interface EvidenceEventStore extends EvidenceEventWriter {
  listByRun(runId: string): Promise<PersistedEvidenceEvent[]>;
  listBySchool(inep: string): Promise<PersistedEvidenceEvent[]>;
  listAll(): Promise<PersistedEvidenceEvent[]>;
  verifyIntegrity(): Promise<EvidenceIntegrityResult>;
}
