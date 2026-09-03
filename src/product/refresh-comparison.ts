import type { HumanPortfolio, HumanSchool } from './types';

export type RefreshComparisonMetricKey =
  | 'programmed'
  | 'paymentInformed'
  | 'creditLocated'
  | 'reportedBalance'
  | 'applications';

export interface RefreshComparisonMetric {
  key: RefreshComparisonMetricKey;
  label: string;
  beforeCents: number | null;
  afterCents: number | null;
  deltaCents: number | null;
  changed: boolean;
}

export interface RefreshComparisonCount {
  key:
    | 'transfers'
    | 'accounting'
    | 'movements'
    | 'registrations'
    | 'accountOpenings'
    | 'suspensions'
    | 'unavailableSources';
  label: string;
  before: number;
  after: number;
  delta: number;
  changed: boolean;
}

export interface RefreshUnavailableSource {
  dataset: string;
  observations: number;
  schoolCount: number;
}

export interface RefreshChangedSchool {
  inep: string;
  sme: string;
  name: string;
  financial: boolean;
  supplemental: boolean;
}

export interface RefreshComparison {
  generatedAt: string;
  referenceBefore: string;
  referenceAfter: string;
  referenceChanged: boolean;
  metrics: RefreshComparisonMetric[];
  counts: RefreshComparisonCount[];
  changedSchools: RefreshChangedSchool[];
  financialChangedSchoolCount: number;
  supplementalChangedSchoolCount: number;
  unavailableSourceObservations: number;
  unavailableSourceSchoolCount: number;
  unavailableSources: RefreshUnavailableSource[];
  hasFinancialChange: boolean;
  hasAnyChange: boolean;
}

function delta(before: number | null, after: number | null): number | null {
  if (before === null || after === null) return before === after ? 0 : null;
  return after - before;
}

function metric(
  key: RefreshComparisonMetricKey,
  label: string,
  beforeCents: number | null,
  afterCents: number | null,
): RefreshComparisonMetric {
  const difference = delta(beforeCents, afterCents);
  return {
    key,
    label,
    beforeCents,
    afterCents,
    deltaCents: difference,
    changed: beforeCents !== afterCents,
  };
}

function transferCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => (
    total + school.programs.reduce((schoolTotal, program) => (
      schoolTotal + program.installments.length
    ), 0)
  ), 0);
}

function accountingCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => total + school.accounting.length, 0);
}

function movementCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => (
    total + school.accounts.reduce((schoolTotal, account) => (
      schoolTotal + account.movements.length
    ), 0)
  ), 0);
}

function registrationCount(schools: readonly HumanSchool[]): number {
  return schools.filter((school) => school.registration !== null && school.registration !== undefined).length;
}

function accountOpeningCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => total + (school.accountOpenings ?? []).length, 0);
}

function suspensionCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => total + (school.suspensions ?? []).length, 0);
}

function unavailableSourceCount(schools: readonly HumanSchool[]): number {
  return schools.reduce((total, school) => (
    total + (school.sourceCoverage ?? []).filter((item) => item.status === 'UNAVAILABLE').length
  ), 0);
}

function unavailableSourceSchoolCount(schools: readonly HumanSchool[]): number {
  return schools.filter((school) => (
    (school.sourceCoverage ?? []).some((item) => item.status === 'UNAVAILABLE')
  )).length;
}


function unavailableSources(schools: readonly HumanSchool[]): RefreshUnavailableSource[] {
  const byDataset = new Map<string, { observations: number; schools: Set<string> }>();
  for (const school of schools) {
    for (const item of (school.sourceCoverage ?? [])) {
      if (item.status !== 'UNAVAILABLE') continue;
      const current = byDataset.get(item.dataset) ?? { observations: 0, schools: new Set<string>() };
      current.observations += 1;
      current.schools.add(school.school.inep);
      byDataset.set(item.dataset, current);
    }
  }
  return [...byDataset.entries()]
    .map(([dataset, value]) => ({
      dataset,
      observations: value.observations,
      schoolCount: value.schools.size,
    }))
    .sort((left, right) => (
      right.schoolCount - left.schoolCount
      || left.dataset.localeCompare(right.dataset, 'pt-BR')
    ));
}

function count(
  key: RefreshComparisonCount['key'],
  label: string,
  before: number,
  after: number,
): RefreshComparisonCount {
  return { key, label, before, after, delta: after - before, changed: before !== after };
}

function normalizedFinancialFingerprint(school: HumanSchool): string {
  return JSON.stringify({
    programs: school.programs,
    accounts: school.accounts.map((account) => ({
      program: account.program,
      bank: account.bank,
      agency: account.agency,
      account: account.account,
      occurrence: account.occurrence ?? null,
      positions: account.positions,
      latestPosition: account.latestPosition,
      movements: account.movements,
    })),
  });
}

function normalizedSupplementalFingerprint(school: HumanSchool): string {
  return JSON.stringify({
    accounting: school.accounting,
    registration: school.registration ?? null,
    accountOpenings: school.accountOpenings ?? [],
    suspensions: school.suspensions ?? [],
    sourceCoverage: school.sourceCoverage ?? [],
    followUp: school.followUp,
  });
}

export function buildRefreshComparison(input: {
  beforePortfolio: HumanPortfolio;
  beforeSchools: readonly HumanSchool[];
  afterPortfolio: HumanPortfolio;
  afterSchools: readonly HumanSchool[];
  generatedAt: string;
}): RefreshComparison {
  const metrics = [
    metric('programmed', 'Programado', input.beforePortfolio.metrics.programmedCents, input.afterPortfolio.metrics.programmedCents),
    metric('paymentInformed', 'Pagamento informado', input.beforePortfolio.metrics.paymentInformedCents, input.afterPortfolio.metrics.paymentInformedCents),
    metric('creditLocated', 'Crédito compatível localizado', input.beforePortfolio.metrics.creditLocatedCents, input.afterPortfolio.metrics.creditLocatedCents),
    metric('reportedBalance', 'Saldo informado', input.beforePortfolio.metrics.reportedBalanceCents, input.afterPortfolio.metrics.reportedBalanceCents),
    metric('applications', 'Aplicações', input.beforePortfolio.metrics.applicationsCents, input.afterPortfolio.metrics.applicationsCents),
  ];

  const counts = [
    count('transfers', 'Registros de repasse', transferCount(input.beforeSchools), transferCount(input.afterSchools)),
    count('accounting', 'Registros de prestação de contas', accountingCount(input.beforeSchools), accountingCount(input.afterSchools)),
    count('movements', 'Movimentações SIGEF', movementCount(input.beforeSchools), movementCount(input.afterSchools)),
    count('registrations', 'Cadastros obtidos', registrationCount(input.beforeSchools), registrationCount(input.afterSchools)),
    count('accountOpenings', 'Situações de abertura de conta', accountOpeningCount(input.beforeSchools), accountOpeningCount(input.afterSchools)),
    count('suspensions', 'Suspensões publicadas', suspensionCount(input.beforeSchools), suspensionCount(input.afterSchools)),
    count('unavailableSources', 'Observações de fonte indisponível', unavailableSourceCount(input.beforeSchools), unavailableSourceCount(input.afterSchools)),
  ];

  const beforeByInep = new Map(input.beforeSchools.map((school) => [school.school.inep, school]));
  const changedSchools: RefreshChangedSchool[] = [];

  for (const after of input.afterSchools) {
    const before = beforeByInep.get(after.school.inep);
    const financial = before
      ? normalizedFinancialFingerprint(before) !== normalizedFinancialFingerprint(after)
      : true;
    const supplemental = before
      ? normalizedSupplementalFingerprint(before) !== normalizedSupplementalFingerprint(after)
      : true;
    if (financial || supplemental) {
      changedSchools.push({
        inep: after.school.inep,
        sme: after.school.sme,
        name: after.school.name,
        financial,
        supplemental,
      });
    }
  }

  changedSchools.sort((left, right) => (
    left.sme.localeCompare(right.sme)
    || left.name.localeCompare(right.name, 'pt-BR')
  ));

  const referenceChanged = input.beforePortfolio.referenceLabel !== input.afterPortfolio.referenceLabel;
  const hasFinancialChange = referenceChanged
    || metrics.some((item) => item.changed)
    || changedSchools.some((item) => item.financial);
  const hasAnyChange = hasFinancialChange
    || counts.some((item) => item.changed)
    || changedSchools.some((item) => item.supplemental);

  return {
    generatedAt: input.generatedAt,
    referenceBefore: input.beforePortfolio.referenceLabel,
    referenceAfter: input.afterPortfolio.referenceLabel,
    referenceChanged,
    metrics,
    counts,
    changedSchools,
    financialChangedSchoolCount: changedSchools.filter((item) => item.financial).length,
    supplementalChangedSchoolCount: changedSchools.filter((item) => item.supplemental).length,
    unavailableSourceObservations: unavailableSourceCount(input.afterSchools),
    unavailableSourceSchoolCount: unavailableSourceSchoolCount(input.afterSchools),
    unavailableSources: unavailableSources(input.afterSchools),
    hasFinancialChange,
    hasAnyChange,
  };
}
