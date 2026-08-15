import { z } from 'zod';
import {
  type EvidenceRunProjection,
  type ProjectedExecutionStatus,
} from '../application/evidence-history';
import {
  toFindingReadModel,
  type ExecutionPage,
  type ExecutionReadQuery,
  type FindingReadQuery,
  type InstitutionalReadRepository,
  type SchoolEventReadQuery,
} from '../application/institutional-read-repository';
import {
  evidenceIdentifierSchema,
  evidenceSourceSchema,
} from '../core/evidence';
import { isoTimestampSchema } from '../core/time';
import { sourceObservationSchema } from '../core/source-observation';
import type { CurrentFiscalPortfolio, CurrentFiscalSchoolSnapshot, CurrentFiscalSchoolSummary } from '../application/current-fiscal-read-model';
import { mapSupabaseEvidenceEvent } from './supabase-evidence-store';

const EVENT_COLUMNS = [
  'sequence', 'event_id', 'run_id', 'event_type', 'occurred_at', 'source',
  'fiscal_year', 'school_inep', 'payload', 'previous_hash', 'event_hash',
].join(',');
const EXECUTION_COLUMNS = [
  'run_id', 'source', 'fiscal_year', 'requested_at', 'started_at', 'finished_at',
  'status', 'source_collection_run_id', 'events_count', 'attempts_count',
  'failed_attempts_count', 'artifacts_count', 'findings_count', 'human_review_count',
  'anchor_sequence',
].join(',');
// Mantém a query `in(...)` abaixo de limites usuais de URL mesmo quando cada
// identificador ocupa os 160 caracteres permitidos pelo contrato.
const CURRENT_FISCAL_SNAPSHOT_COLUMNS = [
  'fiscal_year', 'run_id', 'generated_at', 'source_generated_at',
  'source_observations', 'coverage', 'metrics',
].join(',');
const CURRENT_FISCAL_SCHOOL_COLUMNS = ['school_inep', 'sme', 'school_name', 'metrics'].join(',');
const RUN_ID_BATCH_SIZE = 40;
const projectedStatusSchema = z.enum(['QUEUED', 'RUNNING', 'COMPLETE', 'PARTIAL', 'FAILED', 'UNKNOWN']);
const currentFiscalMetricsSchema = z.object({
  schools: z.number().int().nonnegative(),
  accounts: z.number().int().nonnegative(),
  movements: z.number().int().nonnegative(),
  programmedCents: z.number().int().nonnegative(),
  paidInformedCents: z.number().int().nonnegative(),
  creditedCents: z.number().int().nonnegative(),
  reportedBalanceCents: z.number().int(),
}).strict();
const currentFiscalSchoolMetricsSchema = currentFiscalMetricsSchema.omit({ schools: true });

interface SupabaseResult {
  data: unknown;
  error: unknown;
  count?: number | null;
}

interface SupabaseQuery extends PromiseLike<SupabaseResult> {
  select(columns?: string, options?: { count?: 'exact'; head?: boolean }): SupabaseQuery;
  eq(column: string, value: unknown): SupabaseQuery;
  lt(column: string, value: number): SupabaseQuery;
  in(column: string, values: unknown[]): SupabaseQuery;
  order(column: string, options?: { ascending?: boolean }): SupabaseQuery;
  limit(value: number): SupabaseQuery;
}

interface SupabaseReadClient {
  from(table: string): SupabaseQuery;
}

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function record(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Read model institucional retornou linha inválida.');
  }
  return raw as Record<string, unknown>;
}

function integer(raw: unknown, name: string): number {
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error(`${name} inválido.`);
  return value;
}

function nullableTimestamp(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  return isoTimestampSchema.parse(raw);
}

function executionProjection(raw: unknown): { projection: EvidenceRunProjection; anchor: number } {
  const row = record(raw);
  const status: ProjectedExecutionStatus = projectedStatusSchema.parse(row.status);
  return {
    projection: {
      runId: z.string().min(1).parse(row.run_id),
      source: evidenceSourceSchema.parse(row.source),
      fiscalYear: z.number().int().min(2000).max(2100).parse(Number(row.fiscal_year)),
      requestedAt: nullableTimestamp(row.requested_at),
      startedAt: nullableTimestamp(row.started_at),
      finishedAt: nullableTimestamp(row.finished_at),
      status,
      sourceCollectionRunId: row.source_collection_run_id === null
        || row.source_collection_run_id === undefined
        ? null
        : z.string().min(1).parse(row.source_collection_run_id),
      counts: {
        events: integer(row.events_count, 'events_count'),
        attempts: integer(row.attempts_count, 'attempts_count'),
        failedAttempts: integer(row.failed_attempts_count, 'failed_attempts_count'),
        artifacts: integer(row.artifacts_count, 'artifacts_count'),
        findings: integer(row.findings_count, 'findings_count'),
        humanReview: integer(row.human_review_count, 'human_review_count'),
      },
    },
    anchor: z.number().int().positive().parse(Number(row.anchor_sequence)),
  };
}

export class SupabaseInstitutionalReadRepository implements InstitutionalReadRepository {
  private readonly client: SupabaseReadClient;
  constructor(client: unknown) {
    this.client = client as SupabaseReadClient;
  }

  async listExecutions(query: ExecutionReadQuery): Promise<ExecutionPage> {
    let request = this.client.from('execution_read_models')
      .select(EXECUTION_COLUMNS)
      .order('anchor_sequence', { ascending: false })
      .limit(query.limit + 1);
    if (query.cursor) request = request.lt('anchor_sequence', Number(query.cursor));
    const { data, error } = await request;
    if (error) throw new Error(`Read models de execuções: ${message(error)}.`);
    if (!Array.isArray(data)) throw new Error('Read models de execuções retornaram formato inválido.');
    const mapped = data.map(executionProjection);
    const page = mapped.slice(0, query.limit);
    return {
      items: page.map((item) => item.projection),
      ...(mapped.length > query.limit && page.length > 0
        ? { nextCursor: String(page.at(-1)!.anchor) }
        : {}),
    };
  }

  async listFindings(query: FindingReadQuery) {
    const applyFilters = (rawRequest: SupabaseQuery): SupabaseQuery => {
      let request = rawRequest.eq('event_type', 'FINDING_RECORDED');
      if (query.schoolInep) request = request.eq('school_inep', query.schoolInep);
      if (query.runId) request = request.eq('run_id', query.runId);
      if (query.requiresHumanReview !== undefined) {
        request = request.eq(
          'payload->>requiresHumanReview',
          String(query.requiresHumanReview),
        );
      }
      return request;
    };
    let pageRequest = applyFilters(
      this.client.from('current_finding_events').select(EVENT_COLUMNS),
    ).order('sequence', { ascending: false }).limit(query.limit + 1);
    if (query.cursor) pageRequest = pageRequest.lt('sequence', Number(query.cursor));
    const countRequest = applyFilters(
      this.client.from('current_finding_events').select('sequence', { count: 'exact', head: true }),
    );
    const [pageResult, countResult] = await Promise.all([pageRequest, countRequest]);
    const { data, error } = pageResult;
    const { error: countError, count } = countResult;
    if (error) throw new Error(`Read models de achados: ${message(error)}.`);
    if (countError) throw new Error(`Contagem de achados: ${message(countError)}.`);
    if (!Array.isArray(data)) throw new Error('Read models de achados retornaram formato inválido.');
    const mapped = data.map(mapSupabaseEvidenceEvent);
    const page = mapped.slice(0, query.limit);
    return {
      items: page.map(toFindingReadModel),
      total: Number.isSafeInteger(count) ? Number(count) : mapped.length,
      ...(mapped.length > query.limit && page.length > 0
        ? { nextCursor: String(page.at(-1)!.sequence) }
        : {}),
    };
  }

  async listSchoolEvents(query: SchoolEventReadQuery) {
    const applyFilter = (request: SupabaseQuery): SupabaseQuery => request
      .eq('school_inep', query.schoolInep);
    let pageRequest = applyFilter(
      this.client.from('evidence_events').select(EVENT_COLUMNS),
    ).order('sequence', { ascending: false }).limit(query.limit + 1);
    if (query.cursor) pageRequest = pageRequest.lt('sequence', Number(query.cursor));
    const countRequest = applyFilter(
      this.client.from('evidence_events').select('sequence', { count: 'exact', head: true }),
    );
    const [pageResult, countResult] = await Promise.all([pageRequest, countRequest]);
    if (pageResult.error) {
      throw new Error(`Read models do histórico escolar: ${message(pageResult.error)}.`);
    }
    if (countResult.error) {
      throw new Error(`Contagem do histórico escolar: ${message(countResult.error)}.`);
    }
    if (!Array.isArray(pageResult.data)) {
      throw new Error('Histórico escolar retornou formato inválido.');
    }
    const mapped = pageResult.data.map(mapSupabaseEvidenceEvent);
    const page = mapped.slice(0, query.limit);
    return {
      items: page,
      total: Number.isSafeInteger(countResult.count) ? Number(countResult.count) : mapped.length,
      ...(mapped.length > query.limit && page.length > 0
        ? { nextCursor: String(page.at(-1)!.sequence) }
        : {}),
    };
  }

  async listExecutionsByRuns(runIds: string[]): Promise<EvidenceRunProjection[]> {
    const validated = z.array(evidenceIdentifierSchema).min(1).max(100)
      .parse([...new Set(runIds)]);
    const projections: Array<ReturnType<typeof executionProjection>> = [];
    for (let offset = 0; offset < validated.length; offset += RUN_ID_BATCH_SIZE) {
      const batch = validated.slice(offset, offset + RUN_ID_BATCH_SIZE);
      const { data, error } = await this.client.from('execution_read_models')
        .select(EXECUTION_COLUMNS)
        .in('run_id', batch)
        .limit(batch.length);
      if (error) throw new Error(`Read models do histórico escolar: ${message(error)}.`);
      if (!Array.isArray(data)) throw new Error('Projeções do histórico escolar retornaram formato inválido.');
      projections.push(...data.map(executionProjection));
    }
    return projections
      .sort((left, right) => right.anchor - left.anchor)
      .map((item) => item.projection);
  }

  async getCurrentFiscalPortfolio(): Promise<CurrentFiscalPortfolio | null> {
    const snapshotResult = await this.client.from('current_fiscal_snapshots')
      .select(CURRENT_FISCAL_SNAPSHOT_COLUMNS)
      .eq('fiscal_year', 2026)
      .limit(1);
    if (snapshotResult.error) throw new Error(`Read model fiscal corrente: ${message(snapshotResult.error)}.`);
    if (!Array.isArray(snapshotResult.data)) throw new Error('Read model fiscal corrente retornou formato inválido.');
    if (snapshotResult.data.length === 0) return null;
    const snapshot = record(snapshotResult.data[0]);

    const schoolResult = await this.client.from('current_fiscal_schools')
      .select(CURRENT_FISCAL_SCHOOL_COLUMNS)
      .eq('fiscal_year', 2026)
      .order('sme', { ascending: true })
      .limit(500);
    if (schoolResult.error) throw new Error(`Read models fiscais das escolas: ${message(schoolResult.error)}.`);
    if (!Array.isArray(schoolResult.data)) throw new Error('Read models fiscais das escolas retornaram formato inválido.');
    const schools: CurrentFiscalSchoolSummary[] = schoolResult.data.map((raw) => {
      const row = record(raw);
      return {
        inep: z.string().regex(/^\d{8}$/).parse(row.school_inep),
        sme: z.string().regex(/^\d{7}$/).parse(row.sme),
        name: z.string().min(1).parse(row.school_name),
        metrics: currentFiscalSchoolMetricsSchema.parse(row.metrics),
      };
    });
    return {
      fiscalYear: z.literal(2026).parse(Number(snapshot.fiscal_year)),
      runId: evidenceIdentifierSchema.parse(snapshot.run_id),
      generatedAt: isoTimestampSchema.parse(snapshot.generated_at),
      sourceGeneratedAt: isoTimestampSchema.parse(snapshot.source_generated_at),
      sourceObservations: z.array(sourceObservationSchema).parse(snapshot.source_observations),
      coverage: z.record(z.string(), z.unknown()).parse(snapshot.coverage),
      metrics: currentFiscalMetricsSchema.parse(snapshot.metrics),
      schools,
    };
  }

  async getCurrentFiscalSchool(inep: string): Promise<CurrentFiscalSchoolSnapshot | null> {
    const validatedInep = z.string().regex(/^\d{8}$/).parse(inep);
    const result = await this.client.from('current_fiscal_schools')
      .select('snapshot')
      .eq('fiscal_year', 2026)
      .eq('school_inep', validatedInep)
      .limit(1);
    if (result.error) throw new Error(`Read model fiscal da escola: ${message(result.error)}.`);
    if (!Array.isArray(result.data)) throw new Error('Read model fiscal da escola retornou formato inválido.');
    if (result.data.length === 0) return null;
    const value = record(record(result.data[0]).snapshot);
    return {
      fiscalYear: z.literal(2026).parse(Number(value.fiscalYear)),
      runId: evidenceIdentifierSchema.parse(value.runId),
      school: z.object({
        inep: z.string().regex(/^\d{8}$/), sme: z.string().regex(/^\d{7}$/),
        name: z.string().min(1), uex: z.string(), cnpj: z.string(),
      }).strict().parse(value.school),
      repasses: z.array(z.unknown()).parse(value.repasses),
      statements: z.array(z.unknown()).parse(value.statements),
    };
  }

}
