import { z } from 'zod';

/** Timestamp RFC 3339/ISO 8601 completo, com fuso explícito e data civil válida. */
export const isoTimestampSchema = z.string().datetime({
  offset: true,
  message: 'data e hora ISO inválidas',
});
