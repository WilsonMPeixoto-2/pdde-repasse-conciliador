import { createHash, randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { z } from 'zod';
import { normalizePddeInfoSchools } from '../adapters/pddeinfo-normalizer';
import { parseSigefMovementCsv } from '../adapters/sigef-movements-csv';
import { canonicalCnpj, canonicalProgramCode } from '../core/normalization';
import type { EvidenceEventInput } from '../core/evidence';
import { isoDateSchema } from '../core/schemas';
import type { ArtifactStore } from './artifact-store';
import {
  buildReconciliationWorkbook,
  validateReconciliationWorkbook,
  type ReconciliationWorkbookAudit,
} from '../report/reconciliation-workbook';
import type { EvidenceEventWriter } from './evidence-store';
import { loadSigefReleaseExports } from './load-sigef-release-exports';
import { assembleReconciliationPortfolio } from './reconciliation-pipeline';

const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  'data e hora inválidas',
);
const identifierSchema = z.string().min(1).max(160).regex(
  /^[A-Za-z0-9._:-]+$/,
  'identificador contém caracteres inválidos',
);
const pddeInfoEnvelopeSchema = z.object({
  fetchedAt: timestampSchema,
  collectionStatus: z.enum(['COMPLETE', 'PARTIAL']).optional(),
  runId: z.string().min(1).optional(),
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

export type ReconcileFilesOptions = z.input<typeof optionsSchema> & {
  evidenceStore?: EvidenceEventWriter;
  artifactStore?: ArtifactStore;
  reconciliationRunId?: string;
  sourceCollectionRunId?: string | null;
  manageExecutionLifecycle?: boolean;
  institutionalPathPrefix?: string;
};

export interface ReconcileFilesResult {
  outputPath: string;
  reconciliationRunId?: string;
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

function artifactSha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function generatedRunId(generatedAt: string): string {
  const timestamp = generatedAt.replace(/[^0-9A-Za-z]+/g, '').slice(0, 20);
  return `reconcile-${timestamp}-${randomUUID().slice(0, 8)}`;
}

async function appendEvidence(
  store: EvidenceEventWriter | undefined,
  event: Omit<EvidenceEventInput, 'eventId'>,
): Promise<void> {
  if (!store) return;
  await store.append({ ...event, eventId: randomUUID() } as EvidenceEventInput);
}

export async function reconcileFiles(
  rawOptions: ReconcileFilesOptions,
): Promise<ReconcileFilesResult> {
  const {
    evidenceStore,
    artifactStore,
    reconciliationRunId: requestedRunId,
    sourceCollectionRunId: requestedSourceCollectionRunId,
    manageExecutionLifecycle = true,
    institutionalPathPrefix: rawInstitutionalPathPrefix,
    ...serializableOptions
  } = rawOptions;
  const options = optionsSchema.parse(serializableOptions);
  const institutionalPathPrefix = rawInstitutionalPathPrefix === undefined
    ? undefined
    : z.string().min(1).max(300).refine(
      (value) => value.split('/').every((segment) => /^[A-Za-z0-9._-]+$/.test(segment)),
      'prefixo institucional inválido',
    ).parse(rawInstitutionalPathPrefix);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const envelope = pddeInfoEnvelopeSchema.parse(await parseJsonFile(options.pddeInfoPath));
  if (envelope.collectionStatus === 'PARTIAL') {
    throw new Error('A coleta PDDEInfo está marcada como PARTIAL; conclua as escolas pendentes antes de iniciar a conciliação.');
  }
  const sourceCollectionRunId = requestedSourceCollectionRunId === undefined
    ? (envelope.runId ? identifierSchema.parse(envelope.runId) : null)
    : (requestedSourceCollectionRunId === null
      ? null
      : identifierSchema.parse(requestedSourceCollectionRunId));
  const pddeInfo = normalizePddeInfoSchools(envelope.schools, {
    fiscalYear: options.fiscalYear,
    queriedAt: envelope.fetchedAt,
  });
  if (pddeInfo.payments.length === 0) {
    throw new Error('O PDDEInfo não produziu registros financeiros conciliáveis.');
  }

  const reconciliationRunId = requestedRunId ?? generatedRunId(generatedAt);
  let evidenceRunStarted = false;
  if (manageExecutionLifecycle) {
    await appendEvidence(evidenceStore, {
      runId: reconciliationRunId,
      type: 'EXECUTION_STARTED',
      occurredAt: generatedAt,
      source: 'CONCILIADOR',
      fiscalYear: options.fiscalYear,
      payload: {
        portfolioSize: pddeInfo.payments.length,
        sourceCollectionRunId,
        requestedThrough: options.requestedThrough,
        pddeInfoFetchedAt: envelope.fetchedAt,
      },
    });
    evidenceRunStarted = Boolean(evidenceStore);
  }

  try {
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
    const institutionalReport = artifactStore
      ? await artifactStore.preserve({
        runId: reconciliationRunId,
        relativePath: institutionalPathPrefix
          ? `${institutionalPathPrefix}/reports/reconciliation.xlsx`
          : 'reports/reconciliation.xlsx',
        kind: 'REPORT',
        bytes: workbook,
        mediaType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        metadata: {
          localPath: outputPath,
          generatedAt,
          sourceCollectionRunId,
        },
      })
      : undefined;

    for (const row of portfolio.rows) {
      await appendEvidence(evidenceStore, {
        runId: reconciliationRunId,
        type: 'FINDING_RECORDED',
        occurredAt: generatedAt,
        source: 'CONCILIADOR',
        fiscalYear: options.fiscalYear,
        schoolInep: row.payment.school.inep,
        payload: {
          status: row.reconciliation.status,
          reasonCode: row.reconciliation.reasonCode,
          requiresHumanReview: row.reconciliation.requiresHumanReview,
          data: {
            paymentId: row.payment.id,
            schoolCnpj: row.payment.school.cnpj,
            programCode: row.payment.programCode,
            actionCode: row.payment.actionCode,
            installmentCode: row.payment.installmentCode,
            amountPaidCents: row.payment.amountPaidCents,
            matchedReleaseId: row.reconciliation.matchedReleaseId,
            matchedMovementIds: row.reconciliation.matchedMovementIds,
            differences: row.reconciliation.differences,
            accountResolution: row.accountResolution,
          },
        },
      });
    }

    await appendEvidence(evidenceStore, {
      runId: reconciliationRunId,
      type: 'ARTIFACT_PRESERVED',
      occurredAt: generatedAt,
      source: 'CONCILIADOR',
      fiscalYear: options.fiscalYear,
      payload: {
        kind: 'REPORT',
        path: institutionalReport?.path ?? outputPath,
        sha256: institutionalReport?.sha256 ?? artifactSha256(workbook),
        bytes: institutionalReport?.bytes ?? workbook.byteLength,
        mediaType: institutionalReport?.mediaType
          ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ...(institutionalReport ? {
          provider: institutionalReport.provider,
          bucket: institutionalReport.bucket,
          metadata: institutionalReport.metadata,
        } : {}),
      },
    });

    if (manageExecutionLifecycle) {
      await appendEvidence(evidenceStore, {
        runId: reconciliationRunId,
        type: 'EXECUTION_FINISHED',
        occurredAt: generatedAt,
        source: 'CONCILIADOR',
        fiscalYear: options.fiscalYear,
        payload: {
          status: 'COMPLETE',
          succeeded: portfolio.rows.length,
          failed: 0,
          summary: portfolio.summary,
          sourceCollectionRunId,
        },
      });
    }

    return {
      outputPath,
      ...(evidenceStore ? { reconciliationRunId } : {}),
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
  } catch (cause) {
    if (evidenceRunStarted) {
      await appendEvidence(evidenceStore, {
        runId: reconciliationRunId,
        type: 'EXECUTION_FINISHED',
        occurredAt: generatedAt,
        source: 'CONCILIADOR',
        fiscalYear: options.fiscalYear,
        payload: {
          status: 'FAILED',
          failed: 1,
          sourceCollectionRunId,
          error: cause instanceof Error ? cause.message : String(cause),
        },
      });
    }
    throw cause;
  }
}
