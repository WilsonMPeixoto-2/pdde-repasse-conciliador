import { createHash } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import { SupabaseEvidenceStore } from '../../backend/adapters/supabase-evidence-store';
import type { EvidenceEventInput } from '../../backend/core/evidence';
import { evidenceStoreContract } from '../support/evidence-store-contract';

type Row = Record<string, unknown>;

class FakeQuery implements PromiseLike<{ data: Row[]; error: null }> {
  private filters: Array<(row: Row) => boolean> = [];
  private maximum = 1_000;

  constructor(private readonly rows: Row[]) {}

  select(): this {
    return this;
  }

  eq(column: string, value: unknown): this {
    this.filters.push((row) => row[column] === value);
    return this;
  }

  gt(column: string, value: number): this {
    this.filters.push((row) => Number(row[column]) > value);
    return this;
  }

  order(): this {
    return this;
  }

  limit(value: number): this {
    this.maximum = value;
    return this;
  }

  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const data = this.rows
      .filter((row) => this.filters.every((filter) => filter(row)))
      .sort((left, right) => Number(left.sequence) - Number(right.sequence))
      .slice(0, this.maximum);
    return Promise.resolve({ data, error: null }).then(onfulfilled ?? undefined);
  }
}

class FakeSupabaseEvidenceClient {
  readonly rows: Row[] = [];

  from(table: string): FakeQuery {
    expect(table).toBe('evidence_events');
    return new FakeQuery(this.rows);
  }

  async rpc(name: string, parameters?: Record<string, unknown>) {
    if (name === 'verify_evidence_chain') {
      return { data: [{ valid: true, events: this.rows.length, broken_at_sequence: null, reason: null }], error: null };
    }
    expect(name).toBe('append_evidence_event');
    const input = parameters ?? {};
    if (this.rows.some((row) => row.event_id === input.p_event_id)) {
      return { data: null, error: { message: `eventId duplicado: ${String(input.p_event_id)}` } };
    }
    const previous = this.rows.at(-1);
    const sequence = this.rows.length + 1;
    const previousHash = previous ? String(previous.event_hash) : null;
    const eventHash = createHash('sha256')
      .update(JSON.stringify({ sequence, previousHash, input }))
      .digest('hex');
    const row = {
      sequence,
      event_id: input.p_event_id,
      run_id: input.p_run_id,
      event_type: input.p_event_type,
      occurred_at: input.p_occurred_at,
      source: input.p_source,
      fiscal_year: input.p_fiscal_year,
      school_inep: input.p_school_inep ?? null,
      payload: input.p_payload ?? {},
      previous_hash: previousHash,
      event_hash: eventHash,
    };
    this.rows.push(row);
    return { data: row, error: null };
  }
}

evidenceStoreContract('Supabase/Postgres', async () => (
  new SupabaseEvidenceStore(new FakeSupabaseEvidenceClient())
));

describe('SupabaseEvidenceStore', () => {
  test('valida antes do RPC e traduz falhas com contexto operacional', async () => {
    const client = new FakeSupabaseEvidenceClient();
    const store = new SupabaseEvidenceStore(client);

    await expect(store.append({
      eventId: 'evento inválido com espaços',
      runId: 'run-valid',
      type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T12:00:00-03:00',
      source: 'PDDEINFO',
      fiscalYear: 2026,
      payload: {},
    } as EvidenceEventInput)).rejects.toThrow(/identificador/i);

    client.rpc = async () => ({ data: null, error: { message: 'database unavailable' } });
    await expect(store.verifyIntegrity()).resolves.toMatchObject({
      valid: false,
      reason: expect.stringMatching(/postgres.*database unavailable/i),
    });
  });
});
