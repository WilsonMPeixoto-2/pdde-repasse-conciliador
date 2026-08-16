#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectPddeInfoPublicPortfolio } from '../backend/application/collect-pddeinfo-public-portfolio';
import { loadMasterSchools } from '../backend/application/school-catalog';

const DEFAULT_INEPS = [
  '33069247', '33069093', '33069433', '33069379', '33069271',
  '33069409', '33069360', '33069468', '33069220', '33069328',
];

interface Options {
  ineps: string[] | 'ALL';
  output: string;
  workspace: string;
}

function parseArgs(argv: string[]): Options {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    args.set(key, value);
  }
  const rawIneps = args.get('--ineps');
  const ineps = rawIneps?.toLowerCase() === 'all'
    ? 'ALL' as const
    : rawIneps
      ? rawIneps.split(',').map((value) => value.trim()).filter(Boolean)
      : DEFAULT_INEPS;
  if (ineps !== 'ALL') {
    if (ineps.some((value) => !/^\d{8}$/.test(value))) throw new Error('--ineps contém INEP inválido.');
    if (new Set(ineps).size !== ineps.length) throw new Error('--ineps contém INEP duplicado.');
  }
  return {
    ineps,
    output: resolve(args.get('--output') ?? 'artifacts/backfill-public-balances-2026.json'),
    workspace: resolve(args.get('--workspace') ?? '.tmp/backfill-public-balances-2026'),
  };
}

function artifactFilename(index: number, item: { kind: string; schoolInep?: string; cnpj?: string; coverageThrough: string | null }): string {
  const identity = item.schoolInep ?? item.cnpj ?? String(index + 1).padStart(4, '0');
  const reference = item.coverageThrough ?? 'consulta';
  return `${item.kind.toLowerCase()}-${identity}-${reference}.html`;
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const master = await loadMasterSchools();
  const requested = options.ineps === 'ALL' ? null : new Set(options.ineps);
  const selected = requested ? master.filter((school) => requested.has(school.inep)) : master;
  if (requested && selected.length !== requested.size) {
    const found = new Set(selected.map((school) => school.inep));
    const missing = [...requested].filter((inep) => !found.has(inep));
    throw new Error(`INEP fora da lista-mestre: ${missing.join(', ')}.`);
  }

  const result = await collectPddeInfoPublicPortfolio({
    schools: selected,
    fiscalYear: 2026,
    balanceMode: 'ALL_AVAILABLE_2026',
    browserFallback: false,
  });

  const rawPath = join(options.workspace, 'raw');
  await mkdir(rawPath, { recursive: true });
  for (const [index, item] of result.artifacts.entries()) {
    await writeFile(join(rawPath, artifactFilename(index, item)), item.rawBytes);
  }

  const { artifacts, ...normalized } = result;
  const output = {
    fiscalYear: 2026,
    selectedSchools: selected.length,
    collectedAt: new Date().toISOString(),
    ...normalized,
    preservedRawArtifacts: artifacts.length,
  };
  await mkdir(dirname(options.output), { recursive: true });
  await writeFile(options.output, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    fiscalYear: 2026,
    selectedSchools: selected.length,
    balanceReferenceMonth: result.balanceReferenceMonth,
    coverageThrough: result.coverageThrough,
    attendanceRows: result.attendance.length,
    accountingRows: result.accounting.length,
    balanceRows: result.balances.length,
    failures: result.failures.length,
    rawArtifacts: result.artifacts.length,
    output: options.output,
    workspace: options.workspace,
  }, null, 2));

  if (result.failures.length > 0) process.exitCode = 2;
}

const executedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executedAsScript) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.stack ?? cause.message : cause);
    process.exitCode = 1;
  });
}
