import { describe, expect, test } from 'vitest';
import { SupabaseInstitutionalReadRepository } from '../../backend/adapters/supabase-institutional-read-repository';

type Row = Record<string, unknown>;

const eventRows: Row[] = [
  {
    sequence: 9, event_id: 'finding-b-current', run_id: 'run-b', event_type: 'FINDING_RECORDED',
    occurred_at: '2026-08-13T11:04:00Z', source: 'CONCILIADOR', fiscal_year: 2026,
    school_inep: '33069247', previous_hash: 'd'.repeat(64), event_hash: 'e'.repeat(64),
    payload: {
      status: 'REPASSE_CONFIRMADO', reasonCode: 'EXACT_MATCH',
      requiresHumanReview: false, data: { amountPaidCents: 600_000 },
    },
  },
  {
    sequence: 8, event_id: 'start-b-2', run_id: 'run-b', event_type: 'EXECUTION_STARTED',
    occurred_at: '2026-08-13T11:03:00Z', source: 'CONCILIADOR', fiscal_year: 2026,
    school_inep: null, previous_hash: 'b'.repeat(64), event_hash: 'd'.repeat(64),
    payload: { attempt: 2 },
  },
  {
    sequence: 7, event_id: 'finding-b', run_id: 'run-b', event_type: 'FINDING_RECORDED',
    occurred_at: '2026-08-13T11:02:00Z', source: 'CONCILIADOR', fiscal_year: 2026,
    school_inep: '33069247', previous_hash: 'a'.repeat(64), event_hash: 'b'.repeat(64),
    payload: {
      status: 'DIVERGENCIA_REVISAO_NECESSARIA', reasonCode: 'ACCOUNT_MISMATCH',
      requiresHumanReview: true, data: { amountPaidCents: 506_500 },
    },
  },
  {
    sequence: 6, event_id: 'start-b', run_id: 'run-b', event_type: 'EXECUTION_STARTED',
    occurred_at: '2026-08-13T11:01:00Z', source: 'CONCILIADOR', fiscal_year: 2026,
    school_inep: null, previous_hash: null, event_hash: 'c'.repeat(64), payload: {},
  },
];
const currentFindingRows = eventRows.filter((row) => row.event_id === 'finding-b-current');
const executionRows: Row[] = [
  {
    run_id: 'run-b', source: 'CONCILIADOR', fiscal_year: 2026,
    requested_at: '2026-08-13T11:00:00Z', started_at: '2026-08-13T11:01:00Z',
    finished_at: null, status: 'RUNNING', source_collection_run_id: 'run-a',
    events_count: 3, attempts_count: 0, failed_attempts_count: 0,
    artifacts_count: 0, findings_count: 1, human_review_count: 1, anchor_sequence: 7,
  },
  {
    run_id: 'run-a', source: 'PDDEINFO', fiscal_year: 2026,
    requested_at: '2026-08-13T10:00:00Z', started_at: '2026-08-13T10:01:00Z',
    finished_at: '2026-08-13T10:03:00Z', status: 'COMPLETE', source_collection_run_id: null,
    events_count: 5, attempts_count: 1, failed_attempts_count: 0,
    artifacts_count: 1, findings_count: 0, human_review_count: 0, anchor_sequence: 5,
  },
];

const humanSnapshotRows: Row[] = [{
  fiscal_year: 2026,
  run_id: 'run-human',
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  reference_label: 'Posição financeira pública disponível até 30/06/2026',
  school_count: 1,
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 500_000,
    paymentInformedCents: 500_000,
    creditLocatedCents: 500_000,
    reportedBalanceCents: 0,
    applicationsCents: 0,
  },
  sources: [{ name: 'PDDEInfo', information: 'Dados financeiros.' }],
  indicators: [],
}];

const humanSchoolRows: Row[] = [{
  fiscal_year: 2026,
  school_inep: '33069247',
  sme: '0410001',
  school_name: 'EM EMA NEGRAO DE LIMA',
  summary: {
    inep: '33069247',
    sme: '0410001',
    name: 'EM EMA NEGRAO DE LIMA',
    programmedCents: 500_000,
    paymentInformedCents: 500_000,
    creditLocatedCents: 500_000,
    knownBalanceCents: 0,
    referenceDate: '2026-06-30',
    accountsTotal: 1,
    accountsWithReferencePosition: 1,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  },
}];

class FakeQuery implements PromiseLike<{ data: Row[]; error: null; count: number }> {
  private filters: Array<(row: Row) => boolean> = [];
  private maximum = 1_000;
  private ascending = true;
  constructor(private readonly rows: Row[]) {}
  select() { return this; }
  eq(column: string, value: unknown) {
    this.filters.push((row) => {
      if (column === 'payload->>requiresHumanReview') {
        return String((row.payload as Row).requiresHumanReview) === value;
      }
      return row[column] === value;
    });
    return this;
  }
  lt(column: string, value: number) {
    this.filters.push((row) => Number(row[column]) < value);
    return this;
  }
  in(column: string, values: unknown[]) {
    if (values.length > 40) throw new Error('lote de IN excede 40 valores');
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  order(_column: string, options?: { ascending?: boolean }) {
    this.ascending = options?.ascending ?? true;
    return this;
  }
  limit(value: number) { this.maximum = value; return this; }
  then<TResult1 = { data: Row[]; error: null; count: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null; count: number }) => TResult1 | PromiseLike<TResult1>) | null,
    _onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const filtered = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    const key = 'anchor_sequence' in (filtered[0] ?? {}) ? 'anchor_sequence' : 'sequence';
    const sorted = [...filtered].sort((left, right) => (
      Number(left[key]) - Number(right[key])
    ) * (this.ascending ? 1 : -1));
    return Promise.resolve({ data: sorted.slice(0, this.maximum), error: null, count: filtered.length })
      .then(onfulfilled ?? undefined);
  }
}

class FakeClient {
  constructor(private readonly legacyHumanSummary = false) {}
  from(table: string) {
    if (table === 'execution_read_models') return new FakeQuery(executionRows);
    if (table === 'current_finding_events') return new FakeQuery(currentFindingRows);
    if (table === 'evidence_events') return new FakeQuery(eventRows);
    if (table === 'current_human_financial_snapshots') return new FakeQuery(humanSnapshotRows);
    if (table === 'current_human_financial_schools') {
      return new FakeQuery(this.legacyHumanSummary
        ? humanSchoolRows.map((row) => ({ ...row, summary: null }))
        : humanSchoolRows);
    }
    throw new Error(`Tabela inesperada: ${table}`);
  }
}

describe('SupabaseInstitutionalReadRepository', () => {
  test('pagina projeções de execução no Postgres sem carregar eventos no Node', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());
    await expect(repository.listExecutions({ limit: 1 })).resolves.toEqual({
      items: [expect.objectContaining({
        runId: 'run-b', status: 'RUNNING', sourceCollectionRunId: 'run-a',
        counts: { events: 3, attempts: 0, failedAttempts: 0, artifacts: 0, findings: 1, humanReview: 1 },
      })],
      nextCursor: '7',
    });
    await expect(repository.listExecutions({ limit: 1, cursor: '7' })).resolves.toEqual({
      items: [expect.objectContaining({ runId: 'run-a', status: 'COMPLETE' })],
    });
  });

  test('filtra e pagina achados no servidor preservando centavos inteiros', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());
    await expect(repository.listFindings({
      limit: 10, schoolInep: '33069247', runId: 'run-b', requiresHumanReview: false,
    })).resolves.toEqual({
      items: [expect.objectContaining({
        eventId: 'finding-b-current', reasonCode: 'EXACT_MATCH', amountPaidCents: 600_000,
      })],
      total: 1,
    });

    await expect(repository.listFindings({ limit: 10, cursor: '7' })).resolves.toEqual({
      items: [],
      total: 1,
    });
  });

  test('pagina eventos escolares e consulta suas projeções sem varrer os runs', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());

    await expect(repository.listSchoolEvents({
      schoolInep: '33069247', limit: 1,
    })).resolves.toEqual({
      items: [expect.objectContaining({ eventId: 'finding-b-current', sequence: 9 })],
      total: 2,
      nextCursor: '9',
    });
    await expect(repository.listExecutionsByRuns(['run-b'])).resolves.toEqual([
      expect.objectContaining({ runId: 'run-b', status: 'RUNNING' }),
    ]);
  });

  test('divide em lotes as projeções dos runs presentes na página do histórico', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());
    const runIds = [
      'run-b',
      ...Array.from({ length: 99 }, (_, index) => `history-${index}`),
      'run-b',
    ];

    await expect(repository.listExecutionsByRuns(runIds)).resolves.toEqual([
      expect.objectContaining({ runId: 'run-b', status: 'RUNNING' }),
    ]);
  });

  test('lê o resumo compacto da carteira sem carregar o snapshot completo da escola', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());
    await expect(repository.getCurrentHumanPortfolio()).resolves.toEqual(expect.objectContaining({
      schoolCount: 1,
      schools: [expect.objectContaining({
        inep: '33069247',
        programmedCents: 500_000,
        knownBalanceCents: 0,
        accountsWithReferencePosition: 1,
      })],
    }));
  });

  test('trata retrato legado sem summary como ainda não pronto em vez de fabricar zeros', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient(true));
    await expect(repository.getCurrentHumanPortfolio()).resolves.toBeNull();
  });
});
