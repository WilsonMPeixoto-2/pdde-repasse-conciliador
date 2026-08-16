#!/usr/bin/env node
import { mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { z } from 'zod';
import type { HumanFinancialPortfolioView } from '../backend/application/build-human-financial-view';
import { buildHumanFinancialWorkbook } from '../backend/report/human-financial-workbook';

function parseArgs(argv: string[]): { input: string; output: string } {
  const args = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || !value) throw new Error(`Argumentos inválidos perto de ${key ?? '(fim)'}.`);
    args.set(key, value);
  }
  return {
    input: resolve(args.get('--input') ?? '.tmp/monitor-live-2026/human-financial.json'),
    output: resolve(args.get('--output') ?? 'artifacts/inteligencia-financeira-pdde-4cre-2026.xlsx'),
  };
}

const viewSchema = z.object({
  title: z.literal('Inteligência Financeira PDDE | 4ª CRE'),
  fiscalYear: z.literal(2026),
  referenceLabel: z.string().min(1),
  schools: z.array(z.unknown()),
}).passthrough();

export async function main(argv = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const raw = JSON.parse(await readFile(options.input, 'utf8')) as unknown;
  viewSchema.parse(raw);
  const workbook = buildHumanFinancialWorkbook(raw as HumanFinancialPortfolioView);
  await mkdir(dirname(options.output), { recursive: true });
  await workbook.xlsx.writeFile(options.output);
  console.log(JSON.stringify({ output: options.output, fiscalYear: 2026, sheets: workbook.worksheets.map((sheet) => sheet.name) }, null, 2));
}

const executedAsScript = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (executedAsScript) {
  main().catch((cause) => {
    console.error(cause instanceof Error ? cause.stack ?? cause.message : cause);
    process.exitCode = 1;
  });
}
