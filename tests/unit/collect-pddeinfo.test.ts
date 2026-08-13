import { createHash } from 'node:crypto';
import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';

const subjectUrl = new URL('../../backend/application/collect-pddeinfo.ts', import.meta.url).href;

async function loadSubject(): Promise<Record<string, unknown> | null> {
  try {
    return await import(/* @vite-ignore */ subjectUrl) as Record<string, unknown>;
  } catch {
    return null;
  }
}

type School = { inep: string; sme: string; nome: string };

const schools: School[] = [
  { inep: '33069247', sme: '0410001', nome: 'EM EMA NEGRAO DE LIMA' },
  { inep: '33069093', sme: '0410002', nome: 'EM ALBINO SOUZA CRUZ' },
  { inep: '33069433', sme: '0410003', nome: 'EM RUY BARBOSA' },
];

function schoolHtml(school: School, cnpj: string): string {
  return `<!doctype html><html><body>
    <table><tr><td>Cod. Escola:</td><td>${school.inep}</td><td>Nome Escola:</td><td>${school.sme} ${school.nome}</td></tr></table>
    <table><tr><td>Executora:</td><td>CAIXA ESCOLAR ${school.nome}</td><td>CNPJ:</td><td>${cnpj}</td></tr></table>
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

async function json(path: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
}

describe('collectPddeInfo', () => {
  test('preserva evidências por escola, isola falhas e gera envelope parcial auditável', async () => {
    const subject = await loadSubject();
    expect(subject, 'o orquestrador da coleta PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;
    expect(subject.collectPddeInfo).toBeTypeOf('function');

    const workspacePath = await mkdtemp(join(tmpdir(), 'pddeinfo-collect-'));
    const htmlByInep = new Map([
      [schools[0].inep, schoolHtml(schools[0], '04.552.825/0001-70')],
      [schools[1].inep, schoolHtml(schools[1], '12.345.678/0001-90')],
    ]);

    const result = await (subject.collectPddeInfo as (
      options: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>)({
      schools,
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-test',
      startedAt: '2026-08-12T22:50:00-03:00',
      completedAt: () => '2026-08-12T22:51:00-03:00',
      batchSize: 2,
      batchDelayMs: 0,
      fetchSchoolHtml: async ({ inep }: { inep: string }) => {
        if (inep === schools[2].inep) throw new Error('falha transitória simulada');
        const html = htmlByInep.get(inep)!;
        return {
          html,
          sourceUrl: `https://www.fnde.gov.br/pddeinfo/test/${inep}`,
          queriedAt: '2026-08-12T22:50:30-03:00',
          attempts: inep === schools[1].inep ? 2 : 1,
          httpStatus: 200,
          responseBytes: Buffer.byteLength(html, 'utf8'),
        };
      },
    });

    expect(result).toMatchObject({
      status: 'PARTIAL',
      runId: 'run-test',
      statistics: { total: 3, succeeded: 2, failed: 1 },
      runDirectory: join(workspacePath, 'runs', 'run-test'),
      pddeInfoPath: join(workspacePath, 'runs', 'run-test', 'pddeinfo-2026.json'),
      manifestPath: join(workspacePath, 'runs', 'run-test', 'manifest.json'),
    });

    const firstRawPath = join(workspacePath, 'runs', 'run-test', 'raw', `${schools[0].inep}.html`);
    const firstNormalizedPath = join(workspacePath, 'runs', 'run-test', 'normalized', `${schools[0].inep}.json`);
    const firstRaw = await readFile(firstRawPath, 'utf8');
    const firstNormalized = await json(firstNormalizedPath);
    expect(firstRaw).toBe(htmlByInep.get(schools[0].inep));
    expect(firstNormalized).toMatchObject({
      inep: schools[0].inep,
      sme: schools[0].sme,
      nome: schools[0].nome,
      cnpj: '04.552.825/0001-70',
      accounts: [{ conta: '00012345X' }],
    });

    const manifest = await json(join(workspacePath, 'runs', 'run-test', 'manifest.json'));
    expect(manifest).toMatchObject({
      version: 1,
      runId: 'run-test',
      fiscalYear: 2026,
      status: 'PARTIAL',
      parserVersion: expect.any(String),
      statistics: { total: 3, succeeded: 2, failed: 1 },
      schools: expect.arrayContaining([
        expect.objectContaining({
          inep: schools[0].inep,
          status: 'SUCCESS',
          rawSha256: createHash('sha256').update(firstRaw, 'utf8').digest('hex'),
          normalizedSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
          rawPath: `raw/${schools[0].inep}.html`,
          normalizedPath: `normalized/${schools[0].inep}.json`,
        }),
        expect.objectContaining({
          inep: schools[2].inep,
          status: 'FAILED',
          error: 'falha transitória simulada',
        }),
      ]),
    });

    const envelope = await json(join(workspacePath, 'runs', 'run-test', 'pddeinfo-2026.json'));
    expect(envelope).toMatchObject({
      source: 'PDDEINFO',
      fiscalYear: 2026,
      fetchedAt: '2026-08-12T22:51:00-03:00',
      collectionStatus: 'PARTIAL',
      runId: 'run-test',
      schools: [
        expect.objectContaining({ inep: schools[0].inep }),
        expect.objectContaining({ inep: schools[1].inep }),
      ],
    });
  });

  test('classifica a execução como completa quando todas as escolas passam pela validação', async () => {
    const subject = await loadSubject();
    expect(subject, 'o orquestrador da coleta PDDEInfo ainda não foi implementado').not.toBeNull();
    if (!subject) return;

    const workspacePath = await mkdtemp(join(tmpdir(), 'pddeinfo-complete-'));
    const subset = schools.slice(0, 2);
    const result = await (subject.collectPddeInfo as (
      options: Record<string, unknown>,
    ) => Promise<Record<string, unknown>>)({
      schools: subset,
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-complete',
      startedAt: '2026-08-12T22:50:00-03:00',
      completedAt: () => '2026-08-12T22:51:00-03:00',
      batchSize: 2,
      batchDelayMs: 0,
      fetchSchoolHtml: async ({ inep }: { inep: string }) => {
        const school = subset.find(item => item.inep === inep)!;
        const html = schoolHtml(school, inep === schools[0].inep ? '04.552.825/0001-70' : '12.345.678/0001-90');
        return {
          html,
          sourceUrl: `https://www.fnde.gov.br/pddeinfo/test/${inep}`,
          queriedAt: '2026-08-12T22:50:30-03:00',
          attempts: 1,
          httpStatus: 200,
          responseBytes: Buffer.byteLength(html, 'utf8'),
        };
      },
    });

    expect(result).toMatchObject({
      status: 'COMPLETE',
      statistics: { total: 2, succeeded: 2, failed: 0 },
    });
    const envelope = await json(join(workspacePath, 'runs', 'run-complete', 'pddeinfo-2026.json'));
    expect(envelope).toMatchObject({ collectionStatus: 'COMPLETE' });
  });

  test('mantém manifest e envelope na ordem da lista-mestre mesmo com respostas fora de ordem', async () => {
    const subject = await loadSubject();
    expect(subject).not.toBeNull();
    if (!subject) return;

    const workspacePath = await mkdtemp(join(tmpdir(), 'pddeinfo-order-'));
    const subset = schools.slice(0, 2);
    const result = await (subject.collectPddeInfo as (
      options: Record<string, unknown>,
    ) => Promise<{ manifestPath: string; pddeInfoPath: string }>)({
      schools: subset,
      workspacePath,
      fiscalYear: 2026,
      runId: 'run-order',
      startedAt: '2026-08-12T22:50:00-03:00',
      completedAt: () => '2026-08-12T22:51:00-03:00',
      batchSize: 2,
      batchDelayMs: 0,
      fetchSchoolHtml: async ({ inep }: { inep: string }) => {
        const school = subset.find(item => item.inep === inep)!;
        if (inep === subset[0].inep) await new Promise((resolve) => setTimeout(resolve, 25));
        const html = schoolHtml(school, inep === schools[0].inep ? '04.552.825/0001-70' : '12.345.678/0001-90');
        return {
          html,
          sourceUrl: `https://www.fnde.gov.br/pddeinfo/test/${inep}`,
          queriedAt: '2026-08-12T22:50:30-03:00',
          attempts: 1,
          httpStatus: 200,
          responseBytes: Buffer.byteLength(html, 'utf8'),
        };
      },
    });

    const manifest = await json(result.manifestPath) as { schools: Array<{ inep: string }> };
    const envelope = await json(result.pddeInfoPath) as { schools: Array<{ inep: string }> };
    expect(manifest.schools.map((school) => school.inep)).toEqual(subset.map((school) => school.inep));
    expect(envelope.schools.map((school) => school.inep)).toEqual(subset.map((school) => school.inep));
  });
});
