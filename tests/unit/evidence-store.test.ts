import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, test } from 'vitest';
import {
  evidenceEventInputSchema,
  type EvidenceEventInput,
} from '../../backend/core/evidence';
import { JsonlEvidenceStore } from '../../backend/adapters/jsonl-evidence-store';

const baseEvent: EvidenceEventInput = {
  eventId: 'evt-001',
  runId: 'run-2026-08-13',
  type: 'EXECUTION_STARTED',
  occurredAt: '2026-08-13T01:55:00-03:00',
  source: 'PDDEINFO',
  fiscalYear: 2026,
  payload: {
    portfolioSize: 163,
    parserVersion: '0.3.0',
  },
};

describe('evidenceEventInputSchema', () => {
  test('aceita evento auditável e rejeita hash SHA-256 inválido em artefato', () => {
    expect(evidenceEventInputSchema.parse(baseEvent)).toMatchObject(baseEvent);

    expect(() => evidenceEventInputSchema.parse({
      ...baseEvent,
      eventId: 'evt-artifact',
      type: 'ARTIFACT_PRESERVED',
      schoolInep: '33069247',
      payload: {
        kind: 'RAW_HTML',
        path: 'raw/33069247.html',
        sha256: 'nao-e-hash',
        bytes: 1024,
      },
    })).toThrow(/sha-256/i);
  });
});

describe('JsonlEvidenceStore', () => {
  test('persiste em ordem, rejeita eventId duplicado e filtra por execução e escola', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-'));
    const path = join(directory, 'events.jsonl');
    const store = new JsonlEvidenceStore(path);

    const first = await store.append(baseEvent);
    const second = await store.append({
      eventId: 'evt-002',
      runId: baseEvent.runId,
      type: 'SOURCE_ATTEMPT_RECORDED',
      occurredAt: '2026-08-13T01:55:01-03:00',
      source: 'PDDEINFO',
      fiscalYear: 2026,
      schoolInep: '33069247',
      payload: {
        status: 'SUCCESS',
        attempts: 1,
        httpStatus: 200,
        responseBytes: 2048,
      },
    });
    await store.append({
      eventId: 'evt-003',
      runId: 'outro-run',
      type: 'EXECUTION_STARTED',
      occurredAt: '2026-08-13T01:56:00-03:00',
      source: 'SIGEF_MOVIMENTACOES',
      fiscalYear: 2026,
      payload: {},
    });

    expect(first.sequence).toBe(1);
    expect(first.previousHash).toBeNull();
    expect(first.eventHash).toMatch(/^[a-f0-9]{64}$/);
    expect(second.sequence).toBe(2);
    expect(second.previousHash).toBe(first.eventHash);

    await expect(store.append(baseEvent)).rejects.toThrow(/eventid.*duplicado/i);

    const runEvents = await store.listByRun(baseEvent.runId);
    expect(runEvents.map((event) => event.eventId)).toEqual(['evt-001', 'evt-002']);

    const schoolEvents = await store.listBySchool('33069247');
    expect(schoolEvents.map((event) => event.eventId)).toEqual(['evt-002']);
  });

  test('detecta adulteração da cadeia de hashes ao reabrir o arquivo', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdde-evidence-tamper-'));
    const path = join(directory, 'events.jsonl');
    const store = new JsonlEvidenceStore(path);

    await store.append(baseEvent);
    await store.append({
      ...baseEvent,
      eventId: 'evt-004',
      type: 'EXECUTION_FINISHED',
      occurredAt: '2026-08-13T01:56:00-03:00',
      payload: { status: 'COMPLETE', succeeded: 163, failed: 0 },
    });

    expect(await store.verifyIntegrity()).toEqual({ valid: true, events: 2 });

    const lines = (await readFile(path, 'utf8')).trimEnd().split('\n');
    const altered = JSON.parse(lines[0]) as Record<string, unknown>;
    altered.payload = { portfolioSize: 999 };
    lines[0] = JSON.stringify(altered);
    await writeFile(path, `${lines.join('\n')}\n`, 'utf8');

    const reopened = new JsonlEvidenceStore(path);
    const verification = await reopened.verifyIntegrity();
    expect(verification.valid).toBe(false);
    expect(verification).toMatchObject({ events: 2, brokenAtSequence: 1 });
  });
});
