import { z } from 'zod';
import { canonicalAccount, canonicalText } from '../core/normalization';
import type { BankAccount } from '../core/schemas';
import type { SigefMovementClass } from '../adapters/sigef-public-statement';
import { sourceObservationSchema } from '../core/source-observation';

export type OperationalRepasseStatus =
  | 'PROGRAMADO_NAO_PAGO'
  | 'CREDITO_CONFIRMADO'
  | 'PAGO_SEM_CONTA_ATUAL'
  | 'PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO'
  | 'PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE'
  | 'CREDITO_AMBIGUO'
  | 'CONSULTA_INCONCLUSIVA';

const accountSchema = z.object({
  bank: z.string(),
  agency: z.string(),
  number: z.string(),
}).strict();

const counterpartySchema = z.object({
  document: z.string().nullable(),
  name: z.string().nullable(),
  bank: z.string().nullable(),
  agency: z.string().nullable(),
  account: z.string().nullable(),
}).strict();

const movementSchema = z.object({
  id: z.string(),
  schoolCnpj: z.string(),
  programCode: z.string(),
  operation: z.enum(['credit', 'debit']),
  amountCents: z.number().int().nonnegative(),
  movementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  account: accountSchema,
  document: z.string(),
  history: z.string(),
  classification: z.string(),
  counterparty: counterpartySchema,
  sourceUrl: z.string().url(),
}).strict();

const accountResultSchema = z.object({
  inep: z.string().regex(/^\d{8}$/).optional(),
  programCode: z.string(),
  programLabel: z.string(),
  account: accountSchema,
  saldoPddeInfoCents: z.number().int().nullable(),
  status: z.enum(['COMPLETE', 'PARTIAL', 'ERROR']),
  error: z.string().nullable(),
  pagesFetched: z.number().int().nonnegative(),
  declaredTotal: z.number().int().nonnegative().nullable(),
  uniqueMovements: z.number().int().nonnegative(),
  movementsInYear: z.number().int().nonnegative(),
  coverageThrough: z.string().nullable(),
  totals: z.record(z.string(), z.number().int()),
  movements: z.array(movementSchema),
}).passthrough();

const repasseSchema = z.object({
  programCode: z.string(),
  action: z.string(),
  installment: z.string().nullable(),
  programadoCents: z.number().int().nonnegative(),
  pagoInformadoCents: z.number().int().nonnegative(),
  dataOrdem: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  account: accountSchema.nullable().optional(),
}).strict();

const schoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  name: z.string(),
  uex: z.string(),
  cnpj: z.string(),
  pddeInfo: z.object({ queriedAt: z.string(), rawSha256: z.string() }).optional(),
  repasses: z.array(repasseSchema),
  accounts: z.array(accountResultSchema),
  unknownProgramAccounts: z.array(z.unknown()).default([]),
}).passthrough();

const rawMonitorSchema = z.object({
  version: z.number().int(),
  generatedAt: z.string(),
  fiscalYear: z.number().int(),
  status: z.enum(['COMPLETE', 'PARTIAL']),
  sources: z.array(z.string()),
  sourceObservations: z.array(sourceObservationSchema).default([]),
  coverage: z.record(z.string(), z.unknown()),
  summary: z.record(z.string(), z.unknown()),
  schools: z.array(schoolSchema),
}).passthrough();

export interface OperationalMovement {
  id: string;
  school: {
    inep: string;
    sme: string;
    name: string;
    cnpj: string;
  };
  programCode: string;
  programLabel: string;
  account: BankAccount;
  movementDate: string;
  operation: 'credit' | 'debit';
  amountCents: number;
  classification: SigefMovementClass;
  history: string;
  document: string;
  counterparty: z.infer<typeof counterpartySchema>;
  sourceUrl: string;
}

export interface OperationalRepasse {
  school: {
    inep: string;
    sme: string;
    name: string;
    cnpj: string;
  };
  programCode: string;
  action: string;
  installment: string | null;
  amountProgrammedCents: number;
  amountPaidInformedCents: number;
  orderDate: string | null;
  account: BankAccount | null;
  bankCreditStatus: OperationalRepasseStatus;
  bankCreditDate: string | null;
  bankCreditAmountCents: number | null;
  bankDocument: string | null;
  daysAfterOrder: number | null;
}

export interface MonitoringAlert {
  kind: 'REPASSE' | 'TARIFA' | 'ENTRADA_EXTERNA' | 'MOVIMENTO_REVISAR';
  schoolInep: string;
  schoolName: string;
  programCode: string;
  date: string | null;
  amountCents: number;
  message: string;
  reference: string | null;
}

const CLASSIFICATIONS: SigefMovementClass[] = [
  'REPASSE_FNDE',
  'APLICACAO_FINANCEIRA',
  'RESGATE_APLICACAO',
  'PAGAMENTO_TRANSFERENCIA',
  'PAGAMENTO_CARTAO',
  'RENDIMENTO_FINANCEIRO',
  'ENTRADA_TERCEIRO',
  'TARIFA_BANCARIA',
  'ESTORNO_REVERSAO',
  'MOVIMENTO_NAO_CLASSIFICADO',
];

function parseDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new Error(`Data impossível no monitoramento: ${value}.`);
  }
  return parsed;
}

function daysBetween(start: string, end: string): number {
  const milliseconds = parseDate(end).getTime() - parseDate(start).getTime();
  return Math.round(milliseconds / 86_400_000);
}

export function refineOperationalMovementClass(
  rawClassification: string,
  operation: 'credit' | 'debit',
  rawHistory: string,
): SigefMovementClass {
  if (CLASSIFICATIONS.includes(rawClassification as SigefMovementClass)
    && rawClassification !== 'MOVIMENTO_NAO_CLASSIFICADO') {
    return rawClassification as SigefMovementClass;
  }

  const history = canonicalText(rawHistory);
  if (operation === 'debit' && history === 'TV POR ASSINATURA') {
    return 'PAGAMENTO_TRANSFERENCIA';
  }
  if (operation === 'credit' && history.startsWith('TED TRANSFERENCIA ELETR DISPON')) {
    return 'ENTRADA_TERCEIRO';
  }
  if (operation === 'credit' && history === 'TRANSFERIDO DA POUPANCA') {
    return 'RESGATE_APLICACAO';
  }
  return 'MOVIMENTO_NAO_CLASSIFICADO';
}

function accountKey(account: BankAccount | null | undefined): string | null {
  if (!account) return null;
  return canonicalAccount(account);
}

function makeCreditIndex(movements: OperationalMovement[]): Map<string, OperationalMovement[]> {
  const result = new Map<string, OperationalMovement[]>();
  for (const movement of movements) {
    if (movement.classification !== 'REPASSE_FNDE') continue;
    const key = `${movement.school.inep}|${movement.programCode}|${canonicalAccount(movement.account)}`;
    const bucket = result.get(key) ?? [];
    bucket.push(movement);
    result.set(key, bucket);
  }
  return result;
}

function baseRepasse(
  school: z.infer<typeof schoolSchema>,
  repasse: z.infer<typeof repasseSchema>,
  account: BankAccount | null,
  bankCreditStatus: OperationalRepasseStatus,
): OperationalRepasse {
  return {
    school: {
      inep: school.inep,
      sme: school.sme,
      name: school.name,
      cnpj: school.cnpj,
    },
    programCode: repasse.programCode,
    action: repasse.action,
    installment: repasse.installment,
    amountProgrammedCents: repasse.programadoCents,
    amountPaidInformedCents: repasse.pagoInformadoCents,
    orderDate: repasse.dataOrdem,
    account,
    bankCreditStatus,
    bankCreditDate: null,
    bankCreditAmountCents: null,
    bankDocument: null,
    daysAfterOrder: null,
  };
}

function reconcileRepasse(
  school: z.infer<typeof schoolSchema>,
  repasse: z.infer<typeof repasseSchema>,
  accountResults: z.infer<typeof accountResultSchema>[],
  creditIndex: Map<string, OperationalMovement[]>,
): OperationalRepasse {
  const account = repasse.account ?? null;

  if (repasse.pagoInformadoCents === 0) {
    return {
      ...baseRepasse(school, repasse, account, 'PROGRAMADO_NAO_PAGO'),
      amountPaidInformedCents: 0,
    };
  }

  if (!account) {
    return baseRepasse(school, repasse, null, 'PAGO_SEM_CONTA_ATUAL');
  }

  const correspondingAccount = accountResults.find((candidate) => (
    candidate.programCode === repasse.programCode
    && accountKey(candidate.account) === accountKey(account)
  ));
  if (!correspondingAccount || correspondingAccount.status !== 'COMPLETE') {
    return baseRepasse(school, repasse, account, 'CONSULTA_INCONCLUSIVA');
  }
  if (!correspondingAccount.coverageThrough) {
    return baseRepasse(school, repasse, account, 'CONSULTA_INCONCLUSIVA');
  }
  if (repasse.dataOrdem && correspondingAccount.coverageThrough < repasse.dataOrdem) {
    return baseRepasse(school, repasse, account, 'PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO');
  }

  const key = `${school.inep}|${repasse.programCode}|${canonicalAccount(account)}`;
  const candidates = (creditIndex.get(key) ?? []).filter((movement) => {
    if (movement.amountCents !== repasse.pagoInformadoCents) return false;
    if (!repasse.dataOrdem) return true;
    const delay = daysBetween(repasse.dataOrdem, movement.movementDate);
    return delay >= 0 && delay <= 30;
  });

  if (candidates.length === 1) {
    const credit = candidates[0];
    return {
      ...baseRepasse(school, repasse, account, 'CREDITO_CONFIRMADO'),
      bankCreditDate: credit.movementDate,
      bankCreditAmountCents: credit.amountCents,
      bankDocument: credit.document || null,
      daysAfterOrder: repasse.dataOrdem
        ? daysBetween(repasse.dataOrdem, credit.movementDate)
        : null,
    };
  }

  return baseRepasse(
    school,
    repasse,
    account,
    candidates.length > 1
      ? 'CREDITO_AMBIGUO'
      : 'PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE',
  );
}

export function buildMonitoringOperationalView(rawInput: unknown) {
  const input = rawMonitorSchema.parse(rawInput);
  const movements: OperationalMovement[] = [];

  for (const school of input.schools) {
    for (const accountResult of school.accounts) {
      for (const movement of accountResult.movements) {
        movements.push({
          id: movement.id,
          school: {
            inep: school.inep,
            sme: school.sme,
            name: school.name,
            cnpj: school.cnpj,
          },
          programCode: accountResult.programCode,
          programLabel: accountResult.programLabel,
          account: movement.account,
          movementDate: movement.movementDate,
          operation: movement.operation,
          amountCents: movement.amountCents,
          classification: refineOperationalMovementClass(
            movement.classification,
            movement.operation,
            movement.history,
          ),
          history: movement.history,
          document: movement.document,
          counterparty: movement.counterparty,
          sourceUrl: movement.sourceUrl,
        });
      }
    }
  }

  const creditIndex = makeCreditIndex(movements);
  const repasses: OperationalRepasse[] = input.schools.flatMap((school) => (
    school.repasses.map((repasse) => reconcileRepasse(
      school,
      repasse,
      school.accounts,
      creditIndex,
    ))
  ));

  const classificationCounts = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<SigefMovementClass, number>;
  const classificationAmountsCents = Object.fromEntries(
    CLASSIFICATIONS.map((classification) => [classification, 0]),
  ) as Record<SigefMovementClass, number>;
  for (const movement of movements) {
    classificationCounts[movement.classification] += 1;
    classificationAmountsCents[movement.classification] += movement.amountCents;
  }

  const repasseStatusCounts = Object.create(null) as Record<OperationalRepasseStatus, number>;
  const repasseStatusAmountsCents = Object.create(null) as Record<OperationalRepasseStatus, number>;
  for (const repasse of repasses) {
    repasseStatusCounts[repasse.bankCreditStatus] = (repasseStatusCounts[repasse.bankCreditStatus] ?? 0) + 1;
    repasseStatusAmountsCents[repasse.bankCreditStatus] = (
      repasseStatusAmountsCents[repasse.bankCreditStatus] ?? 0
    ) + repasse.amountPaidInformedCents;
  }

  const alerts: MonitoringAlert[] = [];
  for (const repasse of repasses) {
    if (
      repasse.bankCreditStatus === 'PAGO_SEM_CONTA_ATUAL'
      || repasse.bankCreditStatus === 'CREDITO_AMBIGUO'
      || repasse.bankCreditStatus === 'CONSULTA_INCONCLUSIVA'
    ) {
      alerts.push({
        kind: 'REPASSE',
        schoolInep: repasse.school.inep,
        schoolName: repasse.school.name,
        programCode: repasse.programCode,
        date: repasse.orderDate,
        amountCents: repasse.amountPaidInformedCents,
        message: repasse.bankCreditStatus,
        reference: null,
      });
    }
  }

  for (const movement of movements) {
    if (movement.classification === 'TARIFA_BANCARIA') {
      alerts.push({
        kind: 'TARIFA',
        schoolInep: movement.school.inep,
        schoolName: movement.school.name,
        programCode: movement.programCode,
        date: movement.movementDate,
        amountCents: movement.amountCents,
        message: 'Tarifa bancária detectada; verificar cabimento e eventual estorno.',
        reference: movement.document || null,
      });
    } else if (movement.classification === 'ENTRADA_TERCEIRO') {
      alerts.push({
        kind: 'ENTRADA_EXTERNA',
        schoolInep: movement.school.inep,
        schoolName: movement.school.name,
        programCode: movement.programCode,
        date: movement.movementDate,
        amountCents: movement.amountCents,
        message: 'Entrada externa à ordem bancária FNDE; verificar origem antes de qualquer conclusão.',
        reference: movement.counterparty.document,
      });
    } else if (movement.classification === 'MOVIMENTO_NAO_CLASSIFICADO') {
      alerts.push({
        kind: 'MOVIMENTO_REVISAR',
        schoolInep: movement.school.inep,
        schoolName: movement.school.name,
        programCode: movement.programCode,
        date: movement.movementDate,
        amountCents: movement.amountCents,
        message: `Histórico sem semântica suficiente para classificação automática: ${movement.history}`,
        reference: movement.document || null,
      });
    }
  }

  const confirmedDelays = repasses
    .filter((repasse) => repasse.bankCreditStatus === 'CREDITO_CONFIRMADO' && repasse.daysAfterOrder !== null)
    .map((repasse) => repasse.daysAfterOrder as number);

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceGeneratedAt: input.generatedAt,
    fiscalYear: input.fiscalYear,
    sourceStatus: input.status,
    sources: input.sources,
    sourceObservations: input.sourceObservations,
    coverage: input.coverage,
    summary: {
      schools: input.schools.length,
      repasses: repasses.length,
      movementsInFiscalYear: movements.length,
      repasseStatusCounts,
      repasseStatusAmountsCents,
      classificationCounts,
      classificationAmountsCents,
      confirmedCreditDelayDays: confirmedDelays.length > 0 ? {
        min: Math.min(...confirmedDelays),
        max: Math.max(...confirmedDelays),
      } : null,
      explicitYieldMovementsFound: classificationCounts.RENDIMENTO_FINANCEIRO,
    },
    repasses,
    movements: movements.sort((left, right) => (
      right.movementDate.localeCompare(left.movementDate)
      || left.school.inep.localeCompare(right.school.inep)
      || left.id.localeCompare(right.id)
    )),
    alerts,
  };
}
