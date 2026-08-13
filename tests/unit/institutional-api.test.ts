import { describe, expect, test, vi } from 'vitest';
import { createInstitutionalApi } from '../../backend/api/institutional-api';
import {
  ArtifactUploadIdempotencyConflictError,
  ArtifactUploadIntegrityError,
  ArtifactUploadNotFoundError,
} from '../../backend/application/artifact-intake-service';
import { ReconciliationArtifactEvidenceError } from '../../backend/application/execution-command-service';

const school = { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' };
const execution = {
  runId: 'run-1', source: 'PDDEINFO', fiscalYear: 2026, requestedAt: null,
  startedAt: '2026-08-13T12:00:00Z', finishedAt: null, status: 'RUNNING',
  sourceCollectionRunId: null,
  counts: { events: 1, attempts: 0, failedAttempts: 0, artifacts: 0, findings: 0, humanReview: 0 },
};
const report = {
  eventId: 'report-1', sequence: 10, runId: 'run-1', schoolInep: null,
  occurredAt: '2026-08-13T12:05:00Z', kind: 'REPORT', provider: 'SUPABASE_STORAGE',
  bucket: 'pdde-evidence', path: 'runs/run-1/reports/reconciliation.xlsx',
  sha256: 'a'.repeat(64), bytes: 1000,
  mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', metadata: {},
};

function fixture() {
  const readService = {
    listSchools: vi.fn(() => ({ items: [school], total: 1 })),
    getSchool: vi.fn((inep: string) => inep === school.inep ? school : null),
    getSchoolHistory: vi.fn(async (inep: string) => inep === school.inep
      ? { school, events: [], executions: [execution] }
      : null),
    listExecutions: vi.fn(async () => ({ items: [execution] })),
    getExecution: vi.fn(async (runId: string) => runId === 'run-1'
      ? { execution, events: [], findings: [], artifacts: [] }
      : null),
    listFindings: vi.fn(async () => ({ items: [{ eventId: 'finding-1' }], total: 1 })),
    listArtifacts: vi.fn(async (runId: string) => runId === 'run-1' ? [report] : []),
  };
  const commandService = {
    requestPddeInfo: vi.fn(async () => ({
      jobId: '11111111-1111-4111-8111-111111111111', runId: 'run-pdde',
      kind: 'PDDEINFO', status: 'QUEUED',
    })),
    requestReconciliation: vi.fn(async () => ({
      jobId: '22222222-2222-4222-8222-222222222222', runId: 'run-reconcile',
      kind: 'RECONCILIATION', status: 'QUEUED',
    })),
  };
  const artifactStore = {
    createSignedDownload: vi.fn(async () => ({
      url: 'https://storage.example/signed-report',
      expiresAt: '2026-08-13T12:10:00Z',
    })),
  };
  const artifactIntakeService = {
    requestUpload: vi.fn(async () => ({
      uploadId: '2544c29b-d789-5c70-aee2-adc90cba79b7',
      runId: 'inputs-2026-08-13',
      role: 'SIGEF_MOVEMENTS_CSV',
      kind: 'RAW_FILE',
      originalName: 'movimentacoes.csv',
      mediaType: 'text/csv',
      bucket: 'pdde-evidence',
      path: 'runs/inputs-2026-08-13/inputs/sigef-movimentacoes/2544c29b-d789-5c70-aee2-adc90cba79b7.csv',
      sha256: 'a'.repeat(64),
      bytes: 50,
      upload: {
        method: 'PUT', url: 'https://storage.example/signed-upload', token: 'temporary-token',
        expiresAt: '2026-08-13T14:00:00Z',
      },
    })),
    confirmUpload: vi.fn(async () => ({
      provider: 'SUPABASE_STORAGE', bucket: 'pdde-evidence',
      path: 'runs/inputs-2026-08-13/inputs/sigef-movimentacoes/2544c29b-d789-5c70-aee2-adc90cba79b7.csv',
      kind: 'RAW_FILE', sha256: 'a'.repeat(64), bytes: 50, mediaType: 'text/csv',
      metadata: { role: 'SIGEF_MOVEMENTS_CSV' },
    })),
  };
  const api = createInstitutionalApi({
    readService,
    commandService,
    artifactStore,
    artifactIntakeService,
    commandToken: 'segredo-administrativo',
    verifyEvidence: async () => ({ valid: true, events: 8 }),
    version: '0.5.0',
  });
  return { api, readService, commandService, artifactStore, artifactIntakeService };
}

async function json(response: Response): Promise<Record<string, any>> {
  return response.json() as Promise<Record<string, any>>;
}

describe('API institucional', () => {
  test('expõe health, meta e catálogo/histórico das escolas', async () => {
    const { api, readService } = fixture();
    const health = await api(new Request('http://localhost/api/health'));
    expect(health.status).toBe(200);
    expect(await json(health)).toMatchObject({ ok: true, evidence: { valid: true, events: 8 } });

    const meta = await api(new Request('http://localhost/api/meta'));
    expect(await json(meta)).toMatchObject({ version: '0.5.0', schools: 1 });

    expect(await json(await api(new Request('http://localhost/api/schools')))).toMatchObject({
      items: [school], total: 1,
    });
    expect(await json(await api(new Request(`http://localhost/api/schools/${school.inep}`))))
      .toEqual(school);
    expect(await json(await api(new Request(`http://localhost/api/schools/${school.inep}/history`))))
      .toMatchObject({ school, executions: [execution] });
    await api(new Request(`http://localhost/api/schools/${school.inep}/findings?review=true`));
    expect(readService.listFindings).toHaveBeenCalledWith(expect.objectContaining({
      schoolInep: school.inep, requiresHumanReview: true,
    }));
    expect((await api(new Request('http://localhost/api/schools/99999999'))).status).toBe(404);
  });

  test('coalesce verificações concorrentes do health e renova o resultado após o TTL', async () => {
    let now = 1_000;
    const verifyEvidence = vi.fn(async () => ({ valid: true, events: 493 }));
    const base = fixture();
    const api = createInstitutionalApi({
      readService: base.readService,
      commandService: base.commandService,
      artifactStore: base.artifactStore,
      artifactIntakeService: base.artifactIntakeService,
      commandToken: 'segredo-administrativo',
      verifyEvidence,
      evidenceCacheTtlMs: 5_000,
      now: () => now,
      version: '0.5.0',
    });

    const responses = await Promise.all(Array.from(
      { length: 20 },
      () => api(new Request('http://localhost/api/health')),
    ));
    expect(responses.every((response) => response.status === 200)).toBe(true);
    expect(verifyEvidence).toHaveBeenCalledTimes(1);

    now += 4_999;
    await api(new Request('http://localhost/api/health'));
    expect(verifyEvidence).toHaveBeenCalledTimes(1);

    now += 1;
    await api(new Request('http://localhost/api/health'));
    expect(verifyEvidence).toHaveBeenCalledTimes(2);
  });

  test('expõe execuções, achados, artefatos e relatório por URL curta assinada', async () => {
    const { api, artifactStore } = fixture();
    expect(await json(await api(new Request('http://localhost/api/executions?limit=20'))))
      .toMatchObject({ items: [execution] });
    expect(await json(await api(new Request('http://localhost/api/executions/run-1'))))
      .toMatchObject({ execution });
    expect(await json(await api(new Request('http://localhost/api/findings?review=true'))))
      .toMatchObject({ total: 1 });
    expect(await json(await api(new Request('http://localhost/api/executions/run-1/artifacts'))))
      .toEqual({ items: [report], total: 1 });

    const download = await api(new Request('http://localhost/api/executions/run-1/report'));
    expect(download.status).toBe(302);
    expect(download.headers.get('location')).toBe('https://storage.example/signed-report');
    expect(download.headers.get('cache-control')).toBe('no-store');
    expect(artifactStore.createSignedDownload).toHaveBeenCalledWith(expect.objectContaining({
      bucket: 'pdde-evidence', path: report.path, sha256: report.sha256,
      expiresInSeconds: 300,
    }));
  });

  test('protege comandos e exige Idempotency-Key antes de retornar 202', async () => {
    const { api, commandService } = fixture();
    const url = 'http://localhost/api/executions/pddeinfo';
    const body = JSON.stringify({ fiscalYear: 2026 });
    expect((await api(new Request(url, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body,
    }))).status).toBe(401);
    expect((await api(new Request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: 'Bearer segredo-administrativo' },
      body,
    }))).status).toBe(400);

    const accepted = await api(new Request(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        'idempotency-key': 'coleta-agosto',
      },
      body,
    }));
    expect(accepted.status).toBe(202);
    expect(await json(accepted)).toMatchObject({ runId: 'run-pdde', status: 'QUEUED' });
    expect(commandService.requestPddeInfo).toHaveBeenCalledWith('coleta-agosto', { fiscalYear: 2026 });

    const reconciliation = await api(new Request('http://localhost/api/reconciliations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        'idempotency-key': 'reconcile-agosto',
      },
      body: JSON.stringify({ fiscalYear: 2026 }),
    }));
    expect(reconciliation.status).toBe(202);
    expect(commandService.requestReconciliation).toHaveBeenCalledWith(
      'reconcile-agosto', { fiscalYear: 2026 },
    );
  });

  test('emite e confirma upload institucional somente para comando autenticado', async () => {
    const { api, artifactIntakeService } = fixture();
    const requestBody = {
      runId: 'inputs-2026-08-13', fiscalYear: 2026, role: 'SIGEF_MOVEMENTS_CSV',
      originalName: 'movimentacoes.csv', sha256: 'a'.repeat(64), bytes: 50,
    };
    const requestUrl = 'http://localhost/api/artifacts/uploads';

    const unauthorized = await api(new Request(requestUrl, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(requestBody),
    }));
    expect(unauthorized.status).toBe(401);
    expect(artifactIntakeService.requestUpload).not.toHaveBeenCalled();

    const requested = await api(new Request(requestUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        'idempotency-key': 'movimentacoes-agosto',
      },
      body: JSON.stringify(requestBody),
    }));
    expect(requested.status).toBe(201);
    expect(await json(requested)).toMatchObject({
      uploadId: '2544c29b-d789-5c70-aee2-adc90cba79b7',
      upload: { token: 'temporary-token' },
    });
    expect(artifactIntakeService.requestUpload).toHaveBeenCalledWith(
      'movimentacoes-agosto', requestBody,
    );

    const confirmed = await api(new Request(
      'http://localhost/api/artifacts/uploads/2544c29b-d789-5c70-aee2-adc90cba79b7/confirm',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        },
        body: JSON.stringify({ runId: 'inputs-2026-08-13' }),
      },
    ));
    expect(confirmed.status).toBe(200);
    expect(await json(confirmed)).toMatchObject({
      provider: 'SUPABASE_STORAGE', kind: 'RAW_FILE', sha256: 'a'.repeat(64),
    });
    expect(artifactIntakeService.confirmUpload).toHaveBeenCalledWith(
      'inputs-2026-08-13', '2544c29b-d789-5c70-aee2-adc90cba79b7',
    );
  });

  test('traduz conflito de idempotência para HTTP 409', async () => {
    const { api, commandService } = fixture();
    commandService.requestPddeInfo.mockRejectedValueOnce(
      new Error('Fila de execuções (enqueue_execution_job): idempotency conflict.'),
    );
    const response = await api(new Request('http://localhost/api/executions/pddeinfo', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        'idempotency-key': 'mesma-chave-outro-pedido',
      },
      body: JSON.stringify({ fiscalYear: 2026 }),
    }));
    expect(response.status).toBe(409);
    await expect(json(response)).resolves.toMatchObject({
      error: expect.stringMatching(/idempotência/i),
    });
  });

  test('traduz artefato sem evidência institucional exata para HTTP 409', async () => {
    const { api, commandService } = fixture();
    commandService.requestReconciliation.mockRejectedValueOnce(
      new ReconciliationArtifactEvidenceError(
        'Movimentações: não há evidência ARTIFACT_PRESERVED exata.',
      ),
    );
    const response = await api(new Request('http://localhost/api/reconciliations', {
      method: 'POST',
      headers: {
        'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
        'idempotency-key': 'artefato-nao-confirmado',
      },
      body: JSON.stringify({ fiscalYear: 2026 }),
    }));
    expect(response.status).toBe(409);
    await expect(json(response)).resolves.toMatchObject({
      error: expect.stringMatching(/evidência|preserved/i),
    });
  });

  test('traduz falhas esperadas da ingestão sem expor erro interno', async () => {
    const { api, artifactIntakeService } = fixture();
    const headers = {
      'content-type': 'application/json', authorization: 'Bearer segredo-administrativo',
      'idempotency-key': 'upload-repetido',
    };
    artifactIntakeService.requestUpload.mockRejectedValueOnce(
      new ArtifactUploadIdempotencyConflictError('Conflito de idempotência no upload.'),
    );
    const conflict = await api(new Request('http://localhost/api/artifacts/uploads', {
      method: 'POST', headers,
      body: JSON.stringify({ runId: 'run-1' }),
    }));
    expect(conflict.status).toBe(409);

    artifactIntakeService.confirmUpload.mockRejectedValueOnce(
      new ArtifactUploadIntegrityError('SHA-256 divergente no upload.'),
    );
    const integrity = await api(new Request(
      'http://localhost/api/artifacts/uploads/2544c29b-d789-5c70-aee2-adc90cba79b7/confirm',
      {
        method: 'POST', headers,
        body: JSON.stringify({ runId: 'run-1' }),
      },
    ));
    expect(integrity.status).toBe(409);

    artifactIntakeService.confirmUpload.mockRejectedValueOnce(
      new ArtifactUploadNotFoundError('Solicitação de upload não encontrada.'),
    );
    const notFound = await api(new Request(
      'http://localhost/api/artifacts/uploads/2544c29b-d789-5c70-aee2-adc90cba79b7/confirm',
      {
        method: 'POST', headers,
        body: JSON.stringify({ runId: 'run-1' }),
      },
    ));
    expect(notFound.status).toBe(404);
  });

  test('responde 404/405 em vez de cair no legado AppDeploy', async () => {
    const { api } = fixture();
    expect((await api(new Request('http://localhost/api/inexistente'))).status).toBe(404);
    expect((await api(new Request('http://localhost/api/health', { method: 'POST' }))).status).toBe(405);
  });
});
