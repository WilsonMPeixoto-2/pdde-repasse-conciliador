import { z } from 'zod';

export const humanMoneySchema = z.number().int();
export const humanNonNegativeMoneySchema = humanMoneySchema.nonnegative();

function isReal2026Date(value: string): boolean {
  const match = /^2026-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const day = Number(match[2]);
  const date = new Date(Date.UTC(2026, month - 1, day));
  return date.getUTCFullYear() === 2026
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export const humanIsoDateSchema = z.string().refine(isReal2026Date, {
  message: 'Data humana deve ser uma data calendário válida de 2026.',
});

export const humanUnitSchema = z.object({
  sme: z.string().regex(/^\d{7}$/),
  name: z.string().min(1),
  inep: z.string().regex(/^\d{8}$/),
}).strict();

export const humanPortfolioSchoolSchema = humanUnitSchema.extend({
  programmedCents: humanNonNegativeMoneySchema,
  paymentInformedCents: humanNonNegativeMoneySchema,
  creditLocatedCents: humanNonNegativeMoneySchema,
  knownBalanceCents: humanMoneySchema.nullable(),
  referenceDate: humanIsoDateSchema.nullable(),
  accountsTotal: z.number().int().nonnegative(),
  accountsWithReferencePosition: z.number().int().nonnegative(),
  followUpCount: z.number().int().nonnegative(),
  paymentSuspended: z.boolean(),
  repasseAccountMissing: z.boolean(),
}).strict().refine((value) => value.accountsWithReferencePosition <= value.accountsTotal, {
  message: 'Cobertura de contas da unidade não pode exceder o total.',
});

export const humanSourceSchema = z.object({
  name: z.string().min(1),
  information: z.string().min(1),
}).strict();

export const humanIndicatorSchema = z.object({
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
  units: z.array(humanUnitSchema),
}).strict().refine((value) => value.count === value.units.length, {
  message: 'Indicador sem lista nominal correspondente.',
});

export const humanPortfolioMetricsSchema = z.object({
  schoolCount: z.number().int().positive(),
  accountsTotal: z.number().int().nonnegative(),
  accountsWithPosition: z.number().int().nonnegative(),
  programmedCents: humanNonNegativeMoneySchema,
  paymentInformedCents: humanNonNegativeMoneySchema,
  creditLocatedCents: humanNonNegativeMoneySchema,
  reportedBalanceCents: humanMoneySchema.nullable(),
  applicationsCents: humanMoneySchema.nullable(),
}).strict().refine((value) => value.accountsWithPosition <= value.accountsTotal, {
  message: 'Contas com posição não podem exceder o total.',
});

export const humanSchoolIdentitySchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  name: z.string().min(1),
  uex: z.string(),
  cnpj: z.string(),
}).strict();

export const humanAccountRefSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  number: z.string(),
}).strict();

export const humanCreditEvidenceSchema = z.object({
  status: z.string().min(1),
  date: humanIsoDateSchema.nullable(),
  amountCents: humanNonNegativeMoneySchema.nullable(),
  document: z.string().nullable(),
}).strict();

export const humanInstallmentSchema = z.object({
  installment: z.string().nullable(),
  programmedCents: humanNonNegativeMoneySchema,
  paymentInformedCents: humanNonNegativeMoneySchema,
  paymentInformedDate: humanIsoDateSchema.nullable(),
  paymentOrderDate: humanIsoDateSchema.nullable(),
  account: humanAccountRefSchema.nullable(),
  creditEvidence: humanCreditEvidenceSchema,
  note: z.string().nullable(),
}).strict();

export const humanProgramSchema = z.object({
  name: z.string().min(1),
  installments: z.array(humanInstallmentSchema),
}).strict();

export const humanPositionSchema = z.object({
  referenceDate: humanIsoDateSchema,
  checkingBalanceCents: humanMoneySchema.nullable(),
  applications: z.object({
    fundsCents: humanMoneySchema.nullable(),
    savingsCents: humanMoneySchema.nullable(),
    rdbCdbCents: humanMoneySchema.nullable(),
    totalCents: humanMoneySchema.nullable(),
  }).strict(),
  totalReportedBalanceCents: humanMoneySchema.nullable(),
}).strict();

export const humanCounterpartySchema = z.object({
  document: z.string().nullable(),
  name: z.string().nullable(),
  bank: z.string().nullable(),
  agency: z.string().nullable(),
  account: z.string().nullable(),
}).strict();

export const humanMovementKindSchema = z.enum([
  'FNDE_CREDIT',
  'APPLICATION',
  'REDEMPTION',
  'PAYMENT_OR_TRANSFER',
  'CARD_PAYMENT',
  'FINANCIAL_INCOME',
  'THIRD_PARTY_ENTRY',
  'BANK_FEE',
  'REVERSAL',
  'OTHER',
]);

export const humanMovementSchema = z.object({
  date: humanIsoDateSchema,
  description: z.string().min(1),
  document: z.string().nullable(),
  category: z.string().nullable(),
  kind: humanMovementKindSchema.default('OTHER'),
  creditCents: humanMoneySchema.nullable(),
  debitCents: humanMoneySchema.nullable(),
  counterparty: humanCounterpartySchema.nullable(),
}).strict();

export const humanMovementCollectionStatusSchema = z.enum([
  'COMPLETE',
  'PARTIAL',
  'FAILED',
  'NOT_AVAILABLE',
]);

const defaultCoverage = {
  positionCount: 0,
  firstPositionDate: null,
  latestPositionDate: null,
  movementCollectionStatus: 'NOT_AVAILABLE' as const,
  latestMovementDate: null,
};

export const humanAccountCoverage2026Schema = z.object({
  positionCount: z.number().int().nonnegative(),
  firstPositionDate: humanIsoDateSchema.nullable(),
  latestPositionDate: humanIsoDateSchema.nullable(),
  movementCollectionStatus: humanMovementCollectionStatusSchema,
  latestMovementDate: humanIsoDateSchema.nullable(),
}).strict().default(defaultCoverage);

const defaultActivity = {
  movementCount: 0,
  creditsObservedCents: 0,
  debitsObservedCents: 0,
  fndeCreditsCents: 0,
  applicationsCents: 0,
  redemptionsCents: 0,
  paymentsAndTransfersCents: 0,
  financialIncomeCents: 0,
  thirdPartyEntriesCents: 0,
  bankFeesCents: 0,
  otherCreditsCents: 0,
  otherDebitsCents: 0,
};

export const humanAccountActivity2026Schema = z.object({
  movementCount: z.number().int().nonnegative(),
  creditsObservedCents: humanNonNegativeMoneySchema,
  debitsObservedCents: humanNonNegativeMoneySchema,
  fndeCreditsCents: humanNonNegativeMoneySchema,
  applicationsCents: humanNonNegativeMoneySchema,
  redemptionsCents: humanNonNegativeMoneySchema,
  paymentsAndTransfersCents: humanNonNegativeMoneySchema,
  financialIncomeCents: humanNonNegativeMoneySchema,
  thirdPartyEntriesCents: humanNonNegativeMoneySchema,
  bankFeesCents: humanNonNegativeMoneySchema,
  otherCreditsCents: humanNonNegativeMoneySchema,
  otherDebitsCents: humanNonNegativeMoneySchema,
}).strict().default(defaultActivity);

export const humanAccountContextFlagSchema = z.enum([
  'NONZERO_POSITION_WITHOUT_2026_INFLOW',
  'NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT',
  'MOVEMENT_COLLECTION_PARTIAL',
  'MOVEMENT_COLLECTION_FAILED',
]);

export const humanAccountSchema = z.object({
  program: z.string().min(1),
  bank: z.string(),
  agency: z.string(),
  account: z.string(),
  positions: z.array(humanPositionSchema),
  latestPosition: humanPositionSchema.nullable(),
  movements: z.array(humanMovementSchema),
  coverage: humanAccountCoverage2026Schema,
  activity: humanAccountActivity2026Schema,
  contextFlags: z.array(humanAccountContextFlagSchema).default([]),
  note: z.string().nullable(),
}).strict();

export const humanAccountingSchema = z.object({
  program: z.string().min(1),
  status: z.string(),
  paymentSuspended: z.boolean(),
  expectedTotalCents: humanNonNegativeMoneySchema,
}).strict();

export const humanSchoolContentSchema = z.object({
  school: humanSchoolIdentitySchema,
  programs: z.array(humanProgramSchema),
  accounts: z.array(humanAccountSchema),
  accounting: z.array(humanAccountingSchema),
  followUp: z.array(z.string()),
}).strict();

export const humanPublicPortfolioSchema = z.object({
  title: z.literal('Inteligência Financeira PDDE | 4ª CRE'),
  fiscalYear: z.literal(2026),
  referenceLabel: z.string().min(1),
  schoolCount: z.number().int().positive(),
  metrics: humanPortfolioMetricsSchema,
  sources: z.array(humanSourceSchema).min(1),
  indicators: z.array(humanIndicatorSchema),
  schools: z.array(humanPortfolioSchoolSchema),
}).strict().refine((value) => value.schoolCount === value.schools.length, {
  message: 'Cobertura escolar divergente no portfólio humano.',
}).refine((value) => value.metrics.schoolCount === value.schoolCount, {
  message: 'Métricas e cobertura escolar divergem.',
});

export const humanPublicSchoolSchema = humanSchoolContentSchema.extend({
  fiscalYear: z.literal(2026),
}).strict();