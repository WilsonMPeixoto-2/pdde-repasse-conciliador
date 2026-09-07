import ExcelJS from 'exceljs';
import { describe, expect, test } from 'vitest';
import { prepareCurrentHumanFinancialSnapshot } from '../../backend/application/current-human-financial-read-model';
import { materializeTemporaryFinancialSession } from '../../backend/application/temporary-financial-session';

const sourceObservations = [
  {
    source: 'PDDEINFO', collectionStatus: 'COMPLETE', collectedAt: '2026-09-07T01:30:00Z',
    observationBasis: 'QUERY_TIMESTAMP', observedThrough: null, observedLagDays: null,
    freshnessConclusion: 'NOT_INFERRED', metrics: { schoolsCollected: 1, failures: 0 },
  },
  {
    source: 'SIGEF_EXTRATO', collectionStatus: 'COMPLETE', collectedAt: '2026-09-07T01:31:00Z',
    observationBasis: 'LATEST_MOVEMENT_RETURNED', observedThrough: '2026-05-28', observedLagDays: 102,
    freshnessConclusion: 'NOT_INFERRED', metrics: { accountsQueried: 1, accountsComplete: 1, accountsPartial: 0, accountsFailed: 0, movementsInFiscalYear: 1 },
  },
  {
    source: 'SIGEF_LIBERACOES', collectionStatus: 'COMPLETE', collectedAt: '2026-09-07T01:32:00Z',
    observationBasis: 'LATEST_RELEASE_RETURNED', observedThrough: '2026-08-05', observedLagDays: 33,
    freshnessConclusion: 'NOT_INFERRED', metrics: { queriesAttempted: 1, queriesSucceeded: 1, queriesFailed: 0, releaseRows: 1, releaseMatches: 1, recoveredAccounts: 1, confirmedAccounts: 0, accountMismatches: 0, ambiguousMatches: 0, notFound: 0, errors: 0 },
  },
] as const;

const human = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 31/07/2026',
  metrics: {
    schoolCount: 1, accountsTotal: 0, accountsWithPosition: 0, programmedCents: 0,
    paymentInformedCents: 0, creditLocatedCents: 0, reportedBalanceCents: null, applicationsCents: null,
  },
  sources: [
    { name: 'PDDEInfo', information: 'Repasses e saldos informados.' },
    { name: 'SIGEF', information: 'Extratos e liberações públicas.' },
  ],
  sourceObservations,
  indicators: [],
  schools: [{
    school: { inep: '33069247', sme: '0410001', name: 'ESCOLA A', uex: 'CEC A', cnpj: '04500463000173' },
    programs: [], accounts: [], accounting: [], followUp: [],
  }],
};

describe('observações factuais das fontes no produto humano', () => {
  test('preserva observações estruturadas no snapshot público sem metadados de requisição', () => {
    const prepared = prepareCurrentHumanFinancialSnapshot({
      runId: 'monitoring-full-2026', expectedSchoolCount: 1, human,
    });
    expect(prepared.portfolio.sourceObservations).toEqual(sourceObservations);
    expect(JSON.stringify(prepared.portfolio)).not.toContain('sourceUrl');
    expect(JSON.stringify(prepared.portfolio)).not.toContain('sha256');
  });

  test('materializa no Excel entregue ao usuário uma aba que explica observação e defasagem sem inferir ausência', async () => {
    const session = await materializeTemporaryFinancialSession({
      runId: 'monitoring-full-2026',
      status: 'COMPLETE',
      expectedSchoolCount: 1,
      human: human as never,
    });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Buffer.from(session.workbookBytes));
    const sheet = workbook.getWorksheet('Observações das Fontes');
    expect(sheet).toBeDefined();
    const visible: string[] = [];
    sheet?.eachRow((row) => row.eachCell((cell) => visible.push(String(cell.value ?? ''))));
    const text = visible.join(' ');
    expect(text).toContain('SIGEF · Liberações');
    expect(text).toContain('Contas recuperadas');
    expect(text).toContain('não comprova desatualização nem ausência financeira');
    expect(text).not.toContain('sourceUrl');
    expect(text).not.toContain('sha256');
  });
});
