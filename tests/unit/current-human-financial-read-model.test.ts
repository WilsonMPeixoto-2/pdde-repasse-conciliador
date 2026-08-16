import { describe, expect, it } from 'vitest';
import { prepareCurrentHumanFinancialSnapshot } from '../../backend/application/current-human-financial-read-model';

const human = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  metrics: {
    schoolCount: 2,
    accountsTotal: 0,
    accountsWithPosition: 0,
    programmedCents: 0,
    paymentInformedCents: 0,
    creditLocatedCents: 0,
    reportedBalanceCents: 0,
    applicationsCents: 0,
  },
  sources: [
    { name: 'PDDEInfo', information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.' },
    { name: 'SIGEF', information: 'Movimentações das contas e créditos compatíveis localizados no extrato.' },
  ],
  indicators: [{
    label: '1ª parcela com pagamento informado',
    count: 1,
    units: [{ sme: '0410001', name: 'ESCOLA A', inep: '33069247' }],
  }],
  schools: [
    {
      school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '01872287000102' },
      programs: [], accounts: [], accounting: [], followUp: [],
    },
    {
      school: { inep: '33069093', sme: '0410002', name: 'ESCOLA B', uex: 'CEC B', cnpj: '01872287000102' },
      programs: [], accounts: [], accounting: [], followUp: [],
    },
  ],
};

describe('prepareCurrentHumanFinancialSnapshot', () => {
  it('prepara portfólio e snapshots escolares sem introduzir metadados técnicos', () => {
    const prepared = prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026',
      expectedSchoolCount: 2,
      human,
    });

    expect(prepared.portfolio).toEqual(expect.objectContaining({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      schoolCount: 2,
      metrics: human.metrics,
      indicators: human.indicators,
    }));
    expect(prepared.schools).toHaveLength(2);
    expect(prepared.schools[0].snapshot.school.inep).toBe('33069247');
    expect(JSON.stringify(prepared).toLowerCase()).not.toMatch(/sha256|parser|sourceurl|pagesfetched|technicalclassification|requesthash|payload/);
  });

  it('rejeita cobertura escolar incompleta, INEP duplicado e indicador inconsistente', () => {
    expect(() => prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 3, human,
    })).toThrow(/2\/3/);

    expect(() => prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 2,
      human: { ...human, schools: [human.schools[0], human.schools[0]] },
    })).toThrow(/INEP duplicado/i);

    expect(() => prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 2,
      human: { ...human, indicators: [{ ...human.indicators[0], count: 2 }] },
    })).toThrow(/indicador/i);
  });

  it('rejeita métricas com cobertura escolar divergente', () => {
    expect(() => prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 2,
      human: { ...human, metrics: { ...human.metrics, schoolCount: 1 } },
    })).toThrow(/Métricas humanas inconsistentes/i);
  });

  it('rejeita unidade de indicador que não pertence ao portfólio', () => {
    expect(() => prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 2,
      human: {
        ...human,
        indicators: [{
          label: 'Informação parcial',
          count: 1,
          units: [{ sme: '0499999', name: 'FORA DA CARTEIRA', inep: '33999999' }],
        }],
      },
    })).toThrow(/fora do portfólio/i);
  });
});
