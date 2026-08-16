import { describe, expect, test, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';

const COMMAND_TOKEN = 'pdde-admin-current-fiscal-2026-abcdef';
const school = { inep: '33069247', sme: '0410001', nome: 'ESCOLA A' };

function fixture() {
  const readService = {
    listSchools: vi.fn(() => ({ items: [school], total: 1 })),
    getSchool: vi.fn(() => school),
    getSchoolHistory: vi.fn(async () => null),
    listExecutions: vi.fn(async () => ({ items: [] })),
    getExecution: vi.fn(async () => null),
    listFindings: vi.fn(async () => ({ items: [], total: 0 })),
    listArtifacts: vi.fn(async () => []),
    getCurrentReport: vi.fn(async () => null),
    getCurrentFiscalPortfolio: vi.fn(async () => ({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      generatedAt: '2026-08-15T03:19:47Z',
      sourceObservations: [],
      metrics: { schools: 163, accounts: 284, movements: 394 },
      schools: [{ inep: school.inep, sme: school.sme, name: school.nome }],
    })),
    getCurrentFiscalSchool: vi.fn(async (inep: string) => inep === school.inep ? ({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      school: { inep: school.inep, sme: school.sme, name: school.nome },
      repasses: [],
      statements: [],
    }) : null),
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

function adminGet(url: string): Request {
  return new Request(url, { headers: { authorization: `Bearer ${COMMAND_TOKEN}` } });
}

describe('API do retrato fiscal corrente', () => {
  test('expõe a carteira financeira 2026 sem misturar histórico de execução', async () => {
    const { api, readService } = fixture();

    const response = await api(adminGet('http://localhost/api/current/portfolio'));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      fiscalYear: 2026,
      runId: 'monitoring-full-2026',
      metrics: { schools: 163, accounts: 284, movements: 394 },
    });
    expect(readService.getCurrentFiscalPortfolio).toHaveBeenCalledTimes(1);
  });

  test('expõe o prontuário fiscal corrente por INEP e retorna 404 quando ainda não publicado', async () => {
    const { api, readService } = fixture();

    const found = await api(adminGet(`http://localhost/api/current/schools/${school.inep}`));
    expect(found.status).toBe(200);
    await expect(found.json()).resolves.toMatchObject({
      fiscalYear: 2026,
      school: { inep: school.inep },
    });

    const missing = await api(adminGet('http://localhost/api/current/schools/99999999'));
    expect(missing.status).toBe(404);
    expect(readService.getCurrentFiscalSchool).toHaveBeenCalledWith('99999999');
  });
});
