import { describe, expect, test, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';
import { humanPortfolioSchema, humanSchoolSchema } from '../../src/product/types';

const COMMAND_TOKEN = 'pdde-admin-test-token-2026-08-17-abcdef';
const runId = 'human-read-model-run-2026-08-17';

const portfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE' as const,
  fiscalYear: 2026 as const,
  runId,
  referenceLabel: 'Posição financeira disponível em 17/08/2026',
  schoolCount: 1,
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 100_00,
    paymentInformedCents: 100_00,
    creditLocatedCents: 100_00,
    reportedBalanceCents: 50_00,
    applicationsCents: 20_00,
  },
  sources: [{ name: 'FNDE', information: 'PDDEInfo e SIGEF' }],
  indicators: [],
  schools: [{
    sme: '0410001',
    name: 'EM TESTE',
    inep: '33000001',
    programmedCents: 100_00,
    paymentInformedCents: 100_00,
    creditLocatedCents: 100_00,
    knownBalanceCents: 50_00,
    referenceDate: '2026-08-17',
    accountsTotal: 1,
    accountsWithReferencePosition: 1,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  }],
};

const school = {
  fiscalYear: 2026 as const,
  runId,
  school: {
    inep: '33000001',
    sme: '0410001',
    name: 'EM TESTE',
    uex: 'UEx Teste',
    cnpj: '00.000.000/0001-00',
  },
  programs: [],
  accounts: [],
  accounting: [],
  followUp: [],
};

function createApi() {
  return createInstitutionalApi({
    readService: {
      listSchools: () => ({ items: [], total: 0 }),
      getSchool: () => null,
      getSchoolHistory: async () => null,
      listExecutions: async () => ({ items: [] }),
      getExecution: async () => null,
      listFindings: async () => ({ items: [], total: 0 }),
      listArtifacts: async () => [],
      getCurrentReport: async () => null,
      getCurrentHumanPortfolio: async () => portfolio,
      getCurrentHumanSchool: async (inep: string) => inep === school.school.inep ? school : null,
    },
    commandService: {
      requestPddeInfo: vi.fn(),
      requestReconciliation: vi.fn(),
    },
    artifactStore: { createSignedDownload: vi.fn() },
    artifactIntakeService: {
      requestUpload: vi.fn(),
      confirmUpload: vi.fn(),
    },
    commandToken: COMMAND_TOKEN,
    verifyEvidence: async () => ({ valid: true, events: 0 }),
    version: '0.5.0',
  });
}

describe('contrato público do read model humano persistente', () => {
  test('remove runId do portfólio antes de entregar o DTO usado pelo frontend', async () => {
    const api = createApi();
    const response = await api(new Request('http://localhost/api/current/human/portfolio'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty('runId');
    expect(() => humanPortfolioSchema.parse(body)).not.toThrow();
  });

  test('remove runId da escola antes de entregar o DTO usado pelo frontend', async () => {
    const api = createApi();
    const response = await api(new Request('http://localhost/api/current/human/schools/33000001'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).not.toHaveProperty('runId');
    expect(() => humanSchoolSchema.parse(body)).not.toThrow();
  });
});
