import { assertCurrentFiscalYear } from '../core/fiscal-scope';
import type { PddeInfoPublicPortfolioResult } from './collect-pddeinfo-public-portfolio';
import type {
  FiscalCreditPresentationStatus,
  FiscalSchoolView,
} from './build-fiscal-human-view';

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
  latestPosition: HumanFinancialPosition | null;
  movements: HumanFinancialMovement[];
  note: string | null;
}

export interface HumanFinancialInstallment {
  installment: string | null;
  programmedCents: number;
  paymentInformedCents: number;
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

export interface HumanFinancialPortfolioView {
  title: 'Inteligência Financeira PDDE | 4ª CRE';
  fiscalYear: 2026;
  referenceLabel: string;
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

function brDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function creditStatusLabel(status: FiscalCreditPresentationStatus): string {
  switch (status) {
    case 'CREDITO_LOCALIZADO':
      return 'Crédito compatível localizado no extrato SIGEF';
    case 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA':
      return 'Pagamento informado no PDDEInfo; crédito ainda não localizado nesta consulta';
    case 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO':
      return 'Pagamento informado no PDDEInfo; conta não exibida na consulta atual';
    case 'MAIS_DE_UM_CREDITO_COMPATIVEL':
      return 'Mais de um crédito compatível localizado; requer conferência';
    case 'CONSULTA_DA_CONTA_INCONCLUSIVA':
      return 'Consulta da conta inconclusiva';
    case 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO':
      return 'Pagamento ainda não informado no PDDEInfo';
  }
}

function accountKey(bank: string, agency: string, account: string): string {
  const clean = (value: string) => value.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  return `${clean(bank)}|${clean(agency)}|${clean(account)}`;
}

function latestReference(publicReports: PddeInfoPublicPortfolioResult): string | null {
  return publicReports.balances
    .map((balance) => balance.coverageThrough)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? publicReports.coverageThrough;
}

function positionFor(
  schoolInep: string,
  bank: string,
  agency: string,
  account: string,
  publicReports: PddeInfoPublicPortfolioResult,
): HumanFinancialPosition | null {
  const wanted = accountKey(bank, agency, account);
  const candidates = publicReports.balances
    .filter((balance) => balance.schoolIneps.includes(schoolInep))
    .filter((balance) => accountKey(balance.bank, balance.agency, balance.account) === wanted)
    .sort((left, right) => right.coverageThrough.localeCompare(left.coverageThrough));
  const latest = candidates[0];
  if (!latest) return null;
  return {
    referenceDate: latest.coverageThrough,
    checkingBalanceCents: latest.checkingBalanceCents,
    applications: {
      fundsCents: latest.fundBalanceCents,
      savingsCents: latest.savingsBalanceCents,
      rdbCdbCents: latest.rdbCdbBalanceCents,
      totalCents: latest.investmentBalanceCents,
    },
    totalReportedBalanceCents: latest.totalReportedBalanceCents,
  };
}

function accountNote(position: HumanFinancialPosition | null): string | null {
  if (!position) return 'Posição de saldo do FNDE ainda não disponível para esta conta.';
  return `Saldo informado pelo FNDE com posição até ${brDate(position.referenceDate)}.`;
}

function schoolPrograms(school: FiscalSchoolView): HumanFinancialProgram[] {
  return school.repasses.map((repasse) => ({
    name: repasse.action,
    installments: repasse.installments.map((installment) => ({
      installment: installment.installment,
      programmedCents: installment.amountProgrammedCents,
      paymentInformedCents: installment.amountPaidInformedCents,
      paymentOrderDate: installment.pddeInfoDate,
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
    const latestPosition = positionFor(
      school.school.inep,
      statement.account.bank,
      statement.account.agency,
      statement.account.number,
      publicReports,
    );
    accounts.set(accountKey(
      statement.account.bank,
      statement.account.agency,
      statement.account.number,
    ), {
      program: statement.programLabel,
      bank: statement.account.bank,
      agency: statement.account.agency,
      account: statement.account.number,
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
    const latestPosition = positionFor(
      school.school.inep,
      balance.bank,
      balance.agency,
      balance.account,
      publicReports,
    );
    accounts.set(key, {
      program: balance.programName,
      bank: balance.bank,
      agency: balance.agency,
      account: balance.account,
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
      programs: schoolPrograms(school),
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
    indicators: buildIndicators(schools),
    schools,
  };
}
