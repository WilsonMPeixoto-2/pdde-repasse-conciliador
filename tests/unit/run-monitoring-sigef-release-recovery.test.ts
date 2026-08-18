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
  const path = await mkdtemp(join(tmpdir(), 'pdde-release-recovery-'));
  temporaryPaths.push(path);
  return path;
}

const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };
const cnpj = '01872287000102';
const recoveredAccount = { bank: '001', agency: '0249', number: '0000555215' };

const rawSchoolWithoutAccount = {
  inep: school.inep,
  sme: school.sme,
  nome: school.nome,
  denominacaoFnde: 'ESCOLA A',
  uex: 'CONSELHO ESCOLA COMUNIDADE DA ESCOLA A',
  cnpj: '01.872.287/0001-02',
  accounts: [],
  finance: [{
    destinacao: 'PDDE / PDDE BÁSICO - 1ª PARCELA',
    devidoCusteio: '5.065,00',
    devidoCapital: '0,00',
    devidoTotal: '5.065,00',
    ajusteCusteio: '0,00',
    ajusteCapital: '0,00',
    ajusteTotal: '0,00',
    finalDevidoTotal: '5.065,00',
    pagoCusteio: '5.065,00',
    pagoCapital: '0,00',
    pagoTotal: '5.065,00',
    data: '05/08/2026',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/escola/33069247',
  sourceIdentity: { inep: school.inep, sme: school.sme, denominacao: 'ESCOLA A' },
};

const release = {
  id: 'SIGEF_LIBERACOES:01872287000102:2026:PDDE_BASICO:1:900001:506500',
  schoolCnpj: cnpj,
  fiscalYear: 2026,
  programCode: '02',
  programName: 'PDDE',
  actionCode: 'PDDE_BASICO',
  installmentCode: '1',
  amountCents: 506_500,
  paymentDate: '2026-08-05',
  orderBank: '900001',
  destinationAccount: recoveredAccount,
  sourceReference: {
    source: 'SIGEF_LIBERACOES',
    url: `https://www.fnde.gov.br/sigefweb/index.php/liberacoes/resultado-entidade/ano/2026/programa/02/cnpj/${cnpj}`,
    rawProgram: 'PDDE - 1ª parc. 2026',
  },
};

const credit = {
  id: 'credito-recuperado',
  schoolCnpj: cnpj,
  programCode: '02',
  operation: 'credit' as const,
  amountCents: 506_500,
  movementDate: '2026-08-05',
  account: recoveredAccount,
  document: '900001',
  history: 'ORDEM BANCARIA',
  classification: 'REPASSE_FNDE' as const,
  counterparty: {
    document: '00378257000181',
    name: 'FUNDO NACIONAL DE DESENVOLVIMENTO DA EDUCACAO',
    bank: '001', agency: '1607', account: '0997380845',
  },
  sourceUrl: 'https://www.fnde.gov.br/sigefweb/extrato',
};

describe('recuperação de conta pela liberação oficial do SIGEF', () => {
  test('usa a conta SIGEF quando o pagamento existe mas o PDDEInfo não exibe a conta e então consulta o extrato', async () => {
    const collectSigefReleases = vi.fn(async () => ({
      query: { fiscalYear: 2026, programCode: '02' },
      entity: { cnpj, name: 'CEC ESCOLA A', state: 'RJ', city: 'RIO DE JANEIRO' },
      releases: [release],
      source: {
        source: 'SIGEF_LIBERACOES',
        status: 'available',
        queriedAt: '2026-08-18T13:00:00-03:00',
        coverageThrough: '2026-08-18',
      },
      statistics: { releaseRows: 1, tables: 1 },
      rawBytes: Buffer.from('<html>liberação</html>'),
      sourceUrl: release.sourceReference.url,
    }));
    const collectSigefAccount = vi.fn(async () => ({
      status: 'COMPLETE' as const,
      pagesFetched: 1,
      declaredTotal: 1,
      movements: [credit],
      coverageThrough: '2026-08-18',
    }));

    const result = await runFinancialIntelligenceMonitoring({
      schools: [school],
      workspacePath: await workspace(),
      fiscalYear: 2026,
      runId: 'release-recovery-2026',
      collectPddeInfoSchool: vi.fn(async () => ({
        school: rawSchoolWithoutAccount,
        queriedAt: '2026-08-18T13:00:00-03:00',
        rawBytes: Buffer.from('<html>pddeinfo</html>'),
      })),
      collectSigefReleases,
      collectSigefAccount,
      collectPddeInfoPublicPortfolio: vi.fn(async () => ({
        attendance: [], accounting: [], balances: [], artifacts: [], failures: [],
        balanceReferenceMonth: null, coverageThrough: null,
      })),
      now: () => '2026-08-18T13:01:00-03:00',
    } as never) as any;

    expect(collectSigefReleases).toHaveBeenCalledTimes(1);
    expect(collectSigefAccount).toHaveBeenCalledTimes(1);
    expect(collectSigefAccount.mock.calls[0]?.[0]).toMatchObject({
      cnpj,
      programCode: '02',
      account: recoveredAccount,
    });
    expect(result.raw.accountRecoveries).toEqual([
      expect.objectContaining({
        schoolInep: school.inep,
        programCode: '02',
        status: 'RECOVERED',
        account: recoveredAccount,
        orderBank: '900001',
      }),
    ]);
    expect(result.operational.repasses[0]).toMatchObject({
      account: recoveredAccount,
      bankCreditStatus: 'CREDITO_CONFIRMADO',
      bankCreditAmountCents: 506_500,
    });
    expect(result.fiscal.schools[0].repasses[0].installments[0]).toMatchObject({
      account: recoveredAccount,
      bankCredit: { presentationStatus: 'CREDITO_LOCALIZADO' },
    });
    expect(result.human.schools[0].programs[0].installments[0]).toMatchObject({
      account: recoveredAccount,
    });
    expect(result.human.schools[0].programs[0].installments[0].note).toMatch(/SIGEF.*Liberações/i);
  });
});
