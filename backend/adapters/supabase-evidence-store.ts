import {
  evidenceEventInputSchema,
  persistedEvidenceEventSchema,
  type EvidenceEventInput,
  type EvidenceIntegrityResult,
  type PersistedEvidenceEvent,
} from '../core/evidence';
import type { EvidenceEventStore } from '../application/evidence-store';

const SELECT_COLUMNS = [
  'sequence',
  'event_id',
  'run_id',
  'event_type',
  'occurred_at',
  'source',
  'fiscal_year',
  'school_inep',
  'payload',
  'previous_hash',
  'event_hash',
].join(',');
const PAGE_SIZE = 1_000;

interface SupabaseResult {
  data: unknown;
  error: unknown;
}

interface SupabaseQuery extends PromiseLike<SupabaseResult> {
  select(columns?: string): SupabaseQuery;
  eq(column: string, value: unknown): SupabaseQuery;
  gt(column: string, value: number): SupabaseQuery;
  order(column?: string, options?: { ascending?: boolean }): SupabaseQuery;
  limit(value: number): SupabaseQuery;
}

interface SupabaseEvidenceClient {
  rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<SupabaseResult>;
  from(table: string): SupabaseQuery;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    return String(error.message);
  }
  return String(error);
}

function asRecord(value: unknown, context: string): Record<string, unknown> {
  const candidate = Array.isArray(value) ? value[0] : value;
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    throw new Error(`${context}: resposta vazia ou inválida do Postgres.`);
  }
  return candidate as Record<string, unknown>;
}

export function mapSupabaseEvidenceEvent(raw: unknown): PersistedEvidenceEvent {
  const row = asRecord(raw, 'Evento de evidência inválido');
  return persistedEvidenceEventSchema.parse({
    sequence: Number(row.sequence),
    eventId: row.event_id,
    runId: row.run_id,
    type: row.event_type,
    occurredAt: row.occurred_at,
    source: row.source,
    fiscalYear: Number(row.fiscal_year),
    ...(row.school_inep === null || row.school_inep === undefined
      ? {}
      : { schoolInep: row.school_inep }),
    payload: row.payload,
    previousHash: row.previous_hash ?? null,
    eventHash: row.event_hash,
  });
}

/**
 * Adaptador exclusivo de infraestrutura. O domínio conhece somente
 * EvidenceEventStore; o SDK Supabase é injetado neste limite.
 */
export class SupabaseEvidenceStore implements EvidenceEventStore {
  private readonly client: SupabaseEvidenceClient;

  constructor(client: unknown) {
    this.client = client as SupabaseEvidenceClient;
  }

  async append(rawEvent: EvidenceEventInput): Promise<PersistedEvidenceEvent> {
    const event = evidenceEventInputSchema.parse(rawEvent);
    const { data, error } = await this.client.rpc('append_evidence_event', {
      p_event_id: event.eventId,
      p_run_id: event.runId,
      p_event_type: event.type,
      p_occurred_at: event.occurredAt,
      p_source: event.source,
      p_fiscal_year: event.fiscalYear,
      p_school_inep: event.schoolInep ?? null,
      p_payload: event.payload,
    });
    if (error) {
      throw new Error(`PostgresEvidenceStore: não foi possível anexar o evento: ${errorMessage(error)}.`);
    }
    return mapSupabaseEvidenceEvent(data);
  }

  listByRun(runId: string): Promise<PersistedEvidenceEvent[]> {
    if (!runId) return Promise.reject(new Error('runId é obrigatório para listar evidências.'));
    return this.listPaginated((query) => query.eq('run_id', runId));
  }

  listBySchool(inep: string): Promise<PersistedEvidenceEvent[]> {
    if (!/^\d{8}$/.test(inep)) {
      return Promise.reject(new Error(`INEP inválido para listar evidências: ${inep}.`));
    }
    return this.listPaginated((query) => query.eq('school_inep', inep));
  }

  listAll(): Promise<PersistedEvidenceEvent[]> {
    return this.listPaginated((query) => query);
  }

  async verifyIntegrity(): Promise<EvidenceIntegrityResult> {
    try {
      const { data, error } = await this.client.rpc('verify_evidence_chain');
      if (error) {
        return {
          valid: false,
          events: 0,
          brokenAtSequence: 1,
          reason: `PostgresEvidenceStore: ${errorMessage(error)}`,
        };
      }
      const row = asRecord(data, 'Verificação da cadeia inválida');
      const events = Number(row.events ?? 0);
      const brokenAt = row.broken_at_sequence;
      return {
        valid: row.valid === true,
        events: Number.isSafeInteger(events) ? events : 0,
        ...(brokenAt === null || brokenAt === undefined
          ? {}
          : { brokenAtSequence: Number(brokenAt) }),
        ...(typeof row.reason === 'string' && row.reason.length > 0
          ? { reason: row.reason }
          : {}),
      };
    } catch (cause) {
      return {
        valid: false,
        events: 0,
        brokenAtSequence: 1,
        reason: `PostgresEvidenceStore: ${errorMessage(cause)}`,
      };
    }
  }

  private async listPaginated(
    applyFilter: (query: SupabaseQuery) => SupabaseQuery,
  ): Promise<PersistedEvidenceEvent[]> {
    const events: PersistedEvidenceEvent[] = [];
    let cursor = 0;

    while (true) {
      let query = this.client.from('evidence_events').select(SELECT_COLUMNS);
      query = applyFilter(query);
      const { data, error } = await query
        .gt('sequence', cursor)
        .order('sequence', { ascending: true })
        .limit(PAGE_SIZE);
      if (error) {
        throw new Error(`PostgresEvidenceStore: falha ao listar eventos: ${errorMessage(error)}.`);
      }
      if (!Array.isArray(data)) {
        throw new Error('PostgresEvidenceStore: listagem retornou formato inválido.');
      }
      const page = data.map(mapSupabaseEvidenceEvent);
      events.push(...page);
      if (page.length < PAGE_SIZE) break;
      const nextCursor = page.at(-1)?.sequence;
      if (!nextCursor || nextCursor <= cursor) {
        throw new Error('PostgresEvidenceStore: cursor de paginação não avançou.');
      }
      cursor = nextCursor;
    }

    return events;
  }
}
