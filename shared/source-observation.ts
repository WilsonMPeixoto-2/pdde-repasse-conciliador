import { z } from 'zod';

/** Fatos de coleta e datas observadas; não inferem atualização nem ausência financeira. */
export const sourceObservationSchema = z.object({
  source: z.enum(['PDDEINFO', 'SIGEF_EXTRATO', 'SIGEF_LIBERACOES']),
  collectionStatus: z.enum(['COMPLETE', 'PARTIAL', 'FAILED', 'NOT_ATTEMPTED']),
  collectedAt: z.string().datetime({ offset: true, message: 'data e hora ISO inválidas' }),
  observationBasis: z.enum(['QUERY_TIMESTAMP', 'LATEST_MOVEMENT_RETURNED', 'LATEST_RELEASE_RETURNED']),
  observedThrough: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  observedLagDays: z.number().int().nonnegative().nullable(),
  freshnessConclusion: z.literal('NOT_INFERRED'),
  metrics: z.record(z.string(), z.number().int().nonnegative()),
}).strict();

export type SourceObservation = z.infer<typeof sourceObservationSchema>;
