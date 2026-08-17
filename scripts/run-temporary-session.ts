#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMasterSchools } from '../backend/application/school-catalog';
import { runTemporaryFinancialSession } from '../backend/application/temporary-financial-session';

export interface TemporarySessionCliOptions {
  ineps: 'all' | string[];
  workspace: string;
  outputDir: string;
}

export function parseTemporarySessionArgs(argv: string[]): TemporarySessionCliOptions {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) {
      throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    }
    args.set(key, value);
  }

  const rawIneps = args.get('--ineps')?.trim() || 'all';
  let ineps: 'all' | string[] = 'all';
  if (rawIneps.toLocaleLowerCase('pt-BR') !== 'all') {
    const values = rawIneps.split(',').map((value) => value.trim()).filter(Boolean);
    if (values.some((value) => !/^\d{8}$/.test(value))) {
      throw new Error('INEP inválido na consulta temporária.');
    }
    if (new Set(values).size !== values.length) {
      throw new Error('INEP duplicado na consulta temporária.');
    }
    if (values.length < 1 || values.length > 163) {
      throw new Error('A consulta temporária deve conter entre 1 e 163 INEPs.');
    }
    ineps = values;
  }

  return {
    ineps,
    workspace: resolve(args.get('--workspace') ?? '.tmp/temporary-session'),
    outputDir: resolve(args.get('--output-dir') ?? 'artifacts/temporary-session'),
  };
}

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseTemporarySessionArgs(argv);
  const master = await loadMasterSchools();
  const byInep = new Map(master.map((school) => [school.inep, school]));
  const schools = options.ineps === 'all'
    ? master
    : options.ineps.map((inep) => {
      const school = byInep.get(inep);
      if (!school) throw new Error(`INEP ${inep} não pertence à lista-mestre da 4ª CRE.`);
      return school;
    });

  const requestedRunId = process.env.PDDE_SESSION_ID?.trim();
  const result = await runTemporaryFinancialSession({
    schools,
    workspacePath: options.workspace,
    ...(requestedRunId ? { runId: requestedRunId } : {}),
    onProgress: (progress) => {
      console.log(JSON.stringify({ type: 'session-progress', ...progress }));
    },
  });

  await mkdir(options.outputDir, { recursive: true });
  await Promise.all([
    writeFile(
      resolve(options.outputDir, 'human-financial.json'),
      `${JSON.stringify(result.human, null, 2)}\n`,
      'utf8',
    ),
    writeFile(resolve(options.outputDir, result.workbookFilename), result.workbookBytes),
    writeFile(
      resolve(options.outputDir, 'session.json'),
      `${JSON.stringify({
        sessionId: result.runId,
        status: result.status,
        fiscalYear: 2026,
        schoolCount: result.human.schools.length,
        workbookFilename: result.workbookFilename,
        temporary: true,
        generatedAt: new Date().toISOString(),
      }, null, 2)}\n`,
      'utf8',
    ),
  ]);

  console.log(JSON.stringify({
    type: 'session-result',
    sessionId: result.runId,
    status: result.status,
    outputDir: options.outputDir,
    schools: result.human.schools.length,
    workbook: result.workbookFilename,
  }));

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
