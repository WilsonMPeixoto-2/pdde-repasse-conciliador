import { assertCurrentFiscalYear } from '../core/fiscal-scope';
import { canonicalAccount } from '../core/normalization';
import type { PddeInfoPublicPortfolioResult } from './collect-pddeinfo-public-portfolio';
import type {
  FiscalCreditPresentationStatus,
  FiscalSchoolView,
} from './build-fiscal-human-view';

export interface HumanSourceDescription {
  name: string;
  information: string;
}

export interface HumanFinancialCounterparty {
  document: string | null;
  name: string | null;
  bank: string | null;
  agency: string | null;
  account: string | null;
}

export interface HumanFinancialMovement {
  date: string;
  description: string;
  document: string | null;
  category: string | null;
  creditCents: number | null;
  debitCents: number | null;
  counterparty: HumanFinancialCounterparty | null;
}

export interface HumanFinancialPosition {
  referenceDate: string;
  checkingBalanceCents: number | null;
  applications: {
    fundsCents: number | null;
    savingsCents: number | null;
    rdbCdbCents: number | null;
    totalCents: number | null;
  };
  totalReportedBalanceCents: number | null;
}

export interface HumanFinancialAccount {
  program: string;
  bank: string;
  agency: string;
  account: string;
  occurrence?: string | null;
  positions: HumanFinancialPosition[];
  latestPosition: HumanFinancialPosition | null;
  movements: HumanFinancialMovement[];
  note: string | null;
}

export interface HumanFinancialInstallment {
  installment: string | null;
  programmedCents: number;
  paymentInformedCents: number;
  breakdown?: {
    programmedCusteioCents: number | null;
    programmedCapitalCents: number | null;
    adjustmentCusteioCents: number | null;
    adjustmentCapitalCents: number | null;
    paidCusteioCents: number | null;
    paidCapitalCents: number | null;
  } | null;
  paymentInformedDate: string | null;
  paymentOrderDate: string | null;
  account: { bank: string; agency: string; number: string } | null;
  creditEvidence: {
    status: string;
    date: string | null;
    amountCents: number | null;
    document: string | null;
  };
  note: string | null;
}

export interface HumanFinancialProgram {
  name: string;
  installments: HumanFinancialInstallment[];
}

export interface HumanAccountingStatus {
  program: string;
  status: string;
  paymentSuspended: boolean;
  expectedTotalCents: number;
}


export interface HumanRegistrationStatus {
  studentCount: number | null;
  location: string | null;
  uexName: string | null;
  uexCnpj: string | null;
  network: string | null;
  mandateStatus: string | null;
  mandateStartDate: string | null;
  mandateEndDate: string | null;
  updatedDate: string | null;
  updatedTime: string | null;
  phone: string | null;
  registrationNote: string | null;
  uexAccountingNote: string | null;
  eexAdhesionNote: string | null;
  eexAccountingNote: string | null;
}

export interface HumanAccountOpeningStatus {
  program: string | null;
  status: string;
  bank: string | null;
  agency: string | null;
  account: string | null;
}

export interface HumanSuspensionStatus {
  program: string | null;
  destination: string | null;
  type: string;
  detail: string | null;
}

export interface HumanSourceCoverage {
  dataset: string;
  status: 'AVAILABLE' | 'EMPTY' | 'PARTIAL' | 'UNAVAILABLE';
  detail: string | null;
}

export interface HumanFinancialSchoolView {
  school: {
    inep: string;
    sme: string;
    name: string;
    uex: string;
    cnpj: string;
  };
  programs: HumanFinancialProgram[];
  accounts: HumanFinancialAccount[];
  registration?: HumanRegistrationStatus | null;
  accountOpenings?: HumanAccountOpeningStatus[];
  suspensions?: HumanSuspensionStatus[];
  sourceCoverage?: HumanSourceCoverage[];
  accounting: HumanAccountingStatus[];
  followUp: string[];
}

export interface HumanIndicatorUnit {
  sme: string;
  name: string;
  inep: string;
}

export interface HumanFinancialIndicator {
  label: string;
  count: number;
  units: HumanIndicatorUnit[];
}

export interface HumanFinancialPortfolioMetrics {
  schoolCount: number;
  accountsTotal: number;
  accountsWithPosition: number;
  programmedCents: number;
  paymentInformedCents: number;
  creditLocatedCents: number;
  reportedBalanceCents: number | null;
  applicationsCents: number | null;
}

export interface HumanFinancialPortfolioView {
  title: 'Inteligência Financeira PDDE | 4ª CRE';
  fiscalYear: 2026;
  referenceLabel: string;
  metrics: HumanFinancialPortfolioMetrics;
  sources: HumanSourceDescription[];
  indicators: HumanFinancialIndicator[];
  schools: HumanFinancialSchoolView[];
}

interface FiscalViewInput {
  fiscalYear: number;
  schools: FiscalSchoolView[];
}

export interface BuildHumanFinancialViewOptions {
  fiscalView: FiscalViewInput;
  publicReports: PddeInfoPublicPortfolioResult;
}

const HUMAN_SOURCES: HumanSourceDescription[] = [
  {
    name: 'PDDEInfo',
    information: 'Repasses informados, cadastro e mandato da UEx, abertura de contas, suspensões, saldos e situação da prestação de contas.',
  },
  {
    name: 'SIGEF',
    information: 'Movimentações das contas e créditos compatíveis localizados no extrato.',
  },
];

const SOURCE_UNAVAILABLE_FOLLOW_UP = 'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.';

function brDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function creditStatusLabel(status: FiscalCreditPresentationStatus): string {
  switch (status) {
    case 'CREDITO_LOCALIZADO':
      return 'Crédito localizado';
    case 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA':
      return 'Crédito não localizado';
    case 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO':
      return 'Conta não exibida';
    case 'MAIS_DE_UM_CREDITO_COMPATIVEL':
      return 'Requer conferência';
    case 'CONSULTA_DA_CONTA_INCONCLUSIVA':
      return 'Consulta inconclusiva';
    case 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO':
      return 'Pagamento não informado';
  }
}

function accountKey(bank: string, agency: string, account: string): string {
  return canonicalAccount({ bank, agency, number: account });
}

function latestReference(publicReports: PddeInfoPublicPortfolioResult): string | null {
  return publicReports.balances
    .map((balance) => balance.coverageThrough)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? publicReports.coverageThrough;
}

function positionsFor(
  schoolInep: string,
  bank: string,
  agency: string,
  account: string,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanFinancialPosition[] {
  const wanted = accountKey(bank, agency, account);
  return publicReports.balances
    .filter((balance) => balance.schoolIneps.includes(schoolInep))
    .filter((balance) => accountKey(balance.bank, balance.agency, balance.account) === wanted)
    .sort((left, right) => left.coverageThrough.localeCompare(right.coverageThrough))
    .map((position) => ({
      referenceDate: position.coverageThrough,
      checkingBalanceCents: position.checkingBalanceCents,
      applications: {
        fundsCents: position.fundBalanceCents,
        savingsCents: position.savingsBalanceCents,
        rdbCdbCents: position.rdbCdbBalanceCents,
        totalCents: position.investmentBalanceCents,
      },
      totalReportedBalanceCents: position.totalReportedBalanceCents,
    }));
}

function accountNote(position: HumanFinancialPosition | null): string | null {
  if (!position) return 'Posição de saldo do FNDE ainda não disponível para esta conta.';
  return `Saldo informado pelo FNDE com posição até ${brDate(position.referenceDate)}.`;
}

function normalizedMatchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function installmentMarker(value: string | null): '1' | '2' | 'P1' | 'P2' | null {
  const normalized = normalizedMatchText(value ?? '');
  if (/\bP1\b/.test(normalized)) return 'P1';
  if (/\bP2\b/.test(normalized)) return 'P2';
  if (/\b1\b/.test(normalized) && /\bPARCELA\b/.test(normalized)) return '1';
  if (/\b2\b/.test(normalized) && /\bPARCELA\b/.test(normalized)) return '2';
  if (/\bPRIMEIRA PARCELA\b/.test(normalized)) return '1';
  if (/\bSEGUNDA PARCELA\b/.test(normalized)) return '2';
  return null;
}

function destinationInstallmentMarker(value: string): '1' | '2' | 'P1' | 'P2' | null {
  const normalized = normalizedMatchText(value);
  if (/\bP1\b/.test(normalized)) return 'P1';
  if (/\bP2\b/.test(normalized)) return 'P2';
  if (/\b1\b/.test(normalized) && /\bPARCELA\b/.test(normalized)) return '1';
  if (/\b2\b/.test(normalized) && /\bPARCELA\b/.test(normalized)) return '2';
  if (/\bPRIMEIRA PARCELA\b/.test(normalized)) return '1';
  if (/\bSEGUNDA PARCELA\b/.test(normalized)) return '2';
  return null;
}

const ACTION_STOPWORDS = new Set([
  'PDDE', 'BASICO', 'QUALIDADE', 'EQUIDADE', 'PARCELA',
  'PRIMEIRA', 'SEGUNDA', '2026', 'DE', 'DA', 'DO', 'DAS', 'DOS', 'E',
]);

function meaningfulActionTokens(action: string): string[] {
  return normalizedMatchText(action)
    .split(' ')
    .filter((token) => token.length >= 4 && !ACTION_STOPWORDS.has(token));
}

function publicOrderDateFor(input: {
  schoolInep: string;
  action: string;
  installment: string | null;
  programmedCents: number;
  publicReports: PddeInfoPublicPortfolioResult;
}): string | null {
  const marker = installmentMarker(input.installment);
  const actionTokens = meaningfulActionTokens(input.action);
  const candidates = input.publicReports.attendance.filter((item) => {
    if (item.schoolInep !== input.schoolInep) return false;
    if (item.totalCents !== input.programmedCents) return false;
    if (!item.paymentOrderDate) return false;
    if (marker && destinationInstallmentMarker(item.destination) !== marker) return false;
    const destination = normalizedMatchText(item.destination);
    return actionTokens.every((token) => destination.includes(token));
  });
  const dates = [...new Set(
    candidates
      .map((item) => item.paymentOrderDate)
      .filter((date): date is string => Boolean(date)),
  )];
  return dates.length === 1 ? dates[0] : null;
}

function schoolPrograms(
  school: FiscalSchoolView,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanFinancialProgram[] {
  return school.repasses.map((repasse) => ({
    name: repasse.action,
    installments: repasse.installments.map((installment) => ({
      installment: installment.installment,
      programmedCents: installment.amountProgrammedCents,
      paymentInformedCents: installment.amountPaidInformedCents,
      breakdown: installment.breakdown ? { ...installment.breakdown } : null,
      paymentInformedDate: installment.pddeInfoDate,
      paymentOrderDate: publicOrderDateFor({
        schoolInep: school.school.inep,
        action: repasse.action,
        installment: installment.installment,
        programmedCents: installment.amountProgrammedCents,
        publicReports,
      }),
      account: installment.account,
      creditEvidence: {
        status: creditStatusLabel(installment.bankCredit.presentationStatus),
        date: installment.bankCredit.date,
        amountCents: installment.bankCredit.amountCents,
        document: installment.bankCredit.document,
      },
      note: installment.note,
    })),
  }));
}

function humanCounterparty(value: {
  document: string | null;
  name: string | null;
  bank: string | null;
  agency: string | null;
  account: string | null;
}): HumanFinancialCounterparty | null {
  const counterparty: HumanFinancialCounterparty = {
    document: value.document,
    name: value.name,
    bank: value.bank,
    agency: value.agency,
    account: value.account,
  };
  return Object.values(counterparty).some((item) => item !== null && item !== '')
    ? counterparty
    : null;
}

function schoolAccounts(
  school: FiscalSchoolView,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanFinancialAccount[] {
  const accounts = new Map<string, HumanFinancialAccount>();

  for (const statement of school.statements) {
    const positions = positionsFor(
      school.school.inep,
      statement.account.bank,
      statement.account.agency,
      statement.account.number,
      publicReports,
    );
    const latestPosition = positions.at(-1) ?? null;
    accounts.set(accountKey(
      statement.account.bank,
      statement.account.agency,
      statement.account.number,
    ), {
      program: statement.programLabel,
      bank: statement.account.bank,
      agency: statement.account.agency,
      account: statement.account.number,
      occurrence: statement.occurrence ?? null,
      positions,
      latestPosition,
      movements: statement.entries.map((entry) => ({
        date: entry.date,
        description: entry.history,
        document: entry.document || null,
        category: entry.neutralCategory,
        creditCents: entry.creditCents,
        debitCents: entry.debitCents,
        counterparty: humanCounterparty(entry.counterparty),
      })),
      note: accountNote(latestPosition),
    });
  }

  const publicBalances = publicReports.balances
    .filter((balance) => balance.schoolIneps.includes(school.school.inep))
    .sort((left, right) => right.coverageThrough.localeCompare(left.coverageThrough));

  for (const balance of publicBalances) {
    const key = accountKey(balance.bank, balance.agency, balance.account);
    if (accounts.has(key)) continue;
    const positions = positionsFor(
      school.school.inep,
      balance.bank,
      balance.agency,
      balance.account,
      publicReports,
    );
    const latestPosition = positions.at(-1) ?? null;
    if (latestPosition?.totalReportedBalanceCents === null
      || latestPosition?.totalReportedBalanceCents === 0) continue;
    accounts.set(key, {
      program: balance.programName,
      bank: balance.bank,
      agency: balance.agency,
      account: balance.account,
      occurrence: null,
      positions,
      latestPosition,
      movements: [],
      note: accountNote(latestPosition),
    });
  }

  return [...accounts.values()].sort((left, right) => (
    left.program.localeCompare(right.program, 'pt-BR')
    || left.bank.localeCompare(right.bank)
    || left.agency.localeCompare(right.agency)
    || left.account.localeCompare(right.account)
  ));
}


function isoFromBrazilian(value: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(2026)$/.exec(value.trim());
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

function registrationFor(
  school: FiscalSchoolView,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanRegistrationStatus | null {
  const report = (publicReports.registrations ?? []).find((item) => item.schoolInep === school.school.inep) ?? null;
  const raw = school.status ?? {
    uexRegistration: '',
    mandate: '',
    mandateStartDate: '',
    mandateEndDate: '',
    uexAccounting: '',
    eexAdhesion: '',
    eexAccounting: '',
  };
  const hasRaw = Object.values(raw).some((value) => Boolean(value.trim()));
  if (!report && !hasRaw) return null;
  const studentCount = publicReports.attendance
    .find((item) => item.schoolInep === school.school.inep)?.studentCount ?? null;
  return {
    studentCount,
    location: report?.location ?? null,
    uexName: report?.uexName ?? school.school.uex ?? null,
    uexCnpj: report?.uexCnpj ?? school.school.cnpj ?? null,
    network: report?.network ?? null,
    mandateStatus: report?.mandateStatus ?? (raw.mandate || null),
    mandateStartDate: isoFromBrazilian(raw.mandateStartDate),
    mandateEndDate: report?.mandateEndDate ?? isoFromBrazilian(raw.mandateEndDate),
    updatedDate: report?.updatedDate ?? null,
    updatedTime: report?.updatedTime ?? null,
    phone: report?.phone ?? null,
    registrationNote: raw.uexRegistration || null,
    uexAccountingNote: raw.uexAccounting || null,
    eexAdhesionNote: raw.eexAdhesion || null,
    eexAccountingNote: raw.eexAccounting || null,
  };
}

function accountOpeningsFor(
  schoolInep: string,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanAccountOpeningStatus[] {
  return (publicReports.accountOpenings ?? [])
    .filter((item) => item.schoolInep === schoolInep)
    .map((item) => ({
      program: item.programName,
      status: item.status,
      bank: item.bank,
      agency: item.agency,
      account: item.account,
    }));
}

function suspensionsFor(
  schoolInep: string,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanSuspensionStatus[] {
  return (publicReports.suspensions ?? [])
    .filter((item) => item.schoolInep === schoolInep)
    .map((item) => ({
      program: item.programName,
      destination: item.destination,
      type: item.suspensionType,
      detail: item.detail,
    }));
}

function coverageStatus(
  publicReports: PddeInfoPublicPortfolioResult,
  schoolInep: string,
  kind: PddeInfoPublicPortfolioResult['failures'][number]['kind'],
  hasRows: boolean,
): HumanSourceCoverage['status'] {
  if (publicReports.failures.some((failure) => failure.schoolInep === schoolInep && failure.kind === kind)) {
    return 'UNAVAILABLE';
  }
  return hasRows ? 'AVAILABLE' : 'EMPTY';
}

function sourceCoverageFor(
  school: FiscalSchoolView,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanSourceCoverage[] {
  const inep = school.school.inep;
  const cnpj = school.school.cnpj.replace(/\D/g, '');
  const balanceFailure = publicReports.failures.some((failure) => failure.kind === 'BALANCE' && failure.cnpj === cnpj);
  const statements = school.statements;
  const sigefStatus: HumanSourceCoverage['status'] = statements.length === 0
    ? 'EMPTY'
    : statements.some((statement) => statement.collectionStatus === 'ERROR')
      ? 'UNAVAILABLE'
      : statements.some((statement) => statement.collectionStatus === 'PARTIAL')
        ? 'PARTIAL'
        : 'AVAILABLE';
  return [
    {
      dataset: 'PDDEInfo · Consulta por Escola',
      status: 'AVAILABLE',
      detail: 'Repasses, componentes financeiros, contas e situação textual da escola.',
    },
    {
      dataset: 'PDDEInfo · Atendimento',
      status: coverageStatus(publicReports, inep, 'ATTENDANCE', publicReports.attendance.some((item) => item.schoolInep === inep)),
      detail: 'Custeio, capital, total e data da ordem de pagamento.',
    },
    {
      dataset: 'PDDEInfo · Cadastro',
      status: coverageStatus(publicReports, inep, 'REGISTRATION', (publicReports.registrations ?? []).some((item) => item.schoolInep === inep)),
      detail: 'Situação cadastral, mandato e atualização da UEx.',
    },
    {
      dataset: 'PDDEInfo · Abertura de Conta',
      status: coverageStatus(publicReports, inep, 'ACCOUNT_OPENING', (publicReports.accountOpenings ?? []).some((item) => item.schoolInep === inep)),
      detail: 'Situação publicada para abertura/vínculo de conta.',
    },
    {
      dataset: 'PDDEInfo · Suspensões',
      status: coverageStatus(publicReports, inep, 'SUSPENSION', (publicReports.suspensions ?? []).some((item) => item.schoolInep === inep)),
      detail: 'Motivos de suspensão informados pelo FNDE.',
    },
    {
      dataset: 'PDDEInfo · Prestação de Contas',
      status: coverageStatus(publicReports, inep, 'ACCOUNTING', publicReports.accounting.some((item) => item.schoolInep === inep)),
      detail: 'Situação da prestação e suspensão de pagamento.',
    },
    {
      dataset: 'PDDEInfo · Saldos',
      status: balanceFailure
        ? 'UNAVAILABLE'
        : publicReports.balances.some((item) => item.schoolIneps.includes(inep)) ? 'AVAILABLE' : 'EMPTY',
      detail: publicReports.coverageThrough ? `Posição pública até ${brDate(publicReports.coverageThrough)}.` : 'Sem posição pública de 2026 nesta coleta.',
    },
    {
      dataset: 'SIGEF · Extrato',
      status: sigefStatus,
      detail: 'Movimentações bancárias do exercício e evidência de créditos compatíveis.',
    },
  ];
}

function normalizedStatus(value: string | null): string {
  return normalizedMatchText(value ?? '');
}

function registrationNeedsAttention(registration: HumanRegistrationStatus | null): boolean {
  if (!registration) return false;
  const status = normalizedStatus(registration.mandateStatus);
  const note = normalizedStatus(registration.registrationNote);
  return status.includes('VENCID')
    || status.includes('VENCER')
    || note.includes('PENDENCIA')
    || note.includes('DESATUALIZ');
}

function accountOpeningNeedsAttention(item: HumanAccountOpeningStatus): boolean {
  const status = normalizedStatus(item.status);
  if (!status) return false;
  return !(
    status.includes('SEM PENDENCIA')
    || status.includes('REGULAR')
    || status.includes('CONCLUID')
    || status.includes('ABERTA')
    || status.includes('ATIVA')
  );
}

function accountingFor(
  schoolInep: string,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanAccountingStatus[] {
  return publicReports.accounting
    .filter((item) => item.schoolInep === schoolInep)
    .map((item) => ({
      program: item.programName,
      status: item.accountingStatus,
      paymentSuspended: item.paymentSuspended,
      expectedTotalCents: item.expectedTotalCents,
    }));
}

function followUpFor(
  school: FiscalSchoolView,
  accounts: HumanFinancialAccount[],
  publicReports: PddeInfoPublicPortfolioResult,
): string[] {
  const messages: string[] = [];
  const schoolFailures = publicReports.failures.filter((failure) => (
    failure.schoolInep === school.school.inep
    || (failure.cnpj && failure.cnpj === school.school.cnpj)
  ));
  if (schoolFailures.length > 0) {
    messages.push(SOURCE_UNAVAILABLE_FOLLOW_UP);
  }
  if (accounts.some((account) => account.latestPosition === null)) {
    messages.push('Há conta sem posição pública de saldo disponível na data desta consulta.');
  }
  if (school.repasses.some((repasse) => repasse.installments.some((installment) => (
    installment.amountPaidInformedCents > 0
    && installment.bankCredit.presentationStatus === 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA'
  )))) {
    messages.push('Há pagamento informado no PDDEInfo sem crédito compatível localizado nesta coleta.');
  }
  const registration = registrationFor(school, publicReports);
  if (registrationNeedsAttention(registration)) {
    messages.push('Há informação cadastral ou de mandato que requer acompanhamento.');
  }
  if (suspensionsFor(school.school.inep, publicReports).length > 0) {
    messages.push('O relatório público de suspensões apresenta ocorrência para esta unidade.');
  }
  if (accountOpeningsFor(school.school.inep, publicReports).some(accountOpeningNeedsAttention)) {
    messages.push('A situação de abertura de conta apresenta ocorrência para acompanhamento.');
  }
  return [...new Set(messages)];
}

function unitOf(school: HumanFinancialSchoolView): HumanIndicatorUnit {
  return {
    sme: school.school.sme,
    name: school.school.name,
    inep: school.school.inep,
  };
}

function indicator(
  label: string,
  schools: readonly HumanFinancialSchoolView[],
  predicate: (school: HumanFinancialSchoolView) => boolean,
): HumanFinancialIndicator {
  const units = schools
    .filter(predicate)
    .map(unitOf)
    .sort((left, right) => left.sme.localeCompare(right.sme) || left.name.localeCompare(right.name, 'pt-BR'));
  return { label, count: units.length, units };
}

function buildPortfolioMetrics(
  schools: readonly HumanFinancialSchoolView[],
  referenceDate: string | null,
): HumanFinancialPortfolioMetrics {
  let accountsTotal = 0;
  let accountsWithPosition = 0;
  let programmedCents = 0;
  let paymentInformedCents = 0;
  let creditLocatedCents = 0;
  let reportedBalanceCents = 0;
  let applicationsCents = 0;
  let reportedBalanceKnown = true;
  let applicationsKnown = true;

  for (const school of schools) {
    for (const program of school.programs) {
      for (const installment of program.installments) {
        programmedCents += installment.programmedCents;
        paymentInformedCents += installment.paymentInformedCents;
        if (installment.creditEvidence.status === 'Crédito localizado'
          && installment.creditEvidence.amountCents !== null) {
          creditLocatedCents += installment.creditEvidence.amountCents;
        }
      }
    }
    accountsTotal += school.accounts.length;
    for (const account of school.accounts) {
      if (!account.latestPosition || !referenceDate
        || account.latestPosition.referenceDate !== referenceDate) continue;
      accountsWithPosition += 1;
      if (account.latestPosition.totalReportedBalanceCents === null) {
        reportedBalanceKnown = false;
      } else {
        reportedBalanceCents += account.latestPosition.totalReportedBalanceCents;
      }
      if (account.latestPosition.applications.totalCents === null) {
        applicationsKnown = false;
      } else {
        applicationsCents += account.latestPosition.applications.totalCents;
      }
    }
  }

  const hasAlignedAccounts = referenceDate !== null && accountsWithPosition > 0;

  return {
    schoolCount: schools.length,
    accountsTotal,
    accountsWithPosition,
    programmedCents,
    paymentInformedCents,
    creditLocatedCents,
    reportedBalanceCents: hasAlignedAccounts && reportedBalanceKnown ? reportedBalanceCents : null,
    applicationsCents: hasAlignedAccounts && applicationsKnown ? applicationsCents : null,
  };
}

function buildIndicators(schools: readonly HumanFinancialSchoolView[]): HumanFinancialIndicator[] {
  return [
    indicator('Pagamento informado sem crédito compatível localizado', schools, (school) => (
      school.programs.some((program) => program.installments.some((installment) => (
        installment.paymentInformedCents > 0
        && installment.creditEvidence.status === 'Crédito não localizado'
      )))
    )),
    indicator('Pagamento informado sem conta do repasse exibida', schools, (school) => (
      school.programs.some((program) => program.installments.some((installment) => (
        installment.paymentInformedCents > 0 && installment.account === null
      )))
    )),
    indicator('Conta sem posição pública de saldo', schools, (school) => (
      school.accounts.some((account) => account.latestPosition === null)
    )),
    indicator('Prestação com pagamento suspenso', schools, (school) => (
      school.accounting.some((item) => item.paymentSuspended)
    )),
    indicator('Cadastro ou mandato requer acompanhamento', schools, (school) => (
      registrationNeedsAttention(school.registration)
    )),
    indicator('Suspensão informada pelo FNDE', schools, (school) => school.suspensions.length > 0),
    indicator('Abertura de conta requer acompanhamento', schools, (school) => (
      school.accountOpenings.some(accountOpeningNeedsAttention)
    )),
    indicator('Outra informação parcial', schools, (school) => (
      school.followUp.includes(SOURCE_UNAVAILABLE_FOLLOW_UP)
    )),
  ];
}

export function buildHumanFinancialView(
  options: BuildHumanFinancialViewOptions,
): HumanFinancialPortfolioView {
  assertCurrentFiscalYear(options.fiscalView.fiscalYear);
  const reference = latestReference(options.publicReports);

  const schools = options.fiscalView.schools.map((school) => {
    const accounts = schoolAccounts(school, options.publicReports);
    return {
      school: { ...school.school },
      programs: schoolPrograms(school, options.publicReports),
      accounts,
      registration: registrationFor(school, options.publicReports),
      accountOpenings: accountOpeningsFor(school.school.inep, options.publicReports),
      suspensions: suspensionsFor(school.school.inep, options.publicReports),
      sourceCoverage: sourceCoverageFor(school, options.publicReports),
      accounting: accountingFor(school.school.inep, options.publicReports),
      followUp: followUpFor(school, accounts, options.publicReports),
    };
  });

  return {
    title: 'Inteligência Financeira PDDE | 4ª CRE',
    fiscalYear: 2026,
    referenceLabel: reference
      ? `Posição financeira pública disponível até ${brDate(reference)}`
      : 'Posição de saldo público ainda não disponível para 2026',
    metrics: buildPortfolioMetrics(schools, reference),
    sources: HUMAN_SOURCES.map((source) => ({ ...source })),
    indicators: buildIndicators(schools),
    schools,
  };
}
