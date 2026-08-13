import { readFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';
import { normalizePddeInfoSchools } from '../../backend/adapters/pddeinfo-normalizer';
import { collectPddeInfo } from '../../backend/application/collect-pddeinfo';
import { EvidenceHistoryReader } from '../../backend/application/evidence-history';
import { loadMasterSchools } from '../../scripts/collect-pddeinfo';

const live = process.env.PDDEINFO_FULL_LIVE === '1';
const liveTest = live ? test : test.skip;

describe('PDDEInfo público — coleta completa opt-in', () => {
  liveTest('consulta as 163 escolas e preserva a trilha íntegra de evidências', async () => {
    const workspacePath = await mkdtemp(join(tmpdir(), 'pddeinfo-full-live-'));
    const schools = await loadMasterSchools();
    const evidenceStore = new JsonlEvidenceStore(join(workspacePath, 'evidence', 'events.jsonl'));

    const result = await collectPddeInfo({
      schools,
      workspacePath,
      fiscalYear: 2026,
      batchSize: 3,
      batchDelayMs: 1_500,
      evidenceStore,
    });

    const manifest = JSON.parse(await readFile(result.manifestPath, 'utf8')) as {
      schools: Array<{ inep: string; sme: string; nome: string; status: string; error?: string }>;
    };
    const failed = manifest.schools.filter((school) => school.status !== 'SUCCESS');
    if (failed.length > 0) {
      console.error('PDDEINFO_FULL_LIVE_FAILURES', JSON.stringify(failed, null, 2));
    }

    expect(result.status).toBe('COMPLETE');
    expect(result.statistics).toEqual({ total: 163, succeeded: 163, failed: 0 });

    const envelope = JSON.parse(await readFile(result.pddeInfoPath, 'utf8')) as {
      fetchedAt: string;
      collectionStatus: string;
      schools: unknown[];
    };
    expect(envelope.collectionStatus).toBe('COMPLETE');
    expect(envelope.schools).toHaveLength(163);

    const normalized = normalizePddeInfoSchools(envelope.schools, {
      fiscalYear: 2026,
      queriedAt: envelope.fetchedAt,
    });
    expect(normalized.statistics.schools).toBe(163);
    expect(normalized.payments.length).toBeGreaterThan(0);

    const integrity = await evidenceStore.verifyIntegrity();
    expect(integrity).toEqual({ valid: true, events: 493 });
    const projection = await new EvidenceHistoryReader(evidenceStore).getRun(result.runId);
    expect(projection).toMatchObject({
      runId: result.runId,
      source: 'PDDEINFO',
      status: 'COMPLETE',
      counts: {
        events: 493,
        attempts: 163,
        failedAttempts: 0,
        artifacts: 328,
        findings: 0,
        humanReview: 0,
      },
    });

    console.log('PDDEINFO_FULL_LIVE_SUMMARY', JSON.stringify({
      collection: result.statistics,
      normalization: normalized.statistics,
      warnings: normalized.warnings.length,
      evidence: integrity,
    }));
  }, 300_000);
});
