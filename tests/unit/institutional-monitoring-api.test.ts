import { describe, expect, test, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';

const TOKEN = 'pdde-admin-monitoring-token-2026-08-14';

function fixture() {
  const commandService = {
    requestPddeInfo: vi.fn(),
    requestMonitoring: vi.fn(async () => ({
      jobId: '33333333-3333-4333-8333-333333333333',
      runId: 'monitoring-abc123',
      kind: 'MONITORING',
      status: 'QUEUED',
    })),
    requestReconciliation: vi.fn(),
  };
  const readService = {
    listSchools: vi.fn(() => ({ items: [], total: 0 })),
    getSchool: vi.fn(),
    getSchoolHistory: vi.fn(),
    listExecutions: vi.fn(async () => ({ items: [] })),
    getExecution: vi.fn(),
    listFindings: vi.fn(async () => ({ items: [], total: 0 })),
    listArtifacts: vi.fn(async () => []),
    getCurrentReport: vi.fn(),
  };
  const api = createInstitutionalApi({
    readService,
    commandService,
    artifactStore: { createSignedDownload: vi.fn() },
    artifactIntakeService: {
      requestUpload: vi.fn(),
      confirmUpload: vi.fn(),
    },
    commandToken: TOKEN,
    verifyEvidence: async () => ({ valid: true, events: 0 }),
    version: '0.5.0',
  } as never);
  return { api, commandService };
}

describe('API institucional MONITORING', () => {
  test('protege o comando e enfileira monitoramento 2026 com Idempotency-Key', async () => {
    const { api, commandService } = fixture();
    const url = 'http://localhost/api/executions/monitoring';
    const body = JSON.stringify({ fiscalYear: 2026, schoolIneps: ['33069247'] });

    expect((await api(new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    }))).status).toBe(401);

    const accepted = await api(new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${TOKEN}`,
        'idempotency-key': 'monitoramento-agosto',
      },
      body,
    }));

    expect(accepted.status).toBe(202);
    await expect(accepted.json()).resolves.toMatchObject({
      runId: 'monitoring-abc123',
      kind: 'MONITORING',
      status: 'QUEUED',
    });
    expect(commandService.requestMonitoring).toHaveBeenCalledWith('monitoramento-agosto', {
      fiscalYear: 2026,
      schoolIneps: ['33069247'],
    });
  });
});
