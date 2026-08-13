import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import {
  evidenceEventInputSchema,
  persistedEvidenceEventSchema,
  type EvidenceEventInput,
  type EvidenceIntegrityResult,
  type PersistedEvidenceEvent,
} from '../core/evidence';

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function sha256(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)), 'utf8')
    .digest('hex');
}

function hashMaterial(
  sequence: number,
  previousHash: string | null,
  event: EvidenceEventInput,
): unknown {
  return { sequence, previousHash, event };
}

function toEventInput(event: PersistedEvidenceEvent): EvidenceEventInput {
  const {
    sequence: _sequence,
    previousHash: _previousHash,
    eventHash: _eventHash,
    ...input
  } = event;
  return evidenceEventInputSchema.parse(input);
}

export class JsonlEvidenceStore {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(private readonly filePath: string) {}

  private async readAllUnsafe(): Promise<PersistedEvidenceEvent[]> {
    let content: string;
    try {
      content = await readFile(this.filePath, 'utf8');
    } catch (cause) {
      if ((cause as NodeJS.ErrnoException).code === 'ENOENT') return [];
      throw cause;
    }

    const lines = content.split('\n').filter((line) => line.trim().length > 0);
    return lines.map((line, index) => {
      try {
        return persistedEvidenceEventSchema.parse(JSON.parse(line) as unknown);
      } catch (cause) {
        throw new Error(
          `Evento de evidência inválido na linha ${index + 1}: ${cause instanceof Error ? cause.message : String(cause)}`,
        );
      }
    });
  }

  private verifyEvents(events: PersistedEvidenceEvent[]): EvidenceIntegrityResult {
    const seenEventIds = new Set<string>();
    let previousHash: string | null = null;

    for (let index = 0; index < events.length; index += 1) {
      const persisted = events[index];
      const expectedSequence = index + 1;
      if (persisted.sequence !== expectedSequence) {
        return {
          valid: false,
          events: events.length,
          brokenAtSequence: expectedSequence,
          reason: 'sequência não contígua',
        };
      }
      if (seenEventIds.has(persisted.eventId)) {
        return {
          valid: false,
          events: events.length,
          brokenAtSequence: persisted.sequence,
          reason: 'eventId duplicado',
        };
      }
      seenEventIds.add(persisted.eventId);
      if (persisted.previousHash !== previousHash) {
        return {
          valid: false,
          events: events.length,
          brokenAtSequence: persisted.sequence,
          reason: 'previousHash divergente',
        };
      }

      const input = toEventInput(persisted);
      const expectedHash = sha256(hashMaterial(persisted.sequence, persisted.previousHash, input));
      if (persisted.eventHash !== expectedHash) {
        return {
          valid: false,
          events: events.length,
          brokenAtSequence: persisted.sequence,
          reason: 'eventHash divergente',
        };
      }
      previousHash = persisted.eventHash;
    }

    return { valid: true, events: events.length };
  }

  async append(rawEvent: EvidenceEventInput): Promise<PersistedEvidenceEvent> {
    const event = evidenceEventInputSchema.parse(rawEvent);
    let result: PersistedEvidenceEvent | undefined;
    let failure: unknown;

    this.writeQueue = this.writeQueue.then(async () => {
      try {
        const existing = await this.readAllUnsafe();
        const integrity = this.verifyEvents(existing);
        if (!integrity.valid) {
          throw new Error(
            `Store de evidências corrompido na sequência ${integrity.brokenAtSequence ?? '?'}: ${integrity.reason ?? 'integridade inválida'}.`,
          );
        }
        if (existing.some((item) => item.eventId === event.eventId)) {
          throw new Error(`eventId duplicado: ${event.eventId}.`);
        }

        const sequence = existing.length + 1;
        const previousHash = existing.at(-1)?.eventHash ?? null;
        const eventHash = sha256(hashMaterial(sequence, previousHash, event));
        const persisted = persistedEvidenceEventSchema.parse({
          ...event,
          sequence,
          previousHash,
          eventHash,
        });

        await mkdir(dirname(this.filePath), { recursive: true });
        await appendFile(this.filePath, `${JSON.stringify(persisted)}\n`, 'utf8');
        result = persisted;
      } catch (cause) {
        failure = cause;
      }
    });

    await this.writeQueue;
    if (failure) throw failure;
    if (!result) throw new Error('Falha interna ao persistir evento de evidência.');
    return result;
  }

  async listByRun(runId: string): Promise<PersistedEvidenceEvent[]> {
    return (await this.readAllUnsafe()).filter((event) => event.runId === runId);
  }

  async listBySchool(inep: string): Promise<PersistedEvidenceEvent[]> {
    return (await this.readAllUnsafe()).filter((event) => event.schoolInep === inep);
  }

  async listAll(): Promise<PersistedEvidenceEvent[]> {
    return this.readAllUnsafe();
  }

  async verifyIntegrity(): Promise<EvidenceIntegrityResult> {
    try {
      return this.verifyEvents(await this.readAllUnsafe());
    } catch (cause) {
      return {
        valid: false,
        events: 0,
        brokenAtSequence: 1,
        reason: cause instanceof Error ? cause.message : String(cause),
      };
    }
  }
}
