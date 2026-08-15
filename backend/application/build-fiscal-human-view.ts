import { z } from 'zod';
import { canonicalAccount } from '../core/normalization';
import type { BankAccount } from '../core/schemas';
import type { SigefMovementClass } from '../adapters/sigef-public-statement';
import { sourceObservationSchema } from '../core/source-observation';
import {
  buildMonitoringOperationalView,
  type OperationalMovement,
  type OperationalRepasse,
  type OperationalRepasseStatus,
} from './build-monitoring-operational-view';

const accountSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  number: z.string(),
}).strict();

const sourceAccountSchema = z.object({
  programCode: z.string(),
  programLabel: z.string(),
  account: accountSchema,
  saldoPddeInfoCents: z.number().int().nullable(),
  status: z.enum(['COMPLETE', 'PARTIAL', 'ERROR']),
  error: z.string().nullable(),
  pagesFetched: z.number().int().nonnegative(),
  declaredTotal: z.number().int().nonnegative().nullable(),
  movementsInYear: z.number().int().nonnegative(),
  coverageThrough: z.string().nullable(),
}).passthrough();

const sourceSchoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  name: z.string(),
  uex: z.string(),
  cnpj: z.string(),
  accounts: z.array(sourceAccountSchema),
}).passthrough();

const sourceSchema = z.object({
  generatedAt: z.string(),
  fiscalYear: z.number().int(),
  status: z.enum(['COMPLETE', 'PARTIAL']),
  sources: z.array(z.string()),
  sourceObservations: z.array(sourceObservationSchema).default([]),
  coverage: z.record(z.string(), z.unknown()),
  schools: z.array(sourceSchoolSchema),
}).passthrough();

export type FiscalCreditPresentationStatus =
  | 'CREDITO_LOCALIZADO'
  | 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA'
  | 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO'
  | 'MAIS_DE_UM_CREDITO_COMPATIVEL'
  | 'CONSULTA_DA_CONTA_INCONCLUSIVA'
  | 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO';

export interface FiscalInstallmentView {
  /** Texto exatamente como veio do PDDEInfo. Nulo quando a própria fonte não divide a ação em parcelas. */
  installment: string | null;
  amountProgrammedCents: number;
  amountPaidInformedCents: number;
  /** Data associada ao pagamento/ordem na coleta do PDDEInfo. */
  pddeInfoDate: string | null;
  account: BankAccount | null;
  bankCredit: {
    presentationStatus: FiscalCreditPresentationStatus;
    technicalStatus: OperationalRepasseStatus;
    date: string | null;
    amountCents: number | null;
    document: string | null;
  };
  /** Explicação neutra de leitura, sem juízo de regularidade. */
  note: string | null;
}

export interface FiscalRepasseGroupView {
  programCode: string;
  /** Nome da ação preservado como veio do PDDEInfo. */
  action: string;
  installments: FiscalInstallmentView[];
}

export interface FiscalStatementEntry {
  id: string;
  date: string;
  /** Histórico preservado literalmente do extrato SIGEF. */
  history: string;
  /** Documento preservado literalmente do extrato SIGEF. */
  document: string;
  creditCents: number | null;
  debitCents: number | null;
  counterparty: OperationalMovement['counterparty'];
  /** Categoria auxiliar neutra. Não substitui o histórico original da fonte. */
  neutralCategory: string | null;
  technicalClassification: SigefMovementClass;
  sourceUrl: string;
}

export interface FiscalAccountStatementView {
  programCode: string;
  programLabel: string;
  account: BankAccount;
  saldoPddeInfoCents: number | null;
  collectionStatus: 'COMPLETE' | 'PARTIAL' | 'ERROR';
  collectionError: string | null;
  coverageThrough: string | null;
  pagesFetched: number;
  declaredTotal: number | null;
  entries: FiscalStatementEntry[];
}

export interface FiscalSchoolView {
  school: {
    inep: string;
    sme: string;
    name: string;
    uex: string;
    cnpj: string;
  };
  repasses: FiscalRepasseGroupView[];
  statements: FiscalAccountStatementView[];
}

function presentationCreditStatus(
  status: OperationalRepasseStatus,
): FiscalCreditPresentationStatus {
  switch (status) {
    case 'CREDITO_CONFIRMADO':
      return 'CREDITO_LOCALIZADO';
    case 'PAGO_CREDITO_NAO_LOCALIZADO':
      return 'PAGAMENTO_INFORMADO_CREDITO_NAO_LOCALIZADO_NESTA_COLETA';
    case 'PAGO_SEM_CONTA_ATUAL':
      return 'PAGAMENTO_INFORMADO_CONTA_NAO_EXIBIDA_NO_PDDEINFO';
    case 'CREDITO_AMBIGUO':
      return 'MAIS_DE_UM_CREDITO_COMPATIVEL';
    case 'CONSULTA_INCONCLUSIVA':
      return 'CONSULTA_DA_CONTA_INCONCLUSIVA';
    case 'PROGRAMADO_NAO_PAGO':
      return 'PAGAMENTO_AINDA_NAO_INFORMADO_NO_PDDEINFO';
  }
}

function repasseNote(repasse: OperationalRepasse): string | null {
  switch (repasse.bankCreditStatus) {
    case 'CREDITO_CONFIRMADO':
      return 'Pagamento informado no PDDEInfo e crédito compatível localizado no extrato SIGEF.';
    case 'PAGO_CREDITO_NAO_LOCALIZADO':
      return 'Pagamento informado no PDDEInfo; crédito compatível ainda não localizado nesta coleta do extrato SIGEF.';
    case 'PAGO_SEM_CONTA_ATUAL':
      return 'Pagamento informado no PDDEInfo; a conta correspondente não estava exibida na coleta atual do PDDEInfo.';
    case 'CREDITO_AMBIGUO':
      return 'Pagamento informado no PDDEInfo; mais de um crédito bancário compatível foi localizado nesta coleta.';
    case 'CONSULTA_INCONCLUSIVA':
      return 'Pagamento informado no PDDEInfo; a consulta do extrato da conta não ficou completa nesta coleta.';
    case 'PROGRAMADO_NAO_PAGO':
      return null;
  }
}

function installmentRank(value: string | null): number {
  if (value === '1ª Parcela' || value === 'P1') return 10;
  if (value === '2ª Parcela' || value === 'P2') return 20;
  if (value === null) return 90;
  return 50;
}

export function neutralMovementCategory(classification: SigefMovementClass): string | null {
  switch (classification) {
    case 'REPASSE_FNDE':
      return 'Crédito FNDE';
    case 'APLICACAO_FINANCEIRA':
      return 'Aplicação financeira';
    case 'RESGATE_APLICACAO':
      return 'Resgate de aplicação';
    case 'PAGAMENTO_TRANSFERENCIA':
      return 'Pagamento / transferência';
    case 'PAGAMENTO_CARTAO':
      return 'Pagamento por cartão';
    case 'RENDIMENTO_FINANCEIRO':
      return 'Rendimento financeiro';
    case 'ENTRADA_TERCEIRO':
      return 'Entrada registrada no extrato';
    case 'TARIFA_BANCARIA':
      return 'Tarifa bancária';
    case 'ESTORNO_REVERSAO':
      return 'Estorno / reversão';
    case 'MOVIMENTO_NAO_CLASSIFICADO':
      return null;
  }
}

function groupRepasses(repasses: OperationalRepasse[]): FiscalRepasseGroupView[] {
  const groups = new Map<string, FiscalRepasseGroupView>();

  for (const repasse of repasses) {
    const key = `${repasse.programCode}\u0000${repasse.action}`;
    let group = groups.get(key);
    if (!group) {
      group = {
        programCode: repasse.programCode,
        action: repasse.action,
        installments: [],
      };
      groups.set(key, group);
    }

    group.installments.push({
      installment: repasse.installment,
      amountProgrammedCents: repasse.amountProgrammedCents,
      amountPaidInformedCents: repasse.amountPaidInformedCents,
      pddeInfoDate: repasse.orderDate,
      account: repasse.account,
      bankCredit: {
        presentationStatus: presentationCreditStatus(repasse.bankCreditStatus),
        technicalStatus: repasse.bankCreditStatus,
        date: repasse.bankCreditDate,
        amountCents: repasse.bankCreditAmountCents,
        document: repasse.bankDocument,
      },
      note: repasseNote(repasse),
    });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      installments: group.installments.sort((left, right) => (
        installmentRank(left.installment) - installmentRank(right.installment)
        || (left.installment ?? '').localeCompare(right.installment ?? '', 'pt-BR')
      )),
    }))
    .sort((left, right) => (
      left.action.localeCompare(right.action, 'pt-BR')
      || left.programCode.localeCompare(right.programCode)
    ));
}

function statementEntries(
  movements: OperationalMovement[],
): FiscalStatementEntry[] {
  return movements
    .map((movement) => ({
      id: movement.id,
      date: movement.movementDate,
      history: movement.history,
      document: movement.document,
      creditCents: movement.operation === 'credit' ? movement.amountCents : null,
      debitCents: movement.operation === 'debit' ? movement.amountCents : null,
      counterparty: movement.counterparty,
      neutralCategory: neutralMovementCategory(movement.classification),
      technicalClassification: movement.classification,
      sourceUrl: movement.sourceUrl,
    }))
    .sort((left, right) => (
      left.date.localeCompare(right.date)
      || left.id.localeCompare(right.id)
    ));
}

export function buildFiscalHumanView(rawInput: unknown) {
  const source = sourceSchema.parse(rawInput);
  const operational = buildMonitoringOperationalView(rawInput);

  const movementsBySchoolAndAccount = new Map<string, OperationalMovement[]>();
  for (const movement of operational.movements) {
    const key = `${movement.school.inep}|${movement.programCode}|${canonicalAccount(movement.account)}`;
    const bucket = movementsBySchoolAndAccount.get(key) ?? [];
    bucket.push(movement);
    movementsBySchoolAndAccount.set(key, bucket);
  }

  const repassesBySchool = new Map<string, OperationalRepasse[]>();
  for (const repasse of operational.repasses) {
    const bucket = repassesBySchool.get(repasse.school.inep) ?? [];
    bucket.push(repasse);
    repassesBySchool.set(repasse.school.inep, bucket);
  }

  const schools: FiscalSchoolView[] = source.schools
    .map((school) => ({
      school: {
        inep: school.inep,
        sme: school.sme,
        name: school.name,
        uex: school.uex,
        cnpj: school.cnpj,
      },
      repasses: groupRepasses(repassesBySchool.get(school.inep) ?? []),
      statements: school.accounts
        .map((accountResult) => {
          const key = `${school.inep}|${accountResult.programCode}|${canonicalAccount(accountResult.account)}`;
          return {
            programCode: accountResult.programCode,
            programLabel: accountResult.programLabel,
            account: accountResult.account,
            saldoPddeInfoCents: accountResult.saldoPddeInfoCents,
            collectionStatus: accountResult.status,
            collectionError: accountResult.error,
            coverageThrough: accountResult.coverageThrough,
            pagesFetched: accountResult.pagesFetched,
            declaredTotal: accountResult.declaredTotal,
            entries: statementEntries(movementsBySchoolAndAccount.get(key) ?? []),
          } satisfies FiscalAccountStatementView;
        })
        .sort((left, right) => (
          left.programCode.localeCompare(right.programCode)
          || canonicalAccount(left.account).localeCompare(canonicalAccount(right.account))
        )),
    }))
    .sort((left, right) => (
      left.school.sme.localeCompare(right.school.sme)
      || left.school.name.localeCompare(right.school.name, 'pt-BR')
    ));

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: source.generatedAt,
    fiscalYear: source.fiscalYear,
    sourceStatus: source.status,
    sources: source.sources,
    sourceObservations: source.sourceObservations,
    coverage: source.coverage,
    presentation: {
      repasses: 'Ações agrupadas por escola com parcelas preservadas exatamente como informadas pelo PDDEInfo.',
      statements: 'Movimentações agrupadas por escola e conta, em ordem cronológica crescente, com histórico original do SIGEF preservado.',
      interpretation: 'Categorias auxiliares são descritivas e não expressam juízo de regularidade da despesa.',
    },
    schools,
  };
}
