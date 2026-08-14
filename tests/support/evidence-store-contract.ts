import { randomUUID } from 'node:crypto';
import { describe, expect, test } from 'vitest';
import type { EvidenceEventStore } from '../../backend/application/evidence-store';

export type EvidenceStoreFactory = () => Promise<EvidenceEventStore>;

export function evidenceStoreContract(
  name: string,
  makeStore: EvidenceStoreFactory,
  timeoutMs = 5_000,
): void {
  describe(`${name} — contrato de EvidenceEventStore`, () => {
    test('faz append encadeado, lista por execução/escola e rejeita eventId duplicado', async () => {
      const store = await makeStore();
      const suffix = randomUUID();
      const runId = `run-${suffix}`;
      const firstInput = {
        eventId: `evt-start-${suffix}`,
        runId,
        type: 'EXECUTION_STARTED' as const,
        occurredAt: '2026-08-13T12:00:00-03:00',
        source: 'PDDEINFO' as const,
        fiscalYear: 2026,
        payload: { portfolioSize: 1 },
      };

      const first = await store.append(firstInput);
      const second = await store.append({
        eventId: `evt-attempt-${suffix}`,
        runId,
        type: 'SOURCE_ATTEMPT_RECORDED',
        occurredAt: '2026-08-13T12:00:01-03:00',
        source: 'PDDEINFO',
        fiscalYear: 2026,
        schoolInep: '33069247',
        payload: { status: 'SUCCESS', attempts: 1 },
      });

      expect(second.sequence).toBe(first.sequence + 1);
      expect(second.previousHash).toBe(first.eventHash);
      expect(first.eventHash).toMatch(/^[a-f0-9]{64}$/);
      await expect(store.append(firstInput)).rejects.toThrow(/eventid.*duplicado/i);

      await expect(store.listByRun(runId)).resolves.toEqual([
        expect.objectContaining({ eventId: firstInput.eventId }),
        expect.objectContaining({ eventId: `evt-attempt-${suffix}` }),
      ]);
      await expect(store.listBySchool('33069247')).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ eventId: `evt-attempt-${suffix}` })]),
      );
      expect((await store.listAll()).map((event) => event.sequence)).toEqual(
        expect.arrayContaining([first.sequence, second.sequence]),
      );
      await expect(store.verifyIntegrity()).resolves.toMatchObject({ valid: true });
    }, timeoutMs);
  });
}
