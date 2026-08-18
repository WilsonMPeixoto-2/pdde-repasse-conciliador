#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMasterSchools } from '../backend/application/school-catalog';
import {
  runTemporaryFinancialSession,
  type TemporaryFinancialSessionResult,
} from '../backend/application/temporary-financial-session';

export interface TemporarySessionCliOptions {
  ineps: 'all' | string[];
  workspace: string;
  outputDir: string;
}

export interface TemporarySessionOutputEntry {
  path: string;
  content: string | Uint8Array;
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

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function temporarySessionOutputEntries(
  result: Pick<
    TemporaryFinancialSessionResult,
    'runId' | 'status' | 'portfolio' | 'schools' | 'workbookBytes' | 'workbookFilename'
  >,
): TemporarySessionOutputEntry[] {
  const entries: TemporarySessionOutputEntry[] = [
    {
      path: 'portfolio.json',
      content: jsonText(result.portfolio),
    },
    {
      path: result.workbookFilename,
      content: result.workbookBytes,
    },
    {
      path: 'session.json',
      content: jsonText({
        sessionId: result.runId,
        status: result.status,
        fiscalYear: 2026,
        schoolCount: result.portfolio.schoolCount,
        workbookFilename: result.workbookFilename,
        temporary: true,
        generatedAt: new Date().toISOString(),
      }),
    },
  ];

  for (const item of result.schools) {
    entries.push({
      path: `schools/${item.school.inep}.json`,
      content: jsonText(item.snapshot),
    });
  }
  return entries;
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

  const entries = temporarySessionOutputEntries(result);
  await Promise.all(entries.map(async (entry) => {
    const outputPath = resolve(options.outputDir, entry.path);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, entry.content);
  }));

  console.log(JSON.stringify({
    type: 'session-result',
    sessionId: result.runId,
    status: result.status,
    outputDir: options.outputDir,
    schools: result.portfolio.schoolCount,
    workbook: result.workbookFilename,
  }));
}

const executedAsScript = process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executedAsScript) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.stack ?? cause.message : cause);
    process.exitCode = 1;
  });
}
