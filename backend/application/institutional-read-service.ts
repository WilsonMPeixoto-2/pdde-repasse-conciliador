import { z } from 'zod';
import type {
  PersistedEvidenceEvent,
} from '../core/evidence';
import { evidenceIdentifierSchema } from '../core/evidence';
import type { EvidenceEventStore } from './evidence-store';
import {
  projectEvidenceRun,
  type EvidenceRunProjection,
} from './evidence-history';
import {
  toFindingReadModel,
  type ExecutionPage,
  type FindingReadModel,
  type InstitutionalReadRepository,
} from './institutional-read-repository';

export type { ExecutionPage, FindingReadModel } from './institutional-read-repository';

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();
const cursorSchema = z.string().max(16, 'cursor excede 16 caracteres')
  .regex(/^(?:0|[1-9]\d*)$/, 'cursor inválido')
  .refine((value) => Number.isSafeInteger(Number(value)), 'cursor fora da faixa segura');
const pageQuerySchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: cursorSchema.optional(),
}).strict();

export type InstitutionalSchool = z.infer<typeof schoolSchema>;

export interface ArtifactReadModel {
  eventId: string;
  sequence: number;
  runId: string;
  schoolInep: string | null;
  occurredAt: string;
  kind: string;
  provider: 'LOCAL' | 'SUPABASE_STORAGE';
  bucket: string | null;
  path: string;
  sha256: string;
  bytes: number;
  mediaType: string | null;
  metadata: Record<string, unknown>;
}

function payload(event: PersistedEvidenceEvent): Record<string, unknown> {
  return event.payload as Record<string, unknown>;
}

function groupByRun(events: PersistedEvidenceEvent[]): Map<string, PersistedEvidenceEvent[]> {
  const groups = new Map<string, PersistedEvidenceEvent[]>();
  for (const event of events) {
    const existing = groups.get(event.runId) ?? [];
    existing.push(event);
    groups.set(event.runId, existing);
  }
  return groups;
}

function artifactModel(event: PersistedEvidenceEvent): ArtifactReadModel {
  const value = payload(event);
  return {
    eventId: event.eventId,
    sequence: event.sequence,
    runId: event.runId,
    schoolInep: event.schoolInep ?? null,
    occurredAt: event.occurredAt,
    kind: String(value.kind),
    provider: value.provider === 'SUPABASE_STORAGE' ? 'SUPABASE_STORAGE' : 'LOCAL',
    bucket: typeof value.bucket === 'string' ? value.bucket : null,
    path: String(value.path),
    sha256: String(value.sha256),
    bytes: Number(value.bytes),
    mediaType: typeof value.mediaType === 'string' ? value.mediaType : null,
    metadata: value.metadata && typeof value.metadata === 'object' && !Array.isArray(value.metadata)
      ? value.metadata as Record<string, unknown>
      : {},
  };
}

export class InstitutionalReadService {
  private readonly schools: InstitutionalSchool[];
  private readonly schoolByInep: Map<string, InstitutionalSchool>;

  constructor(
    private readonly store: EvidenceEventStore,
    rawSchools: InstitutionalSchool[],
    private readonly repository?: InstitutionalReadRepository,
  ) {
    this.schools = z.array(schoolSchema).min(1).parse(rawSchools);
    this.schoolByInep = new Map(this.schools.map((school) => [school.inep, school]));
    if (this.schoolByInep.size !== this.schools.length) {
      throw new Error('Catálogo institucional contém INEP duplicado.');
    }
  }

  listSchools(): { items: InstitutionalSchool[]; total: number } {
    return { items: [...this.schools], total: this.schools.length };
  }

  getSchool(inep: string): InstitutionalSchool | null {
    z.string().regex(/^\d{8}$/, 'INEP inválido').parse(inep);
    return this.schoolByInep.get(inep) ?? null;
  }

  async getSchoolHistory(
    inep: string,
    rawQuery: { limit?: number; cursor?: string } = {},
  ): Promise<{
    school: InstitutionalSchool;
    events: PersistedEvidenceEvent[];
    executions: EvidenceRunProjection[];
    total: number;
    nextCursor?: string;
  } | null> {
    const school = this.getSchool(inep);
    if (!school) return null;
    const query = pageQuerySchema.parse(rawQuery);
    if (this.repository) {
      const page = await this.repository.listSchoolEvents({ schoolInep: inep, ...query });
      if (page.items.length === 0) {
        return {
          school,
          events: [],
          executions: [],
          total: page.total,
        };
      }
      const runIds = [...new Set(page.items.map((event) => event.runId))];
      return {
        school,
        events: page.items,
        executions: await this.repository.listExecutionsByRuns(runIds),
        total: page.total,
        ...(page.nextCursor ? { nextCursor: page.nextCursor } : {}),
      };
    }

    const allSchoolEvents = (await this.store.listBySchool(inep)).sort(
      (left, right) => right.sequence - left.sequence,
    );
    const cursor = query.cursor ? Number(query.cursor) : Number.POSITIVE_INFINITY;
    const eligible = allSchoolEvents.filter((event) => event.sequence < cursor);
    const events = eligible.slice(0, query.limit);
    if (events.length === 0) {
      return { school, events: [], executions: [], total: allSchoolEvents.length };
    }
    const runIds = new Set(events.map((event) => event.runId));
    const allGroups = groupByRun((await this.store.listAll()).filter(
      (event) => runIds.has(event.runId),
    ));
    const executions = [...runIds]
      .map((runId) => projectEvidenceRun(runId, allGroups.get(runId) ?? []))
      .filter((run): run is EvidenceRunProjection => run !== null)
      .sort((left, right) => (
        Date.parse(right.startedAt ?? right.requestedAt ?? '')
        - Date.parse(left.startedAt ?? left.requestedAt ?? '')
      ));
    return {
      school,
      events,
      executions,
      total: allSchoolEvents.length,
      ...(eligible.length > query.limit
        ? { nextCursor: String(events.at(-1)!.sequence) }
        : {}),
    };
  }

  async listExecutions(rawQuery: { limit?: number; cursor?: string } = {}): Promise<ExecutionPage> {
    const query = pageQuerySchema.parse(rawQuery);
    if (this.repository) return this.repository.listExecutions(query);
    const groups = groupByRun(await this.store.listAll());
    const projected = [...groups.entries()].flatMap(([runId, events]) => {
      const execution = projectEvidenceRun(runId, events);
      if (!execution) return [];
      return [{ execution, anchor: Math.max(...events.map((event) => event.sequence)) }];
    }).sort((left, right) => right.anchor - left.anchor);
    const cursor = query.cursor ? Number(query.cursor) : Number.POSITIVE_INFINITY;
    const eligible = projected.filter((item) => item.anchor < cursor);
    const page = eligible.slice(0, query.limit);
    return {
      items: page.map((item) => item.execution),
      ...(eligible.length > query.limit && page.length > 0
        ? { nextCursor: String(page.at(-1)!.anchor) }
        : {}),
    };
  }

  async getExecution(runId: string): Promise<{
    execution: EvidenceRunProjection;
    events: PersistedEvidenceEvent[];
    findings: PersistedEvidenceEvent[];
    artifacts: PersistedEvidenceEvent[];
  } | null> {
    const validatedRunId = evidenceIdentifierSchema.parse(runId);
    const events = (await this.store.listByRun(validatedRunId)).sort(
      (left, right) => left.sequence - right.sequence,
    );
    const execution = projectEvidenceRun(validatedRunId, events);
    if (!execution) return null;
    return {
      execution,
      events,
      findings: events.filter((event) => event.type === 'FINDING_RECORDED'),
      artifacts: events.filter((event) => event.type === 'ARTIFACT_PRESERVED'),
    };
  }

  async listFindings(rawQuery: {
    limit?: number;
    cursor?: string;
    schoolInep?: string;
    runId?: string;
    requiresHumanReview?: boolean;
  } = {}): Promise<{ items: FindingReadModel[]; total: number; nextCursor?: string }> {
    const page = pageQuerySchema.parse({ limit: rawQuery.limit, cursor: rawQuery.cursor });
    if (rawQuery.schoolInep) z.string().regex(/^\d{8}$/, 'INEP inválido').parse(rawQuery.schoolInep);
    const runId = rawQuery.runId === undefined
      ? undefined
      : evidenceIdentifierSchema.parse(rawQuery.runId);
    if (this.repository) {
      return this.repository.listFindings({
        ...page,
        ...(rawQuery.schoolInep ? { schoolInep: rawQuery.schoolInep } : {}),
        ...(runId ? { runId } : {}),
        ...(rawQuery.requiresHumanReview === undefined
          ? {}
          : { requiresHumanReview: rawQuery.requiresHumanReview }),
      });
    }
    const cursor = page.cursor ? Number(page.cursor) : Number.POSITIVE_INFINITY;
    const filtered = (await this.store.listAll())
      .filter((event) => event.type === 'FINDING_RECORDED')
      .filter((event) => !rawQuery.schoolInep || event.schoolInep === rawQuery.schoolInep)
      .filter((event) => !runId || event.runId === runId)
      .filter((event) => rawQuery.requiresHumanReview === undefined
        || payload(event).requiresHumanReview === rawQuery.requiresHumanReview)
      .sort((left, right) => right.sequence - left.sequence);
    const eligible = filtered.filter((event) => event.sequence < cursor);
    const items = eligible.slice(0, page.limit);
    return {
      items: items.map(toFindingReadModel),
      total: filtered.length,
      ...(eligible.length > page.limit && items.length > 0
        ? { nextCursor: String(items.at(-1)!.sequence) }
        : {}),
    };
  }

  async listArtifacts(runId: string): Promise<ArtifactReadModel[]> {
    const validatedRunId = evidenceIdentifierSchema.parse(runId);
    return (await this.store.listByRun(validatedRunId))
      .filter((event) => event.type === 'ARTIFACT_PRESERVED')
      .sort((left, right) => right.sequence - left.sequence)
      .map(artifactModel);
  }
}
