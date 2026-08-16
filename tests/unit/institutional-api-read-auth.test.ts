import { describe, expect, it, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';

const TOKEN = 'pdde-admin-read-test-token-2026-08-16-abcdef';
const school = { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' };

function fixture() {
  const readService = {
    listSchools: vi.fn(() => ({ items: [school], total: 1 })),
    getSchool: vi.fn(() => school),
    getSchoolHistory: vi.fn(async () => ({ school, events: [], executions: [] })),
    listExecutions: vi.fn(async () => ({ items: [], total: 0 })),
    getExecution: vi.fn(async () => ({ execution: { runId: 'run-1' } })),
    listFindings: vi.fn(async () => ({ items: [], total: 0 })),
    listArtifacts: vi.fn(async () => []),
    getCurrentReport: vi.fn(async () => ({
      kind: 'REPORT', provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
      path: 'runs/run-1/report.xlsx', sha256: 'a'.repeat(64),
    })),
    getCurrentFiscalPortfolio: vi.fn(async () => ({ fiscalYear: 2026, technical: true })),
    getCurrentFiscalSchool: vi.fn(async () => ({ fiscalYear: 2026, technical: true })),
    getCurrentHumanPortfolio: vi.fn(async () => ({ fiscalYear: 2026, title: 'Humano' })),
    getCurrentHumanSchool: vi.fn(async () => ({ fiscalYear: 2026, school: { inep: '33069247' } })),
  };
  const artifactStore = {
    createSignedDownload: vi.fn(async () => ({
      url: 'https://storage.example/signed', expiresAt: '2026-08-16T21:10:00Z',
    })),
  };
  const api = createInstitutionalApi({
    readService,
    commandService: {
      requestPddeInfo: vi.fn(),
      requestReconciliation: vi.fn(),
    },
    artifactStore,
    artifactIntakeService: {
      requestUpload: vi.fn(),
      confirmUpload: vi.fn(),
    },
    commandToken: TOKEN,
    verifyEvidence: async () => ({ valid: true, events: 1 }),
    version: '0.5.0',
  });
  return { api, readService, artifactStore };
}

function admin(url: string): Request {
  return new Request(url, { headers: { authorization: `Bearer ${TOKEN}` } });
}

describe('autorização das leituras institucionais', () => {
  it('mantém health, meta e read model humano acessíveis sem segredo administrativo', async () => {
    const { api } = fixture();
    expect((await api(new Request('http://localhost/api/health'))).status).toBe(200);
    expect((await api(new Request('http://localhost/api/meta'))).status).toBe(200);
    expect((await api(new Request('http://localhost/api/current/human/portfolio'))).status).toBe(200);
    expect((await api(new Request('http://localhost/api/current/human/schools/33069247'))).status).toBe(200);
  });

  it.each([
    '/api/current/portfolio',
    '/api/current/schools/33069247',
    '/api/schools',
    '/api/schools/33069247',
    '/api/schools/33069247/history',
    '/api/schools/33069247/findings',
    '/api/executions',
    '/api/executions/run-1',
    '/api/executions/run-1/artifacts',
    '/api/findings',
  ])('recusa leitura técnica sem Bearer em %s', async (path) => {
    const { api } = fixture();
    expect((await api(new Request(`http://localhost${path}`))).status).toBe(401);
  });

  it('não cria URL assinada de relatório antes de autenticar', async () => {
    const { api, artifactStore } = fixture();
    const response = await api(new Request('http://localhost/api/executions/run-1/report'));
    expect(response.status).toBe(401);
    expect(artifactStore.createSignedDownload).not.toHaveBeenCalled();
  });

  it('mantém leitura técnica disponível com o Bearer administrativo correto', async () => {
    const { api, artifactStore } = fixture();
    expect((await api(admin('http://localhost/api/current/portfolio'))).status).toBe(200);
    expect((await api(admin('http://localhost/api/executions'))).status).toBe(200);
    expect((await api(admin('http://localhost/api/findings'))).status).toBe(200);
    const report = await api(admin('http://localhost/api/executions/run-1/report'));
    expect(report.status).toBe(302);
    expect(artifactStore.createSignedDownload).toHaveBeenCalledTimes(1);
  });
});
