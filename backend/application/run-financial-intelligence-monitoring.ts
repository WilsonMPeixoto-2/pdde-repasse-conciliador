import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  collectPddeInfoPublicPortfolio,
  type CollectPddeInfoPublicPortfolioOptions,
  type PddeInfoPublicPortfolioResult,
  type PublicPortfolioArtifact,
} from './collect-pddeinfo-public-portfolio';
import { buildHumanFinancialView } from './build-human-financial-view';
import {
  recoverSigefReleaseAccounts,
  type RecoverSigefReleaseAccountsOptions,
  type SigefReleaseAccountRecovery,
} from './recover-sigef-release-accounts';
import {
  runMonitoring,
  type RunMonitoringOptions,
  type RunMonitoringResult,
} from './run-monitoring';
import type { FinancialSnapshotStore } from './financial-snapshot-store';
import type { ArtifactStore, PreservedArtifact } from './artifact-store';
import type { EvidenceEventStore } from './evidence-store';
import type { EvidenceEventInput } from '../core/evidence';
import type { FinancialAccountSnapshot } from '../core/financial-snapshot';

export interface RunFinancialIntelligenceMonitoringOptions extends RunMonitoringOptions {
  collectPddeInfoPublicPortfolio?: (
    options: CollectPddeInfoPublicPortfolioOptions,
  ) => Promise<PddeInfoPublicPortfolioResult>;
  collectSigefReleases?: RecoverSigefReleaseAccountsOptions['collectSigefReleases'];
  financialSnapshotStore?: FinancialSnapshotStore;
}

export interface RunFinancialIntelligenceMonitoringResult extends Omit<RunMonitoringResult, 'status' | 'raw' | 'paths'> {
  status: 'COMPLETE' | 'PARTIAL';
  raw: RunMonitoringResult['raw'] & {
    accountRecoveries: SigefReleaseAccountRecovery[];
    publicReports: Omit<PddeInfoPublicPortfolioResult, 'artifacts'>;
  };
  human: ReturnType<typeof buildHumanFinancialView>;
  paths: RunMonitoringResult['paths'] & {
    financialIntelligence: string;
    human: string;
  };
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function safeSegment(value: string): string {
  return value.replace(/[^0-9A-Za-z._-]/g, '_');
}

async function appendEvidence(
  store: EvidenceEventStore | undefined,
  event: Omit<EvidenceEventInput, 'eventId'>,
): Promise<void> {
  if (!store) return;
  await store.append({ ...event, eventId: randomUUID() } as EvidenceEventInput);
}

function artifactRelativePath(artifact: PublicPortfolioArtifact, index: number): string {
  const identity = artifact.schoolInep ?? artifact.cnpj ?? String(index + 1).padStart(4, '0');
  const reference = artifact.coverageThrough ?? artifact.queriedAt.slice(0, 10);
  return `public-reports/${artifact.kind.toLowerCase()}/${safeSegment(identity)}-${safeSegment(reference)}.html`;
}

async function preservePublicArtifact(input: {
  artifact: PublicPortfolioArtifact;
  index: number;
  workspacePath: string;
  runId: string;
  artifactStore?: ArtifactStore;
  evidenceStore?: EvidenceEventStore;
  institutionalPathPrefix?: string;
}): Promise<{ sha256: string; preserved?: PreservedArtifact }> {
  const relative = artifactRelativePath(input.artifact, input.index);
  const localPath = join(input.workspacePath, relative);
  await mkdir(resolve(localPath, '..'), { recursive: true }).catch(async () => {
    const lastSeparator = Math.max(localPath.lastIndexOf('/'), localPath.lastIndexOf('\\'));
    await mkdir(localPath.slice(0, lastSeparator), { recursive: true });
  });
  await writeFile(localPath, input.artifact.rawBytes);
  const digest = sha256(input.artifact.rawBytes);
  if (!input.artifactStore) return { sha256: digest };

  const storePath = input.institutionalPathPrefix
    ? `${input.institutionalPathPrefix}/${relative}`
    : relative;
  const preserved = await input.artifactStore.preserve({
    runId: input.runId,
    relativePath: storePath,
    kind: 'RAW_HTML',
    bytes: input.artifact.rawBytes,
    mediaType: 'text/html',
    ...(input.artifact.schoolInep ? { schoolInep: input.artifact.schoolInep } : {}),
    metadata: {
      reportKind: input.artifact.kind,
      queriedAt: input.artifact.queriedAt,
      sourceUrl: input.artifact.sourceUrl,
      coverageThrough: input.artifact.coverageThrough,
      localPath,
    },
  });
  await appendEvidence(input.evidenceStore, {
    runId: input.runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: input.artifact.queriedAt,
    source: 'PDDEINFO',
    fiscalYear: 2026,
    ...(input.artifact.schoolInep ? { schoolInep: input.artifact.schoolInep } : {}),
    payload: {
      kind: preserved.kind,
      path: preserved.path,
      sha256: preserved.sha256,
      bytes: preserved.bytes,
      mediaType: preserved.mediaType,
      provider: preserved.provider,
      bucket: preserved.bucket,
      metadata: preserved.metadata,
    },
  });
  return { sha256: preserved.sha256, preserved };
}

function matchingBalanceArtifact(
  artifacts: readonly PublicPortfolioArtifact[],
  cnpj: string,
  coverageThrough: string,
): PublicPortfolioArtifact | undefined {
  return artifacts.find((artifact) => (
    artifact.kind === 'BALANCE'
    && artifact.cnpj === cnpj
    && artifact.coverageThrough === coverageThrough
  ));
}

async function persistSnapshots(input: {
  reports: PddeInfoPublicPortfolioResult;
  store?: FinancialSnapshotStore;
}): Promise<FinancialAccountSnapshot[]> {
  const snapshots: FinancialAccountSnapshot[] = [];
  for (const balance of input.reports.balances) {
    const sourceArtifact = matchingBalanceArtifact(
      input.reports.artifacts,
      balance.uexCnpj,
      balance.coverageThrough,
    );
    const artifactSha256 = sourceArtifact ? sha256(sourceArtifact.rawBytes) : null;
    const collectedAt = sourceArtifact?.queriedAt ?? new Date().toISOString();
    for (const schoolInep of balance.schoolIneps) {
      const snapshot: FinancialAccountSnapshot = {
        schoolInep,
        uexCnpj: balance.uexCnpj,
        programName: balance.programName,
        bank: balance.bank,
        agency: balance.agency,
        account: balance.account,
        referenceDate: balance.coverageThrough,
        checkingBalanceCents: balance.checkingBalanceCents,
        fundBalanceCents: balance.fundBalanceCents,
        savingsBalanceCents: balance.savingsBalanceCents,
        rdbCdbBalanceCents: balance.rdbCdbBalanceCents,
        investmentBalanceCents: balance.investmentBalanceCents,
        totalReportedBalanceCents: balance.totalReportedBalanceCents,
        source: 'PDDEINFO',
        collectedAt,
        artifactSha256,
      };
      snapshots.push(input.store ? await input.store.append(snapshot) : snapshot);
    }
  }
  return snapshots;
}

async function preserveJsonArtifact(input: {
  store?: ArtifactStore;
  evidenceStore?: EvidenceEventStore;
  runId: string;
  relativePath: string;
  role: string;
  bytes: Buffer;
  occurredAt: string;
}): Promise<void> {
  if (!input.store) return;
  const preserved = await input.store.preserve({
    runId: input.runId,
    relativePath: input.relativePath,
    kind: 'NORMALIZED_JSON',
    bytes: input.bytes,
    mediaType: 'application/json',
    metadata: { role: input.role },
  });
  await appendEvidence(input.evidenceStore, {
    runId: input.runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: input.occurredAt,
    source: 'CONCILIADOR',
    fiscalYear: 2026,
    payload: {
      kind: preserved.kind,
      path: preserved.path,
      sha256: preserved.sha256,
      bytes: preserved.bytes,
      mediaType: preserved.mediaType,
      provider: preserved.provider,
      bucket: preserved.bucket,
      metadata: preserved.metadata,
    },
  });
}

function annotateRecoveredAccounts(
  human: ReturnType<typeof buildHumanFinancialView>,
  recoveries: readonly SigefReleaseAccountRecovery[],
): void {
  for (const recovery of recoveries) {
    if (recovery.status !== 'RECOVERED' || !recovery.account) continue;
    const school = human.schools.find((item) => item.school.inep === recovery.schoolInep);
    if (!school) continue;
    const program = school.programs.find((item) => item.name === recovery.action);
    if (!program) continue;
    const installment = program.installments.find((item) => (
      item.installment === recovery.installment
      && item.paymentInformedCents === recovery.amountCents
    ));
    if (!installment) continue;
    const evidence = recovery.orderBank
      ? `Conta recuperada no SIGEF Liberações pela OB ${recovery.orderBank}.`
      : 'Conta recuperada no SIGEF Liberações.';
    installment.note = installment.note ? `${installment.note} ${evidence}` : evidence;
  }
}

export async function runFinancialIntelligenceMonitoring(
  options: RunFinancialIntelligenceMonitoringOptions,
): Promise<RunFinancialIntelligenceMonitoringResult> {
  const {
    collectPddeInfoPublicPortfolio: publicCollector = collectPddeInfoPublicPortfolio,
    collectSigefReleases,
    financialSnapshotStore,
    ...baseOptions
  } = options;
  const manageLifecycle = options.manageExecutionLifecycle ?? true;
  const now = options.now ?? (() => new Date().toISOString());
  const startedAt = now();

  if (manageLifecycle) {
    await appendEvidence(options.evidenceStore, {
      runId: options.runId,
      type: 'EXECUTION_STARTED',
      occurredAt: startedAt,
      source: 'CONCILIADOR',
      fiscalYear: 2026,
      payload: { portfolioSize: options.schools.length },
    });
  }

  try {
    const initial = await runMonitoring({
      ...baseOptions,
      manageExecutionLifecycle: false,
    });
    const base = await recoverSigefReleaseAccounts({
      base: initial,
      workspacePath: options.workspacePath,
      fiscalYear: 2026,
      ...(options.signal ? { signal: options.signal } : {}),
      ...(collectSigefReleases ? { collectSigefReleases } : {}),
      ...(options.collectSigefAccount ? { collectSigefAccount: options.collectSigefAccount } : {}),
    });
    const reports = await publicCollector({
      schools: options.schools,
      fiscalYear: 2026,
      ...(options.signal ? { signal: options.signal } : {}),
    });

    for (const [index, artifact] of reports.artifacts.entries()) {
      await preservePublicArtifact({
        artifact,
        index,
        workspacePath: resolve(options.workspacePath),
        runId: options.runId,
        ...(options.artifactStore ? { artifactStore: options.artifactStore } : {}),
        ...(options.evidenceStore ? { evidenceStore: options.evidenceStore } : {}),
        ...(options.institutionalPathPrefix
          ? { institutionalPathPrefix: options.institutionalPathPrefix }
          : {}),
      });
    }

    const snapshots = await persistSnapshots({
      reports,
      ...(financialSnapshotStore ? { store: financialSnapshotStore } : {}),
    });
    const { artifacts: _artifacts, ...publicReports } = reports;
    const raw = {
      ...base.raw,
      publicReports,
      financialSnapshots: snapshots,
    };
    const human = buildHumanFinancialView({
      fiscalView: base.fiscal,
      publicReports: reports,
    });
    annotateRecoveredAccounts(human, base.raw.accountRecoveries);
    const status: 'COMPLETE' | 'PARTIAL' = base.status === 'COMPLETE' && reports.failures.length === 0
      ? 'COMPLETE'
      : 'PARTIAL';

    const workspacePath = resolve(options.workspacePath);
    const financialIntelligencePath = join(workspacePath, 'financial-intelligence.json');
    const humanPath = join(workspacePath, 'human-financial.json');
    const financialBytes = jsonBytes({ ...raw, status });
    const humanBytes = jsonBytes(human);
    await writeFile(financialIntelligencePath, financialBytes);
    await writeFile(humanPath, humanBytes);

    const prefix = options.institutionalPathPrefix
      ? `${options.institutionalPathPrefix}/`
      : '';
    await preserveJsonArtifact({
      ...(options.artifactStore ? { store: options.artifactStore } : {}),
      ...(options.evidenceStore ? { evidenceStore: options.evidenceStore } : {}),
      runId: options.runId,
      relativePath: `${prefix}financial-intelligence.json`,
      role: 'FINANCIAL_INTELLIGENCE_2026',
      bytes: financialBytes,
      occurredAt: now(),
    });
    await preserveJsonArtifact({
      ...(options.artifactStore ? { store: options.artifactStore } : {}),
      ...(options.evidenceStore ? { evidenceStore: options.evidenceStore } : {}),
      runId: options.runId,
      relativePath: `${prefix}human-financial.json`,
      role: 'HUMAN_FINANCIAL_VIEW_2026',
      bytes: humanBytes,
      occurredAt: now(),
    });

    if (manageLifecycle) {
      await appendEvidence(options.evidenceStore, {
        runId: options.runId,
        type: 'EXECUTION_FINISHED',
        occurredAt: now(),
        source: 'CONCILIADOR',
        fiscalYear: 2026,
        payload: {
          status,
          succeeded: options.schools.length,
          failed: reports.failures.length,
        },
      });
    }

    return {
      ...base,
      status,
      raw,
      human,
      paths: {
        ...base.paths,
        financialIntelligence: financialIntelligencePath,
        human: humanPath,
      },
    };
  } catch (cause) {
    if (manageLifecycle) {
      await appendEvidence(options.evidenceStore, {
        runId: options.runId,
        type: 'EXECUTION_FINISHED',
        occurredAt: now(),
        source: 'CONCILIADOR',
        fiscalYear: 2026,
        payload: {
          status: 'FAILED',
          failed: 1,
          error: cause instanceof Error ? cause.message : String(cause),
        },
      });
    }
    throw cause;
  }
}
