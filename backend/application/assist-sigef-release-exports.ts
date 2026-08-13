import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { z } from 'zod';
import {
  inspectSigefReleaseHtml,
  type SupportedReleaseProgramCode,
} from '../adapters/sigef-release-inspector';
import { parseSigefReleaseHtml } from '../adapters/sigef-releases-html';
import { canonicalCnpj, canonicalText } from '../core/normalization';
import { DEFAULT_SIGEF_RELEASE_SOURCE_URL } from './load-sigef-release-exports';

const SUPPORTED_PROGRAMS = ['02', '0A', '0B', 'Z9'] as const;
const GENERATED_DIRECTORIES = new Set(['originais', 'liberacoes', 'controle']);

const timestampSchema = z.string().refine(
  (value) => Number.isFinite(Date.parse(value)),
  'data e hora inválidas',
);
const optionsSchema = z.object({
  pddeInfoPath: z.string().min(1),
  workspacePath: z.string().min(1),
  fiscalYear: z.number().int().min(2000).max(2100),
  generatedAt: timestampSchema.optional(),
}).strict();

const pddeInfoEnvelopeSchema = z.object({
  fetchedAt: z.string().optional(),
  schools: z.array(z.object({
    sme: z.string().min(1),
    nome: z.string().min(1),
    cnpj: z.string().min(1),
    accounts: z.array(z.object({
      programa: z.string(),
    }).passthrough()).default([]),
    finance: z.array(z.object({
      destinacao: z.string(),
    }).passthrough()).default([]),
  }).passthrough()),
}).passthrough();

export type ReleaseAssistantFileStatus =
  | 'IMPORTADO'
  | 'DUPLICADO_EQUIVALENTE'
  | 'ATUALIZADO'
  | 'CONFLITO'
  | 'PASTA_INCORRETA'
  | 'FORA_DA_CARTEIRA'
  | 'EXERCICIO_DIVERGENTE'
  | 'EXERCICIO_NAO_COMPROVADO'
  | 'ARQUIVO_INVALIDO';

export interface ReleaseAssistantFileAudit {
  sourcePath: string;
  sha256: string;
  status: ReleaseAssistantFileStatus;
  cnpj?: string;
  programCode?: SupportedReleaseProgramCode;
  queryDate?: string;
  originalPath?: string;
  canonicalPath?: string;
  message?: string;
}

export interface ReleaseAssistantCoverageRow {
  sme: string;
  schoolName: string;
  cnpj: string;
  programCode: SupportedReleaseProgramCode;
  status: 'DISPONIVEL' | 'FALTANTE';
  canonicalPath: string;
  queryDate?: string;
  records?: number;
}

export interface ReleaseAssistantPending {
  kind: 'PAR_FALTANTE' | ReleaseAssistantFileStatus;
  cnpj?: string;
  programCode?: SupportedReleaseProgramCode;
  sourcePath?: string;
  message: string;
}

export interface ReleaseAssistantResult {
  generatedAt: string;
  fiscalYear: number;
  workspace: {
    root: string;
    originalsDirectory: string;
    releasesDirectory: string;
    controlDirectory: string;
    controlWorkbookPath: string;
  };
  summary: {
    schools: number;
    expectedPairs: number;
    availablePairs: number;
    missingPairs: number;
    processedFiles: number;
    conflicts: number;
    errors: number;
  };
  files: ReleaseAssistantFileAudit[];
  coverage: ReleaseAssistantCoverageRow[];
  pending: ReleaseAssistantPending[];
}

interface ExpectedPair {
  sme: string;
  schoolName: string;
  cnpj: string;
  programCode: SupportedReleaseProgramCode;
}

interface CanonicalState {
  path: string;
  signature: string;
  queryDate: string;
  queriedAt: string;
  records: number;
}

function accountProgramCode(raw: string): SupportedReleaseProgramCode | null {
  const text = canonicalText(raw);
  if (text === 'PDDE' || text === 'PDDE BASICO') return '02';
  if (text === 'PDDE QUALIDADE') return '0B';
  if (text === 'PDDE EQUIDADE') return '0A';
  if (text === 'PDDE EDUCACAO INTEGRAL') return 'Z9';
  return null;
}

function financeProgramCode(raw: string): SupportedReleaseProgramCode | null {
  const text = canonicalText(raw);
  if (text.includes('PDDE QUALIDADE')) return '0B';
  if (text.includes('PDDE EQUIDADE')) return '0A';
  if (text.includes('PDDE EDUCACAO INTEGRAL') || text.includes('MAIS EDUCACAO')) return 'Z9';
  if (
    text.includes('PDDE BASICO')
    || text.includes('PRIMEIRA INFANCIA')
    || text.startsWith('PDDE PDDE')
  ) return '02';
  return null;
}

function expectedPairKey(cnpj: string, programCode: SupportedReleaseProgramCode): string {
  return `${canonicalCnpj(cnpj)}:${programCode}`;
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

async function buildExpectedPairs(pddeInfoPath: string): Promise<{
  schools: number;
  pairs: ExpectedPair[];
}> {
  const envelope = pddeInfoEnvelopeSchema.parse(await parseJsonFile(pddeInfoPath));
  const pairs = new Map<string, ExpectedPair>();
  for (const school of envelope.schools) {
    const cnpj = canonicalCnpj(school.cnpj);
    if (!/^\d{14}$/.test(cnpj)) throw new Error(`${school.sme}: CNPJ inválido no PDDEInfo: ${school.cnpj}.`);
    const programs = new Set<SupportedReleaseProgramCode>();
    for (const account of school.accounts) {
      const code = accountProgramCode(account.programa);
      if (code) programs.add(code);
    }
    for (const finance of school.finance) {
      const code = financeProgramCode(finance.destinacao);
      if (code) programs.add(code);
    }
    for (const programCode of programs) {
      pairs.set(expectedPairKey(cnpj, programCode), {
        sme: school.sme,
        schoolName: school.nome,
        cnpj,
        programCode,
      });
    }
  }
  if (pairs.size === 0) throw new Error('O PDDEInfo não produziu nenhum par CNPJ/programa para Liberações.');
  return {
    schools: envelope.schools.length,
    pairs: [...pairs.values()].sort((left, right) =>
      expectedPairKey(left.cnpj, left.programCode).localeCompare(
        expectedPairKey(right.cnpj, right.programCode),
        'en',
      )),
  };
}

async function ensureWorkspace(root: string, fiscalYear: number) {
  const originalsDirectory = join(root, 'originais');
  const releasesDirectory = join(root, 'liberacoes');
  const controlDirectory = join(root, 'controle');
  await Promise.all([
    ...SUPPORTED_PROGRAMS.map((code) => mkdir(join(originalsDirectory, code), { recursive: true })),
    mkdir(join(originalsDirectory, '_pendentes'), { recursive: true }),
    mkdir(releasesDirectory, { recursive: true }),
    mkdir(controlDirectory, { recursive: true }),
  ]);
  return {
    root,
    originalsDirectory,
    releasesDirectory,
    controlDirectory,
    controlWorkbookPath: join(controlDirectory, `controle-liberacoes-${fiscalYear}.xlsx`),
  };
}

async function scanIncomingXls(root: string): Promise<string[]> {
  const found: string[] = [];
  async function walk(directory: string, depth: number): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (depth === 0 && GENERATED_DIRECTORIES.has(entry.name.toLowerCase())) continue;
        await walk(path, depth + 1);
      } else if (entry.isFile() && /\.xls$/i.test(entry.name)) {
        found.push(path);
      }
    }
  }
  await walk(root, 0);
  return found.sort((left, right) => left.localeCompare(right, 'en'));
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function preserveOriginal(
  workspace: ReleaseAssistantResult['workspace'],
  bytes: Buffer,
  hash: string,
  cnpj?: string,
  programCode?: SupportedReleaseProgramCode,
): Promise<string> {
  const directory = programCode
    ? join(workspace.originalsDirectory, programCode)
    : join(workspace.originalsDirectory, '_pendentes');
  const filename = programCode && cnpj
    ? `${cnpj}__${programCode}__${hash.slice(0, 12)}.xls`
    : `${hash.slice(0, 12)}.xls`;
  const target = join(directory, filename);
  try {
    await writeFile(target, bytes, { flag: 'wx' });
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code !== 'EEXIST') throw error;
    const existing = await readFile(target);
    if (sha256(existing) !== hash) {
      throw new Error(`Colisão de hash/caminho ao preservar o original ${target}.`);
    }
  }
  return target;
}

function declaredFolderProgram(root: string, filePath: string): SupportedReleaseProgramCode | null {
  const parts = dirname(relative(root, filePath)).split(/[\\/]+/).filter(Boolean);
  for (const part of parts.reverse()) {
    const code = part.toUpperCase();
    if ((SUPPORTED_PROGRAMS as readonly string[]).includes(code)) {
      return code as SupportedReleaseProgramCode;
    }
  }
  return null;
}

function releaseSignature(parsed: ReturnType<typeof parseSigefReleaseHtml>): string {
  const normalized = parsed.releases.map((release) => ({
    actionCode: release.actionCode,
    installmentCode: release.installmentCode ?? null,
    amountCents: release.amountCents,
    paymentDate: release.paymentDate,
    orderBank: release.orderBank,
    bank: release.destinationAccount.bank,
    agency: release.destinationAccount.agency,
    account: release.destinationAccount.number,
  })).sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right), 'en'));
  return JSON.stringify(normalized);
}

function signatureIsStrictSuperset(next: string, previous: string): boolean {
  const nextRows = JSON.parse(next) as unknown[];
  const previousRows = JSON.parse(previous) as unknown[];
  if (nextRows.length <= previousRows.length) return false;
  const nextSet = new Set(nextRows.map((item) => JSON.stringify(item)));
  return previousRows.every((item) => nextSet.has(JSON.stringify(item)));
}

async function readCanonicalState(
  path: string,
  pair: ExpectedPair,
  targetCnpjs: string[],
  fiscalYear: number,
): Promise<CanonicalState> {
  const bytes = await readFile(path);
  const parsed = parseSigefReleaseHtml(bytes, {
    fiscalYear,
    programCode: pair.programCode,
    targetCnpjs,
    sourceUrl: DEFAULT_SIGEF_RELEASE_SOURCE_URL,
  });
  return {
    path,
    signature: releaseSignature(parsed),
    queryDate: parsed.source.coverageThrough ?? '',
    queriedAt: parsed.source.queriedAt,
    records: parsed.releases.length,
  };
}

async function existingCanonicalStates(
  expectedPairs: ExpectedPair[],
  releasesDirectory: string,
  targetCnpjs: string[],
  fiscalYear: number,
): Promise<Map<string, CanonicalState>> {
  const states = new Map<string, CanonicalState>();
  for (const pair of expectedPairs) {
    const path = join(releasesDirectory, `${pair.cnpj}__${pair.programCode}.xls`);
    try {
      states.set(
        expectedPairKey(pair.cnpj, pair.programCode),
        await readCanonicalState(path, pair, targetCnpjs, fiscalYear),
      );
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
      if (code !== 'ENOENT') throw error;
    }
  }
  return states;
}

function auditErrorStatus(error: unknown): ReleaseAssistantFileStatus {
  const message = error instanceof Error ? error.message : String(error);
  if (/exerc[ií]cio divergente/i.test(message)) return 'EXERCICIO_DIVERGENTE';
  return 'ARQUIVO_INVALIDO';
}

export async function assistSigefReleaseExports(
  rawOptions: z.input<typeof optionsSchema>,
): Promise<ReleaseAssistantResult> {
  const options = optionsSchema.parse(rawOptions);
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const root = resolve(options.workspacePath);
  const workspace = await ensureWorkspace(root, options.fiscalYear);
  const expected = await buildExpectedPairs(options.pddeInfoPath);
  const expectedByKey = new Map(expected.pairs.map((pair) => [
    expectedPairKey(pair.cnpj, pair.programCode),
    pair,
  ]));
  const targetCnpjs = [...new Set(expected.pairs.map((pair) => pair.cnpj))];
  const canonicalStates = await existingCanonicalStates(
    expected.pairs,
    workspace.releasesDirectory,
    targetCnpjs,
    options.fiscalYear,
  );

  const files: ReleaseAssistantFileAudit[] = [];
  for (const sourcePath of await scanIncomingXls(root)) {
    const bytes = await readFile(sourcePath);
    const hash = sha256(bytes);
    let inspection;
    try {
      inspection = inspectSigefReleaseHtml(bytes, { fiscalYear: options.fiscalYear });
    } catch (error) {
      const originalPath = await preserveOriginal(workspace, bytes, hash);
      files.push({
        sourcePath,
        sha256: hash,
        status: auditErrorStatus(error),
        originalPath,
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const originalPath = await preserveOriginal(
      workspace,
      bytes,
      hash,
      inspection.cnpj,
      inspection.programCode,
    );
    const key = expectedPairKey(inspection.cnpj, inspection.programCode);
    const baseAudit = {
      sourcePath,
      sha256: hash,
      cnpj: inspection.cnpj,
      programCode: inspection.programCode,
      queryDate: inspection.query.date,
      originalPath,
    };

    const folderProgram = declaredFolderProgram(root, sourcePath);
    if (folderProgram && folderProgram !== inspection.programCode) {
      files.push({
        ...baseAudit,
        status: 'PASTA_INCORRETA',
        message: `Arquivo está na pasta ${folderProgram}, mas o conteúdo pertence ao programa ${inspection.programCode}.`,
      });
      continue;
    }
    const expectedPair = expectedByKey.get(key);
    if (!expectedPair) {
      files.push({
        ...baseAudit,
        status: 'FORA_DA_CARTEIRA',
        message: `O par ${inspection.cnpj}/${inspection.programCode} não pertence à carteira do PDDEInfo.`,
      });
      continue;
    }
    if (!inspection.fiscalYear.verified) {
      files.push({
        ...baseAudit,
        status: 'EXERCICIO_NAO_COMPROVADO',
        message: `O arquivo não contém evidência suficiente para confirmar o exercício ${options.fiscalYear}.`,
      });
      continue;
    }

    let parsed;
    try {
      parsed = parseSigefReleaseHtml(bytes, {
        fiscalYear: options.fiscalYear,
        programCode: inspection.programCode,
        targetCnpjs,
        sourceUrl: DEFAULT_SIGEF_RELEASE_SOURCE_URL,
      });
    } catch (error) {
      files.push({
        ...baseAudit,
        status: 'ARQUIVO_INVALIDO',
        message: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    const canonicalPath = join(
      workspace.releasesDirectory,
      `${inspection.cnpj}__${inspection.programCode}.xls`,
    );
    const signature = releaseSignature(parsed);
    const current = canonicalStates.get(key);
    if (!current) {
      await writeFile(canonicalPath, bytes, { flag: 'wx' });
      canonicalStates.set(key, {
        path: canonicalPath,
        signature,
        queryDate: inspection.query.date,
        queriedAt: inspection.query.timestamp,
        records: parsed.releases.length,
      });
      files.push({ ...baseAudit, status: 'IMPORTADO', canonicalPath });
      continue;
    }
    if (current.signature === signature) {
      files.push({ ...baseAudit, status: 'DUPLICADO_EQUIVALENTE', canonicalPath: current.path });
      continue;
    }
    if (
      inspection.query.timestamp > current.queriedAt
      && signatureIsStrictSuperset(signature, current.signature)
    ) {
      await writeFile(canonicalPath, bytes);
      canonicalStates.set(key, {
        path: canonicalPath,
        signature,
        queryDate: inspection.query.date,
        queriedAt: inspection.query.timestamp,
        records: parsed.releases.length,
      });
      files.push({ ...baseAudit, status: 'ATUALIZADO', canonicalPath });
      continue;
    }
    files.push({
      ...baseAudit,
      status: 'CONFLITO',
      canonicalPath: current.path,
      message: 'A exportação diverge do arquivo canônico e não representa uma atualização monotônica segura.',
    });
  }

  const coverage: ReleaseAssistantCoverageRow[] = expected.pairs.map((pair) => {
    const state = canonicalStates.get(expectedPairKey(pair.cnpj, pair.programCode));
    return {
      ...pair,
      status: state ? 'DISPONIVEL' : 'FALTANTE',
      canonicalPath: join(workspace.releasesDirectory, `${pair.cnpj}__${pair.programCode}.xls`),
      ...(state?.queryDate ? { queryDate: state.queryDate } : {}),
      ...(state ? { records: state.records } : {}),
    };
  });
  const pending: ReleaseAssistantPending[] = [
    ...coverage.filter((row) => row.status === 'FALTANTE').map((row) => ({
      kind: 'PAR_FALTANTE' as const,
      cnpj: row.cnpj,
      programCode: row.programCode,
      message: `Falta a exportação de Liberações para ${row.cnpj}/${row.programCode}.`,
    })),
    ...files.filter((file) => !['IMPORTADO', 'DUPLICADO_EQUIVALENTE', 'ATUALIZADO'].includes(file.status)).map((file) => ({
      kind: file.status,
      cnpj: file.cnpj,
      programCode: file.programCode,
      sourcePath: file.sourcePath,
      message: file.message ?? `Arquivo requer revisão: ${basename(file.sourcePath)}.`,
    })),
  ];
  const availablePairs = coverage.filter((row) => row.status === 'DISPONIVEL').length;
  const conflicts = files.filter((file) => file.status === 'CONFLITO').length;
  const errors = files.filter((file) => [
    'ARQUIVO_INVALIDO',
    'EXERCICIO_DIVERGENTE',
    'EXERCICIO_NAO_COMPROVADO',
    'FORA_DA_CARTEIRA',
    'PASTA_INCORRETA',
  ].includes(file.status)).length;

  return {
    generatedAt,
    fiscalYear: options.fiscalYear,
    workspace,
    summary: {
      schools: expected.schools,
      expectedPairs: expected.pairs.length,
      availablePairs,
      missingPairs: expected.pairs.length - availablePairs,
      processedFiles: files.length,
      conflicts,
      errors,
    },
    files,
    coverage,
    pending,
  };
}
