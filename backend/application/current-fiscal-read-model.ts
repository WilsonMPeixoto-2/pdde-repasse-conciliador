import { z } from 'zod';
import { evidenceIdentifierSchema } from '../core/evidence';
import { sourceObservationSchema, type SourceObservation } from '../core/source-observation';
import { isoTimestampSchema } from '../core/time';

const schoolIdentitySchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  name: z.string().min(1),
  uex: z.string(),
  cnpj: z.string(),
}).strict();

const installmentSchema = z.object({
  amountProgrammedCents: z.number().int().nonnegative(),
  amountPaidInformedCents: z.number().int().nonnegative(),
  bankCredit: z.object({
    amountCents: z.number().int().nonnegative().nullable(),
    presentationStatus: z.string(),
  }).passthrough(),
}).passthrough();

const repasseSchema = z.object({
  installments: z.array(installmentSchema),
}).passthrough();

const statementSchema = z.object({
  saldoPddeInfoCents: z.number().int().nullable(),
  entries: z.array(z.unknown()),
}).passthrough();

const fiscalSchoolSchema = z.object({
  school: schoolIdentitySchema,
  repasses: z.array(repasseSchema),
  statements: z.array(statementSchema),
}).passthrough();

const fiscalViewSchema = z.object({
  generatedAt: isoTimestampSchema,
  sourceGeneratedAt: isoTimestampSchema,
  fiscalYear: z.literal(2026),
  sourceStatus: z.literal('COMPLETE'),
  sourceObservations: z.array(sourceObservationSchema).default([]),
  coverage: z.record(z.string(), z.unknown()),
  schools: z.array(fiscalSchoolSchema),
}).passthrough();

export interface CurrentFiscalSchoolSummary {
  inep: string;
  sme: string;
  name: string;
  metrics: {
    accounts: number;
    movements: number;
    programmedCents: number;
    paidInformedCents: number;
    creditedCents: number;
    reportedBalanceCents: number;
  };
}

export interface CurrentFiscalPortfolio {
  fiscalYear: 2026;
  runId: string;
  generatedAt: string;
  sourceGeneratedAt: string;
  sourceObservations: SourceObservation[];
  coverage: Record<string, unknown>;
  metrics: {
    schools: number;
    accounts: number;
    movements: number;
    programmedCents: number;
    paidInformedCents: number;
    creditedCents: number;
    reportedBalanceCents: number;
  };
  schools: CurrentFiscalSchoolSummary[];
}

export interface CurrentFiscalSchoolSnapshot {
  fiscalYear: 2026;
  runId: string;
  school: z.infer<typeof schoolIdentitySchema>;
  repasses: unknown[];
  statements: unknown[];
}

export interface PreparedCurrentFiscalSnapshot {
  portfolio: CurrentFiscalPortfolio;
  schools: Array<{
    school: z.infer<typeof schoolIdentitySchema>;
    metrics: CurrentFiscalSchoolSummary['metrics'];
    snapshot: CurrentFiscalSchoolSnapshot;
  }>;
}

export interface CurrentFiscalPublisher {
  publish(input: {
    runId: string;
    expectedSchoolCount: number;
    fiscal: unknown;
  }): Promise<void>;
}

function schoolMetrics(school: z.infer<typeof fiscalSchoolSchema>): CurrentFiscalSchoolSummary['metrics'] {
  const installments = school.repasses.flatMap((repasse) => repasse.installments);
  return {
    accounts: school.statements.length,
    movements: school.statements.reduce((sum, statement) => sum + statement.entries.length, 0),
    programmedCents: installments.reduce((sum, item) => sum + item.amountProgrammedCents, 0),
    paidInformedCents: installments.reduce((sum, item) => sum + item.amountPaidInformedCents, 0),
    creditedCents: installments.reduce((sum, item) => sum + (item.bankCredit.amountCents ?? 0), 0),
    reportedBalanceCents: school.statements.reduce((sum, statement) => sum + (statement.saldoPddeInfoCents ?? 0), 0),
  };
}

export function prepareCurrentFiscalSnapshot(input: {
  runId: string;
  expectedSchoolCount: number;
  fiscal: unknown;
}): PreparedCurrentFiscalSnapshot {
  const runId = evidenceIdentifierSchema.parse(input.runId);
  const expectedSchoolCount = z.number().int().positive().parse(input.expectedSchoolCount);
  const fiscal = fiscalViewSchema.parse(input.fiscal);
  if (fiscal.schools.length !== expectedSchoolCount) {
    throw new Error(`Retrato fiscal incompleto: ${fiscal.schools.length}/${expectedSchoolCount} escolas.`);
  }
  const uniqueIneps = new Set(fiscal.schools.map((item) => item.school.inep));
  if (uniqueIneps.size !== fiscal.schools.length) {
    throw new Error('Retrato fiscal contém INEP duplicado.');
  }

  const schools = fiscal.schools.map((item) => {
    const metrics = schoolMetrics(item);
    return {
      school: item.school,
      metrics,
      snapshot: {
        fiscalYear: 2026 as const,
        runId,
        school: item.school,
        repasses: item.repasses,
        statements: item.statements,
      },
    };
  });
  const totals = schools.reduce((acc, item) => ({
    schools: acc.schools + 1,
    accounts: acc.accounts + item.metrics.accounts,
    movements: acc.movements + item.metrics.movements,
    programmedCents: acc.programmedCents + item.metrics.programmedCents,
    paidInformedCents: acc.paidInformedCents + item.metrics.paidInformedCents,
    creditedCents: acc.creditedCents + item.metrics.creditedCents,
    reportedBalanceCents: acc.reportedBalanceCents + item.metrics.reportedBalanceCents,
  }), {
    schools: 0,
    accounts: 0,
    movements: 0,
    programmedCents: 0,
    paidInformedCents: 0,
    creditedCents: 0,
    reportedBalanceCents: 0,
  });

  return {
    portfolio: {
      fiscalYear: 2026,
      runId,
      generatedAt: fiscal.generatedAt,
      sourceGeneratedAt: fiscal.sourceGeneratedAt,
      sourceObservations: fiscal.sourceObservations,
      coverage: fiscal.coverage,
      metrics: totals,
      schools: schools.map((item) => ({
        inep: item.school.inep,
        sme: item.school.sme,
        name: item.school.name,
        metrics: item.metrics,
      })),
    },
    schools,
  };
}
