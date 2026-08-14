#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildMonitoringOperationalView } from '../backend/application/build-monitoring-operational-view';

function parseArgs(argv: string[]): { input: string; output: string } {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    }
    args.set(key, value);
  }
  return {
    input: resolve(args.get('--input') ?? 'artifacts/monitor-all-163-2026.json'),
    output: resolve(args.get('--output') ?? 'artifacts/monitor-operational-2026.json'),
  };
}

const options = parseArgs(process.argv.slice(2));
const raw = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
const view = buildMonitoringOperationalView(raw);
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(view, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  output: options.output,
  summary: view.summary,
  alerts: view.alerts.length,
}, null, 2)}\n`);
