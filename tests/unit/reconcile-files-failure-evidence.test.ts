import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { reconcileFiles } from '../../backend/application/reconcile-files';

const school = {
  inep: '33000001', sme: '0410001', nome: 'EM Exemplo', denominacaoFnde: '0410001 EM EXEMPLO',
  uex: 'CAIXA ESCOLAR EM EXEMPLO', cnpj: '12.345.678/0001-90',
  accounts: [{ programa: 'PDDE', banco: '001', agencia: '0249', conta: '00012345X', saldo: '0,00', ocorrencia: '' }],
  finance: [{
    destinacao: 'PDDE / PDDE Básico - 1ª Parcela',
    devidoCusteio: '4.000,00', devidoCapital: '1.000,00', devidoTotal: '5.000,00',
    ajusteCusteio: '0,00', ajusteCapital: '0,00', ajusteTotal: '0,00', finalDevidoTotal: '5.000,00',
    pagoCusteio: '4.000,00', pagoCapital: '1.000,00', pagoTotal: '5.000,00', data: '05/08/2026',
  }],
  source: 'https://www.fnde.gov.br/pddeinfo/exemplo',
  sourceIdentity: { inep: '33000001', sme: '0410001', denominacao: '0410001 EM EXEMPLO' },
};

describe('reconcileFiles — falha auditável', () => {
  test('encerra a execução como FAILED quando uma dependência quebra depois do início', async () => {
    const root = await mkdtemp(join(tmpdir(), 'pdde-reconcile-failure-'));
    const pddeInfoPath = join(root, 'pddeinfo.json');
    const evidenceStore = new JsonlEvidenceStore(join(root, 'evidence', 'events.jsonl'));
    await writeFile(pddeInfoPath, JSON.stringify({
      fetchedAt: '2026-08-12T08:00:00-03:00', collectionStatus: 'COMPLETE',
      runId: 'collect-source-run', schools: [school],
    }), 'utf8');

    await expect(reconcileFiles({
      pddeInfoPath,
      movementsPath: join(root, 'arquivo-inexistente.csv'),
      outputPath: join(root, 'result.xlsx'),
      fiscalYear: 2026,
      requestedThrough: '2026-08-12',
      generatedAt: '2026-08-12T09:00:00-03:00',
      reconciliationRunId: 'reconcile-failed-run',
      evidenceStore,
    })).rejects.toThrow();

    const events = await evidenceStore.listByRun('reconcile-failed-run');
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ type: 'EXECUTION_STARTED', source: 'CONCILIADOR' });
    expect(events[1]).toMatchObject({
      type: 'EXECUTION_FINISHED', source: 'CONCILIADOR',
      payload: expect.objectContaining({
        status: 'FAILED', failed: 1, sourceCollectionRunId: 'collect-source-run', error: expect.any(String),
      }),
    });
    expect(await evidenceStore.verifyIntegrity()).toEqual({ valid: true, events: 2 });
  });
});
