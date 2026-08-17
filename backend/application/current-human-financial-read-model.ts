import { z } from 'zod';
import {
  humanIndicatorSchema,
  humanPortfolioMetricsSchema,
  humanPortfolioSchoolSchema,
  humanSchoolContentSchema,
  humanSchoolIdentitySchema,
  humanSourceSchema,
} from '../../shared/human-financial-contract';
import { evidenceIdentifierSchema } from '../core/evidence';

export { humanPortfolioMetricsSchema } from '../../shared/human-financial-contract';

const humanViewSchema = z.object({
  title: z.literal('Inteligência Financeira PDDE | 4ª CRE'),
  fiscalYear: z.literal(2026),
  referenceLabel: z.string().min(1),
  metrics: humanPortfolioMetricsSchema,
  sources: z.array(humanSourceSchema).min(1),
  indicators: z.array(humanIndicatorSchema),
  schools: z.array(humanSchoolContentSchema),
}).strict();

const FORBIDDEN_KEY_PARTS = [
  'sha256',
  'parser',
  'sourceurl',
  'pagesfetched',
  'technical',
  'requesthash',
  'payload',
  'attempts',
] as const;

function assertNoTechnicalMetadata(value: unknown, path = 'human'): void {
  if (Array.isArray(value)) {
    value.forEach((item, index) => assertNoTechnicalMetadata(item, `${path}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (FORBIDDEN_KEY_PARTS.some((part) => normalized.includes(part))) {
      throw new Error(`Metadado técnico proibido no read model humano: ${path}.${key}.`);
    }
    assertNoTechnicalMetadata(child, `${path}.${key}`);
  }
}

export interface CurrentHumanFinancialPortfolio {
  title: 'Inteligência Financeira PDDE | 4ª CRE';
  fiscalYear: 2026;
  runId: string;
  referenceLabel: string;
  schoolCount: number;
  metrics: z.infer<typeof humanPortfolioMetricsSchema>;
  sources: z.infer<typeof humanSourceSchema>[];
  indicators: z.infer<typeof humanIndicatorSchema>[];
  schools: z.infer<typeof humanPortfolioSchoolSchema>[];
}

export interface CurrentHumanFinancialSchoolSnapshot {
  fiscalYear: 2026;
  runId: string;
  school: z.infer<typeof humanSchoolIdentitySchema>;
  programs: z.infer<typeof humanSchoolContentSchema>['programs'];
  accounts: z.infer<typeof humanSchoolContentSchema>['accounts'];
  accounting: z.infer<typeof humanSchoolContentSchema>['accounting'];
  followUp: string[];
}

export interface PreparedCurrentHumanFinancialSnapshot {
  portfolio: CurrentHumanFinancialPortfolio;
  schools: Array<{
    school: z.infer<typeof humanSchoolIdentitySchema>;
    snapshot: CurrentHumanFinancialSchoolSnapshot;
  }>;
}

export interface CurrentHumanFinancialPublisher {
  publish(input: {
    runId: string;
    expectedSchoolCount: number;
    human: unknown;
  }): Promise<void>;
}

function latestPortfolioReferenceDate(
  schools: readonly z.infer<typeof humanSchoolContentSchema>[],
): string | null {
  return schools
    .flatMap((school) => school.accounts)
    .map((account) => account.latestPosition?.referenceDate ?? null)
    .filter((date): date is string => date !== null)
    .sort()
    .at(-1) ?? null;
}

export function buildCurrentPortfolioSchoolSummary(
  school: z.infer<typeof humanSchoolContentSchema>,
  referenceDate: string | null,
): z.infer<typeof humanPortfolioSchoolSchema> {
  let programmedCents = 0;
  let paymentInformedCents = 0;
  let creditLocatedCents = 0;
  let repasseAccountMissing = false;

  for (const program of school.programs) {
    for (const installment of program.installments) {
      programmedCents += installment.programmedCents;
      paymentInformedCents += installment.paymentInformedCents;
      if (
        installment.creditEvidence.status === 'Crédito localizado'
        && installment.creditEvidence.amountCents !== null
      ) {
        creditLocatedCents += installment.creditEvidence.amountCents;
      }
      if (installment.programmedCents > 0 && installment.account === null) {
        repasseAccountMissing = true;
      }
    }
  }

  const referenceAccounts = referenceDate === null
    ? []
    : school.accounts.filter((account) => account.latestPosition?.referenceDate === referenceDate);
  const knownBalances = referenceAccounts
    .map((account) => account.latestPosition?.totalReportedBalanceCents ?? null)
    .filter((value): value is number => value !== null);

  return humanPortfolioSchoolSchema.parse({
    sme: school.school.sme,
    name: school.school.name,
    inep: school.school.inep,
    programmedCents,
    paymentInformedCents,
    creditLocatedCents,
    knownBalanceCents: knownBalances.length > 0
      ? knownBalances.reduce((total, value) => total + value, 0)
      : null,
    referenceDate,
    accountsTotal: school.accounts.length,
    accountsWithReferencePosition: referenceAccounts.length,
    followUpCount: school.followUp.length,
    paymentSuspended: school.accounting.some((item) => item.paymentSuspended),
    repasseAccountMissing,
  });
}

export function prepareCurrentHumanFinancialSnapshot(input: {
  runId: string;
  expectedSchoolCount: number;
  human: unknown;
}): PreparedCurrentHumanFinancialSnapshot {
  const runId = evidenceIdentifierSchema.parse(input.runId);
  const expectedSchoolCount = z.number().int().positive().parse(input.expectedSchoolCount);
  assertNoTechnicalMetadata(input.human);
  const human = humanViewSchema.parse(input.human);

  if (human.schools.length !== expectedSchoolCount) {
    throw new Error(`Retrato humano incompleto: ${human.schools.length}/${expectedSchoolCount} escolas.`);
  }
  if (human.metrics.schoolCount !== human.schools.length) {
    throw new Error(`Métricas humanas inconsistentes: ${human.metrics.schoolCount}/${human.schools.length} escolas.`);
  }
  const knownIneps = new Set(human.schools.map((item) => item.school.inep));
  if (knownIneps.size !== human.schools.length) {
    throw new Error('Retrato humano contém INEP duplicado.');
  }

  for (const indicator of human.indicators) {
    const unitIneps = new Set(indicator.units.map((unit) => unit.inep));
    if (indicator.count !== indicator.units.length || unitIneps.size !== indicator.units.length) {
      throw new Error(`Indicador humano inconsistente: ${indicator.label}.`);
    }
    for (const unit of indicator.units) {
      if (!knownIneps.has(unit.inep)) {
        throw new Error(`Unidade ${unit.inep} do indicador "${indicator.label}" está fora do portfólio.`);
      }
    }
  }

  const schools = human.schools.map((item) => ({
    school: item.school,
    snapshot: {
      fiscalYear: 2026 as const,
      runId,
      school: item.school,
      programs: item.programs,
      accounts: item.accounts,
      accounting: item.accounting,
      followUp: item.followUp,
    },
  }));
  const referenceDate = latestPortfolioReferenceDate(human.schools);

  return {
    portfolio: {
      title: human.title,
      fiscalYear: 2026,
      runId,
      referenceLabel: human.referenceLabel,
      schoolCount: schools.length,
      metrics: human.metrics,
      sources: human.sources,
      indicators: human.indicators,
      schools: human.schools.map((school) => buildCurrentPortfolioSchoolSummary(school, referenceDate)),
    },
    schools,
  };
}
