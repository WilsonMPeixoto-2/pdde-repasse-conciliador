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
  const path = await mkdtemp(join(tmpdir(), 'pdde-temporal-coverage-'));
  temporaryPaths.push(path);
  return path;
}

const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };
const account = { bank: '001', agency: '0249', number: '0000549789' };

const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: 'ESCOLA A',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA A',
  cnpj: '04.500.463/0001-73',
  accounts: [{
    programa: 'PDDE',
    banco: account.bank,
    agencia: account.agency,
    conta: account.number,
    saldo: '0,00',
    ocorrencia: '',
  }],
  finance: [{
    destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
    devidoCusteio: '837,00',
    devidoCapital: '3.348,00',
    devidoTotal: '4.185,00',
    ajusteCusteio: '0,00',
    ajusteCapital: '0,00',
    ajusteTotal: '0,00',
    finalDevidoTotal: '4.185,00',
    pagoCusteio: '837,00',
    pagoCapital: '3.348,00',
    pagoTotal: '4.185,00',
    data: '05/08/2026',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
  sourceIdentity: {
    inep: school.inep,
    sme: school.sme,
    denominacao: 'ESCOLA A',
  },
};

describe('qualidade temporal do monitor', () => {
  test('mantém execução COMPLETE e marca pagamento fora da cobertura bancária', async () => {
    const collectPddeInfoSchool = vi.fn(async () => ({
      school: rawSchool,
      queriedAt: '2026-09-05T08:00:00Z',
      rawBytes: Buffer.from('<html>pddeinfo</html>'),
    }));
    const collectSigefAccount = vi.fn(async () => ({
      status: 'COMPLETE' as const,
      pagesFetched: 1,
      declaredTotal: 0,
      movements: [],
      coverageThrough: '2026-05-28',
    }));

    const result = await runMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'temporal-coverage-2026',
      collectPddeInfoSchool,
      collectSigefAccount,
      now: () => '2026-09-05T08:30:00Z',
    } as never) as any;

    expect(result.status).toBe('COMPLETE');
    expect(result.raw.quality.paymentTemporalCoverage).toMatchObject({
      status: 'OUT_OF_COVERAGE',
      evaluatedPaymentCount: 1,
      sufficientCount: 0,
      outOfCoverageCount: 1,
      unknownCount: 0,
      latestKnownPaymentDate: '2026-08-05',
      maxObservedCoverageThrough: '2026-05-28',
    });
    expect(result.raw.coverage.paymentTemporalCoverage.status).toBe('OUT_OF_COVERAGE');
  });
});
