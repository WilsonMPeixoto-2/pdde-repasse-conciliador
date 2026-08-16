import { describe, expect, it, vi } from 'vitest';
import { SupabaseFinancialSnapshotStore } from '../../backend/adapters/supabase-financial-snapshot-store';

const snapshot = {
  schoolInep: '33069247',
  uexCnpj: '04500463000173',
  programName: 'PDDE QUALIDADE',
  bank: '001',
  agency: '0249',
  account: '0000546402',
  referenceDate: '2026-06-30',
  checkingBalanceCents: 0,
  fundBalanceCents: 318699,
  savingsBalanceCents: 0,
  rdbCdbBalanceCents: 0,
  investmentBalanceCents: 318699,
  totalReportedBalanceCents: 318699,
  source: 'PDDEINFO' as const,
  collectedAt: '2026-08-15T23:00:00.000Z',
  artifactSha256: 'a'.repeat(64),
};

describe('SupabaseFinancialSnapshotStore', () => {
  it('persiste snapshot via RPC sem converter centavos em ponto flutuante', async () => {
    const rpc = vi.fn(async () => ({
      data: [{
        snapshot_id: '11111111-1111-4111-8111-111111111111',
        school_inep: snapshot.schoolInep,
        uex_cnpj: snapshot.uexCnpj,
        program_name: snapshot.programName,
        bank: snapshot.bank,
        agency: snapshot.agency,
        account_number: snapshot.account,
        reference_date: snapshot.referenceDate,
        checking_balance_cents: '0',
        fund_balance_cents: '318699',
        savings_balance_cents: '0',
        rdb_cdb_balance_cents: '0',
        investment_balance_cents: '318699',
        total_reported_balance_cents: '318699',
        source: 'PDDEINFO',
        collected_at: snapshot.collectedAt,
        artifact_sha256: snapshot.artifactSha256,
      }],
      error: null,
    }));
    const store = new SupabaseFinancialSnapshotStore({ rpc });
    const persisted = await store.append(snapshot);

    expect(rpc).toHaveBeenCalledWith('append_financial_account_snapshot', expect.objectContaining({
      p_fund_balance_cents: 318699,
      p_reference_date: '2026-06-30',
      p_source: 'PDDEINFO',
    }));
    expect(persisted).toEqual(snapshot);
  });

  it('propaga conflito de posição lógica como falha explícita', async () => {
    const store = new SupabaseFinancialSnapshotStore({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'snapshot financeiro conflitante' } })),
    });
    await expect(store.append(snapshot)).rejects.toThrow(/conflitante/i);
  });
});
