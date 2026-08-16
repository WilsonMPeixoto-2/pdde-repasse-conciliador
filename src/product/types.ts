import { z } from 'zod';

const moneySchema = z.number().int();
const nonNegativeMoneySchema = moneySchema.nonnegative();
const isoDateSchema = z.string().regex(/^2026-\d{2}-\d{2}$/);

export const humanUnitSchema = z.object({
  sme: z.string().regex(/^\d{7}$/),
  name: z.string().min(1),
  inep: z.string().regex(/^\d{8}$/),
}).strict();

export const humanPortfolioMetricsSchema = z.object({
  schoolCount: z.number().int().positive(),
  accountsTotal: z.number().int().nonnegative(),
  accountsWithPosition: z.number().int().nonnegative(),
  programmedCents: nonNegativeMoneySchema,
  paymentInformedCents: nonNegativeMoneySchema,
  creditLocatedCents: nonNegativeMoneySchema,
  reportedBalanceCents: moneySchema.nullable(),
  applicationsCents: moneySchema.nullable(),
}).strict().refine((value) => value.accountsWithPosition <= value.accountsTotal, {
  message: 'Contas com posição não podem exceder o total.',
});

const sourceSchema = z.object({
  name: z.string().min(1),
  information: z.string().min(1),
}).strict();

const indicatorSchema = z.object({
  label: z.string().min(1),
  count: z.number().int().nonnegative(),
  units: z.array(humanUnitSchema),
}).strict().refine((value) => value.count === value.units.length, {
  message: 'Indicador sem lista nominal correspondente.',
});

export const humanPortfolioSchema = z.object({
  title: z.literal('Inteligência Financeira PDDE | 4ª CRE'),
  fiscalYear: z.literal(2026),
  referenceLabel: z.string().min(1),
  schoolCount: z.number().int().positive(),
  metrics: humanPortfolioMetricsSchema,
  sources: z.array(sourceSchema).min(1),
  indicators: z.array(indicatorSchema),
  schools: z.array(humanUnitSchema),
}).strict().refine((value) => value.schoolCount === value.schools.length, {
  message: 'Cobertura escolar divergente no portfólio humano.',
}).refine((value) => value.metrics.schoolCount === value.schoolCount, {
  message: 'Métricas e cobertura escolar divergem.',
});

const accountRefSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  number: z.string(),
}).strict();

const creditEvidenceSchema = z.object({
  status: z.string().min(1),
  date: isoDateSchema.nullable(),
  amountCents: moneySchema.nullable(),
  document: z.string().nullable(),
}).strict();

const installmentSchema = z.object({
  installment: z.string().nullable(),
  programmedCents: nonNegativeMoneySchema,
  paymentInformedCents: nonNegativeMoneySchema,
  paymentInformedDate: isoDateSchema.nullable(),
  paymentOrderDate: isoDateSchema.nullable(),
  account: accountRefSchema.nullable(),
  creditEvidence: creditEvidenceSchema,
  note: z.string().nullable(),
}).strict();

const programSchema = z.object({
  name: z.string().min(1),
  installments: z.array(installmentSchema),
}).strict();

export const positionSchema = z.object({
  referenceDate: isoDateSchema,
  checkingBalanceCents: moneySchema.nullable(),
  applications: z.object({
    fundsCents: moneySchema.nullable(),
    savingsCents: moneySchema.nullable(),
    rdbCdbCents: moneySchema.nullable(),
    totalCents: moneySchema.nullable(),
  }).strict(),
  totalReportedBalanceCents: moneySchema.nullable(),
}).strict();

const counterpartySchema = z.object({
  document: z.string().nullable(),
  name: z.string().nullable(),
  bank: z.string().nullable(),
  agency: z.string().nullable(),
  account: z.string().nullable(),
}).strict();

const movementSchema = z.object({
  date: isoDateSchema,
  description: z.string().min(1),
  document: z.string().nullable(),
  category: z.string().nullable(),
  creditCents: moneySchema.nullable(),
  debitCents: moneySchema.nullable(),
  counterparty: counterpartySchema.nullable(),
}).strict();

const accountSchema = z.object({
  program: z.string().min(1),
  bank: z.string(),
  agency: z.string(),
  account: z.string(),
  positions: z.array(positionSchema),
  latestPosition: positionSchema.nullable(),
  movements: z.array(movementSchema),
  note: z.string().nullable(),
}).strict();

const accountingSchema = z.object({
  program: z.string().min(1),
  status: z.string(),
  paymentSuspended: z.boolean(),
  expectedTotalCents: moneySchema,
}).strict();

export const humanSchoolSchema = z.object({
  fiscalYear: z.literal(2026),
  school: z.object({
    inep: z.string().regex(/^\d{8}$/),
    sme: z.string().regex(/^\d{7}$/),
    name: z.string().min(1),
    uex: z.string(),
    cnpj: z.string(),
  }).strict(),
  programs: z.array(programSchema),
  accounts: z.array(accountSchema),
  accounting: z.array(accountingSchema),
  followUp: z.array(z.string()),
}).strict();

export type HumanPortfolio = z.infer<typeof humanPortfolioSchema>;
export type HumanSchool = z.infer<typeof humanSchoolSchema>;
export type HumanAccount = z.infer<typeof accountSchema>;
export type HumanPosition = z.infer<typeof positionSchema>;
export type HumanIndicator = z.infer<typeof indicatorSchema>;
export type HumanUnit = z.infer<typeof humanUnitSchema>;
