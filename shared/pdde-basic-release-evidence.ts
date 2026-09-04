export type PddeBasicReleaseEvidenceState =
  | 'CREDIT_LOCATED'
  | 'RELEASE_CONFIRMED'
  | 'RELEASE_ACCOUNT_RECOVERED'
  | 'RELEASE_ACCOUNT_MISMATCH'
  | 'NO_RELEASE_EVIDENCE';

export type PddeBasicExtractFreshness =
  | 'CURRENT_THROUGH_RELEASE'
  | 'STALE_BEFORE_RELEASE'
  | 'NO_STATEMENT'
  | 'UNKNOWN';

interface AccountIdentityLike {
  bank: string;
  agency: string;
  number: string;
}

interface ReleaseEvidenceLike {
  status: 'RECOVERED' | 'CONFIRMED' | 'ACCOUNT_MISMATCH' | 'NOT_FOUND' | 'AMBIGUOUS' | 'ERROR';
  paymentDate: string | null;
  orderBank: string | null;
  sourceUrl: string | null;
  account: AccountIdentityLike | null;
}

interface InstallmentLike {
  installment: string | null;
  paymentInformedCents: number;
  paymentInformedDate?: string | null;
  creditEvidence?: { status: string; amountCents?: number | null; date?: string | null };
  note?: string | null;
  account?: AccountIdentityLike | null;
  releaseEvidence?: ReleaseEvidenceLike | null;
}

interface ProgramLike {
  name: string;
  installments: readonly InstallmentLike[];
}

interface StatementAccountLike {
  bank: string;
  agency: string;
  account: string;
  statementCoverageThrough?: string | null;
  movements?: readonly { date: string }[];
}

export interface FirstCycleReleaseEvidenceSchoolLike {
  programs: readonly ProgramLike[];
  accounts?: readonly StatementAccountLike[];
}

export interface PddeBasicReleaseEvidenceReading {
  state: PddeBasicReleaseEvidenceState;
  hasIndependentSigefEvidence: boolean;
  destinationAccount: AccountIdentityLike | null;
  releaseDate: string | null;
  orderBank: string | null;
  statementCoverageThrough: string | null;
  extractFreshness: PddeBasicExtractFreshness;
  needsFreshExtract: boolean;
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

function digits(value: string | null | undefined): string {
  const normalized = (value ?? '').replace(/\D/g, '').replace(/^0+/, '');
  return normalized || '0';
}

function sameAccount(
  left: AccountIdentityLike,
  right: StatementAccountLike,
): boolean {
  return digits(left.bank) === digits(right.bank)
    && digits(left.agency) === digits(right.agency)
    && digits(left.number) === digits(right.account);
}

function isFirstCycle(programName: string, installment: string | null): boolean {
  const program = normalize(programName);
  const parcel = normalize(installment);
  if (!program.includes('PDDE BASICO')) return false;
  if (program.includes('PRIMEIRA INFANCIA')) return parcel === 'P1';
  return parcel === '1A PARCELA'
    || parcel === '1 PARCELA'
    || parcel.includes('PRIMEIRA PARCELA');
}

function creditLocated(installment: InstallmentLike): boolean {
  return normalize(installment.creditEvidence?.status) === 'CREDITO LOCALIZADO'
    && (installment.creditEvidence?.amountCents ?? 0) > 0;
}

function orderBankFromNote(note: string | null | undefined): string | null {
  const match = /\bOB\s+([0-9A-Z.-]+)/i.exec(note ?? '');
  return match?.[1] ?? null;
}

function latestMovementDate(account: StatementAccountLike): string | null {
  return [...(account.movements ?? [])]
    .map((movement) => movement.date)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;
}

function statementCoverageFor(
  school: FirstCycleReleaseEvidenceSchoolLike,
  account: AccountIdentityLike | null,
): { coverage: string | null; hasStatement: boolean } {
  if (!account) return { coverage: null, hasStatement: false };
  const matching = (school.accounts ?? []).filter((candidate) => sameAccount(account, candidate));
  if (matching.length === 0) return { coverage: null, hasStatement: false };
  const coverage = matching
    .flatMap((candidate) => [candidate.statementCoverageThrough, latestMovementDate(candidate)])
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? null;
  return { coverage, hasStatement: true };
}

function freshnessFor(input: {
  releaseDate: string | null;
  statementCoverageThrough: string | null;
  hasStatement: boolean;
  creditDate?: string | null;
}): PddeBasicExtractFreshness {
  if (input.creditDate && (!input.releaseDate || input.creditDate >= input.releaseDate)) {
    return 'CURRENT_THROUGH_RELEASE';
  }
  if (!input.releaseDate) return 'UNKNOWN';
  if (!input.hasStatement) return 'NO_STATEMENT';
  if (!input.statementCoverageThrough) return 'UNKNOWN';
  return input.statementCoverageThrough < input.releaseDate
    ? 'STALE_BEFORE_RELEASE'
    : 'CURRENT_THROUGH_RELEASE';
}

function readingFor(
  school: FirstCycleReleaseEvidenceSchoolLike,
  installment: InstallmentLike,
  state: PddeBasicReleaseEvidenceState,
  hasIndependentSigefEvidence: boolean,
): PddeBasicReleaseEvidenceReading {
  const destinationAccount = installment.releaseEvidence?.account ?? installment.account ?? null;
  const releaseDate = installment.releaseEvidence?.paymentDate ?? installment.paymentInformedDate ?? null;
  const orderBank = installment.releaseEvidence?.orderBank ?? orderBankFromNote(installment.note);
  const statement = statementCoverageFor(school, destinationAccount);
  const extractFreshness = freshnessFor({
    releaseDate,
    statementCoverageThrough: statement.coverage,
    hasStatement: statement.hasStatement,
    creditDate: creditLocated(installment) ? installment.creditEvidence?.date ?? releaseDate : null,
  });
  return {
    state,
    hasIndependentSigefEvidence,
    destinationAccount,
    releaseDate,
    orderBank,
    statementCoverageThrough: statement.coverage,
    extractFreshness,
    needsFreshExtract: hasIndependentSigefEvidence
      && state !== 'CREDIT_LOCATED'
      && extractFreshness !== 'CURRENT_THROUGH_RELEASE',
  };
}

export function derivePddeBasicFirstCycleReleaseEvidence(
  school: FirstCycleReleaseEvidenceSchoolLike,
): PddeBasicReleaseEvidenceReading {
  const installments = school.programs.flatMap((program) => program.installments
    .filter((installment) => isFirstCycle(program.name, installment.installment)));

  const credit = installments.find((installment) => installment.paymentInformedCents > 0 && creditLocated(installment));
  if (credit) return readingFor(school, credit, 'CREDIT_LOCATED', true);

  for (const installment of installments.filter((item) => item.paymentInformedCents > 0)) {
    const structured = installment.releaseEvidence?.status;
    const note = normalize(installment.note);
    if (structured === 'ACCOUNT_MISMATCH' || note.includes('CONTA DIFERENTE')) {
      return readingFor(school, installment, 'RELEASE_ACCOUNT_MISMATCH', true);
    }
    if (structured === 'CONFIRMED' || note.includes('SIGEF LIBERACOES LOCALIZOU A LIBERACAO')) {
      return readingFor(school, installment, 'RELEASE_CONFIRMED', true);
    }
    if (structured === 'RECOVERED' || note.includes('CONTA RECUPERADA NO SIGEF LIBERACOES')) {
      return readingFor(school, installment, 'RELEASE_ACCOUNT_RECOVERED', true);
    }
  }

  const paid = installments.find((item) => item.paymentInformedCents > 0);
  if (paid) return readingFor(school, paid, 'NO_RELEASE_EVIDENCE', false);

  return {
    state: 'NO_RELEASE_EVIDENCE',
    hasIndependentSigefEvidence: false,
    destinationAccount: null,
    releaseDate: null,
    orderBank: null,
    statementCoverageThrough: null,
    extractFreshness: 'UNKNOWN',
    needsFreshExtract: false,
  };
}

function brDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

export function pddeBasicReleaseEvidenceLabel(
  value: PddeBasicReleaseEvidenceState | PddeBasicReleaseEvidenceReading,
): string {
  const state = typeof value === 'string' ? value : value.state;
  let label: string;
  if (state === 'CREDIT_LOCATED') label = 'Crédito compatível localizado no extrato SIGEF';
  else if (state === 'RELEASE_CONFIRMED') label = 'Liberação/OB localizada no SIGEF para a mesma conta';
  else if (state === 'RELEASE_ACCOUNT_RECOVERED') label = 'Liberação/OB localizada e conta de destino recuperada no SIGEF';
  else if (state === 'RELEASE_ACCOUNT_MISMATCH') label = 'SIGEF Liberações aponta conta diferente; requer conferência';
  else label = 'Sem evidência SIGEF suficiente do 1º ciclo nesta coleta';

  if (typeof value !== 'string' && value.extractFreshness === 'STALE_BEFORE_RELEASE') {
    return `${label}; extrato SIGEF defasado${value.statementCoverageThrough ? ` até ${brDate(value.statementCoverageThrough)}` : ''}`;
  }
  if (typeof value !== 'string' && value.extractFreshness === 'NO_STATEMENT' && value.hasIndependentSigefEvidence) {
    return `${label}; extrato da conta ainda sem cobertura utilizável nesta coleta`;
  }
  return label;
}
