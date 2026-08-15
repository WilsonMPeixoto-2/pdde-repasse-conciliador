import { z } from 'zod';
import { isoTimestampSchema } from './time';

export const sourceObservationSchema = z.object({
  source: z.enum(['PDDEINFO', 'SIGEF_EXTRATO']),
  collectionStatus: z.enum(['COMPLETE', 'PARTIAL', 'FAILED', 'NOT_ATTEMPTED']),
  collectedAt: isoTimestampSchema,
  observationBasis: z.enum(['QUERY_TIMESTAMP', 'LATEST_MOVEMENT_RETURNED']),
  observedThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  observedLagDays: z.number().int().nonnegative().nullable(),
  freshnessConclusion: z.literal('NOT_INFERRED'),
  metrics: z.record(z.string(), z.number().int().nonnegative()),
}).strict();

export type SourceObservation = z.infer<typeof sourceObservationSchema>;

interface MonitoringSourceObservationInput {
  generatedAt: string;
  pddeInfo: {
    collected: number;
    failures: number;
    queriedAt: string[];
  };
  sigef: Array<{
    status: 'COMPLETE' | 'PARTIAL' | 'ERROR';
    coverageThrough: string | null;
    movementsInYear: number;
  }>;
}

function latest(values: string[]): string | null {
  return values.length > 0 ? [...values].sort().at(-1) ?? null : null;
}

function dateOnly(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) throw new Error(`Timestamp inválido para observação de fonte: ${timestamp}.`);
  return parsed.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): number {
  const startMs = Date.parse(`${start}T00:00:00Z`);
  const endMs = Date.parse(`${end}T00:00:00Z`);
  if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
    throw new Error(`Data inválida para observação de fonte: ${start} / ${end}.`);
  }
  return Math.max(0, Math.round((endMs - startMs) / 86_400_000));
}

function pddeCollectionStatus(input: MonitoringSourceObservationInput['pddeInfo']): SourceObservation['collectionStatus'] {
  if (input.collected === 0 && input.failures === 0) return 'NOT_ATTEMPTED';
  if (input.collected === 0 && input.failures > 0) return 'FAILED';
  return input.failures === 0 ? 'COMPLETE' : 'PARTIAL';
}

function sigefCollectionStatus(input: MonitoringSourceObservationInput['sigef']): SourceObservation['collectionStatus'] {
  if (input.length === 0) return 'NOT_ATTEMPTED';
  const failed = input.filter((item) => item.status === 'ERROR').length;
  const partial = input.filter((item) => item.status === 'PARTIAL').length;
  if (failed === input.length) return 'FAILED';
  return failed === 0 && partial === 0 ? 'COMPLETE' : 'PARTIAL';
}

/**
 * Registra o que efetivamente foi observado na coleta. `observedLagDays` mede
 * apenas a distância para a última movimentação devolvida pela fonte. Ele não
 * afirma, sozinho, que a fonte esteja desatualizada: uma conta pode
 * simplesmente não ter movimentações recentes.
 */
export function buildMonitoringSourceObservations(
  input: MonitoringSourceObservationInput,
): SourceObservation[] {
  const generatedAt = isoTimestampSchema.parse(input.generatedAt);
  const referenceDate = dateOnly(generatedAt);
  const latestPddeQuery = latest(input.pddeInfo.queriedAt.map((value) => isoTimestampSchema.parse(value)));
  const latestSigefMovement = latest(
    input.sigef
      .map((item) => item.coverageThrough)
      .filter((value): value is string => value !== null),
  );

  return [
    sourceObservationSchema.parse({
      source: 'PDDEINFO',
      collectionStatus: pddeCollectionStatus(input.pddeInfo),
      collectedAt: latestPddeQuery ?? generatedAt,
      observationBasis: 'QUERY_TIMESTAMP',
      observedThrough: null,
      observedLagDays: null,
      freshnessConclusion: 'NOT_INFERRED',
      metrics: {
        schoolsCollected: input.pddeInfo.collected,
        failures: input.pddeInfo.failures,
      },
    }),
    sourceObservationSchema.parse({
      source: 'SIGEF_EXTRATO',
      collectionStatus: sigefCollectionStatus(input.sigef),
      collectedAt: generatedAt,
      observationBasis: 'LATEST_MOVEMENT_RETURNED',
      observedThrough: latestSigefMovement,
      observedLagDays: latestSigefMovement ? daysBetween(latestSigefMovement, referenceDate) : null,
      freshnessConclusion: 'NOT_INFERRED',
      metrics: {
        accountsQueried: input.sigef.length,
        accountsComplete: input.sigef.filter((item) => item.status === 'COMPLETE').length,
        accountsPartial: input.sigef.filter((item) => item.status === 'PARTIAL').length,
        accountsFailed: input.sigef.filter((item) => item.status === 'ERROR').length,
        movementsInFiscalYear: input.sigef.reduce((sum, item) => sum + item.movementsInYear, 0),
      },
    }),
  ];
}
