#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gunzipSync } from 'node:zlib';

import { fetchPddeInfoPublicReport } from '../backend/adapters/pddeinfo-public-reports';
import {
  normalizeAttendanceRow,
  type PddeInfoAttendanceObservation,
} from '../backend/adapters/pddeinfo-public-report-normalizer';
import { runRateLimited } from '../backend/runtime/rate-limited-queue';

interface PortfolioSchool {
  inep: string;
  sme: string;
  nome: string;
}

interface PublishedInstallment {
  installment?: string | null;
  programmedCents?: number | null;
  paymentInformedCents?: number | null;
  paymentInformedDate?: string | null;
  paymentOrderDate?: string | null;
}

interface PublishedSchool {
  school?: {
    inep?: string;
    sme?: string;
    name?: string;
  };
  programs?: Array<{
    name?: string | null;
    installments?: PublishedInstallment[];
  }>;
}

interface PublishedSnapshot {
  publishedAt?: string;
  source?: {
    workflowRunId?: number;
    artifactId?: number;
  };
  schools?: Record<string, PublishedSchool>;
}

interface PublishedManifest {
  publishedAt: string;
  parts: string[];
  source: {
    workflowRunId: number;
    artifactId: number;
  };
}

export interface AttendanceSentinelDelta {
  inep: string;
  sme: string | null;
  schoolName: string;
  programName: string;
  destination: string;
  totalCents: number;
  paymentOrderDate: string;
  reason: 'NEW_OR_CHANGED_PAYMENT_ORDER';
}

export interface AttendanceSentinelResult {
  checkedAt: string;
  snapshotPublishedAt: string;
  snapshotWorkflowRunId: number;
  snapshotArtifactId: number;
  schoolsChecked: number;
  attendanceObservations: number;
  deltaCount: number;
  deltas: AttendanceSentinelDelta[];
}

function normalized(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[^A-Z0-9]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

function publishedFacts(snapshot: PublishedSnapshot, inep: string): PublishedInstallment[] {
  const school = snapshot.schools?.[inep];
  if (!school) return [];
  return (school.programs ?? []).flatMap((program) => program.installments ?? []);
}

function observationKnown(
  observation: PddeInfoAttendanceObservation,
  snapshot: PublishedSnapshot,
): boolean {
  const facts = publishedFacts(snapshot, observation.schoolInep);
  return facts.some((fact) => {
    const amountKnown = Number(fact.paymentInformedCents ?? 0) === observation.totalCents;
    const dateKnown = (
      fact.paymentOrderDate === observation.paymentOrderDate
      || fact.paymentInformedDate === observation.paymentOrderDate
    );
    return amountKnown && dateKnown;
  });
}

export function compareAttendanceWithSnapshot(
  observations: readonly PddeInfoAttendanceObservation[],
  schools: readonly PortfolioSchool[],
  snapshot: PublishedSnapshot,
): AttendanceSentinelDelta[] {
  const schoolByInep = new Map(schools.map((school) => [school.inep, school]));

  return observations
    .filter((observation) => !observationKnown(observation, snapshot))
    .map((observation) => {
      const school = schoolByInep.get(observation.schoolInep);
      return {
        inep: observation.schoolInep,
        sme: school?.sme ?? null,
        schoolName: school?.nome ?? observation.schoolName,
        programName: observation.programName,
        destination: observation.destination,
        totalCents: observation.totalCents,
        paymentOrderDate: observation.paymentOrderDate,
        reason: 'NEW_OR_CHANGED_PAYMENT_ORDER' as const,
      };
    })
    .sort((left, right) => (
      left.paymentOrderDate.localeCompare(right.paymentOrderDate)
      || left.inep.localeCompare(right.inep)
      || normalized(left.destination).localeCompare(normalized(right.destination), 'pt-BR')
    ));
}

async function loadSchools(): Promise<PortfolioSchool[]> {
  const raw = JSON.parse(await readFile(resolve('backend/schools4cre.json'), 'utf8')) as {
    schools?: PortfolioSchool[];
  };
  const schools = raw.schools ?? [];
  if (schools.length !== 163) {
    throw new Error(`Carteira do sentinela deve conter 163 escolas; recebeu ${schools.length}.`);
  }
  return schools;
}

async function loadPublishedSnapshot(): Promise<{
  manifest: PublishedManifest;
  snapshot: PublishedSnapshot;
}> {
  const manifestPath = resolve('public/data/pdde-2026-snapshot.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as PublishedManifest;
  if (!Array.isArray(manifest.parts) || manifest.parts.length === 0) {
    throw new Error('Manifesto publicado não contém partes do snapshot.');
  }

  const encodedParts = await Promise.all(
    manifest.parts.map(async (part) => {
      const file = resolve('public/data', basename(part));
      return readFile(file, 'utf8');
    }),
  );
  const compressed = Buffer.from(encodedParts.join('').replace(/\s+/g, ''), 'base64');
  const snapshot = JSON.parse(gunzipSync(compressed).toString('utf8')) as PublishedSnapshot;

  if (
    snapshot.publishedAt !== manifest.publishedAt
    || snapshot.source?.workflowRunId !== manifest.source.workflowRunId
    || snapshot.source?.artifactId !== manifest.source.artifactId
  ) {
    throw new Error('Snapshot publicado diverge do manifesto usado pelo sentinela.');
  }

  return { manifest, snapshot };
}

async function collectAttendance(
  schools: readonly PortfolioSchool[],
): Promise<PddeInfoAttendanceObservation[]> {
  const observations: PddeInfoAttendanceObservation[] = [];
  const failures: Array<{ inep: string; message: string }> = [];

  await runRateLimited(
    [...schools],
    async (school) => {
      try {
        const report = await fetchPddeInfoPublicReport({
          filter: {
            kind: 'ATTENDANCE',
            fiscalYear: 2026,
            inep: school.inep,
          },
          browserFallback: false,
          timeoutMs: 20_000,
        });
        for (const row of report.rows) {
          observations.push(normalizeAttendanceRow(row));
        }
      } catch (cause) {
        failures.push({
          inep: school.inep,
          message: cause instanceof Error ? cause.message : String(cause),
        });
      }
    },
    {
      concurrency: 4,
      intervalCap: 8,
      intervalMs: 5_000,
      timeoutMs: 25_000,
      strict: true,
    },
  );

  if (failures.length > 0) {
    const sample = failures.slice(0, 10)
      .map((failure) => `${failure.inep}: ${failure.message}`)
      .join(' | ');
    throw new Error(
      `Sentinela não aceita cobertura parcial: ${failures.length}/163 consultas falharam. ${sample}`,
    );
  }

  return observations.sort((left, right) => (
    left.schoolInep.localeCompare(right.schoolInep)
    || left.paymentOrderDate.localeCompare(right.paymentOrderDate)
    || normalized(left.destination).localeCompare(normalized(right.destination), 'pt-BR')
  ));
}

export async function runAttendanceSentinel(): Promise<AttendanceSentinelResult> {
  const [schools, published] = await Promise.all([
    loadSchools(),
    loadPublishedSnapshot(),
  ]);
  const observations = await collectAttendance(schools);
  const deltas = compareAttendanceWithSnapshot(
    observations,
    schools,
    published.snapshot,
  );

  return {
    checkedAt: new Date().toISOString(),
    snapshotPublishedAt: published.manifest.publishedAt,
    snapshotWorkflowRunId: published.manifest.source.workflowRunId,
    snapshotArtifactId: published.manifest.source.artifactId,
    schoolsChecked: schools.length,
    attendanceObservations: observations.length,
    deltaCount: deltas.length,
    deltas,
  };
}

async function main(): Promise<void> {
  const outputPath = resolve(process.argv[2] ?? 'artifacts/pddeinfo-attendance-sentinel.json');
  const result = await runAttendanceSentinel();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    checkedAt: result.checkedAt,
    snapshotPublishedAt: result.snapshotPublishedAt,
    schoolsChecked: result.schoolsChecked,
    attendanceObservations: result.attendanceObservations,
    deltaCount: result.deltaCount,
    outputPath,
  }));
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
