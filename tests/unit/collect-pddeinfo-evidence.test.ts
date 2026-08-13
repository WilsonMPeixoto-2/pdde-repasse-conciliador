import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { collectPddeInfo } from '../../backend/application/collect-pddeinfo';
import type {
  ArtifactStore,
  PreserveArtifactInput,
  PreservedArtifact,
} from '../../backend/application/artifact-store';

const schools = [
  { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' },
  { inep: '33069093', sme: '0410002', nome: 'EM ALBINO SOUZA CRUZ' },
];

function schoolHtml(school: (typeof schools)[number]): string {
  return `<!doctype html><html><body>
    <table><tr><td>Cod. Escola:</td><td>${school.inep}</td><td>Nome Escola:</td><td>${school.sme} ${school.nome}</td></tr></table>
    <table><tr><td>Executora:</td><td>CAIXA ESCOLAR ${school.nome}</td><td>CNPJ:</td><td>04.552.825/0001-70</td></tr></table>
    <table>
      <tr><th>Programa/Ação</th><th>Banco</th><th>Agência</th><th>Conta</th><th>Saldo</th><th>Ocorrência</th></tr>
      <tr><td>PDDE</td><td>001</td><td>0249</td><td>00012345X</td><td>0,00</td><td></td></tr>
    </table>
    <table>
      <tr>
        <th>Destinação</th><th>Vl Devido Custeio</th><th>Vl Devido Capital</th><th>Vl Devido Total</th>
        <th>Vl Ajuste Custeio</th><th>Vl Ajuste Capital</th><th>Vl Ajuste Total</th><th>Vl Final Devido Total</th>
        <th>Vl Pago Custeio</th><th>Vl Pago Capital</th><th>Valor Pago Total</th><th>Data Ord. Pagamento</th>
      </tr>
      <tr>
        <td>PDDE / PDDE Básico - 1ª Parcela</td><td>4.000,00</td><td>1.000,00</td><td>5.000,00</td>
        <td>0,00</td><td>0,00</td><td>0,00</td><td>5.000,00</td>
        <td>4.000,00</td><td>1.000,00</td><td>5.000,00</td><td>05/08/2026</td>
      </tr>
    </table>
  </body></html>`;
}

describe('collectPddeInfo + EvidenceStore', () => {
  test('registra execução, tentativa por escola, artefatos e encerramento sem perder falhas', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'pdde-collect-evidence-'));
    const evidenceStore = new JsonlEvidenceStore(join(workspacePath, 'evidence', 'events.jsonl'));

    const result = await collectPddeInfo({
      schools,
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-evidence-test',
      startedAt: '2026-08-13T01:55:00-03:00',
      completedAt: () => '2026-08-13T01:56:00-03:00',
      batchSize: 1,
      batchDelayMs: 0,
      evidenceStore,
      fetchSchoolHtml: async ({ inep }) => {
        if (inep === schools[1].inep) throw new Error('falha simulada');
        const html = schoolHtml(schools[0]);
        return {
          html,
          rawBytes: Buffer.from(html, 'utf8'),
          sourceUrl: `https://www.fnde.gov.br/pddeinfo/test/${inep}`,
          queriedAt: '2026-08-13T01:55:30-03:00',
          attempts: 1,
          httpStatus: 200,
          responseBytes: Buffer.byteLength(html),
        };
      },
    });

    expect(result.status).toBe('PARTIAL');

    const events = await evidenceStore.listByRun('run-evidence-test');
    expect(events[0]).toMatchObject({ type: 'EXECUTION_STARTED', source: 'PDDEINFO' });
    expect(events.at(-1)).toMatchObject({
      type: 'EXECUTION_FINISHED',
      payload: { status: 'PARTIAL', succeeded: 1, failed: 1 },
    });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'SOURCE_ATTEMPT_RECORDED',
        schoolInep: schools[0].inep,
        payload: expect.objectContaining({ status: 'SUCCESS' }),
      }),
      expect.objectContaining({
        type: 'SOURCE_ATTEMPT_RECORDED',
        schoolInep: schools[1].inep,
        payload: expect.objectContaining({ status: 'FAILED', error: 'falha simulada' }),
      }),
      expect.objectContaining({
        type: 'ARTIFACT_PRESERVED',
        schoolInep: schools[0].inep,
        payload: expect.objectContaining({ kind: 'RAW_HTML' }),
      }),
      expect.objectContaining({
        type: 'ARTIFACT_PRESERVED',
        schoolInep: schools[0].inep,
        payload: expect.objectContaining({ kind: 'NORMALIZED_JSON' }),
      }),
      expect.objectContaining({
        type: 'ARTIFACT_PRESERVED',
        payload: expect.objectContaining({ kind: 'MANIFEST' }),
      }),
    ]));

    const integrity = await evidenceStore.verifyIntegrity();
    expect(integrity).toEqual({ valid: true, events: events.length });
  });

  test('preserva bytes no storage institucional e faz ARTIFACT_PRESERVED apontar para ele', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'pdde-collect-storage-'));
    const evidenceStore = new JsonlEvidenceStore(join(workspacePath, 'evidence', 'events.jsonl'));
    const preserved: PreserveArtifactInput[] = [];
    const artifactStore: ArtifactStore = {
      async preserve(input): Promise<PreservedArtifact> {
        preserved.push(input);
        return {
          provider: 'SUPABASE_STORAGE',
          bucket: 'pdde-evidence',
          path: `runs/${input.runId}/${input.relativePath}`,
          kind: input.kind,
          sha256: 'a'.repeat(64),
          bytes: input.bytes.byteLength,
          mediaType: input.mediaType,
          ...(input.schoolInep ? { schoolInep: input.schoolInep } : {}),
          metadata: input.metadata ?? {},
        };
      },
      async download() { throw new Error('não usado'); },
      async createSignedDownload() { throw new Error('não usado'); },
    };
    const html = schoolHtml(schools[0]);

    await collectPddeInfo({
      schools: [schools[0]],
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-storage-test',
      startedAt: '2026-08-13T01:55:00-03:00',
      completedAt: () => '2026-08-13T01:56:00-03:00',
      batchSize: 1,
      batchDelayMs: 0,
      evidenceStore,
      artifactStore,
      institutionalPathPrefix: 'attempts/2',
      fetchSchoolHtml: async () => ({
        html,
        rawBytes: Buffer.from(html, 'utf8'),
        sourceUrl: 'https://www.fnde.gov.br/pddeinfo/test/33069247',
        queriedAt: '2026-08-13T01:55:30-03:00',
        attempts: 1,
        httpStatus: 200,
        responseBytes: Buffer.byteLength(html),
      }),
    });

    expect(preserved.map((artifact) => artifact.relativePath)).toEqual([
      'attempts/2/schools/33069247/raw.html',
      'attempts/2/schools/33069247/normalized.json',
      'attempts/2/manifest.json',
      'attempts/2/pddeinfo-2026.json',
    ]);
    const artifacts = (await evidenceStore.listByRun('run-storage-test'))
      .filter((event) => event.type === 'ARTIFACT_PRESERVED');
    expect(artifacts).toHaveLength(4);
    expect(artifacts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        schoolInep: '33069247',
        payload: expect.objectContaining({
          kind: 'RAW_HTML',
          provider: 'SUPABASE_STORAGE',
          bucket: 'pdde-evidence',
          path: 'runs/run-storage-test/attempts/2/schools/33069247/raw.html',
        }),
      }),
    ]));
  });

  test('não mascara falha do armazenamento institucional como falha da fonte', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'pdde-collect-storage-failure-'));
    const evidenceStore = new JsonlEvidenceStore(join(workspacePath, 'evidence', 'events.jsonl'));
    const html = schoolHtml(schools[0]);
    const artifactStore: ArtifactStore = {
      async preserve() { throw new Error('storage institucional indisponível'); },
      async download() { throw new Error('não usado'); },
      async createSignedDownload() { throw new Error('não usado'); },
    };

    await expect(collectPddeInfo({
      schools: [schools[0]],
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-storage-failure',
      batchSize: 1,
      batchDelayMs: 0,
      evidenceStore,
      artifactStore,
      fetchSchoolHtml: async () => ({
        html,
        rawBytes: Buffer.from(html, 'utf8'),
        sourceUrl: 'https://www.fnde.gov.br/pddeinfo/test/33069247',
        queriedAt: '2026-08-13T01:55:30-03:00',
        attempts: 1,
        httpStatus: 200,
        responseBytes: Buffer.byteLength(html),
      }),
    })).rejects.toThrow(/storage institucional indisponível/i);

    const events = await evidenceStore.listByRun('run-storage-failure');
    expect(events).not.toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'SOURCE_ATTEMPT_RECORDED',
        payload: expect.objectContaining({ status: 'FAILED' }),
      }),
    ]));
  });

  test('aguarda as demais escolas do lote antes de propagar falha institucional', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'pdde-collect-storage-batch-failure-'));
    const evidenceStore = new JsonlEvidenceStore(join(workspacePath, 'evidence', 'events.jsonl'));
    let signalSecondStarted!: () => void;
    let releaseSecond!: () => void;
    let signalFirstFailure!: () => void;
    const secondStarted = new Promise<void>((resolve) => { signalSecondStarted = resolve; });
    const secondReleased = new Promise<void>((resolve) => { releaseSecond = resolve; });
    const firstFailure = new Promise<void>((resolve) => { signalFirstFailure = resolve; });
    const artifactStore: ArtifactStore = {
      async preserve(input): Promise<PreservedArtifact> {
        if (input.schoolInep === schools[0].inep) {
          await secondStarted;
          signalFirstFailure();
          throw new Error('storage institucional indisponível');
        }
        signalSecondStarted();
        await secondReleased;
        return {
          provider: 'SUPABASE_STORAGE',
          bucket: 'pdde-evidence',
          path: `runs/${input.runId}/${input.relativePath}`,
          kind: input.kind,
          sha256: 'd'.repeat(64),
          bytes: input.bytes.byteLength,
          mediaType: input.mediaType,
          ...(input.schoolInep ? { schoolInep: input.schoolInep } : {}),
          metadata: input.metadata ?? {},
        };
      },
      async download() { throw new Error('não usado'); },
      async createSignedDownload() { throw new Error('não usado'); },
    };
    const collection = collectPddeInfo({
      schools,
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-storage-batch-failure',
      batchSize: 2,
      batchDelayMs: 0,
      evidenceStore,
      artifactStore,
      fetchSchoolHtml: async ({ inep }) => {
        const school = schools.find((candidate) => candidate.inep === inep)!;
        const html = schoolHtml(school);
        return {
          html,
          rawBytes: Buffer.from(html, 'utf8'),
          sourceUrl: `https://www.fnde.gov.br/pddeinfo/test/${inep}`,
          queriedAt: '2026-08-13T01:55:30-03:00',
          attempts: 1,
          httpStatus: 200,
          responseBytes: Buffer.byteLength(html),
        };
      },
    });
    let settled = false;
    const observed = collection.then(
      () => ({ error: null }),
      (error: unknown) => ({ error }),
    ).finally(() => { settled = true; });

    await firstFailure;
    await new Promise<void>((resolve) => setImmediate(resolve));
    const settledBeforeSecondFinished = settled;
    releaseSecond();
    const result = await observed;

    expect(settledBeforeSecondFinished).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
    expect((result.error as Error).message).toMatch(/storage institucional indisponível/i);
    const events = await evidenceStore.listByRun('run-storage-batch-failure');
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'SOURCE_ATTEMPT_RECORDED',
        schoolInep: schools[1].inep,
        payload: expect.objectContaining({ status: 'SUCCESS' }),
      }),
    ]));
  });
});
