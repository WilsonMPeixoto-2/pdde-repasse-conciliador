import { z } from 'zod';
import { canonicalAccount, canonicalCnpj, canonicalText } from '../core/normalization';
import {
  pddePaymentSchema,
  sourceSnapshotSchema,
  type BankAccount,
  type PddePayment,
  type SourceSnapshot,
} from '../core/schemas';

const rawAccountSchema = z.object({
  programa: z.string(),
  banco: z.string(),
  agencia: z.string(),
  conta: z.string(),
  saldo: z.string(),
  ocorrencia: z.string(),
}).strict();

const rawFinanceSchema = z.object({
  destinacao: z.string(),
  devidoCusteio: z.string(),
  devidoCapital: z.string(),
  devidoTotal: z.string(),
  ajusteCusteio: z.string(),
  ajusteCapital: z.string(),
  ajusteTotal: z.string(),
  finalDevidoTotal: z.string(),
  pagoCusteio: z.string(),
  pagoCapital: z.string(),
  pagoTotal: z.string(),
  data: z.string(),
}).strict();

const rawSchoolSchema = z.object({
  inep: z.string().regex(/^\d{8}$/),
  sme: z.string().regex(/^\d{7}$/),
  nome: z.string().min(1),
  denominacaoFnde: z.string().min(1),
  uex: z.string().min(1),
  cnpj: z.string().min(1),
  accounts: z.array(rawAccountSchema),
  finance: z.array(rawFinanceSchema),
  source: z.string().url(),
  sourceIdentity: z.object({
    inep: z.string(),
    sme: z.string(),
    denominacao: z.string(),
  }).strict(),
}).strict();

const optionsSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  queriedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
}).strict();

type RawFinance = z.infer<typeof rawFinanceSchema>;
type RawSchool = z.infer<typeof rawSchoolSchema>;

interface DestinationMapping {
  programCode: string;
  programName: string;
  actionCode: string;
  actionName: string;
  installmentCode: string | null;
  installmentLabel: string | null;
}

export interface PddeInfoNormalizationResult {
  payments: PddePayment[];
  source: SourceSnapshot;
  statistics: {
    schools: number;
    financialRecords: number;
    paidRecords: number;
    missingProgramAccounts: number;
    ignoredZeroRecords: number;
  };
  warnings: string[];
}

function parseBrazilianMoneyCents(value: string, field: string, school: RawSchool): number {
  const normalized = value.trim();
  const match = normalized.match(/^(-)?(?:(\d{1,3}(?:\.\d{3})*)|(\d+)),(\d{2})$/);
  if (!match) {
    throw new Error(`${school.sme}: ${field} inválido no PDDEInfo: ${value || '(vazio)'}`);
  }
  const whole = (match[2] ?? match[3]).replace(/\./g, '');
  let cents = BigInt(whole) * 100n + BigInt(match[4]);
  if (match[1]) cents = -cents;
  if (cents > BigInt(Number.MAX_SAFE_INTEGER) || cents < BigInt(Number.MIN_SAFE_INTEGER)) {
    throw new Error(`${school.sme}: ${field} excede o limite seguro`);
  }
  return Number(cents);
}

function parseBrazilianDate(value: string, field: string, school: RawSchool): string | undefined {
  if (!value.trim()) return undefined;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`${school.sme}: ${field} inválida no PDDEInfo: ${value}`);
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${school.sme}: ${field} possui data impossível no PDDEInfo: ${value}`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function mapAccountProgram(rawProgram: string): string | null {
  const program = canonicalText(rawProgram);
  if (program === 'PDDE' || program === 'PDDE BASICO') return '02';
  if (program === 'PDDE QUALIDADE') return '0B';
  if (program === 'PDDE EQUIDADE') return '0A';
  if (program === 'PDDE EDUCACAO INTEGRAL') return 'Z9';
  return null;
}

function mapDestination(rawDestination: string): DestinationMapping | null {
  const destination = canonicalText(rawDestination);
  if (destination === 'PDDE PDDE BASICO 1 PARCELA') {
    return {
      programCode: '02', programName: 'PDDE', actionCode: 'PDDE_BASICO',
      actionName: 'PDDE Básico', installmentCode: '1', installmentLabel: '1ª Parcela',
    };
  }
  if (destination === 'PDDE PDDE BASICO 2 PARCELA') {
    return {
      programCode: '02', programName: 'PDDE', actionCode: 'PDDE_BASICO',
      actionName: 'PDDE Básico', installmentCode: '2', installmentLabel: '2ª Parcela',
    };
  }
  if (destination === 'PDDE PDDE BASICO PRIMEIRA INFANCIA P1') {
    return {
      programCode: '02', programName: 'PDDE', actionCode: 'PDDE_PRIMEIRA_INFANCIA',
      actionName: 'PDDE Básico — Primeira Infância', installmentCode: 'P1', installmentLabel: 'P1',
    };
  }
  if (destination === 'PDDE QUALIDADE EDUCACAO CONECTADA 2026') {
    return {
      programCode: '0B', programName: 'PDDE Qualidade', actionCode: 'EDUCACAO_CONECTADA',
      actionName: 'Educação Conectada', installmentCode: null, installmentLabel: null,
    };
  }
  if (destination === 'PDDE QUALIDADE ESCOLA E COMUNIDADE 2026') {
    return {
      programCode: '0B', programName: 'PDDE Qualidade', actionCode: 'ESCOLA_E_COMUNIDADE',
      actionName: 'Escola e Comunidade', installmentCode: null, installmentLabel: null,
    };
  }
  if (destination === 'PDDE QUALIDADE ESCOLA DAS ADOLESCENCIAS 2026') {
    return {
      programCode: '0B', programName: 'PDDE Qualidade', actionCode: 'ESCOLA_DAS_ADOLESCENCIAS',
      actionName: 'Escola das Adolescências', installmentCode: null, installmentLabel: null,
    };
  }
  if (/^PDDE QUALIDADE CANTINHO DA LEITURA ?2026$/.test(destination)) {
    return {
      programCode: '0B', programName: 'PDDE Qualidade', actionCode: 'CANTINHO_DA_LEITURA',
      actionName: 'Cantinho da Leitura', installmentCode: null, installmentLabel: null,
    };
  }
  if (destination === 'PDDE EQUIDADE PDDE SRM 2026') {
    return {
      programCode: '0A', programName: 'PDDE Equidade', actionCode: 'PDDE_SRM',
      actionName: 'PDDE SRM', installmentCode: null, installmentLabel: null,
    };
  }
  return null;
}

function selectAccounts(school: RawSchool, warnings: string[]): Map<string, BankAccount> {
  const candidates = new Map<string, BankAccount[]>();
  for (const raw of school.accounts) {
    const programCode = mapAccountProgram(raw.programa);
    if (!programCode) {
      if (raw.agencia || raw.conta) warnings.push(`${school.sme}: programa bancário não mapeado — ${raw.programa}.`);
      continue;
    }
    if (Boolean(raw.agencia) !== Boolean(raw.conta)) {
      throw new Error(`${school.sme}: agência/conta parcial em ${raw.programa}.`);
    }
    if (!raw.agencia && !raw.conta) continue;
    if (!raw.banco) throw new Error(`${school.sme}: banco ausente em ${raw.programa}.`);
    const account = { bank: raw.banco.trim(), agency: raw.agencia.trim(), number: raw.conta.trim() };
    const bucket = candidates.get(programCode) ?? [];
    bucket.push(account);
    candidates.set(programCode, bucket);
  }

  const selected = new Map<string, BankAccount>();
  for (const [programCode, accounts] of candidates) {
    const distinct = new Map(accounts.map((account) => [canonicalAccount(account), account]));
    if (distinct.size > 1) {
      throw new Error(`${school.sme}: o PDDEInfo informou mais de uma conta para o programa ${programCode}; nenhuma foi presumida.`);
    }
    const account = distinct.values().next().value as BankAccount | undefined;
    if (account) selected.set(programCode, account);
  }
  return selected;
}

function validateFinancialComponents(finance: RawFinance, school: RawSchool) {
  const dueCusteio = parseBrazilianMoneyCents(finance.devidoCusteio, 'devidoCusteio', school);
  const dueCapital = parseBrazilianMoneyCents(finance.devidoCapital, 'devidoCapital', school);
  const dueTotal = parseBrazilianMoneyCents(finance.devidoTotal, 'devidoTotal', school);
  const adjustmentCusteio = parseBrazilianMoneyCents(finance.ajusteCusteio, 'ajusteCusteio', school);
  const adjustmentCapital = parseBrazilianMoneyCents(finance.ajusteCapital, 'ajusteCapital', school);
  const adjustmentTotal = parseBrazilianMoneyCents(finance.ajusteTotal, 'ajusteTotal', school);
  const finalDueTotal = parseBrazilianMoneyCents(finance.finalDevidoTotal, 'finalDevidoTotal', school);
  const paidCusteio = parseBrazilianMoneyCents(finance.pagoCusteio, 'pagoCusteio', school);
  const paidCapital = parseBrazilianMoneyCents(finance.pagoCapital, 'pagoCapital', school);
  const paidTotal = parseBrazilianMoneyCents(finance.pagoTotal, 'pagoTotal', school);

  if (dueCusteio + dueCapital !== dueTotal) {
    throw new Error(`${school.sme}: devidoTotal não corresponde aos componentes em ${finance.destinacao}.`);
  }
  if (adjustmentCusteio + adjustmentCapital !== adjustmentTotal) {
    throw new Error(`${school.sme}: ajusteTotal não corresponde aos componentes em ${finance.destinacao}.`);
  }
  if (paidCusteio + paidCapital !== paidTotal) {
    throw new Error(`${school.sme}: pagoTotal não corresponde aos componentes em ${finance.destinacao}.`);
  }
  if (finalDueTotal !== dueTotal + adjustmentTotal && finalDueTotal !== dueTotal - adjustmentTotal) {
    throw new Error(`${school.sme}: finalDevidoTotal não corresponde ao devido e ao ajuste em ${finance.destinacao}.`);
  }
  if (dueTotal < 0 || finalDueTotal < 0 || paidTotal < 0) {
    throw new Error(`${school.sme}: total financeiro negativo em ${finance.destinacao}.`);
  }
  return {
    amountOriginalDueCents: dueTotal,
    adjustmentCents: finalDueTotal - dueTotal,
    amountFinalDueCents: finalDueTotal,
    amountPaidCents: paidTotal,
  };
}

function isRelevantUnknown(finance: RawFinance, school: RawSchool): boolean {
  const fields: Array<[string, string]> = [
    ['devidoTotal', finance.devidoTotal],
    ['ajusteTotal', finance.ajusteTotal],
    ['finalDevidoTotal', finance.finalDevidoTotal],
    ['pagoTotal', finance.pagoTotal],
  ];
  return fields.some(([field, value]) => parseBrazilianMoneyCents(value, field, school) !== 0)
    || Boolean(finance.data.trim());
}

export function normalizePddeInfoSchools(
  rawSchools: unknown[],
  rawOptions: z.input<typeof optionsSchema>,
): PddeInfoNormalizationResult {
  const options = optionsSchema.parse(rawOptions);
  const schools = z.array(rawSchoolSchema).parse(rawSchools);
  const warnings: string[] = [];
  const payments: PddePayment[] = [];
  const missingAccounts = new Set<string>();
  let ignoredZeroRecords = 0;

  for (const school of schools) {
    if (school.sourceIdentity.inep !== school.inep || school.sourceIdentity.sme !== school.sme) {
      throw new Error(`${school.sme}: a identidade retornada pelo PDDEInfo diverge da unidade consultada.`);
    }
    const cnpj = canonicalCnpj(school.cnpj);
    if (!/^\d{14}$/.test(cnpj)) throw new Error(`${school.sme}: CNPJ da UEx inválido: ${school.cnpj}.`);
    const accounts = selectAccounts(school, warnings);

    for (const finance of school.finance) {
      const mapping = mapDestination(finance.destinacao);
      if (!mapping) {
        if (isRelevantUnknown(finance, school)) {
          throw new Error(`${school.sme}: destinação financeira não mapeada — ${finance.destinacao}.`);
        }
        ignoredZeroRecords += 1;
        warnings.push(`${school.sme}: destinação zerada não mapeada — ${finance.destinacao}.`);
        continue;
      }
      const amounts = validateFinancialComponents(finance, school);
      const account = accounts.get(mapping.programCode);
      if (!account) missingAccounts.add(`${school.inep}:${mapping.programCode}`);
      const installmentId = mapping.installmentCode ?? 'SEM_PARCELA';
      payments.push(pddePaymentSchema.parse({
        id: `PDDEINFO:${school.inep}:${options.fiscalYear}:${mapping.actionCode}:${installmentId}`,
        school: {
          inep: school.inep,
          sme: school.sme,
          name: school.nome,
          uex: school.uex,
          cnpj,
        },
        fiscalYear: options.fiscalYear,
        ...mapping,
        ...amounts,
        ...(finance.data ? { paymentDate: parseBrazilianDate(finance.data, 'data de pagamento', school) } : {}),
        ...(account ? { account } : {}),
        sourceReference: {
          source: 'PDDEINFO',
          url: school.source,
          rawDestination: finance.destinacao,
        },
      }));
    }
  }

  const source = sourceSnapshotSchema.parse({
    source: 'PDDEINFO',
    status: 'available',
    queriedAt: options.queriedAt,
    coverageThrough: options.queriedAt.slice(0, 10),
  });
  return {
    payments,
    source,
    statistics: {
      schools: schools.length,
      financialRecords: payments.length,
      paidRecords: payments.filter((payment) => payment.amountPaidCents > 0).length,
      missingProgramAccounts: missingAccounts.size,
      ignoredZeroRecords,
    },
    warnings,
  };
}
