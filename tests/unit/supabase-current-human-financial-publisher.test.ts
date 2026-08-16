import { describe, expect, it, vi } from 'vitest';
import { SupabaseCurrentHumanFinancialPublisher } from '../../backend/adapters/supabase-current-human-financial-publisher';

const human = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  sources: [{ name: 'PDDEInfo', information: 'Repasses informados e saldos.' }],
  indicators: [{ label: 'Informação parcial', count: 0, units: [] }],
  schools: [{
    school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102' },
    programs: [], accounts: [], accounting: [], followUp: [],
  }],
};

describe('SupabaseCurrentHumanFinancialPublisher', () => {
  it('publica somente o snapshot humano preparado e nunca um modelo técnico', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const publisher = new SupabaseCurrentHumanFinancialPublisher({ rpc });
    await publisher.publish({
      runId: 'monitoring-full-2026',
      expectedSchoolCount: 1,
      human,
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('publish_current_human_financial_snapshot', expect.objectContaining({
      p_run_id: 'monitoring-full-2026',
      p_snapshot: expect.objectContaining({
        portfolio: expect.objectContaining({ fiscalYear: 2026, schoolCount: 1 }),
      }),
    }));
    const serialized = JSON.stringify(rpc.mock.calls[0]);
    expect(serialized).not.toMatch(/sha256|parser|sourceUrl|pagesFetched|technicalClassification|requestHash|payload/i);
  });

  it('propaga falha do banco como erro explícito', async () => {
    const publisher = new SupabaseCurrentHumanFinancialPublisher({
      rpc: vi.fn(async () => ({ data: null, error: { message: 'falha de teste' } })),
    });
    await expect(publisher.publish({
      runId: 'monitoring-full-2026', expectedSchoolCount: 1, human,
    })).rejects.toThrow(/falha de teste/);
  });
});
