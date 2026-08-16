import { z } from 'zod';
import { CURRENT_FISCAL_YEAR } from './fiscal-scope';
import { canonicalAccount } from './normalization';
import { isoDateSchema } from './schemas';
import { isoTimestampSchema } from './time';

const nullableMoneySchema = z.number().int().safe().nullable();

export const financialAccountSnapshotSchema = z.object({
  schoolInep: z.string().regex(/^\d{8}$/),
  uexCnpj: z.string().regex(/^\d{14}$/),
  programName: z.string().min(1),
  bank: z.string().min(1),
  agency: z.string().min(1),
  account: z.string().min(1),
  referenceDate: isoDateSchema.refine(
    (value) => value.startsWith(`${CURRENT_FISCAL_YEAR}-`),
    `snapshot financeiro corrente deve pertencer a ${CURRENT_FISCAL_YEAR}`,
  ),
  checkingBalanceCents: nullableMoneySchema,
  fundBalanceCents: nullableMoneySchema,
  savingsBalanceCents: nullableMoneySchema,
  rdbCdbBalanceCents: nullableMoneySchema,
  investmentBalanceCents: nullableMoneySchema,
  totalReportedBalanceCents: nullableMoneySchema,
  source: z.literal('PDDEINFO'),
  collectedAt: isoTimestampSchema,
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/i).nullable(),
}).strict();

export type FinancialAccountSnapshot = z.infer<typeof financialAccountSnapshotSchema>;

function segment(value: string): string {
  return value.trim().toUpperCase();
}

export function financialSnapshotKey(rawSnapshot: FinancialAccountSnapshot): string {
  const snapshot = financialAccountSnapshotSchema.parse(rawSnapshot);
  return [
    snapshot.schoolInep,
    snapshot.uexCnpj,
    segment(snapshot.programName),
    canonicalAccount({
      bank: snapshot.bank,
      agency: snapshot.agency,
      number: snapshot.account,
    }),
    snapshot.referenceDate,
    snapshot.source,
  ].join('|');
}
