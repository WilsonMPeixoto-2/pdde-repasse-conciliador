import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { runFinancialIntelligenceMonitoring } from '../../backend/application/run-financial-intelligence-monitoring';

const temporaryPaths: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryPaths.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

async function workspace(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), 'pdde-p2-order-payment-'));
  temporaryPaths.push(path);
  return path;
}

const school = { inep: '33136947', sme: '0410601', nome: 'EM EXEMPLO PRIMEIRA INFANCIA' };
const cnpj = '12345678000190';
const account = { bank: '001', agency: '0249', number: '0000123456' };

const rawSchool = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: school.nome,
  uex: 'CEC EM EXEMPLO PRIMEIRA INFANCIA',
  cnpj: '12.345.678/0001-90',
  accounts: [],
  finance: [{
    destinacao: 'PDDE / PDDE Básico - Primeira Infância - P2',
    devidoCusteio: '1.110,00',
    devidoCapital: '1.665,00',
    devidoTotal: '2.775,00',
    ajusteCusteio: '0,00',
    ajusteCapital: '0,00',
    ajusteTotal: '0,00',
    finalDevidoTotal: '2.775,00',
    pagoCusteio: '1.110,00',
    pagoCapital: '1.665,00',
    pagoTotal: '2.775,00',
    data: '',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33136947',
  sourceIdentity: { inep: school.inep, sme: school.sme, denominacao: school.nome },
};

const release = {
  id: 'SIGEF_LIBERACOES:12345678000190:2026:PDDE_PRIMEIRA_INFANCIA:P2:023987:277500',
  schoolCnpj: cnpj,
  fiscalYear: 2026,
  programCode: '02',
  programName: 'PDDE',
  actionCode: 'PDDE_PRIMEIRA_INFANCIA',
  installmentCode: 'P2',
  amountCents: 277_500,
  paymentDate: '2026-09-15',
  orderBank: '023987',
  destinationAccount: account,
  sourceReference: {
    source: 'SIGEF_LIBERACOES',
    url: 'https://www.fnde.gov.br/sigefweb/liberacoes/primeira-infancia-p2',
    rawProgram: 'PDDE -PDDE Básico – 1ª Infância - 2ª Parcela',
  },
};

describe('separação entre ordem FNDE e pagamento SIGEF na Primeira Infância P2', () => {
  test('preserva ordem 14/09 e pagamento 15/09 como fatos distintos', async () => {
    const collectSigefReleases = vi.fn(async () => ({
      query: { fiscalYear: 2026, programCode: '02' },
      entity: { cnpj, name: 'CEC EM EXEMPLO PRIMEIRA INFANCIA', state: 'RJ', city: 'RIO DE JANEIRO' },
      releases: [release],
      source: {
        source: 'SIGEF_LIBERACOES',
        status: 'available',
        queriedAt: '2026-09-18T18:00:00-03:00',
        coverageThrough: '2026-09-15',
      },
      statistics: { releaseRows: 1, tables: 1 },
      rawBytes: Buffer.from('<html>liberação P2</html>'),
      sourceUrl: release.sourceReference.url,
      route: 'modern' as const,
    }));

    const result = await runFinancialIntelligenceMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'primeira-infancia-p2-order-payment',
      collectPddeInfoSchool: vi.fn(async () => ({
        school: rawSchool,
        queriedAt: '2026-09-18T18:00:00-03:00',
        rawBytes: Buffer.from('<html>pddeinfo P2</html>'),
      })),
      collectSigefReleases,
      collectSigefAccount: vi.fn(async () => ({
        status: 'COMPLETE' as const,
        pagesFetched: 1,
        declaredTotal: 0,
        movements: [],
        coverageThrough: '2026-09-15',
      })),
      collectPddeInfoPublicPortfolio: vi.fn(async () => ({
        attendance: [{
          fiscalYear: 2026 as const,
          schoolInep: school.inep,
          uexCnpj: cnpj,
          schoolName: school.nome,
          programName: 'PDDE',
          destination: 'PDDE Básico - Primeira Infância - P2',
          costCents: 111_000,
          capitalCents: 166_500,
          totalCents: 277_500,
          paymentOrderDate: '2026-09-14',
        }],
        accounting: [],
        balances: [],
        registrations: [],
        accountOpenings: [],
        suspensions: [],
        artifacts: [],
        failures: [],
        balanceReferenceMonth: null,
        coverageThrough: null,
      })),
      now: () => '2026-09-18T18:05:00-03:00',
    } as never) as any;

    expect(collectSigefReleases).toHaveBeenCalledOnce();
    expect(result.raw.accountRecoveries).toContainEqual(expect.objectContaining({
      schoolInep: school.inep,
      status: 'RECOVERED',
      paymentDate: '2026-09-15',
      orderBank: '023987',
    }));

    const installment = result.human.schools[0].programs
      .find((program: { name: string }) => program.name === 'PDDE Básico — Primeira Infância')
      ?.installments.find((item: { installment: string | null }) => item.installment === 'P2');

    expect(installment).toMatchObject({
      programmedCents: 277_500,
      paymentInformedCents: 277_500,
      paymentOrderDate: '2026-09-14',
      paymentInformedDate: '2026-09-15',
    });
    expect(installment.paymentOrderDate).not.toBe(installment.paymentInformedDate);
  });
});
