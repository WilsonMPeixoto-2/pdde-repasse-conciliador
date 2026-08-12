#!/usr/bin/env node
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { reconcileFiles, type ReconcileFilesOptions } from '../backend/application/reconcile-files';

const HELP = `
Uso:
  npm run reconcile -- \\
    --pdde-info /caminho/pddeinfo.json \\
    --movements /caminho/extrato-bancario.csv \\
    --output /caminho/conciliacao.xlsx \\
    --year 2026 \\
    --requested-through 2026-08-11 \\
    [--release-manifest /caminho/liberacoes.json] \\
    [--releases-dir /caminho/exportacoes] \\
    [--releases-source-url https://www.fnde.gov.br/sigefweb/index.php/liberacoes] \\
    [--generated-at 2026-08-11T23:59:00-03:00] \\
    [--title "Conciliação PDDE — 4ª CRE"] \\
    [--overwrite]

Manifesto opcional de Liberações (JSON):
[
  {
    "path": "./exports/12345678000190__02.xls",
    "programCode": "02",
    "sourceUrl": "https://www.fnde.gov.br/sigefweb/index.php/liberacoes/visualizaexcel/..."
  }
]

Como alternativa ao manifesto, --releases-dir importa todos os arquivos .xls da pasta.
Cada arquivo deve usar o nome CNPJ__PROGRAMA.xls, por exemplo:
  12345678000190__02.xls

Sem manifesto nem pasta, a ausência de Liberações é registrada como CONSULTA INCONCLUSIVA.
`;

export interface ParsedArguments {
  values: Map<string, string>;
  overwrite: boolean;
  help: boolean;
}

export function parseArguments(args: string[]): ParsedArguments {
  const values = new Map<string, string>();
  let overwrite = false;
  let help = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--overwrite') {
      overwrite = true;
      continue;
    }
    if (argument === '--help' || argument === '-h') {
      help = true;
      continue;
    }
    if (!argument.startsWith('--')) throw new Error(`Argumento inesperado: ${argument}`);
    const value = args[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Valor ausente para ${argument}.`);
    if (values.has(argument)) throw new Error(`Argumento duplicado: ${argument}.`);
    values.set(argument, value);
    index += 1;
  }
  return { values, overwrite, help };
}

function required(values: Map<string, string>, name: string): string {
  const value = values.get(name);
  if (!value) throw new Error(`Argumento obrigatório ausente: ${name}.`);
  return value;
}

export function optionsFromArguments(parsed: ParsedArguments): ReconcileFilesOptions {
  const known = new Set([
    '--pdde-info', '--movements', '--output', '--year', '--requested-through',
    '--release-manifest', '--releases-dir', '--releases-source-url',
    '--generated-at', '--title',
  ]);
  for (const name of parsed.values.keys()) {
    if (!known.has(name)) throw new Error(`Argumento desconhecido: ${name}.`);
  }
  const fiscalYear = Number(required(parsed.values, '--year'));
  if (!Number.isInteger(fiscalYear)) throw new Error('--year deve ser um número inteiro.');
  const releaseManifestPath = parsed.values.get('--release-manifest');
  const releaseDirectoryPath = parsed.values.get('--releases-dir');
  const releaseDirectorySourceUrl = parsed.values.get('--releases-source-url');
  if (releaseManifestPath && releaseDirectoryPath) {
    throw new Error('Use --release-manifest ou --releases-dir, nunca os dois.');
  }
  if (releaseDirectorySourceUrl && !releaseDirectoryPath) {
    throw new Error('--releases-source-url exige --releases-dir.');
  }
  return {
    pddeInfoPath: required(parsed.values, '--pdde-info'),
    movementsPath: required(parsed.values, '--movements'),
    outputPath: required(parsed.values, '--output'),
    fiscalYear,
    requestedThrough: required(parsed.values, '--requested-through'),
    ...(releaseManifestPath ? { releaseManifestPath } : {}),
    ...(releaseDirectoryPath ? { releaseDirectoryPath } : {}),
    ...(releaseDirectorySourceUrl ? { releaseDirectorySourceUrl } : {}),
    ...(parsed.values.get('--generated-at')
      ? { generatedAt: parsed.values.get('--generated-at')! }
      : {}),
    ...(parsed.values.get('--title') ? { title: parsed.values.get('--title')! } : {}),
    overwrite: parsed.overwrite,
  };
}

export async function main(args = process.argv.slice(2)): Promise<void> {
  const parsed = parseArguments(args);
  if (parsed.help) {
    process.stdout.write(HELP);
    return;
  }
  const result = await reconcileFiles(optionsFromArguments(parsed));
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

const isDirectExecution = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (isDirectExecution) {
  main().catch((error: unknown) => {
    process.stderr.write(`Falha na conciliação: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
