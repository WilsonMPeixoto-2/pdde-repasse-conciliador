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
  positions: HumanFinancialPosition[];
  latestPosition: HumanFinancialPosition | null;
  movements: HumanFinancialMovement[];
  note: string | null;
}

export interface HumanFinancialInstallment {
  installment: string | null;
  programmedCents: number;
  paymentInformedCents: number;
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
    information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.',
  },
  {
    name: 'SIGEF',
    information: 'Movimentações das contas e créditos compatíveis localizados no extrato.',
  },
];

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
    accounts.set(key, {
      program: balance.programName,
      bank: balance.bank,
      agency: balance.agency,
      account: balance.account,
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
    messages.push('Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.');
  }
  if (accounts.some((account) => account.latestPosition === null)) {
    messages.push('Há conta sem posição pública de saldo disponível na data desta consulta.');
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
    indicator('1ª parcela com pagamento informado', schools, (school) => (
      school.programs.some((program) => program.installments.some((installment) => (
        /1\s*ª|1a|primeira/i.test(installment.installment ?? '')
        && installment.paymentInformedCents > 0
      )))
    )),
    indicator('Conta do repasse não exibida', schools, (school) => (
      school.programs.some((program) => program.installments.some((installment) => (
        installment.programmedCents > 0 && installment.account === null
      )))
    )),
    indicator('Conta sem posição pública de saldo', schools, (school) => (
      school.accounts.some((account) => account.latestPosition === null)
    )),
    indicator('Prestação com pagamento suspenso', schools, (school) => (
      school.accounting.some((item) => item.paymentSuspended)
    )),
    indicator('Informação parcial', schools, (school) => school.followUp.length > 0),
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
