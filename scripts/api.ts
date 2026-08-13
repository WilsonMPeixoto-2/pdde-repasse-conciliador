#!/usr/bin/env node
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

export async function main(): Promise<void> {
  const { api, version } = await createInstitutionalApiRuntime();
  const port = portFromEnvironment(process.env.PORT);
  const host = process.env.HOST?.trim() || '0.0.0.0';
  const server = createNodeApiServer(api, {
    onError: (cause) => process.stderr.write(
      `Falha HTTP: ${cause instanceof Error ? cause.message : String(cause)}\n`,
    ),
  });
  await new Promise<void>((resolveListening, reject) => {
    server.once('error', reject);
    server.listen(port, host, resolveListening);
  });
  process.stdout.write(`PDDE backend institucional v${version} ouvindo em ${host}:${port}.\n`);
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
