#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { JsonlEvidenceStore } from '../backend/adapters/jsonl-evidence-store';
import { EvidenceHistoryReader } from '../backend/application/evidence-history';

const HELP = `
Uso:
  npm run evidence:inspect -- --store /caminho/events.jsonl --run <run-id>
  npm run evidence:inspect -- --store /caminho/events.jsonl --school <INEP>

A integridade da cadeia SHA-256 é verificada antes da consulta. Se a trilha estiver
corrompida, a inspeção é bloqueada.
`;

export interface ParsedArguments {
  values: Map<string, string>;
  help: boolean;
}

export interface InspectEvidenceOptions {
  storePath: string;
  mode: 'run' | 'school';
  value: string;
}

const KNOWN_ARGUMENTS = new Set(['--store', '--run', '--school']);

export function parseArguments(args: string[]): ParsedArguments {
  const values = new Map<string, string>();
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (!argument.startsWith('--')) throw new Error(`Argumento inesperado: ${argument}.`);
    if (!KNOWN_ARGUMENTS.has(argument)) throw new Error(`Argumento desconhecido: ${argument}.`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Valor ausente para ${argument}.`);
    if (values.has(argument)) throw new Error(`Argumento duplicado: ${argument}.`);
    values.set(argument, value);
    index += 1;
  }
  return { values, help };
}

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name);
  if (!value) throw new Error(`Argumento obrigatório ausente: ${name}.`);
  return value;
}

export function optionsFromArguments(parsed: ParsedArguments): InspectEvidenceOptions {
  const runId = parsed.values.get('--run');
  const schoolInep = parsed.values.get('--school');
  if (runId && schoolInep) throw new Error('Use --run ou --school, nunca os dois.');
  if (!runId && !schoolInep) throw new Error('Informe --run ou --school para inspecionar a trilha.');
  if (schoolInep && !/^\d{8}$/.test(schoolInep)) {
    throw new Error('--school deve conter um INEP com 8 dígitos.');
  }
  return {
    storePath: required(parsed.values, '--store'),
    mode: runId ? 'run' : 'school',
    value: runId ?? schoolInep!,
  };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const parsed = parseArguments(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    return;
  }

  const options = optionsFromArguments(parsed);
  const store = new JsonlEvidenceStore(resolve(options.storePath));
  const integrity = await store.verifyIntegrity();
  if (!integrity.valid) {
    throw new Error(
      `Trilha de evidências inválida na sequência ${integrity.brokenAtSequence ?? '?'}: ${integrity.reason ?? 'integridade não comprovada'}.`,
    );
  }

  const reader = new EvidenceHistoryReader(store);
  const result = options.mode === 'run'
    ? await reader.getRun(options.value)
    : await reader.getSchoolHistory(options.value);
  if (options.mode === 'run' && result === null) {
    throw new Error(`Execução não localizada na trilha: ${options.value}.`);
  }

  process.stdout.write(`${JSON.stringify({ integrity, result }, null, 2)}\n`);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`Falha ao inspecionar evidências: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
