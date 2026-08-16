import {
  financialAccountSnapshotSchema,
  type FinancialAccountSnapshot,
} from '../core/financial-snapshot';
import type { FinancialSnapshotStore } from '../application/financial-snapshot-store';

interface SupabaseResult {
  data: unknown;
  error: unknown;
}

interface SupabaseRpcClient {
  rpc(name: string, parameters?: Record<string, unknown>): PromiseLike<SupabaseResult>;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return String(error);
}

function rowOf(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw new Error('FinancialSnapshotStore: resposta inválida do Postgres.');
  }
  return row as Record<string, unknown>;
}

function cents(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new RangeError(`FinancialSnapshotStore: valor monetário fora da faixa segura: ${String(value)}.`);
  }
  return parsed;
}

function mapRow(value: unknown): FinancialAccountSnapshot {
  const row = rowOf(value);
  return financialAccountSnapshotSchema.parse({
    schoolInep: row.school_inep,
    uexCnpj: row.uex_cnpj,
    programName: row.program_name,
    bank: row.bank,
    agency: row.agency,
    account: row.account_number,
    referenceDate: row.reference_date,
    checkingBalanceCents: cents(row.checking_balance_cents),
    fundBalanceCents: cents(row.fund_balance_cents),
    savingsBalanceCents: cents(row.savings_balance_cents),
    rdbCdbBalanceCents: cents(row.rdb_cdb_balance_cents),
    investmentBalanceCents: cents(row.investment_balance_cents),
    totalReportedBalanceCents: cents(row.total_reported_balance_cents),
    source: row.source,
    collectedAt: row.collected_at,
    artifactSha256: row.artifact_sha256 ?? null,
  });
}

export class SupabaseFinancialSnapshotStore implements FinancialSnapshotStore {
  private readonly client: SupabaseRpcClient;

  constructor(client: unknown) {
    this.client = client as SupabaseRpcClient;
  }

  async append(rawSnapshot: FinancialAccountSnapshot): Promise<FinancialAccountSnapshot> {
    const snapshot = financialAccountSnapshotSchema.parse(rawSnapshot);
    const { data, error } = await this.client.rpc('append_financial_account_snapshot', {
      p_school_inep: snapshot.schoolInep,
      p_uex_cnpj: snapshot.uexCnpj,
      p_program_name: snapshot.programName,
      p_bank: snapshot.bank,
      p_agency: snapshot.agency,
      p_account_number: snapshot.account,
      p_reference_date: snapshot.referenceDate,
      p_checking_balance_cents: snapshot.checkingBalanceCents,
      p_fund_balance_cents: snapshot.fundBalanceCents,
      p_savings_balance_cents: snapshot.savingsBalanceCents,
      p_rdb_cdb_balance_cents: snapshot.rdbCdbBalanceCents,
      p_investment_balance_cents: snapshot.investmentBalanceCents,
      p_total_reported_balance_cents: snapshot.totalReportedBalanceCents,
      p_source: snapshot.source,
      p_collected_at: snapshot.collectedAt,
      p_artifact_sha256: snapshot.artifactSha256,
    });
    if (error) {
      throw new Error(`FinancialSnapshotStore: não foi possível persistir o snapshot: ${errorMessage(error)}.`);
    }
    return mapRow(data);
  }
}
