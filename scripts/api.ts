#!/usr/bin/env node
import type { Server } from 'node:http';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createInstitutionalApiRuntime } from '../backend/runtime/institutional-runtime';
import { createNodeApiServer } from '../backend/runtime/node-api-server';

function portFromEnvironment(raw: string | undefined): number {
  const port = Number(raw ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT deve ser um inteiro entre 1 e 65535.');
  }
  return port;
}

interface ApiServerOptions {
  host: string;
  port: number;
  signal: AbortSignal;
  onListening?: () => void;
}

function listen(server: Server, host: string, port: number): Promise<void> {
  return new Promise((resolveListening, rejectListening) => {
    const cleanup = (): void => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (cause: Error): void => {
      cleanup();
      rejectListening(cause);
    };
    const onListening = (): void => {
      cleanup();
      resolveListening();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, host);
  });
}

function close(server: Server): Promise<void> {
  if (!server.listening) return Promise.resolve();
  return new Promise((resolveClosed, rejectClosed) => {
    server.close((cause) => {
      if (cause) rejectClosed(cause);
      else resolveClosed();
    });
    server.closeIdleConnections();
  });
}

function waitForStop(
  server: Server,
  signal: AbortSignal,
): Promise<{ kind: 'ABORT' } | { kind: 'ERROR'; cause: unknown }> {
  if (signal.aborted) return Promise.resolve({ kind: 'ABORT' });
  return new Promise((resolveStop) => {
    const cleanup = (): void => {
      signal.removeEventListener('abort', onAbort);
      server.off('error', onError);
    };
    const onAbort = (): void => {
      cleanup();
      resolveStop({ kind: 'ABORT' });
    };
    const onError = (cause: unknown): void => {
      cleanup();
      resolveStop({ kind: 'ERROR', cause });
    };
    signal.addEventListener('abort', onAbort, { once: true });
    server.once('error', onError);
  });
}

export async function runApiServer(server: Server, options: ApiServerOptions): Promise<void> {
  if (options.signal.aborted) return;
  await listen(server, options.host, options.port);
  try {
    options.onListening?.();
    const stop = await waitForStop(server, options.signal);
    if (stop.kind === 'ERROR') throw stop.cause;
  } finally {
    await close(server);
  }
}

export async function main(): Promise<void> {
  const port = portFromEnvironment(process.env.PORT);
  const host = process.env.HOST?.trim() || '0.0.0.0';
  const shutdown = new AbortController();
  const requestShutdown = (): void => shutdown.abort();
  process.once('SIGTERM', requestShutdown);
  process.once('SIGINT', requestShutdown);

  try {
    const { api, version } = await createInstitutionalApiRuntime();
    const server = createNodeApiServer(api, {
      onError: (cause) => process.stderr.write(
        `Falha HTTP: ${cause instanceof Error ? cause.message : String(cause)}\n`,
      ),
    });
    await runApiServer(server, {
      host,
      port,
      signal: shutdown.signal,
      onListening: () => process.stdout.write(
        `PDDE backend institucional v${version} ouvindo em ${host}:${port}.\n`,
      ),
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
    process.stderr.write(`Falha ao iniciar API institucional: ${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
