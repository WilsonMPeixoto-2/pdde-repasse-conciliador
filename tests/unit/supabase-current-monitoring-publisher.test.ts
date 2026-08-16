import { describe, expect, it, vi } from 'vitest';
import { SupabaseCurrentMonitoringPublisher } from '../../backend/adapters/supabase-current-monitoring-publisher';

const fiscal = {
  version: 1,
  generatedAt: '2026-08-15T03:19:47Z',
  sourceGeneratedAt: '2026-08-15T03:19:47Z',
  fiscalYear: 2026,
  sourceStatus: 'COMPLETE',
  sources: ['PDDEINFO', 'SIGEF_EXTRATO'],
  sourceObservations: [],
  coverage: {},
  presentation: {},
  schools: [{
    school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102' },
    repasses: [], statements: [],
  }],
};

const human = {
  title: 'Inteligência Financeira PDDE | 4ª CRE', fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  sources: [{ name: 'PDDEInfo', information: 'Repasses informados e saldos.' }],
  indicators: [{ label: 'Informação parcial', count: 0, units: [] }],
  schools: [{
    school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102' },
    programs: [], accounts: [], accounting: [], followUp: [],
  }],
};

describe('SupabaseCurrentMonitoringPublisher', () => {
  it('envia fiscal e humano no mesmo RPC transacional e com o mesmo run_id', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const publisher = new SupabaseCurrentMonitoringPublisher({ rpc });
    await publisher.publish({
      runId: 'monitoring-full-2026',
      expectedSchoolCount: 1,
      fiscal,
      human,
    });

    expect(rpc).toHaveBeenCalledOnce();
    expect(rpc).toHaveBeenCalledWith('publish_current_monitoring_snapshot', {
      p_run_id: 'monitoring-full-2026',
      p_fiscal_snapshot: expect.objectContaining({
        portfolio: expect.objectContaining({ runId: 'monitoring-full-2026', fiscalYear: 2026 }),
      }),
      p_human_snapshot: expect.objectContaining({
        portfolio: expect.objectContaining({ runId: 'monitoring-full-2026', fiscalYear: 2026 }),
      }),
    });
  });

  it('não chama o banco quando um dos read models é inválido', async () => {
    const rpc = vi.fn(async () => ({ data: null, error: null }));
    const publisher = new SupabaseCurrentMonitoringPublisher({ rpc });
    await expect(publisher.publish({
      runId: 'monitoring-full-2026',
      expectedSchoolCount: 1,
      fiscal,
      human: { ...human, fiscalYear: 2025 },
    })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});
