import { describe, expect, test, vi } from 'vitest';
import { runWorkerLoop } from '../../scripts/worker';

describe('runner institucional', () => {
  test('interrompe imediatamente uma espera ociosa quando recebe sinal de encerramento', async () => {
    const shutdown = new AbortController();
    const runOnce = vi.fn(async () => null);
    const pending = runWorkerLoop({ runOnce }, {
      pollMs: 60_000,
      signal: shutdown.signal,
    });

    await vi.waitFor(() => expect(runOnce).toHaveBeenCalledTimes(1));
    shutdown.abort();

    await expect(pending).resolves.toBeUndefined();
    expect(runOnce).toHaveBeenCalledTimes(1);
  });

  test('termina o job em andamento antes de encerrar e não reclama outro', async () => {
    const shutdown = new AbortController();
    let finish: (() => void) | undefined;
    let resolveStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const runOnce = vi.fn(() => {
      resolveStarted?.();
      return new Promise<{
        jobId: string;
        runId: string;
        status: 'COMPLETE';
      }>((resolveJob) => {
        finish = () => resolveJob({ jobId: 'job-1', runId: 'run-1', status: 'COMPLETE' });
      });
    });
    const onResult = vi.fn();
    const pending = runWorkerLoop({ runOnce }, {
      pollMs: 250,
      signal: shutdown.signal,
      onResult,
    });

    await started;
    shutdown.abort();
    finish?.();

    await expect(pending).resolves.toBeUndefined();
    expect(runOnce).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith({
      jobId: 'job-1', runId: 'run-1', status: 'COMPLETE',
    });
  });

  test('propaga erro de infraestrutura sem criar busy-loop', async () => {
    const runOnce = vi.fn(async () => { throw new Error('fila indisponível'); });

    await expect(runWorkerLoop({ runOnce }, { pollMs: 250 }))
      .rejects.toThrow('fila indisponível');
    expect(runOnce).toHaveBeenCalledTimes(1);
  });
});
