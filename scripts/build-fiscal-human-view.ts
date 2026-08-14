#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildFiscalHumanView } from '../backend/application/build-fiscal-human-view';

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
    output: resolve(args.get('--output') ?? 'artifacts/monitor-fiscal-2026.json'),
  };
}

const options = parseArgs(process.argv.slice(2));
const raw = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
const view = buildFiscalHumanView(raw);
await mkdir(dirname(options.output), { recursive: true });
await writeFile(options.output, `${JSON.stringify(view, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify({
  output: options.output,
  schools: view.schools.length,
  repasseGroups: view.schools.reduce((total, school) => total + school.repasses.length, 0),
  statementAccounts: view.schools.reduce((total, school) => total + school.statements.length, 0),
  statementEntries: view.schools.reduce((total, school) => (
    total + school.statements.reduce((subtotal, statement) => subtotal + statement.entries.length, 0)
  ), 0),
}, null, 2)}\n`);
