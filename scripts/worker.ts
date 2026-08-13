#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInstitutionalWorkerRuntime } from '../backend/runtime/institutional-runtime';

function pollMilliseconds(raw: string | undefined): number {
  const value = Number(raw ?? 5_000);
  if (!Number.isInteger(value) || value < 250 || value > 60_000) {
    throw new Error('PDDE_WORKER_POLL_MS deve estar entre 250 e 60000.');
  }
  return value;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const unknown = args.filter((argument) => argument !== '--once');
  if (unknown.length > 0) throw new Error(`Argumento desconhecido: ${unknown[0]}.`);
  const once = args.includes('--once');
  const pollMs = pollMilliseconds(process.env.PDDE_WORKER_POLL_MS);
  const { worker, workerId } = await createInstitutionalWorkerRuntime();

  do {
    const result = await worker.runOnce();
    if (result) process.stdout.write(`${JSON.stringify({ workerId, ...result })}\n`);
    if (once) return;
    if (!result) await sleep(pollMs);
  } while (true);
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
