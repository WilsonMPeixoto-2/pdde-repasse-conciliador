import { describe, expect, test } from 'vitest';
import { SupabaseExecutionQueue } from '../../backend/adapters/supabase-execution-queue';

const row = {
  job_id: '11111111-1111-4111-8111-111111111111',
  run_id: 'pddeinfo-abc123',
  job_kind: 'PDDEINFO',
  status: 'QUEUED',
  idempotency_key: 'coleta-agosto',
  request_hash: 'a'.repeat(64),
  request_payload: { fiscalYear: 2026 },
  requested_at: '2026-08-13T12:00:00Z',
  available_at: '2026-08-13T12:00:00Z',
  claimed_at: null,
  lease_expires_at: null,
  completed_at: null,
  worker_id: null,
  attempts: 0,
  max_attempts: 3,
  last_error: null,
};

class FakeClient {
  readonly calls: Array<{ name: string; parameters?: Record<string, unknown> }> = [];
  responses = new Map<string, { data: unknown; error: unknown }>([
    ['enqueue_execution_job', { data: row, error: null }],
    ['claim_execution_job', { data: { ...row, status: 'RUNNING', worker_id: 'worker-1', attempts: 1 }, error: null }],
    ['renew_execution_job_lease', { data: { ...row, status: 'RUNNING', worker_id: 'worker-1', attempts: 1 }, error: null }],
    ['complete_execution_job', { data: { ...row, status: 'COMPLETE', worker_id: 'worker-1' }, error: null }],
  ]);

  async rpc(name: string, parameters?: Record<string, unknown>) {
    this.calls.push({ name, parameters });
    return this.responses.get(name) ?? { data: null, error: { message: 'RPC desconhecido' } };
  }
}

describe('SupabaseExecutionQueue', () => {
  test('enfileira de forma idempotente e mapeia o job persistido', async () => {
    const client = new FakeClient();
    const queue = new SupabaseExecutionQueue(client);
    const job = await queue.enqueue({
      jobId: '11111111-1111-4111-8111-111111111111',
      runId: 'pddeinfo-abc123',
      kind: 'PDDEINFO',
      idempotencyKey: 'coleta-agosto',
      fiscalYear: 2026,
      requestHash: 'a'.repeat(64),
      payload: { fiscalYear: 2026 },
      requestedAt: '2026-08-13T12:00:00Z',
      maxAttempts: 3,
    });

    expect(job).toMatchObject({
      jobId: '11111111-1111-4111-8111-111111111111',
      runId: 'pddeinfo-abc123',
      kind: 'PDDEINFO',
      status: 'QUEUED',
      payload: { fiscalYear: 2026 },
      attempts: 0,
    });
    expect(client.calls[0]).toEqual({
      name: 'enqueue_execution_job',
      parameters: expect.objectContaining({
        p_run_id: 'pddeinfo-abc123',
        p_job_kind: 'PDDEINFO',
        p_idempotency_key: 'coleta-agosto',
        p_fiscal_year: 2026,
        p_request_hash: 'a'.repeat(64),
      }),
    });
  });

  test('reclama com lease, renova e conclui somente pelo worker proprietário', async () => {
    const client = new FakeClient();
    const queue = new SupabaseExecutionQueue(client);

    await expect(queue.claim({ workerId: 'worker-1', leaseSeconds: 120 })).resolves.toMatchObject({
      status: 'RUNNING', workerId: 'worker-1', attempts: 1,
    });
    await expect(queue.renewLease({
      jobId: row.job_id,
      workerId: 'worker-1',
      attempt: 1,
      leaseSeconds: 120,
    })).resolves.toMatchObject({ status: 'RUNNING' });
    await expect(queue.complete({
      jobId: row.job_id,
      workerId: 'worker-1',
      attempt: 1,
      status: 'COMPLETE',
    })).resolves.toMatchObject({ status: 'COMPLETE' });

    expect(client.calls.map((call) => call.name)).toEqual([
      'claim_execution_job',
      'renew_execution_job_lease',
      'complete_execution_job',
    ]);
    expect(client.calls[1].parameters).toMatchObject({ p_attempt: 1 });
    expect(client.calls[2].parameters).toMatchObject({ p_attempt: 1 });
  });

  test('retorna null quando a fila está vazia e propaga erro de banco com clareza', async () => {
    const client = new FakeClient();
    client.responses.set('claim_execution_job', { data: null, error: null });
    const queue = new SupabaseExecutionQueue(client);
    await expect(queue.claim({ workerId: 'worker-1', leaseSeconds: 120 })).resolves.toBeNull();

    client.responses.set('claim_execution_job', {
      data: { job_id: null, run_id: null, job_kind: null }, error: null,
    });
    await expect(queue.claim({ workerId: 'worker-1', leaseSeconds: 120 })).resolves.toBeNull();

    client.responses.set('enqueue_execution_job', { data: null, error: { message: 'idempotency conflict' } });
    await expect(queue.enqueue({
      jobId: '11111111-1111-4111-8111-111111111111',
      runId: 'pddeinfo-abc123',
      kind: 'PDDEINFO',
      idempotencyKey: 'coleta-agosto',
      fiscalYear: 2026,
      requestHash: 'a'.repeat(64),
      payload: { fiscalYear: 2026 },
      requestedAt: '2026-08-13T12:00:00Z',
      maxAttempts: 3,
    })).rejects.toThrow(/fila.*idempotency conflict/i);
  });

  test('classifica separadamente a perda definitiva do lease', async () => {
    const client = new FakeClient();
    client.responses.set('renew_execution_job_lease', {
      data: null,
      error: { code: 'PDE01', message: 'PDDE_LEASE_LOST: lease expirou: job/1' },
    });
    const queue = new SupabaseExecutionQueue(client);

    await expect(queue.renewLease({
      jobId: row.job_id,
      workerId: 'worker-1',
      attempt: 1,
      leaseSeconds: 120,
    })).rejects.toMatchObject({
      name: 'ExecutionLeaseLostError',
      message: expect.stringMatching(/lease expirou/i),
    });

    client.responses.set('complete_execution_job', {
      data: null,
      error: {
        code: 'PDE01',
        message: 'PDDE_LEASE_LOST: tentativa não está RUNNING para o worker: job/1',
      },
    });
    await expect(queue.complete({
      jobId: row.job_id,
      workerId: 'worker-1',
      attempt: 1,
      status: 'COMPLETE',
    })).rejects.toMatchObject({ name: 'ExecutionLeaseLostError' });

    client.responses.set('renew_execution_job_lease', {
      data: null,
      error: { message: 'proxy indisponível ao verificar se o lease expirou' },
    });
    await expect(queue.renewLease({
      jobId: row.job_id,
      workerId: 'worker-1',
      attempt: 1,
      leaseSeconds: 120,
    })).rejects.toMatchObject({ name: 'Error' });
  });
});
