import { createHash, randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import {
  PDDEINFO_HTML_PARSER_VERSION,
  parsePddeInfoSchoolHtml,
  type PddeInfoExpectedSchool,
  type PddeInfoRawSchool,
} from '../adapters/pddeinfo-html';
import {
  buildPddeInfoSchoolUrl,
  fetchPddeInfoSchoolHtml,
  type FetchPddeInfoSchoolHtmlOptions,
  type PddeInfoHttpResult,
} from '../adapters/pddeinfo-http';
import { normalizePddeInfoSchools } from '../adapters/pddeinfo-normalizer';
import type { EvidenceEventInput } from '../core/evidence';
import type { EvidenceEventWriter } from './evidence-store';

const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  'data e hora inválidas',
);

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
}).strict();

const baseOptionsSchema = z.object({
  schools: z.array(schoolSchema).min(1),
  workspacePath: z.string().min(1),
  fiscalYear: z.number().int().min(2000).max(2100),
  runId: z.string().regex(/^[A-Za-z0-9._-]+$/).optional(),
  startedAt: timestampSchema.optional(),
  batchSize: z.number().int().min(1).max(20).default(3),
  batchDelayMs: z.number().int().min(0).max(60_000).default(1_500),
}).strict();

type CollectionStatus = 'COMPLETE' | 'PARTIAL';

type FetchSchoolHtml = (
  options: FetchPddeInfoSchoolHtmlOptions,
) => Promise<PddeInfoHttpResult>;

export interface CollectPddeInfoOptions {
  schools: PddeInfoExpectedSchool[];
  workspacePath: string;
  fiscalYear: number;
  runId?: string;
  startedAt?: string;
  completedAt?: () => string;
  batchSize?: number;
  batchDelayMs?: number;
  fetchSchoolHtml?: FetchSchoolHtml;
  sleep?: (milliseconds: number) => Promise<void>;
  evidenceStore?: EvidenceEventWriter;
}

interface SuccessManifestEntry {
  inep: string;
  sme: string;
  nome: string;
  status: 'SUCCESS';
  sourceUrl: string;
  queriedAt: string;
  attempts: number;
  httpStatus: number;
  responseBytes: number;
  rawSha256: string;
  normalizedSha256: string;
  rawPath: string;
  normalizedPath: string;
  normalizedBytes: number;
  warnings: string[];
}

interface FailureManifestEntry {
  inep: string;
  sme: string;
  nome: string;
  status: 'FAILED';
  sourceUrl: string;
  queriedAt?: string;
  attempts?: number;
  httpStatus?: number;
  responseBytes?: number;
  rawSha256?: string;
  rawPath?: string;
  error: string;
}

type SchoolManifestEntry = SuccessManifestEntry | FailureManifestEntry;

export interface CollectPddeInfoResult {
  status: CollectionStatus;
  runId: string;
  runDirectory: string;
  pddeInfoPath: string;
  manifestPath: string;
  statistics: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

function safeTimestampForRunId(value: string): string {
  return value.replace(/[^0-9A-Za-z]+/g, '').slice(0, 20);
}

function sha256(content: string | Uint8Array): string {
  const hash = createHash('sha256');
  if (typeof content === 'string') hash.update(content, 'utf8');
  else hash.update(content);
  return hash.digest('hex');
}

async function writeJson(path: string, value: unknown): Promise<{ sha256: string; bytes: number }> {
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  await writeFile(path, serialized, { flag: 'wx' });
  return {
    sha256: sha256(serialized),
    bytes: Buffer.byteLength(serialized, 'utf8'),
  };
}

function validateMasterSubset(schools: PddeInfoExpectedSchool[]): void {
  const uniqueIneps = new Set(schools.map((school) => school.inep));
  if (uniqueIneps.size !== schools.length) {
    throw new Error('A lista de escolas contém INEP duplicado; a coleta foi bloqueada.');
  }
  const uniqueSme = new Set(schools.map((school) => school.sme));
  if (uniqueSme.size !== schools.length) {
    throw new Error('A lista de escolas contém código SME duplicado; a coleta foi bloqueada.');
  }
}

async function appendEvidence(
  store: EvidenceEventWriter | undefined,
  event: Omit<EvidenceEventInput, 'eventId'>,
): Promise<void> {
  if (!store) return;
  await store.append({ ...event, eventId: randomUUID() } as EvidenceEventInput);
}

export async function collectPddeInfo(
  rawOptions: CollectPddeInfoOptions,
): Promise<CollectPddeInfoResult> {
  const parsed = baseOptionsSchema.parse({
    schools: rawOptions.schools,
    workspacePath: rawOptions.workspacePath,
    fiscalYear: rawOptions.fiscalYear,
    ...(rawOptions.runId ? { runId: rawOptions.runId } : {}),
    ...(rawOptions.startedAt ? { startedAt: rawOptions.startedAt } : {}),
    ...(rawOptions.batchSize !== undefined ? { batchSize: rawOptions.batchSize } : {}),
    ...(rawOptions.batchDelayMs !== undefined ? { batchDelayMs: rawOptions.batchDelayMs } : {}),
  });
  validateMasterSubset(parsed.schools);

  const startedAt = parsed.startedAt ?? new Date().toISOString();
  const runId = parsed.runId ?? `${safeTimestampForRunId(startedAt)}-${randomUUID().slice(0, 8)}`;
  const runDirectory = resolve(parsed.workspacePath, 'runs', runId);
  const rawDirectory = join(runDirectory, 'raw');
  const normalizedDirectory = join(runDirectory, 'normalized');
  const manifestPath = join(runDirectory, 'manifest.json');
  const pddeInfoPath = join(runDirectory, `pddeinfo-${parsed.fiscalYear}.json`);

  await mkdir(resolve(parsed.workspacePath, 'runs'), { recursive: true });
  await mkdir(runDirectory, { recursive: false });
  await mkdir(rawDirectory);
  await mkdir(normalizedDirectory);

  await appendEvidence(rawOptions.evidenceStore, {
    runId,
    type: 'EXECUTION_STARTED',
    occurredAt: startedAt,
    source: 'PDDEINFO',
    fiscalYear: parsed.fiscalYear,
    payload: {
      portfolioSize: parsed.schools.length,
      parserVersion: PDDEINFO_HTML_PARSER_VERSION,
    },
  });

  const fetchSchoolHtml = rawOptions.fetchSchoolHtml ?? fetchPddeInfoSchoolHtml;
  const sleep = rawOptions.sleep ?? defaultSleep;
  const successfulByInep = new Map<string, PddeInfoRawSchool>();
  const entriesByInep = new Map<string, SchoolManifestEntry>();

  const processSchool = async (school: PddeInfoExpectedSchool): Promise<void> => {
    let httpResult: PddeInfoHttpResult | null = null;
    let rawPath: string | undefined;
    let rawSha256: string | undefined;
    const deterministicSourceUrl = buildPddeInfoSchoolUrl({
      fiscalYear: parsed.fiscalYear,
      inep: school.inep,
    });

    let entry: SchoolManifestEntry;
    try {
      httpResult = await fetchSchoolHtml({
        fiscalYear: parsed.fiscalYear,
        inep: school.inep,
      });

      const rawBytes = httpResult.rawBytes ?? Buffer.from(httpResult.html, 'utf8');
      rawPath = `raw/${school.inep}.html`;
      rawSha256 = sha256(rawBytes);
      await writeFile(join(runDirectory, rawPath), rawBytes, { flag: 'wx' });

      const parsedSchool = parsePddeInfoSchoolHtml(httpResult.html, {
        expectedSchool: school,
        sourceUrl: httpResult.sourceUrl,
      });

      const validation = normalizePddeInfoSchools([parsedSchool], {
        fiscalYear: parsed.fiscalYear,
        queriedAt: httpResult.queriedAt,
      });
      if (validation.payments.length === 0) {
        throw new Error('PDDEInfo não produziu registro financeiro conciliável para a unidade.');
      }

      const normalizedPath = `normalized/${school.inep}.json`;
      const normalizedArtifact = await writeJson(join(runDirectory, normalizedPath), parsedSchool);
      successfulByInep.set(school.inep, parsedSchool);
      entry = {
        inep: school.inep,
        sme: school.sme,
        nome: school.nome,
        status: 'SUCCESS',
        sourceUrl: httpResult.sourceUrl,
        queriedAt: httpResult.queriedAt,
        attempts: httpResult.attempts,
        httpStatus: httpResult.httpStatus,
        responseBytes: httpResult.responseBytes,
        rawSha256,
        normalizedSha256: normalizedArtifact.sha256,
        rawPath,
        normalizedPath,
        normalizedBytes: normalizedArtifact.bytes,
        warnings: validation.warnings,
      };
    } catch (cause) {
      entry = {
        inep: school.inep,
        sme: school.sme,
        nome: school.nome,
        status: 'FAILED',
        sourceUrl: httpResult?.sourceUrl ?? deterministicSourceUrl,
        ...(httpResult?.queriedAt ? { queriedAt: httpResult.queriedAt } : {}),
        ...(httpResult ? { attempts: httpResult.attempts } : {}),
        ...(httpResult ? { httpStatus: httpResult.httpStatus } : {}),
        ...(httpResult ? { responseBytes: httpResult.responseBytes } : {}),
        ...(rawSha256 ? { rawSha256 } : {}),
        ...(rawPath ? { rawPath } : {}),
        error: cause instanceof Error ? cause.message : String(cause),
      };
    }

    entriesByInep.set(school.inep, entry);

    if (entry.status === 'SUCCESS') {
      await appendEvidence(rawOptions.evidenceStore, {
        runId,
        type: 'SOURCE_ATTEMPT_RECORDED',
        occurredAt: entry.queriedAt,
        source: 'PDDEINFO',
        fiscalYear: parsed.fiscalYear,
        schoolInep: school.inep,
        payload: {
          status: 'SUCCESS',
          attempts: entry.attempts,
          httpStatus: entry.httpStatus,
          responseBytes: entry.responseBytes,
          sourceUrl: entry.sourceUrl,
        },
      });
      await appendEvidence(rawOptions.evidenceStore, {
        runId,
        type: 'ARTIFACT_PRESERVED',
        occurredAt: entry.queriedAt,
        source: 'PDDEINFO',
        fiscalYear: parsed.fiscalYear,
        schoolInep: school.inep,
        payload: {
          kind: 'RAW_HTML',
          path: entry.rawPath,
          sha256: entry.rawSha256,
          bytes: entry.responseBytes,
          mediaType: 'text/html',
        },
      });
      await appendEvidence(rawOptions.evidenceStore, {
        runId,
        type: 'ARTIFACT_PRESERVED',
        occurredAt: entry.queriedAt,
        source: 'PDDEINFO',
        fiscalYear: parsed.fiscalYear,
        schoolInep: school.inep,
        payload: {
          kind: 'NORMALIZED_JSON',
          path: entry.normalizedPath,
          sha256: entry.normalizedSha256,
          bytes: entry.normalizedBytes,
          mediaType: 'application/json',
        },
      });
    } else {
      await appendEvidence(rawOptions.evidenceStore, {
        runId,
        type: 'SOURCE_ATTEMPT_RECORDED',
        occurredAt: entry.queriedAt ?? new Date().toISOString(),
        source: 'PDDEINFO',
        fiscalYear: parsed.fiscalYear,
        schoolInep: school.inep,
        payload: {
          status: 'FAILED',
          ...(entry.attempts ? { attempts: entry.attempts } : {}),
          ...(entry.httpStatus ? { httpStatus: entry.httpStatus } : {}),
          ...(entry.responseBytes !== undefined ? { responseBytes: entry.responseBytes } : {}),
          error: entry.error,
          sourceUrl: entry.sourceUrl,
        },
      });
    }
  };

  for (let start = 0; start < parsed.schools.length; start += parsed.batchSize) {
    const batch = parsed.schools.slice(start, start + parsed.batchSize);
    await Promise.all(batch.map(processSchool));
    if (start + parsed.batchSize < parsed.schools.length && parsed.batchDelayMs > 0) {
      await sleep(parsed.batchDelayMs);
    }
  }

  const entries = parsed.schools.map((school) => entriesByInep.get(school.inep));
  if (entries.some((entry) => !entry)) {
    throw new Error('Falha interna: nem todas as escolas receberam resultado de coleta.');
  }
  const orderedEntries = entries as SchoolManifestEntry[];
  const successfulSchools = parsed.schools.flatMap((school) => {
    const parsedSchool = successfulByInep.get(school.inep);
    return parsedSchool ? [parsedSchool] : [];
  });

  const completedAt = rawOptions.completedAt?.() ?? new Date().toISOString();
  timestampSchema.parse(completedAt);
  const succeeded = orderedEntries.filter((entry) => entry.status === 'SUCCESS').length;
  const failed = orderedEntries.length - succeeded;
  const status: CollectionStatus = failed === 0 ? 'COMPLETE' : 'PARTIAL';
  const statistics = { total: parsed.schools.length, succeeded, failed };

  const manifest = {
    version: 1,
    runId,
    fiscalYear: parsed.fiscalYear,
    status,
    parserVersion: PDDEINFO_HTML_PARSER_VERSION,
    startedAt,
    completedAt,
    statistics,
    schools: orderedEntries,
  };
  const manifestArtifact = await writeJson(manifestPath, manifest);

  const envelope = {
    source: 'PDDEINFO',
    fiscalYear: parsed.fiscalYear,
    fetchedAt: completedAt,
    collectionStatus: status,
    runId,
    parserVersion: PDDEINFO_HTML_PARSER_VERSION,
    schools: successfulSchools,
  };
  const envelopeArtifact = await writeJson(pddeInfoPath, envelope);

  await appendEvidence(rawOptions.evidenceStore, {
    runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: completedAt,
    source: 'PDDEINFO',
    fiscalYear: parsed.fiscalYear,
    payload: {
      kind: 'MANIFEST',
      path: 'manifest.json',
      sha256: manifestArtifact.sha256,
      bytes: manifestArtifact.bytes,
      mediaType: 'application/json',
    },
  });
  await appendEvidence(rawOptions.evidenceStore, {
    runId,
    type: 'ARTIFACT_PRESERVED',
    occurredAt: completedAt,
    source: 'PDDEINFO',
    fiscalYear: parsed.fiscalYear,
    payload: {
      kind: 'NORMALIZED_JSON',
      path: `pddeinfo-${parsed.fiscalYear}.json`,
      sha256: envelopeArtifact.sha256,
      bytes: envelopeArtifact.bytes,
      mediaType: 'application/json',
    },
  });
  await appendEvidence(rawOptions.evidenceStore, {
    runId,
    type: 'EXECUTION_FINISHED',
    occurredAt: completedAt,
    source: 'PDDEINFO',
    fiscalYear: parsed.fiscalYear,
    payload: {
      status,
      succeeded,
      failed,
    },
  });

  return {
    status,
    runId,
    runDirectory,
    pddeInfoPath,
    manifestPath,
    statistics,
  };
}
