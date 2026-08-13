import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { normalizePddeInfoSchools } from '../adapters/pddeinfo-normalizer';
import { parseSigefMovementCsv } from '../adapters/sigef-movements-csv';
import { canonicalCnpj, canonicalProgramCode } from '../core/normalization';
import {
  buildReconciliationWorkbook,
  validateReconciliationWorkbook,
  type ReconciliationWorkbookAudit,
} from '../report/reconciliation-workbook';
import { loadSigefReleaseExports } from './load-sigef-release-exports';
import { assembleReconciliationPortfolio } from './reconciliation-pipeline';

const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  'data e hora inválidas',
);
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(`${value}T00:00:00Z`)),
  'data ISO inválida',
);
const pddeInfoEnvelopeSchema = z.object({
  fetchedAt: timestampSchema,
  collectionStatus: z.enum(['COMPLETE', 'PARTIAL']).optional(),
  schools: z.array(z.unknown()),
}).passthrough();
const optionsSchema = z.object({
  pddeInfoPath: z.string().min(1),
  movementsPath: z.string().min(1),
  outputPath: z.string().min(1),
  releaseManifestPath: z.string().min(1).optional(),
  releaseDirectoryPath: z.string().min(1).optional(),
  releaseDirectorySourceUrl: z.string().url().optional(),
  fiscalYear: z.number().int().min(2000).max(2100),
  requestedThrough: isoDateSchema,
  generatedAt: timestampSchema.optional(),
  title: z.string().min(1).optional(),
  overwrite: z.boolean().default(false),
}).strict().superRefine((value, context) => {
  if (value.releaseManifestPath && value.releaseDirectoryPath) {
    context.addIssue({
      code: 'custom',
      message: 'Use --release-manifest ou --releases-dir, nunca os dois.',
    });
  }
  if (value.releaseDirectorySourceUrl && !value.releaseDirectoryPath) {
    context.addIssue({
      code: 'custom',
      message: '--releases-source-url exige --releases-dir.',
    });
  }
});

export type ReconcileFilesOptions = z.input<typeof optionsSchema>;

export interface ReconcileFilesResult {
  outputPath: string;
  workbookAudit: ReconciliationWorkbookAudit;
  pddeInfo: {
    schools: number;
    financialRecords: number;
    paidRecords: number;
    missingProgramAccounts: number;
    ignoredZeroRecords: number;
    warnings: string[];
  };
  releases: {
    mode: 'none' | 'manifest' | 'directory';
    exports: number;
    records: number;
    expectedPairs: number;
    importedPairs: number;
    missingPairs: Array<{ cnpj: string; programCode: string }>;
  };
  movements: {
    rowsRead: number;
    targetRows: number;
    creditRows: number;
    debitRows: number;
    coverageThrough?: string;
    coverageLagDays: number | null;
  };
  reconciliation: ReturnType<typeof assembleReconciliationPortfolio>['summary'];
}

async function parseJsonFile(path: string): Promise<unknown> {
  let source: string;
  try {
    source = await readFile(path, 'utf8');
  } catch (error) {
    throw new Error(`Não foi possível ler ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  try {
    return JSON.parse(source) as unknown;
  } catch (error) {
    throw new Error(`JSON inválido em ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function writeWorkbook(path: string, bytes: Buffer, overwrite: boolean): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  try {
    await writeFile(path, bytes, { flag: overwrite ? 'w' : 'wx' });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error
      ? String(error.code)
      : '';
    if (code === 'EEXIST') {
      throw new Error(`O arquivo ${path} já existe; use --overwrite para substituí-lo.`);
    }
    throw error;
  }
}

export async function reconcileFiles(
  rawOptions: ReconcileFilesOptions,
): Promise<ReconcileFilesResult> {
  const options = optionsSchema.parse(rawOptions);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const envelope = pddeInfoEnvelopeSchema.parse(await parseJsonFile(options.pddeInfoPath));
  if (envelope.collectionStatus === 'PARTIAL') {
    throw new Error('A coleta PDDEInfo está marcada como PARTIAL; conclua as escolas pendentes antes de iniciar a conciliação.');
  }
  const pddeInfo = normalizePddeInfoSchools(envelope.schools, {
    fiscalYear: options.fiscalYear,
    queriedAt: envelope.fetchedAt,
  });
  if (pddeInfo.payments.length === 0) {
    throw new Error('O PDDEInfo não produziu registros financeiros conciliáveis.');
  }
  const targetCnpjs = [...new Set(pddeInfo.payments.map(
    (payment) => canonicalCnpj(payment.school.cnpj),
  ))];
  const programCodes = [...new Set(pddeInfo.payments.map(
    (payment) => canonicalProgramCode(payment.programCode),
  ))];
  const expectedReleasePairs = pddeInfo.payments.map((payment) => ({
    cnpj: canonicalCnpj(payment.school.cnpj),
    programCode: canonicalProgramCode(payment.programCode),
  }));

  const movements = await parseSigefMovementCsv(createReadStream(options.movementsPath), {
    targetCnpjs,
    programCodes,
    queriedAt: generatedAt,
    requestedThrough: options.requestedThrough,
  });

  const loadedReleases = await loadSigefReleaseExports({
    fiscalYear: options.fiscalYear,
    expectedPairs: expectedReleasePairs,
    ...(options.releaseManifestPath ? { manifestPath: options.releaseManifestPath } : {}),
    ...(options.releaseDirectoryPath ? { directoryPath: options.releaseDirectoryPath } : {}),
    ...(options.releaseDirectorySourceUrl
      ? { directorySourceUrl: options.releaseDirectorySourceUrl }
      : {}),
  });
  const releaseExports = loadedReleases.exports;

  const portfolio = assembleReconciliationPortfolio({ pddeInfo, releaseExports, movements });
  const workbook = await buildReconciliationWorkbook({
    portfolio,
    generatedAt,
    title: options.title ?? `Conciliação de repasses PDDE ${options.fiscalYear} — 4ª CRE`,
  });
  const workbookAudit = await validateReconciliationWorkbook(workbook, portfolio);
  const outputPath = resolve(options.outputPath);
  await writeWorkbook(outputPath, workbook, options.overwrite);

  return {
    outputPath,
    workbookAudit,
    pddeInfo: {
      ...pddeInfo.statistics,
      warnings: pddeInfo.warnings,
    },
    releases: {
      mode: loadedReleases.mode,
      exports: releaseExports.length,
      records: releaseExports.reduce((sum, item) => sum + item.releases.length, 0),
      expectedPairs: loadedReleases.coverage.expectedPairs,
      importedPairs: loadedReleases.coverage.importedPairs,
      missingPairs: loadedReleases.coverage.missingPairs,
    },
    movements: {
      rowsRead: movements.statistics.rowsRead,
      targetRows: movements.statistics.targetRows,
      creditRows: movements.statistics.creditRows,
      debitRows: movements.statistics.debitRows,
      ...(movements.source.coverageThrough
        ? { coverageThrough: movements.source.coverageThrough }
        : {}),
      coverageLagDays: movements.statistics.coverageLagDays,
    },
    reconciliation: portfolio.summary,
  };
}
