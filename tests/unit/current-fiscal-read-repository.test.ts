import { describe, expect, test } from 'vitest';
import { SupabaseInstitutionalReadRepository } from '../../backend/adapters/supabase-institutional-read-repository';

type Row = Record<string, unknown>;

const snapshotRows: Row[] = [{
  fiscal_year: 2026,
  run_id: 'monitoring-full-2026',
  generated_at: '2026-08-15T03:19:47Z',
  source_generated_at: '2026-08-15T03:19:47Z',
  source_observations: [{ source: 'SIGEF_EXTRATO', collectionStatus: 'COMPLETE' }],
  coverage: { requestedSchools: 163 },
  metrics: { schools: 163, accounts: 284, movements: 394 },
}];
const schoolRows: Row[] = [{
  fiscal_year: 2026,
  school_inep: '33069247',
  run_id: 'monitoring-full-2026',
  sme: '0410001',
  school_name: 'ESCOLA A',
  metrics: { accounts: 2, movements: 4 },
  snapshot: {
    fiscalYear: 2026,
    runId: 'monitoring-full-2026',
    school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A' },
    repasses: [],
    statements: [],
  },
}];

class FakeQuery implements PromiseLike<{ data: Row[]; error: null }> {
  private filters: Array<(row: Row) => boolean> = [];
  private maximum = 1000;
  private orderColumn: string | null = null;
  private ascending = true;
  constructor(private readonly rows: Row[]) {}
  select() { return this; }
  eq(column: string, value: unknown) { this.filters.push((row) => row[column] === value); return this; }
  order(column: string, options?: { ascending?: boolean }) {
    this.orderColumn = column;
    this.ascending = options?.ascending ?? true;
    return this;
  }
  limit(value: number) { this.maximum = value; return this; }
  then<TResult1 = { data: Row[]; error: null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[]; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    let data = this.rows.filter((row) => this.filters.every((filter) => filter(row)));
    if (this.orderColumn) {
      const key = this.orderColumn;
      data = [...data].sort((a, b) => String(a[key]).localeCompare(String(b[key])) * (this.ascending ? 1 : -1));
    }
    return Promise.resolve({ data: data.slice(0, this.maximum), error: null }).then(onfulfilled ?? undefined);
  }
}

class FakeClient {
  from(table: string) {
    if (table === 'current_fiscal_snapshots') return new FakeQuery(snapshotRows);
    if (table === 'current_fiscal_schools') return new FakeQuery(schoolRows);
    throw new Error(`Tabela inesperada: ${table}`);
  }
}

describe('read model fiscal corrente no Supabase', () => {
  test('entrega carteira e prontuário da publicação corrente de 2026', async () => {
    const repository = new SupabaseInstitutionalReadRepository(new FakeClient());
    const portfolioMethod = (repository as any).getCurrentFiscalPortfolio;
    const schoolMethod = (repository as any).getCurrentFiscalSchool;
    expect(typeof portfolioMethod).toBe('function');
    expect(typeof schoolMethod).toBe('function');
    if (typeof portfolioMethod !== 'function' || typeof schoolMethod !== 'function') return;

    await expect(portfolioMethod.call(repository)).resolves.toMatchObject({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      metrics: { schools: 163, accounts: 284, movements: 394 },
      schools: [{ inep: '33069247', sme: '0410001', name: 'ESCOLA A' }],
    });
    await expect(schoolMethod.call(repository, '33069247')).resolves.toMatchObject({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      school: { inep: '33069247' },
    });
    await expect(schoolMethod.call(repository, '99999999')).resolves.toBeNull();
  });
});
