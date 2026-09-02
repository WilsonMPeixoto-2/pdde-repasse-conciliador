import { z } from 'zod';
import { isoTimestampSchema } from './time';

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}, 'data ISO inválida');

export const bankAccountSchema = z.object({
  bank: z.string().min(1),
  agency: z.string().min(1),
  number: z.string().min(1),
}).strict();

export const sourceSnapshotSchema = z.object({
  source: z.enum(['PDDEINFO', 'SIGEF_LIBERACOES', 'SIGEF_MOVIMENTACOES']),
  status: z.enum(['available', 'partial', 'unavailable']),
  queriedAt: isoTimestampSchema,
  coverageThrough: isoDateSchema.optional(),
  detail: z.string().min(1).optional(),
}).strict();

export const pddePaymentSchema = z.object({
  id: z.string().min(1),
  school: z.object({
    inep: z.string().regex(/^\d{8}$/),
    sme: z.string().regex(/^\d{7}$/),
    name: z.string().min(1),
    uex: z.string().min(1),
    cnpj: z.string().regex(/^\d{14}$/),
  }).strict(),
  fiscalYear: z.number().int().min(2000).max(2100),
  programCode: z.string().min(1),
  programName: z.string().min(1),
  actionCode: z.string().min(1),
  actionName: z.string().min(1),
  installmentCode: z.string().min(1).nullable(),
  installmentLabel: z.string().min(1).nullable(),
  amountOriginalDueCents: z.number().int().nonnegative(),
  amountOriginalDueCusteioCents: z.number().int().nonnegative().optional(),
  amountOriginalDueCapitalCents: z.number().int().nonnegative().optional(),
  adjustmentCents: z.number().int(),
  adjustmentCusteioCents: z.number().int().optional(),
  adjustmentCapitalCents: z.number().int().optional(),
  amountFinalDueCents: z.number().int().nonnegative(),
  amountFinalDueCusteioCents: z.number().int().nonnegative().optional(),
  amountFinalDueCapitalCents: z.number().int().nonnegative().optional(),
  amountPaidCents: z.number().int().nonnegative(),
  amountPaidCusteioCents: z.number().int().nonnegative().optional(),
  amountPaidCapitalCents: z.number().int().nonnegative().optional(),
  paymentDate: isoDateSchema.optional(),
  account: bankAccountSchema.optional(),
  sourceReference: z.object({
    source: z.literal('PDDEINFO'),
    url: z.string().url(),
    rawDestination: z.string().min(1),
  }).strict(),
}).strict();

export const sigefReleaseSchema = z.object({
  id: z.string().min(1),
  schoolCnpj: z.string().regex(/^\d{14}$/),
  fiscalYear: z.number().int().min(2000).max(2100),
  programCode: z.string().min(1),
  programName: z.string().min(1),
  actionCode: z.string().min(1),
  installmentCode: z.string().min(1).nullable(),
  amountCents: z.number().int().nonnegative(),
  paymentDate: isoDateSchema,
  orderBank: z.string().min(1),
  destinationAccount: bankAccountSchema,
  sourceReference: z.object({
    source: z.literal('SIGEF_LIBERACOES'),
    url: z.string().url(),
    rawProgram: z.string().min(1),
  }).strict(),
}).strict();

export const sigefMovementSchema = z.object({
  id: z.string().min(1),
  schoolCnpj: z.string().regex(/^\d{14}$/),
  programCode: z.string().min(1),
  operation: z.enum(['credit', 'debit']),
  amountCents: z.number().int().nonnegative(),
  movementDate: isoDateSchema,
  account: bankAccountSchema,
  document: z.string(),
  history: z.string(),
}).strict();

export const reconciliationInputSchema = z.object({
  payment: pddePaymentSchema.nullable(),
  releases: z.array(sigefReleaseSchema),
  movements: z.array(sigefMovementSchema),
  sources: z.object({
    pddeInfo: sourceSnapshotSchema,
    sigefReleases: sourceSnapshotSchema,
    sigefMovements: sourceSnapshotSchema,
  }).strict(),
}).strict();

export type BankAccount = z.infer<typeof bankAccountSchema>;
export type SourceSnapshot = z.infer<typeof sourceSnapshotSchema>;
export type PddePayment = z.infer<typeof pddePaymentSchema>;
export type SigefRelease = z.infer<typeof sigefReleaseSchema>;
export type SigefMovement = z.infer<typeof sigefMovementSchema>;
export type ReconciliationInput = z.infer<typeof reconciliationInputSchema>;
