import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import type { HumanFinancialPortfolioView } from '../backend/application/build-human-financial-view';
import { prepareCurrentHumanFinancialSnapshot } from '../backend/application/current-human-financial-read-model';
import { buildHumanFinancialWorkbook } from '../backend/report/human-financial-workbook';

const WORKBOOK_FILENAME = 'inteligencia-financeira-pdde-4cre-2026.xlsx';
const MANIFEST_FILENAME = 'pdde-2026-snapshot.json';
const DEFAULT_PART_SIZE = 900_000;

export interface HumanFinancialSnapshotSource {
  workflowRunId: number;
  artifactId: number;
  artifactName: string;
}

export interface PackageHumanFinancialSnapshotOptions {
  human: HumanFinancialPortfolioView;
  runId: string;
  expectedSchoolCount: number;
  source: HumanFinancialSnapshotSource;
  outputDir: string;
  generatedAt?: string;
  partSize?: number;
}

export interface PackagedHumanFinancialSnapshot {
  payloadSha256: string;
  compressedSha256: string;
  partCount: number;
  manifestPath: string;
  workbookPath: string;
}

function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex');
}

function stableJson(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return `[${value.map((item) => item === undefined ? 'null' : stableJson(item)).join(',')}]`;
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => child !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`).join(',')}}`;
  }
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new Error('O snapshot contém valor não serializável.');
  return encoded;
}

function publicPayload(input: {
  runId: string;
  expectedSchoolCount: number;
  human: HumanFinancialPortfolioView;
}) {
  const prepared = prepareCurrentHumanFinancialSnapshot(input);
  const { runId: _portfolioRunId, ...portfolio } = prepared.portfolio;
  const schools = Object.fromEntries(
    [...prepared.schools]
      .sort((left, right) => left.school.inep.localeCompare(right.school.inep))
      .map(({ school, snapshot }) => {
        const { runId: _schoolRunId, ...publicSnapshot } = snapshot;
        return [school.inep, publicSnapshot];
      }),
  );
  return { portfolio, schools };
}

function splitBase64(value: string, partSize: number): string[] {
  if (!Number.isInteger(partSize) || partSize < 4) {
    throw new Error('partSize deve ser um inteiro maior ou igual a 4.');
  }
  const parts: string[] = [];
  for (let offset = 0; offset < value.length; offset += partSize) {
    parts.push(value.slice(offset, offset + partSize));
  }
  return parts;
}

export async function packageHumanFinancialSnapshot(
  options: PackageHumanFinancialSnapshotOptions,
): Promise<PackagedHumanFinancialSnapshot> {
  const outputDir = resolve(options.outputDir);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const generatedDate = new Date(generatedAt);
  if (Number.isNaN(generatedDate.getTime())) throw new Error('generatedAt inválido.');
  const partSize = options.partSize ?? DEFAULT_PART_SIZE;
  const payload = publicPayload({
    runId: options.runId,
    expectedSchoolCount: options.expectedSchoolCount,
    human: options.human,
  });
  const payloadJson = stableJson(payload);
  const payloadSha256 = sha256(payloadJson);
  const compressed = gzipSync(Buffer.from(payloadJson, 'utf8'), { level: 9 });
  const compressedSha256 = sha256(compressed);
  const encoded = compressed.toString('base64');
  const parts = splitBase64(encoded, partSize);
  const partDigits = Math.max(2, String(parts.length).length);
  const partNames = parts.map((_, index) => (
    `pdde-2026-snapshot.part${String(index + 1).padStart(partDigits, '0')}.txt`
  ));

  await mkdir(outputDir, { recursive: true });

  for (let index = 0; index < parts.length; index += 1) {
    const name = partNames[index];
    const content = parts[index];
    if (!name || content === undefined) throw new Error('Falha interna ao montar partes do snapshot.');
    await writeFile(resolve(outputDir, name), content, 'utf8');
  }

  const workbook = buildHumanFinancialWorkbook(options.human, { generatedAt: generatedDate });
  const workbookBytes = Buffer.from(await workbook.xlsx.writeBuffer());
  const workbookPath = resolve(outputDir, WORKBOOK_FILENAME);
  await writeFile(workbookPath, workbookBytes);

  const accountCount = options.human.schools.reduce((sum, school) => sum + school.accounts.length, 0);
  const positionCount = options.human.schools.reduce(
    (sum, school) => sum + school.accounts.reduce((accountSum, account) => accountSum + account.positions.length, 0),
    0,
  );
  const movementCount = options.human.schools.reduce(
    (sum, school) => sum + school.accounts.reduce((accountSum, account) => accountSum + account.movements.length, 0),
    0,
  );
  const partChecksums = Object.fromEntries(partNames.map((name, index) => [
    `/data/${name}`,
    sha256(parts[index] ?? ''),
  ]));

  const manifest = {
    encoding: 'gzip-base64-parts',
    parts: partNames.map((name) => `/data/${name}`),
    generatedAt,
    fiscalYear: 2026,
    counts: {
      schools: options.human.schools.length,
      accounts: accountCount,
      positions: positionCount,
      movements: movementCount,
    },
    checksums: {
      payloadSha256,
      compressedSha256,
      parts: partChecksums,
    },
    workbook: {
      path: `/data/${WORKBOOK_FILENAME}`,
      filename: WORKBOOK_FILENAME,
      generatedFromSameHumanContract: true,
    },
    source: options.source,
  } as const;
  const manifestPath = resolve(outputDir, MANIFEST_FILENAME);
  await writeFile(manifestPath, stableJson(manifest), 'utf8');

  return {
    payloadSha256,
    compressedSha256,
    partCount: parts.length,
    manifestPath,
    workbookPath,
  };
}

interface CliOptions {
  input: string;
  output: string;
  runId: string;
  expectedSchoolCount: number;
  workflowRunId: number;
  artifactId: number;
  artifactName: string;
  generatedAt?: string;
  partSize?: number;
}

function parseCli(argv: string[]): CliOptions {
  const values = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith('--') || value === undefined) {
      throw new Error('Argumentos inválidos para o empacotador do snapshot.');
    }
    values.set(key.slice(2), value);
  }
  const required = (key: string): string => {
    const value = values.get(key)?.trim();
    if (!value) throw new Error(`Argumento obrigatório ausente: --${key}.`);
    return value;
  };
  const positiveInteger = (key: string): number => {
    const value = Number(required(key));
    if (!Number.isSafeInteger(value) || value < 1) throw new Error(`--${key} deve ser inteiro positivo.`);
    return value;
  };
  const optionalInteger = (key: string): number | undefined => {
    const raw = values.get(key);
    if (raw === undefined) return undefined;
    const value = Number(raw);
    if (!Number.isSafeInteger(value) || value < 4) throw new Error(`--${key} deve ser inteiro maior ou igual a 4.`);
    return value;
  };

  const generatedAt = values.get('generated-at')?.trim();
  const partSize = optionalInteger('part-size');
  return {
    input: required('input'),
    output: required('output'),
    runId: required('run-id'),
    expectedSchoolCount: positiveInteger('expected-school-count'),
    workflowRunId: positiveInteger('workflow-run-id'),
    artifactId: positiveInteger('artifact-id'),
    artifactName: required('artifact-name'),
    ...(generatedAt ? { generatedAt } : {}),
    ...(partSize !== undefined ? { partSize } : {}),
  };
}

async function main(): Promise<void> {
  const cli = parseCli(process.argv.slice(2));
  const human = JSON.parse(await readFile(resolve(cli.input), 'utf8')) as HumanFinancialPortfolioView;
  const result = await packageHumanFinancialSnapshot({
    human,
    runId: cli.runId,
    expectedSchoolCount: cli.expectedSchoolCount,
    outputDir: cli.output,
    source: {
      workflowRunId: cli.workflowRunId,
      artifactId: cli.artifactId,
      artifactName: cli.artifactName,
    },
    ...(cli.generatedAt ? { generatedAt: cli.generatedAt } : {}),
    ...(cli.partSize !== undefined ? { partSize: cli.partSize } : {}),
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  main().catch((cause) => {
    process.stderr.write(`${cause instanceof Error ? cause.message : String(cause)}\n`);
    process.exitCode = 1;
  });
}
