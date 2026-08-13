#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import { collectPddeInfo } from '../backend/application/collect-pddeinfo';

const HELP = `
Uso:
  npm run pddeinfo:collect -- \\
    --workspace /caminho/coleta-pddeinfo \\
    --year 2026 \\
    [--batch-size 3] \\
    [--batch-delay-ms 1500]

A coleta usa a lista-mestre embutida das 163 escolas da 4ª CRE, consulta o PDDEInfo
por INEP, preserva HTML e JSON por unidade, registra hashes e gera um envelope
pddeinfo-<ano>.json compatível com o conciliador.

Uma execução com qualquer escola não concluída é marcada como PARTIAL e não deve
ser usada como fonte aprovada para conciliação.
`;

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();

const masterSchema = z.object({
  schools: z.array(schoolSchema).length(163),
}).strict();

export interface ParsedArguments {
  values: Map<string, string>;
  help: boolean;
}

const KNOWN_ARGUMENTS = new Set([
  '--workspace',
  '--year',
  '--batch-size',
  '--batch-delay-ms',
]);

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

function positiveInteger(value: string, name: string, minimum = 1): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} deve ser um número inteiro${minimum > 0 ? ` >= ${minimum}` : ''}.`);
  }
  return parsed;
}

export function optionsFromArguments(parsed: ParsedArguments): {
  workspacePath: string;
  fiscalYear: number;
  batchSize: number;
  batchDelayMs: number;
} {
  const fiscalYear = positiveInteger(required(parsed.values, '--year'), '--year', 2000);
  if (fiscalYear > 2100) throw new Error('--year deve estar entre 2000 e 2100.');
  const batchSize = parsed.values.has('--batch-size')
    ? positiveInteger(required(parsed.values, '--batch-size'), '--batch-size')
    : 3;
  if (batchSize > 20) throw new Error('--batch-size não pode ser maior que 20.');
  const batchDelayMs = parsed.values.has('--batch-delay-ms')
    ? positiveInteger(required(parsed.values, '--batch-delay-ms'), '--batch-delay-ms', 0)
    : 1_500;
  return {
    workspacePath: required(parsed.values, '--workspace'),
    fiscalYear,
    batchSize,
    batchDelayMs,
  };
}

export async function loadMasterSchools(): Promise<Array<{ inep: string; sme: string; nome: string }>> {
  const source = await readFile(new URL('../backend/schools4cre.json', import.meta.url), 'utf8');
  const parsed = masterSchema.parse(JSON.parse(source) as unknown);
  const uniqueIneps = new Set(parsed.schools.map((school) => school.inep));
  const uniqueSme = new Set(parsed.schools.map((school) => school.sme));
  if (uniqueIneps.size !== 163 || uniqueSme.size !== 163) {
    throw new Error('A lista-mestre das 163 escolas não é única por INEP/SME.');
  }
  return parsed.schools;
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const parsed = parseArguments(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    return;
  }

  const cliOptions = optionsFromArguments(parsed);
  const schools = await loadMasterSchools();
  const result = await collectPddeInfo({
    schools,
    ...cliOptions,
  });

  process.stdout.write(`${JSON.stringify({
    status: result.status,
    runId: result.runId,
    statistics: result.statistics,
    pddeInfoPath: result.pddeInfoPath,
    manifestPath: result.manifestPath,
    runDirectory: result.runDirectory,
  }, null, 2)}\n`);

  if (result.status === 'PARTIAL') {
    throw new Error(`Coleta PDDEInfo parcial: ${result.statistics.failed} de ${result.statistics.total} escola(s) não concluída(s). Consulte o manifest.json.`);
  }
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`Falha na coleta PDDEInfo: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
