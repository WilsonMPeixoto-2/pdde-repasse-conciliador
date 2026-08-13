#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ExecutionWorkerResult } from '../backend/application/execution-worker';
import { createInstitutionalWorkerRuntime } from '../backend/runtime/institutional-runtime';

function pollMilliseconds(raw: string | undefined): number {
  const value = Number(raw ?? 5_000);
  if (!Number.isInteger(value) || value < 250 || value > 60_000) {
    throw new Error('PDDE_WORKER_POLL_MS deve estar entre 250 e 60000.');
  }
  return value;
}

interface WorkerLoop {
  runOnce(): Promise<ExecutionWorkerResult | null>;
}

interface WorkerLoopOptions {
  pollMs: number;
  once?: boolean;
  signal?: AbortSignal;
  onResult?: (result: ExecutionWorkerResult) => void;
}

function sleep(milliseconds: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.resolve();
  return new Promise((resolveDelay) => {
    const finish = (): void => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolveDelay();
    };
    const timer = setTimeout(finish, milliseconds);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

export async function runWorkerLoop(
  worker: WorkerLoop,
  options: WorkerLoopOptions,
): Promise<void> {
  while (!options.signal?.aborted) {
    const result = await worker.runOnce();
    if (result) options.onResult?.(result);
    if (options.once || options.signal?.aborted) return;
    if (!result) await sleep(options.pollMs, options.signal);
  }
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const allowed = new Set(['--once', '--recover-interrupted']);
  const unknown = args.filter((argument) => !allowed.has(argument));
  if (unknown.length > 0) throw new Error(`Argumento desconhecido: ${unknown[0]}.`);
  const once = args.includes('--once');
  const recoverInterrupted = args.includes('--recover-interrupted');
  const pollMs = pollMilliseconds(process.env.PDDE_WORKER_POLL_MS);
  const shutdown = new AbortController();
  const requestShutdown = (): void => shutdown.abort();
  process.once('SIGTERM', requestShutdown);
  process.once('SIGINT', requestShutdown);

  try {
    const { worker } = await createInstitutionalWorkerRuntime();
    if (recoverInterrupted) {
      const recovered = await worker.recoverInterrupted();
      process.stdout.write(`${JSON.stringify({ recoveredInterrupted: recovered })}\n`);
    }
    await runWorkerLoop(worker, {
      pollMs,
      once,
      signal: shutdown.signal,
      onResult: (result) => process.stdout.write(`${JSON.stringify(result)}\n`),
    });
  } finally {
    process.off('SIGTERM', requestShutdown);
    process.off('SIGINT', requestShutdown);
  }
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((cause: unknown) => {
    process.stderr.write(`Falha no runner institucional: ${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
