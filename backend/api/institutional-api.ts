import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { EvidenceIntegrityResult } from '../core/evidence';
import type {
  PddeInfoJobRequest,
  ReconciliationJobRequest,
} from '../application/execution-command-service';
import { ReconciliationArtifactEvidenceError } from '../application/execution-command-service';
import {
  ArtifactUploadIdempotencyConflictError,
  ArtifactUploadIntegrityError,
  ArtifactUploadNotFoundError,
  type ArtifactUploadRequest,
} from '../application/artifact-intake-service';

interface ReadServiceApi {
  listSchools(): { items: Array<{ inep: string; sme: string; nome: string }>; total: number };
  getSchool(inep: string): unknown | null;
  getSchoolHistory(inep: string): Promise<unknown | null>;
  listExecutions(query?: { limit?: number; cursor?: string }): Promise<unknown>;
  getExecution(runId: string): Promise<unknown | null>;
  listFindings(query?: {
    limit?: number;
    cursor?: string;
    schoolInep?: string;
    runId?: string;
    requiresHumanReview?: boolean;
  }): Promise<unknown>;
  listArtifacts(runId: string): Promise<Array<{
    kind: string;
    provider: string;
    bucket: string | null;
    path: string;
    sha256: string;
    metadata?: Record<string, unknown>;
  }>>;
}

interface CommandServiceApi {
  requestPddeInfo(idempotencyKey: string, body: PddeInfoJobRequest): Promise<unknown>;
  requestReconciliation(idempotencyKey: string, body: ReconciliationJobRequest): Promise<unknown>;
}

interface ArtifactSignerApi {
  createSignedDownload(input: {
    bucket: string;
    path: string;
    sha256?: string;
    expiresInSeconds: number;
    downloadName?: string;
  }): Promise<{ url: string; expiresAt: string }>;
}

interface ArtifactIntakeApi {
  requestUpload(idempotencyKey: string, body: ArtifactUploadRequest): Promise<unknown>;
  confirmUpload(runId: string, uploadId: string): Promise<unknown>;
}

export interface InstitutionalApiDependencies {
  readService: ReadServiceApi;
  commandService: CommandServiceApi;
  artifactStore: ArtifactSignerApi;
  artifactIntakeService: ArtifactIntakeApi;
  commandToken: string;
  verifyEvidence: () => Promise<EvidenceIntegrityResult>;
  evidenceCacheTtlMs?: number;
  now?: () => number;
  version: string;
  onError?: (cause: unknown) => void;
}

export type InstitutionalApiHandler = (request: Request) => Promise<Response>;

export const administrativeCommandTokenSchema = z.string()
  .min(32, 'PDDE_API_COMMAND_TOKEN deve ter ao menos 32 caracteres.')
  .max(512, 'PDDE_API_COMMAND_TOKEN excede 512 caracteres.')
  .regex(/^[\x21-\x7e]+$/, 'PDDE_API_COMMAND_TOKEN deve usar somente caracteres ASCII visíveis, sem espaços.');

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
};
export const MAX_INSTITUTIONAL_JSON_BODY_BYTES = 1_000_000;

class RequestBodyTooLargeError extends Error {}

function json(value: unknown, status = 200, extraHeaders?: HeadersInit): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { ...JSON_HEADERS, ...Object.fromEntries(new Headers(extraHeaders).entries()) },
  });
}

function errorResponse(status: number, error: string, details?: unknown): Response {
  return json({ error, ...(details === undefined ? {} : { details }) }, status);
}

function tokenMatches(provided: string, expected: string): boolean {
  const providedDigest = createHash('sha256').update(provided, 'utf8').digest();
  const expectedDigest = createHash('sha256').update(expected, 'utf8').digest();
  return timingSafeEqual(providedDigest, expectedDigest);
}

function authorized(request: Request, expectedToken: string): boolean {
  const authorization = request.headers.get('authorization') ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(authorization);
  return Boolean(match && tokenMatches(match[1], expectedToken));
}

function queryString(url: URL, name: string): string | undefined {
  const value = url.searchParams.get(name);
  return value === null || value === '' ? undefined : value;
}

function numericQuery(url: URL, name: string): number | undefined {
  const value = queryString(url, name);
  if (value === undefined) return undefined;
  if (!/^\d+$/.test(value)) throw new Error(`${name} deve ser um inteiro positivo.`);
  return Number(value);
}

function booleanQuery(url: URL, name: string): boolean | undefined {
  const value = queryString(url, name);
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${name} deve ser true ou false.`);
}

async function requestJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  const mediaType = contentType.split(';', 1)[0].trim().toLowerCase();
  if (mediaType !== 'application/json') {
    throw new Error('Content-Type application/json é obrigatório.');
  }
  const declaredLength = request.headers.get('content-length');
  if (declaredLength !== null) {
    if (!/^\d+$/.test(declaredLength)) throw new Error('Content-Length inválido.');
    if (Number(declaredLength) > MAX_INSTITUTIONAL_JSON_BODY_BYTES) {
      throw new RequestBodyTooLargeError('Corpo da requisição excede 1.000.000 bytes.');
    }
  }
  const reader = request.body?.getReader();
  if (!reader) throw new Error('JSON inválido no corpo da requisição.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MAX_INSTITUTIONAL_JSON_BODY_BYTES) {
        try { await reader.cancel(); } catch { /* resposta 413 prevalece */ }
        throw new RequestBodyTooLargeError('Corpo da requisição excede 1.000.000 bytes.');
      }
      chunks.push(value);
    }
    const body = new Uint8Array(bytes);
    let offset = 0;
    for (const chunk of chunks) {
      body.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(body)) as unknown;
  } catch (cause) {
    if (cause instanceof RequestBodyTooLargeError) throw cause;
    throw new Error('JSON inválido no corpo da requisição.');
  } finally {
    reader.releaseLock();
  }
}

function methodNotAllowed(allowed: string): Response {
  return errorResponse(405, 'Método não permitido.', { allowed });
}

export function createInstitutionalApi(
  dependencies: InstitutionalApiDependencies,
): InstitutionalApiHandler {
  const commandToken = administrativeCommandTokenSchema.parse(dependencies.commandToken);
  z.string().min(1).parse(dependencies.version);
  const evidenceCacheTtlMs = z.number().int().min(100).max(300_000)
    .parse(dependencies.evidenceCacheTtlMs ?? 10_000);
  const now = dependencies.now ?? Date.now;
  let cachedEvidence: { expiresAt: number; value: EvidenceIntegrityResult } | null = null;
  let inFlightEvidence: Promise<EvidenceIntegrityResult> | null = null;

  const verifyEvidence = async (): Promise<EvidenceIntegrityResult> => {
    const currentTime = now();
    if (cachedEvidence && currentTime < cachedEvidence.expiresAt) {
      return cachedEvidence.value;
    }
    if (inFlightEvidence) return inFlightEvidence;

    const pending = dependencies.verifyEvidence().then((value) => {
      cachedEvidence = { value, expiresAt: now() + evidenceCacheTtlMs };
      return value;
    }).finally(() => {
      if (inFlightEvidence === pending) inFlightEvidence = null;
    });
    inFlightEvidence = pending;
    return pending;
  };

  return async (request: Request): Promise<Response> => {
    try {
      const url = new URL(request.url);
      const segments = url.pathname.split('/').filter(Boolean).map(decodeURIComponent);
      if (segments[0] !== 'api') return errorResponse(404, 'Endpoint não encontrado.');

      if (segments.length === 2 && segments[1] === 'health') {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        const evidence = await verifyEvidence();
        return json({ ok: evidence.valid, service: 'pdde-repasse-conciliador', evidence }, evidence.valid ? 200 : 503);
      }

      if (segments.length === 2 && segments[1] === 'meta') {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        const catalog = dependencies.readService.listSchools();
        return json({
          service: 'pdde-repasse-conciliador',
          version: dependencies.version,
          schools: catalog.total,
          executionMode: 'POSTGRES_QUEUE_AND_TRUSTED_NODE_RUNNER',
          evidence: 'APPEND_ONLY',
          money: 'INTEGER_CENTS',
        });
      }

      if (segments.length === 2 && segments[1] === 'schools') {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        return json(dependencies.readService.listSchools());
      }

      if (segments[1] === 'schools' && segments.length >= 3) {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        const inep = segments[2];
        if (segments.length === 3) {
          const school = dependencies.readService.getSchool(inep);
          return school ? json(school) : errorResponse(404, 'Escola não encontrada.');
        }
        if (segments.length === 4 && segments[3] === 'history') {
          const history = await dependencies.readService.getSchoolHistory(inep);
          return history ? json(history) : errorResponse(404, 'Escola não encontrada.');
        }
        if (segments.length === 4 && segments[3] === 'findings') {
          const findings = await dependencies.readService.listFindings({
            schoolInep: inep,
            limit: numericQuery(url, 'limit'),
            cursor: queryString(url, 'cursor'),
            requiresHumanReview: booleanQuery(url, 'review'),
          });
          return json(findings);
        }
      }

      if (segments.length === 2 && segments[1] === 'executions') {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        return json(await dependencies.readService.listExecutions({
          limit: numericQuery(url, 'limit'),
          cursor: queryString(url, 'cursor'),
        }));
      }

      if (segments[1] === 'executions' && segments.length >= 3) {
        if (segments.length === 3 && segments[2] === 'pddeinfo') {
          if (request.method !== 'POST') return methodNotAllowed('POST');
          if (!authorized(request, commandToken)) return errorResponse(401, 'Comando não autorizado.');
          const idempotencyKey = request.headers.get('idempotency-key')?.trim();
          if (!idempotencyKey) return errorResponse(400, 'Idempotency-Key é obrigatório.');
          const receipt = await dependencies.commandService.requestPddeInfo(
            idempotencyKey,
            await requestJson(request) as PddeInfoJobRequest,
          );
          return json(receipt, 202);
        }

        if (request.method !== 'GET') return methodNotAllowed('GET');
        const runId = segments[2];
        if (segments.length === 3) {
          const detail = await dependencies.readService.getExecution(runId);
          return detail ? json(detail) : errorResponse(404, 'Execução não encontrada.');
        }
        if (segments.length === 4 && segments[3] === 'artifacts') {
          const artifacts = await dependencies.readService.listArtifacts(runId);
          return json({ items: artifacts, total: artifacts.length });
        }
        if (segments.length === 4 && segments[3] === 'report') {
          const artifacts = await dependencies.readService.listArtifacts(runId);
          const report = artifacts.find((artifact) => artifact.kind === 'REPORT');
          if (!report) return errorResponse(404, 'Relatório não encontrado.');
          if (report.provider !== 'SUPABASE_STORAGE' || !report.bucket) {
            return errorResponse(409, 'Relatório ainda não está no armazenamento institucional.');
          }
          const signed = await dependencies.artifactStore.createSignedDownload({
            bucket: report.bucket,
            path: report.path,
            sha256: report.sha256,
            expiresInSeconds: 300,
            downloadName: `relatorio-${runId}.xlsx`,
          });
          return new Response(null, {
            status: 302,
            headers: {
              location: signed.url,
              'cache-control': 'no-store',
              'x-content-type-options': 'nosniff',
            },
          });
        }
      }

      if (segments.length === 2 && segments[1] === 'findings') {
        if (request.method !== 'GET') return methodNotAllowed('GET');
        return json(await dependencies.readService.listFindings({
          limit: numericQuery(url, 'limit'),
          cursor: queryString(url, 'cursor'),
          schoolInep: queryString(url, 'schoolInep'),
          runId: queryString(url, 'runId'),
          requiresHumanReview: booleanQuery(url, 'review'),
        }));
      }

      if (segments[1] === 'artifacts' && segments[2] === 'uploads') {
        if (segments.length === 3) {
          if (request.method !== 'POST') return methodNotAllowed('POST');
          if (!authorized(request, commandToken)) return errorResponse(401, 'Comando não autorizado.');
          const idempotencyKey = request.headers.get('idempotency-key')?.trim();
          if (!idempotencyKey) return errorResponse(400, 'Idempotency-Key é obrigatório.');
          const ticket = await dependencies.artifactIntakeService.requestUpload(
            idempotencyKey,
            await requestJson(request) as ArtifactUploadRequest,
          );
          return json(ticket, 201);
        }
        if (segments.length === 5 && segments[4] === 'confirm') {
          if (request.method !== 'POST') return methodNotAllowed('POST');
          if (!authorized(request, commandToken)) return errorResponse(401, 'Comando não autorizado.');
          const body = z.object({ runId: z.string().min(1).max(160) }).strict()
            .parse(await requestJson(request));
          return json(await dependencies.artifactIntakeService.confirmUpload(
            body.runId,
            segments[3],
          ));
        }
      }

      if (segments.length === 2 && segments[1] === 'reconciliations') {
        if (request.method !== 'POST') return methodNotAllowed('POST');
        if (!authorized(request, commandToken)) return errorResponse(401, 'Comando não autorizado.');
        const idempotencyKey = request.headers.get('idempotency-key')?.trim();
        if (!idempotencyKey) return errorResponse(400, 'Idempotency-Key é obrigatório.');
        const receipt = await dependencies.commandService.requestReconciliation(
          idempotencyKey,
          await requestJson(request) as ReconciliationJobRequest,
        );
        return json(receipt, 202);
      }

      return errorResponse(404, 'Endpoint não encontrado.');
    } catch (cause) {
      dependencies.onError?.(cause);
      if (cause instanceof z.ZodError) {
        return errorResponse(400, 'Requisição inválida.', cause.issues.map((issue) => ({
          path: issue.path.join('.'), message: issue.message,
        })));
      }
      if (cause instanceof URIError) return errorResponse(400, 'Caminho de URL inválido.');
      if (cause instanceof RequestBodyTooLargeError) {
        return errorResponse(413, cause.message);
      }
      if (cause instanceof ArtifactUploadNotFoundError) {
        return errorResponse(404, cause.message);
      }
      if (cause instanceof ReconciliationArtifactEvidenceError) {
        return errorResponse(409, cause.message);
      }
      if (
        cause instanceof ArtifactUploadIdempotencyConflictError
        || cause instanceof ArtifactUploadIntegrityError
      ) return errorResponse(409, cause.message);
      if (cause instanceof Error && /idempotency conflict/i.test(cause.message)) {
        return errorResponse(
          409,
          'Conflito de idempotência: a chave já foi usada para outro pedido.',
        );
      }
      if (cause instanceof Error && /obrigatóri|inválid|deve ser|excede/i.test(cause.message)) {
        return errorResponse(400, cause.message);
      }
      return errorResponse(500, 'Erro interno no backend institucional.');
    }
  };
}
