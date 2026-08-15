import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runMonitoring } from '../../backend/application/run-monitoring';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-source-observation-'));
  temporaryPaths.push(path);
  return path;
}

const school = { inep: '33070415', sme: '0431024', nome: 'EM ANDRADE NEVES' };
const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: school.nome,
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA MUNICIPAL ANDRADE NEVES',
  cnpj: '01.959.159/0001-09',
  accounts: [{
    programa: 'PDDE QUALIDADE',
    banco: '001',
    agencia: '3189',
    conta: '00000023442',
    saldo: '8.124,90',
    ocorrencia: '',
  }],
  finance: [],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33070415',
  sourceIdentity: { inep: school.inep, sme: school.sme, denominacao: school.nome },
};

const movement = {
  id: 'mov-2026-05-14',
  schoolCnpj: '01959159000109',
  programCode: '0B',
  operation: 'debit' as const,
  amountCents: 16_700,
  movementDate: '2026-05-14',
  account: { bank: '001', agency: '3189', number: '00000023442' },
  document: '41843',
  history: 'TV POR ASSINATURA',
  classification: 'PAGAMENTO_TRANSFERENCIA' as const,
  counterparty: { document: null, name: 'GLOBO CABO SA', bank: null, agency: null, account: null },
  sourceUrl: 'https://www.fnde.gov.br/sigefweb/extrato',
};

describe('observações de fonte do MONITORING', () => {
  test('separa completude da coleta da recência observada no SIGEF', async () => {
    const result = await runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'monitoring-source-observation',
      collectPddeInfoSchool: vi.fn(async () => ({
        school: rawSchool,
        queriedAt: '2026-08-14T18:00:00Z',
        rawBytes: Buffer.from('<html>pddeinfo</html>'),
      })),
      collectSigefAccount: vi.fn(async () => ({
        status: 'COMPLETE' as const,
        pagesFetched: 1,
        declaredTotal: 1,
        movements: [movement],
        coverageThrough: '2026-05-14',
      })),
      now: () => '2026-08-14T18:30:00Z',
    } as never) as any;

    expect(result.status).toBe('COMPLETE');
    expect(result.raw.sourceObservations).toEqual(expect.arrayContaining([
      expect.objectContaining({
        source: 'PDDEINFO',
        collectionStatus: 'COMPLETE',
        collectedAt: '2026-08-14T18:00:00Z',
        observationBasis: 'QUERY_TIMESTAMP',
        observedThrough: null,
        observedLagDays: null,
      }),
      expect.objectContaining({
        source: 'SIGEF_EXTRATO',
        collectionStatus: 'COMPLETE',
        collectedAt: '2026-08-14T18:30:00Z',
        observationBasis: 'LATEST_MOVEMENT_RETURNED',
        observedThrough: '2026-05-14',
        observedLagDays: 92,
        freshnessConclusion: 'NOT_INFERRED',
      }),
    ]));

    expect(result.operational.sourceObservations).toEqual(result.raw.sourceObservations);
    expect(result.fiscal.sourceObservations).toEqual(result.raw.sourceObservations);
  });
});
