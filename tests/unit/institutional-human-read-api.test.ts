import { describe, expect, test, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';

const COMMAND_TOKEN = 'pdde-admin-human-view-2026-abcdef';
const school = { inep: '33069093', sme: '0410002', nome: 'EM ALBINO SOUZA CRUZ' };
const RUN_ID = 'human-api-test-run-2026-08-17';

function fixture() {
  const humanSchool = {
    fiscalYear: 2026 as const,
    runId: RUN_ID,
    school: {
      inep: school.inep,
      sme: school.sme,
      name: school.nome,
      uex: 'CONSELHO ESCOLA COMUNIDADE',
      cnpj: '12345678000190',
    },
    programs: [],
    accounts: [],
    accounting: [],
    followUp: [],
  };
  const humanPortfolio = {
    title: 'Inteligência Financeira PDDE | 4ª CRE' as const,
    fiscalYear: 2026 as const,
    runId: RUN_ID,
    referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
    schoolCount: 1,
    metrics: {
      schoolCount: 1,
      accountsTotal: 0,
      accountsWithPosition: 0,
      programmedCents: 0,
      paymentInformedCents: 0,
      creditLocatedCents: 0,
      reportedBalanceCents: null,
      applicationsCents: null,
    },
    sources: [
      { name: 'PDDEInfo', information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.' },
    ],
    indicators: [
      { label: 'Conta do repasse não exibida', count: 1, units: [{ sme: school.sme, name: school.nome, inep: school.inep }] },
    ],
    schools: [{
      sme: school.sme,
      name: school.nome,
      inep: school.inep,
      programmedCents: 0,
      paymentInformedCents: 0,
      creditLocatedCents: 0,
      knownBalanceCents: null,
      referenceDate: null,
      accountsTotal: 0,
      accountsWithReferencePosition: 0,
      followUpCount: 0,
      paymentSuspended: false,
      repasseAccountMissing: false,
    }],
  };
  const readService = {
    listSchools: vi.fn(() => ({ items: [school], total: 1 })),
    getSchool: vi.fn(() => school),
    getSchoolHistory: vi.fn(async () => null),
    listExecutions: vi.fn(async () => ({ items: [] })),
    getExecution: vi.fn(async () => null),
    listFindings: vi.fn(async () => ({ items: [], total: 0 })),
    listArtifacts: vi.fn(async () => []),
    getCurrentReport: vi.fn(async () => null),
    getCurrentFiscalPortfolio: vi.fn(async () => null),
    getCurrentFiscalSchool: vi.fn(async () => null),
    getCurrentHumanPortfolio: vi.fn(async () => humanPortfolio),
    getCurrentHumanSchool: vi.fn(async (inep: string) => inep === school.inep ? humanSchool : null),
  };
  const api = createInstitutionalApi({
    readService,
    commandService: {
      requestPddeInfo: vi.fn(),
      requestMonitoring: vi.fn(),
      requestReconciliation: vi.fn(),
    },
    artifactStore: { createSignedDownload: vi.fn() },
    artifactIntakeService: { requestUpload: vi.fn(), confirmUpload: vi.fn() },
    commandToken: COMMAND_TOKEN,
    verifyEvidence: async () => ({ valid: true, events: 0 }),
    version: '0.5.0',
  });
  return { api, readService };
}

describe('API do read model humano corrente', () => {
  test('expõe o portfólio humano de 2026 em endpoint separado do retrato fiscal técnico', async () => {
    const { api, readService } = fixture();

    const response = await api(new Request('http://localhost/api/current/human/portfolio'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      title: 'Inteligência Financeira PDDE | 4ª CRE',
      fiscalYear: 2026,
      referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
      schools: [{ inep: school.inep, sme: school.sme }],
    });
    expect(readService.getCurrentHumanPortfolio).toHaveBeenCalledTimes(1);
  });

  test('expõe uma unidade pelo INEP e mantém 404 para unidade fora do retrato humano', async () => {
    const { api, readService } = fixture();

    const found = await api(new Request(`http://localhost/api/current/human/schools/${school.inep}`));
    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toMatchObject({ school: { inep: school.inep } });

    const missing = await api(new Request('http://localhost/api/current/human/schools/99999999'));
    expect(missing.status).toBe(404);
    expect(readService.getCurrentHumanSchool).toHaveBeenCalledWith('99999999');
  });

  test('não confunde a rota humana com /api/current/portfolio técnico', async () => {
    const { api, readService } = fixture();

    const human = await api(new Request('http://localhost/api/current/human/portfolio'));
    expect(human.status).toBe(200);
    expect(readService.getCurrentHumanPortfolio).toHaveBeenCalledTimes(1);
    expect(readService.getCurrentFiscalPortfolio).not.toHaveBeenCalled();
  });
});
