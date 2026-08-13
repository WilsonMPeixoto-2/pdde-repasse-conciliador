import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { collectPddeInfo } from '../../backend/application/collect-pddeinfo';

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
});
