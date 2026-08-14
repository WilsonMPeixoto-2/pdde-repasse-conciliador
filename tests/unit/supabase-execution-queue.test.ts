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
  started_at: null,
  completed_at: null,
  last_error: null,
};

class FakeClient {
  readonly calls: Array<{ name: string; parameters?: Record<string, unknown> }> = [];
  responses = new Map<string, { data: unknown; error: unknown }>([
    ['enqueue_execution_job', { data: row, error: null }],
    ['claim_execution_job', { data: { ...row, status: 'RUNNING', started_at: '2026-08-13T12:01:00Z' }, error: null }],
    ['recover_interrupted_execution_jobs', { data: 1, error: null }],
    ['complete_execution_job', { data: { ...row, status: 'COMPLETE', started_at: '2026-08-13T12:01:00Z', completed_at: '2026-08-13T12:02:00Z' }, error: null }],
  ]);

  async rpc(name: string, parameters?: Record<string, unknown>) {
    this.calls.push({ name, parameters });
    return this.responses.get(name) ?? { data: null, error: { message: 'RPC desconhecido' } };
  }
}

describe('SupabaseExecutionQueue', () => {
  test('enfileira sem conceitos de lease ou tentativa', async () => {
    const client = new FakeClient();
    const queue = new SupabaseExecutionQueue(client);
    const job = await queue.enqueue({
      jobId: row.job_id,
      runId: row.run_id,
      kind: 'PDDEINFO',
      idempotencyKey: row.idempotency_key,
      fiscalYear: 2026,
      requestHash: row.request_hash,
      payload: { fiscalYear: 2026 },
      requestedAt: row.requested_at,
    });
    expect(job).toMatchObject({ status: 'QUEUED', startedAt: null, completedAt: null });
    expect(client.calls[0].parameters).not.toHaveProperty('p_max_attempts');
  });

  test('reclama, conclui e recupera interrupção por operações simples', async () => {
    const client = new FakeClient();
    const queue = new SupabaseExecutionQueue(client);
    await expect(queue.claim()).resolves.toMatchObject({ status: 'RUNNING' });
    await expect(queue.complete({ jobId: row.job_id, status: 'COMPLETE' }))
      .resolves.toMatchObject({ status: 'COMPLETE' });
    await expect(queue.recoverInterrupted()).resolves.toBe(1);
    expect(client.calls.map((call) => call.name)).toEqual([
      'claim_execution_job', 'complete_execution_job', 'recover_interrupted_execution_jobs',
    ]);
  });

  test('retorna null quando não há trabalho e propaga erro de banco', async () => {
    const client = new FakeClient();
    client.responses.set('claim_execution_job', { data: null, error: null });
    const queue = new SupabaseExecutionQueue(client);
    await expect(queue.claim()).resolves.toBeNull();

    client.responses.set('enqueue_execution_job', {
      data: null,
      error: { message: 'idempotency conflict' },
    });
    await expect(queue.enqueue({
      jobId: row.job_id,
      runId: row.run_id,
      kind: 'PDDEINFO',
      idempotencyKey: row.idempotency_key,
      fiscalYear: 2026,
      requestHash: row.request_hash,
      payload: { fiscalYear: 2026 },
      requestedAt: row.requested_at,
    })).rejects.toThrow(/fila.*idempotency conflict/i);
  });
});
