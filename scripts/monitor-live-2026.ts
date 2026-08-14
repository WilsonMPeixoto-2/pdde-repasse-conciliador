#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMasterSchools } from '../backend/application/school-catalog';
import { runMonitoring } from '../backend/application/run-monitoring';

const DEFAULT_INEPS = [
  '33069247', '33069093', '33069433', '33069379', '33069271',
  '33069409', '33069360', '33069468', '33069220', '33069328',
];

interface CliOptions {
  year: 2026;
  ineps: string[];
  workspace: string;
  output: string;
}

function args(argv: string[]): CliOptions {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i];
    const value = argv[i + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    }
    map.set(key, value);
  }

  const year = Number(map.get('--year') ?? '2026');
  if (year !== 2026) {
    throw new Error('--year deve ser 2026: o monitoramento operacional corrente é exclusivo do exercício de 2026.');
  }

  const ineps = map.get('--ineps')?.split(',').map((value) => value.trim()).filter(Boolean) ?? DEFAULT_INEPS;
  if (ineps.some((value) => !/^\d{8}$/.test(value))) throw new Error('--ineps contém INEP inválido.');
  if (new Set(ineps).size !== ineps.length) throw new Error('--ineps contém INEP duplicado.');

  return {
    year: 2026,
    ineps,
    workspace: resolve(map.get('--workspace') ?? '.tmp/monitor-live-2026'),
    output: resolve(map.get('--output') ?? 'artifacts/monitor-live-2026.json'),
  };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const opt = args(argv);
  const master = await loadMasterSchools();
  const byInep = new Map(master.map((school) => [school.inep, school]));
  const selected = opt.ineps.map((inep) => {
    const school = byInep.get(inep);
    if (!school) throw new Error(`INEP ${inep} não está na lista-mestre.`);
    return school;
  });

  const result = await runMonitoring({
    schools: selected,
    workspacePath: opt.workspace,
    fiscalYear: opt.year,
    runId: 'monitor-live-2026',
    manageExecutionLifecycle: false,
  });

  await mkdir(dirname(opt.output), { recursive: true });
  await writeFile(opt.output, `${JSON.stringify(result.raw, null, 2)}\n`, 'utf8');

  console.log(JSON.stringify({
    status: result.status,
    output: opt.output,
    workspace: opt.workspace,
    coverage: result.raw.coverage,
    summary: result.raw.summary,
  }, null, 2));

  if (result.status !== 'COMPLETE') process.exitCode = 2;
}

const executedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;

if (executedAsScript) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.stack ?? cause.message : cause);
    process.exitCode = 1;
  });
}
