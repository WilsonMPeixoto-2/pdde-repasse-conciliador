#!/usr/bin/env node
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { assistSigefReleaseExports } from '../backend/application/assist-sigef-release-exports';
import { buildReleaseAssistantWorkbook } from '../backend/report/release-assistant-workbook';

const HELP = `
Uso:
  npm run releases:assist -- \\
    --pdde-info /caminho/pddeinfo.json \\
    --workspace /caminho/coleta-liberacoes \\
    --year 2026 \\
    [--generated-at 2026-08-12T10:00:00-03:00]

O assistente varre arquivos .xls do workspace, preserva os originais, valida CNPJ,
programa, exercício e carteira, gera arquivos canônicos CNPJ__PROGRAMA.xls em
workspace/liberacoes e grava a planilha de controle em workspace/controle.
`;

export interface ParsedArguments {
  values: Map<string, string>;
  help: boolean;
}

const KNOWN_ARGUMENTS = new Set([
  '--pdde-info',
  '--workspace',
  '--year',
  '--generated-at',
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

export function optionsFromArguments(parsed: ParsedArguments): {
  pddeInfoPath: string;
  workspacePath: string;
  fiscalYear: number;
  generatedAt?: string;
} {
  const fiscalYear = Number(required(parsed.values, '--year'));
  if (!Number.isInteger(fiscalYear)) throw new Error('--year deve ser um número inteiro.');
  const generatedAt = parsed.values.get('--generated-at');
  return {
    pddeInfoPath: required(parsed.values, '--pdde-info'),
    workspacePath: required(parsed.values, '--workspace'),
    fiscalYear,
    ...(generatedAt ? { generatedAt } : {}),
  };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const parsed = parseArguments(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    return;
  }
  const result = await assistSigefReleaseExports(optionsFromArguments(parsed));
  const workbook = await buildReleaseAssistantWorkbook(result);
  await writeFile(result.workspace.controlWorkbookPath, workbook);
  process.stdout.write(`${JSON.stringify({
    fiscalYear: result.fiscalYear,
    summary: result.summary,
    releasesDirectory: result.workspace.releasesDirectory,
    controlWorkbookPath: result.workspace.controlWorkbookPath,
  }, null, 2)}\n`);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`Falha no Assistente de Liberações: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
