export type PddeBasicInstallmentState = 'PAID_INFORMED' | 'PROGRAMMED' | 'NOT_PROGRAMMED';
export type PddeBasicBalanceLocation =
  | 'CHECKING'
  | 'APPLICATION'
  | 'CHECKING_AND_APPLICATION'
  | 'ZERO'
  | 'NO_POSITION'
  | 'POSITIVE_UNCOMPOSED';

export type PddeBasicEvidenceState =
  | 'CREDIT_LOCATED'
  | 'BALANCE_REFERENCE_BEFORE_PAYMENT'
  | 'POSITIVE_BALANCE_AFTER_PAYMENT'
  | 'ZERO_BALANCE_AFTER_PAYMENT'
  | 'NO_BALANCE_POSITION'
  | 'PAYMENT_DATE_UNAVAILABLE'
  | 'PAYMENT_NOT_INFORMED';

interface CreditEvidenceLike {
  status: string;
  date?: string | null;
  amountCents?: number | null;
  document?: string | null;
}

interface InstallmentLike {
  installment: string | null;
  programmedCents: number;
  paymentInformedCents: number;
  paymentInformedDate: string | null;
  creditEvidence?: CreditEvidenceLike;
}

interface ProgramLike {
  name: string;
  installments: readonly InstallmentLike[];
}

interface PositionLike {
  referenceDate: string;
  checkingBalanceCents: number | null;
  applications: { totalCents: number | null };
  totalReportedBalanceCents: number | null;
}

interface AccountLike {
  program: string;
  latestPosition: PositionLike | null;
}

export interface PddeBasicSchoolLike {
  school: {
    inep: string;
    sme: string;
    name: string;
  };
  programs: readonly ProgramLike[];
  accounts: readonly AccountLike[];
}

export interface PddeBasicInstallmentReading {
  track: 'PDDE Básico' | 'Primeira Infância' | 'Misto' | 'Não identificado';
  programmedCents: number;
  paymentInformedCents: number;
  paymentInformedDate: string | null;
  state: PddeBasicInstallmentState;
  creditLocated: boolean;
  creditLocatedCents: number;
}

export interface PddeBasicBalanceReading {
  accountCount: number;
  referenceDate: string | null;
  checkingCents: number | null;
  applicationsCents: number | null;
  totalCents: number | null;
  location: PddeBasicBalanceLocation;
}

export interface PddeBasicEvidenceReading {
  state: PddeBasicEvidenceState;
  creditLocated: boolean;
  needsFreshBalance: boolean;
  needsSourceEscalation: boolean;
  isContradiction: boolean;
}

export interface PddeBasicSchoolReading {
  inep: string;
  sme: string;
  name: string;
  first: PddeBasicInstallmentReading;
  second: PddeBasicInstallmentReading;
  balance: PddeBasicBalanceReading;
  firstEvidence: PddeBasicEvidenceReading;
  secondEvidence: PddeBasicEvidenceReading;
}

function normalize(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ª/g, 'A')
    .replace(/º/g, 'O')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function validIso2026Date(value: string | null | undefined): value is string {
  if (!value || !/^2026-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

function creditLocated(evidence: CreditEvidenceLike | undefined): boolean {
  if (!evidence) return false;
  return normalize(evidence.status) === 'CREDITO LOCALIZADO'
    && (evidence.amountCents ?? 0) > 0;
}

function programTrack(name: string): 'regular' | 'infancy' | null {
  const value = normalize(name);
  if (!value.includes('PDDE BASICO')) return null;
  if (value.includes('PRIMEIRA INFANCIA')) return 'infancy';
  return 'regular';
}

function installmentMarker(value: string | null): 'first' | 'second' | null {
  const normalized = normalize(value);
  if (normalized === 'P1' || normalized === '1' || normalized.includes('1A PARCELA') || normalized.includes('PRIMEIRA PARCELA')) {
    return 'first';
  }
  if (normalized === 'P2' || normalized === '2' || normalized.includes('2A PARCELA') || normalized.includes('SEGUNDA PARCELA')) {
    return 'second';
  }
  return null;
}

function isEligible(track: 'regular' | 'infancy', marker: 'first' | 'second', installment: string | null): boolean {
  const normalized = normalize(installment);
  if (track === 'infancy') return marker === 'first' ? normalized === 'P1' : normalized === 'P2';
  return installmentMarker(installment) === marker;
}

function installmentReading(
  school: PddeBasicSchoolLike,
  marker: 'first' | 'second',
): PddeBasicInstallmentReading {
  const rows: Array<InstallmentLike & { track: 'regular' | 'infancy' }> = [];
  for (const program of school.programs) {
    const track = programTrack(program.name);
    if (!track) continue;
    for (const installment of program.installments) {
      if (isEligible(track, marker, installment.installment)) rows.push({ ...installment, track });
    }
  }

  const programmedCents = rows.reduce((total, row) => total + row.programmedCents, 0);
  const paymentInformedCents = rows.reduce((total, row) => total + row.paymentInformedCents, 0);
  const dates = rows
    .map((row) => row.paymentInformedDate)
    .filter(validIso2026Date)
    .sort();
  const tracks = new Set(rows.map((row) => row.track));
  const track = tracks.size > 1
    ? 'Misto'
    : tracks.has('infancy')
      ? 'Primeira Infância'
      : tracks.has('regular')
        ? 'PDDE Básico'
        : 'Não identificado';
  const locatedRows = rows.filter((row) => creditLocated(row.creditEvidence));

  return {
    track,
    programmedCents,
    paymentInformedCents,
    paymentInformedDate: dates.at(-1) ?? null,
    state: paymentInformedCents > 0
      ? 'PAID_INFORMED'
      : programmedCents > 0
        ? 'PROGRAMMED'
        : 'NOT_PROGRAMMED',
    creditLocated: locatedRows.length > 0,
    creditLocatedCents: locatedRows.reduce((total, row) => total + (row.creditEvidence?.amountCents ?? 0), 0),
  };
}

function isPddeBasicAccount(program: string): boolean {
  const value = normalize(program);
  return value === 'PDDE' || value === 'PDDE BASICO';
}

function sumKnown(values: readonly (number | null)[]): number | null {
  if (values.length === 0 || values.some((value) => value === null)) return null;
  return values.reduce<number>((total, value) => total + (value as number), 0);
}

function balanceReading(school: PddeBasicSchoolLike): PddeBasicBalanceReading {
  const accounts = school.accounts.filter((account) => isPddeBasicAccount(account.program));
  const referenceDate = accounts
    .map((account) => account.latestPosition?.referenceDate ?? null)
    .filter(validIso2026Date)
    .sort()
    .at(-1) ?? null;

  if (!referenceDate) {
    return {
      accountCount: accounts.length,
      referenceDate: null,
      checkingCents: null,
      applicationsCents: null,
      totalCents: null,
      location: 'NO_POSITION',
    };
  }

  const positions = accounts
    .map((account) => account.latestPosition)
    .filter((position): position is PositionLike => position?.referenceDate === referenceDate);
  const checkingCents = sumKnown(positions.map((position) => position.checkingBalanceCents));
  const applicationsCents = sumKnown(positions.map((position) => position.applications.totalCents));
  const totalCents = sumKnown(positions.map((position) => position.totalReportedBalanceCents));

  let location: PddeBasicBalanceLocation = 'NO_POSITION';
  if (totalCents !== null) {
    if (checkingCents !== null && applicationsCents !== null) {
      if (checkingCents > 0 && applicationsCents > 0) location = 'CHECKING_AND_APPLICATION';
      else if (checkingCents > 0) location = 'CHECKING';
      else if (applicationsCents > 0) location = 'APPLICATION';
      else if (totalCents === 0) location = 'ZERO';
      else if (totalCents > 0) location = 'POSITIVE_UNCOMPOSED';
      else location = 'ZERO';
    } else if (totalCents > 0) {
      location = 'POSITIVE_UNCOMPOSED';
    } else if (totalCents === 0) {
      location = 'ZERO';
    }
  }

  return {
    accountCount: accounts.length,
    referenceDate,
    checkingCents,
    applicationsCents,
    totalCents,
    location,
  };
}

function evidenceReading(
  installment: PddeBasicInstallmentReading,
  balance: PddeBasicBalanceReading,
): PddeBasicEvidenceReading {
  if (installment.state !== 'PAID_INFORMED') {
    return {
      state: 'PAYMENT_NOT_INFORMED',
      creditLocated: false,
      needsFreshBalance: false,
      needsSourceEscalation: false,
      isContradiction: false,
    };
  }

  if (installment.creditLocated) {
    return {
      state: 'CREDIT_LOCATED',
      creditLocated: true,
      needsFreshBalance: false,
      needsSourceEscalation: false,
      isContradiction: false,
    };
  }

  if (!installment.paymentInformedDate) {
    return {
      state: 'PAYMENT_DATE_UNAVAILABLE',
      creditLocated: false,
      needsFreshBalance: balance.referenceDate === null,
      needsSourceEscalation: true,
      isContradiction: false,
    };
  }

  if (!balance.referenceDate || balance.totalCents === null) {
    return {
      state: 'NO_BALANCE_POSITION',
      creditLocated: false,
      needsFreshBalance: true,
      needsSourceEscalation: true,
      isContradiction: false,
    };
  }

  if (balance.referenceDate < installment.paymentInformedDate) {
    return {
      state: 'BALANCE_REFERENCE_BEFORE_PAYMENT',
      creditLocated: false,
      needsFreshBalance: true,
      needsSourceEscalation: true,
      isContradiction: false,
    };
  }

  if (balance.totalCents > 0) {
    return {
      state: 'POSITIVE_BALANCE_AFTER_PAYMENT',
      creditLocated: false,
      needsFreshBalance: false,
      needsSourceEscalation: true,
      isContradiction: false,
    };
  }

  return {
    state: 'ZERO_BALANCE_AFTER_PAYMENT',
    creditLocated: false,
    needsFreshBalance: false,
    needsSourceEscalation: true,
    isContradiction: true,
  };
}

export function derivePddeBasicSchoolReading(school: PddeBasicSchoolLike): PddeBasicSchoolReading {
  const first = installmentReading(school, 'first');
  const second = installmentReading(school, 'second');
  const balance = balanceReading(school);
  return {
    inep: school.school.inep,
    sme: school.school.sme,
    name: school.school.name,
    first,
    second,
    balance,
    firstEvidence: evidenceReading(first, balance),
    secondEvidence: evidenceReading(second, balance),
  };
}

export function derivePddeBasicPortfolio(schools: readonly PddeBasicSchoolLike[]) {
  const rows = schools
    .map(derivePddeBasicSchoolReading)
    .sort((left, right) => left.sme.localeCompare(right.sme) || left.name.localeCompare(right.name, 'pt-BR'));

  return {
    rows,
    schoolCount: rows.length,
    firstPaidCount: rows.filter((row) => row.first.state === 'PAID_INFORMED').length,
    firstPendingCount: rows.filter((row) => row.first.state !== 'PAID_INFORMED').length,
    firstRegularCount: rows.filter((row) => row.first.track === 'PDDE Básico').length,
    firstInfancyCount: rows.filter((row) => row.first.track === 'Primeira Infância').length,
    firstCreditLocatedCount: rows.filter((row) => row.firstEvidence.creditLocated).length,
    firstNeedsSourceEscalationCount: rows.filter((row) => row.firstEvidence.needsSourceEscalation).length,
    balanceBeforePaymentCount: rows.filter((row) => row.firstEvidence.state === 'BALANCE_REFERENCE_BEFORE_PAYMENT').length,
    trueInconsistencyCount: rows.filter((row) => row.firstEvidence.isContradiction).length,
    secondPaidCount: rows.filter((row) => row.second.state === 'PAID_INFORMED').length,
    secondPendingCount: rows.filter((row) => row.second.state !== 'PAID_INFORMED').length,
    secondRegularCount: rows.filter((row) => row.second.track === 'PDDE Básico').length,
    secondInfancyCount: rows.filter((row) => row.second.track === 'Primeira Infância').length,
    checkingPositiveCount: rows.filter((row) => (row.balance.checkingCents ?? 0) > 0).length,
    applicationsPositiveCount: rows.filter((row) => (row.balance.applicationsCents ?? 0) > 0).length,
    balancePositiveCount: rows.filter((row) => (row.balance.totalCents ?? 0) > 0).length,
    noPositionCount: rows.filter((row) => row.balance.referenceDate === null).length,
    checkingCents: rows.reduce((total, row) => total + Math.max(0, row.balance.checkingCents ?? 0), 0),
    applicationsCents: rows.reduce((total, row) => total + Math.max(0, row.balance.applicationsCents ?? 0), 0),
    totalBalanceCents: rows.reduce((total, row) => total + (row.balance.totalCents ?? 0), 0),
  };
}

export function pddeBasicInstallmentStateLabel(state: PddeBasicInstallmentState): string {
  if (state === 'PAID_INFORMED') return 'Pagamento informado';
  if (state === 'PROGRAMMED') return 'Programado · aguardando pagamento';
  return 'Sem programação identificada';
}

export function pddeBasicBalanceLocationLabel(location: PddeBasicBalanceLocation): string {
  if (location === 'CHECKING') return 'Em conta corrente';
  if (location === 'APPLICATION') return 'Em aplicação';
  if (location === 'CHECKING_AND_APPLICATION') return 'Conta + aplicação';
  if (location === 'ZERO') return 'Saldo zerado';
  if (location === 'POSITIVE_UNCOMPOSED') return 'Saldo positivo sem composição completa';
  return 'Sem posição publicada';
}

export function pddeBasicEvidenceStateLabel(state: PddeBasicEvidenceState): string {
  if (state === 'CREDIT_LOCATED') return 'Crédito compatível localizado no SIGEF';
  if (state === 'BALANCE_REFERENCE_BEFORE_PAYMENT') return 'O saldo é anterior ao pagamento; ainda não pode confirmar este repasse';
  if (state === 'POSITIVE_BALANCE_AFTER_PAYMENT') return 'Saldo posterior positivo; situação coerente, mas o crédito específico ainda não foi localizado';
  if (state === 'ZERO_BALANCE_AFTER_PAYMENT') return 'Saldo posterior zerado; requer cruzamento de movimentações e outras fontes';
  if (state === 'NO_BALANCE_POSITION') return 'Sem posição de saldo posterior disponível';
  if (state === 'PAYMENT_DATE_UNAVAILABLE') return 'Pagamento informado sem data válida para comparação temporal';
  return 'Pagamento ainda não informado';
}
