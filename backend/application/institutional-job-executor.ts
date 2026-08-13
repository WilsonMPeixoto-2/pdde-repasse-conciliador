import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { inspectSigefReleaseHtml } from '../adapters/sigef-release-inspector';
import type { ExecutionJob } from '../core/execution-job';
import type { ArtifactReference, ArtifactStore } from './artifact-store';
import {
  collectPddeInfo,
  type CollectPddeInfoOptions,
} from './collect-pddeinfo';
import type { EvidenceEventStore } from './evidence-store';
import {
  pddeInfoJobRequestSchema,
  reconciliationJobPayloadSchema,
} from './execution-command-service';
import type { ExecutionJobExecutor, ExecutionJobResult } from './execution-worker';
import {
  reconcileFiles,
  type ReconcileFilesOptions,
} from './reconcile-files';

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();
type CollectionRunner = (
  options: CollectPddeInfoOptions,
) => Promise<{ status: 'COMPLETE' | 'PARTIAL' }>;
type ReconciliationRunner = (options: ReconcileFilesOptions) => Promise<unknown>;

interface InstitutionalJobExecutorDependencies {
  workspacePath: string;
  schools: Array<{ inep: string; sme: string; nome: string }>;
  evidenceStore: EvidenceEventStore;
  artifactStore: ArtifactStore;
  collectPddeInfo?: CollectionRunner;
  reconcileFiles?: ReconciliationRunner;
}

async function stageArtifact(
  store: ArtifactStore,
  reference: ArtifactReference,
  destination: string,
  signal?: AbortSignal,
): Promise<void> {
  signal?.throwIfAborted();
  const bytes = await store.download(reference);
  signal?.throwIfAborted();
  await writeFile(destination, bytes, { flag: 'wx', ...(signal ? { signal } : {}) });
}

export class InstitutionalJobExecutor implements ExecutionJobExecutor {
  private readonly workspacePath: string;
  private readonly schools: Array<{ inep: string; sme: string; nome: string }>;
  private readonly schoolByInep: Map<string, { inep: string; sme: string; nome: string }>;
  private readonly collect: CollectionRunner;
  private readonly reconcile: ReconciliationRunner;

  constructor(private readonly dependencies: InstitutionalJobExecutorDependencies) {
    this.workspacePath = resolve(z.string().min(1).parse(dependencies.workspacePath));
    this.schools = z.array(schoolSchema).min(1).parse(dependencies.schools);
    this.schoolByInep = new Map(this.schools.map((school) => [school.inep, school]));
    if (this.schoolByInep.size !== this.schools.length) {
      throw new Error('A lista institucional contém INEP duplicado.');
    }
    this.collect = dependencies.collectPddeInfo ?? collectPddeInfo;
    this.reconcile = dependencies.reconcileFiles ?? reconcileFiles;
  }

  execute(job: ExecutionJob, context: { signal: AbortSignal }): Promise<ExecutionJobResult> {
    context.signal.throwIfAborted();
    if (job.kind === 'PDDEINFO') return this.executePddeInfo(job, context.signal);
    return this.executeReconciliation(job, context.signal);
  }

  private runPath(job: ExecutionJob): string {
    return resolve(this.workspacePath, 'jobs', job.jobId, 'run');
  }

  private async executePddeInfo(
    job: ExecutionJob,
    signal?: AbortSignal,
  ): Promise<ExecutionJobResult> {
    signal?.throwIfAborted();
    const request = pddeInfoJobRequestSchema.parse(job.payload);
    const selected = request.schoolIneps
      ? new Set(request.schoolIneps)
      : new Set(this.schools.map((school) => school.inep));
    const unknown = [...selected].filter((inep) => !this.schoolByInep.has(inep));
    if (unknown.length > 0) {
      throw new Error(`INEP fora da lista institucional: ${unknown.join(', ')}.`);
    }
    const schools = this.schools.filter((school) => selected.has(school.inep));
    const result = await this.collect({
      schools,
      workspacePath: this.runPath(job),
      fiscalYear: request.fiscalYear,
      runId: job.runId,
      batchSize: request.batchSize,
      batchDelayMs: request.batchDelayMs,
      evidenceStore: this.dependencies.evidenceStore,
      artifactStore: this.dependencies.artifactStore,
      ...(signal ? { signal } : {}),
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'run',
    });
    return { status: result.status };
  }

  private async executeReconciliation(
    job: ExecutionJob,
    signal?: AbortSignal,
  ): Promise<ExecutionJobResult> {
    signal?.throwIfAborted();
    const request = reconciliationJobPayloadSchema.parse(job.payload);
    const runPath = this.runPath(job);
    const inputPath = join(runPath, 'inputs');
    const releasePath = join(inputPath, 'releases');
    const reportPath = join(runPath, 'reports', 'reconciliation.xlsx');
    await mkdir(inputPath, { recursive: true });
    signal?.throwIfAborted();

    const pddeInfoPath = join(inputPath, 'pddeinfo.json');
    const movementsPath = join(inputPath, 'movements.csv');
    await stageArtifact(this.dependencies.artifactStore, request.pddeInfoArtifact, pddeInfoPath, signal);
    await stageArtifact(this.dependencies.artifactStore, request.movementsArtifact, movementsPath, signal);

    if (request.releaseArtifacts.length > 0) {
      await mkdir(releasePath);
      const filenames = new Set<string>();
      for (const reference of request.releaseArtifacts) {
        signal?.throwIfAborted();
        const bytes = await this.dependencies.artifactStore.download(reference);
        signal?.throwIfAborted();
        const inspection = inspectSigefReleaseHtml(bytes, { fiscalYear: request.fiscalYear });
        const filename = `${inspection.cnpj}__${inspection.programCode}.xls`;
        if (filenames.has(filename)) {
          throw new Error(`Nome de exportação SIGEF duplicado: ${filename}.`);
        }
        filenames.add(filename);
        await writeFile(join(releasePath, filename), bytes, {
          flag: 'wx',
          ...(signal ? { signal } : {}),
        });
      }
    }

    await this.reconcile({
      pddeInfoPath,
      movementsPath,
      outputPath: reportPath,
      ...(request.releaseArtifacts.length > 0 ? { releaseDirectoryPath: releasePath } : {}),
      fiscalYear: request.fiscalYear,
      requestedThrough: request.requestedThrough,
      ...(request.title ? { title: request.title } : {}),
      evidenceStore: this.dependencies.evidenceStore,
      artifactStore: this.dependencies.artifactStore,
      reconciliationRunId: job.runId,
      manageExecutionLifecycle: false,
      institutionalPathPrefix: 'run',
      ...(signal ? { signal } : {}),
    });
    return { status: 'COMPLETE' };
  }
}
