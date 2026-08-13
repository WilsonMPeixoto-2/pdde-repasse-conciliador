import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import {
  createSupabaseBackendClient,
  loadSupabaseBackendConfig,
} from '../../backend/adapters/supabase-backend-client';
import { SupabaseArtifactStore } from '../../backend/adapters/supabase-artifact-store';
import { SupabaseEvidenceStore } from '../../backend/adapters/supabase-evidence-store';
import { SupabaseExecutionQueue } from '../../backend/adapters/supabase-execution-queue';
import { ExecutionCommandService } from '../../backend/application/execution-command-service';

const enabled = process.env.SUPABASE_INSTITUTIONAL_LIVE === '1';

describe.runIf(enabled)('backend institucional no Supabase real', () => {
  test('valida Storage imutável, fila transacional e cadeia de evidências', async () => {
    const client = createSupabaseBackendClient(loadSupabaseBackendConfig());
    const artifacts = new SupabaseArtifactStore(client);
    const evidence = new SupabaseEvidenceStore(client);
    const queue = new SupabaseExecutionQueue(client);
    const suffix = randomUUID();

    const preserved = await artifacts.preserve({
      runId: `live-artifact-${suffix}`,
      relativePath: 'contract/sample.json',
      kind: 'NORMALIZED_JSON',
      bytes: Buffer.from('{"contract":"v0.5"}\n', 'utf8'),
      mediaType: 'application/json',
      metadata: { test: true },
    });
    await expect(artifacts.download(preserved)).resolves.toEqual(
      Buffer.from('{"contract":"v0.5"}\n', 'utf8'),
    );
    await expect(artifacts.createSignedDownload({
      ...preserved,
      expiresInSeconds: 60,
      downloadName: 'sample.json',
    })).resolves.toMatchObject({ url: expect.stringMatching(/^https?:\/\//) });

    const command = new ExecutionCommandService(queue);
    const receipt = await command.requestPddeInfo(`live-contract-${suffix}`, {
      fiscalYear: 2026,
      schoolIneps: ['33069247'],
      batchSize: 1,
      batchDelayMs: 0,
    });
    const workerId = `live-test:${suffix}`;
    const claimed = await queue.claim({ workerId, leaseSeconds: 60 });
    expect(claimed).toMatchObject({ jobId: receipt.jobId, runId: receipt.runId, attempts: 1 });
    await expect(queue.renewLease({
      jobId: receipt.jobId, workerId, leaseSeconds: 60,
    })).resolves.toMatchObject({ status: 'RUNNING' });
    await expect(queue.complete({
      jobId: receipt.jobId,
      workerId,
      status: 'FAILED',
      error: 'Teste live do transporte; nenhuma coleta foi executada.',
    })).resolves.toMatchObject({ status: 'FAILED' });

    const events = await evidence.listByRun(receipt.runId);
    expect(events.map((event) => event.type)).toEqual([
      'EXECUTION_REQUESTED', 'EXECUTION_STARTED', 'EXECUTION_FINISHED',
    ]);
    await expect(evidence.verifyIntegrity()).resolves.toMatchObject({ valid: true });
  }, 30_000);
});
