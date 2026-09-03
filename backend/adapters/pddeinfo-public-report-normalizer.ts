import { z } from 'zod';
import { sumMoneyCents } from '../core/money';
import { isoDateSchema } from '../core/schemas';

const cnpjSchema = z.string().regex(/^\d{14}$/);
const inepSchema = z.string().regex(/^\d{8}$/);

export interface PddeInfoAttendanceObservation {
  fiscalYear: 2026;
  schoolInep: string;
  uexCnpj: string;
  schoolName: string;
  programName: string;
  destination: string;
  studentCount: number | null;
  costCents: number;
  capitalCents: number;
  totalCents: number;
  paymentOrderDate: string;
}

export interface PddeInfoBalanceObservation {
  coverageThrough: string;
  uexCnpj: string;
  bank: string;
  agency: string;
  account: string;
  programName: string;
  checkingBalanceCents: number;
  fundBalanceCents: number;
  savingsBalanceCents: number;
  rdbCdbBalanceCents: number;
  investmentBalanceCents: number;
  totalReportedBalanceCents: number;
}

export interface PddeInfoAccountingObservation {
  fiscalYear: 2026;
  programName: string;
  schoolInep: string;
  uexCnpj: string;
  accountingStatus: string;
  paymentSuspended: boolean;
  expectedTotalCents: number;
}

export interface PddeInfoRegistrationObservation {
  fiscalYear: 2026;
  schoolInep: string;
  schoolName: string;
  location: string | null;
  uexCnpj: string | null;
  uexName: string | null;
  network: string | null;
  mandateStatus: string | null;
  mandateEndDate: string | null;
  updatedDate: string | null;
  updatedTime: string | null;
  phone: string | null;
}

export interface PddeInfoAccountOpeningObservation {
  fiscalYear: 2026;
  schoolInep: string;
  uexCnpj: string | null;
  programName: string | null;
  bank: string | null;
  agency: string | null;
  account: string | null;
  status: string;
}

export interface PddeInfoSuspensionObservation {
  fiscalYear: 2026;
  schoolInep: string;
  uexCnpj: string | null;
  programName: string | null;
  destination: string | null;
  suspensionType: string;
  detail: string | null;
}


function canonicalHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim();
}

function valueByHeader(
  row: Record<string, string>,
  candidates: readonly string[],
): string | null {
  const wanted = candidates.map(canonicalHeader);
  for (const [key, value] of Object.entries(row)) {
    const normalized = canonicalHeader(key);
    if (wanted.some((candidate) => normalized === candidate || normalized.includes(candidate))) {
      const cleaned = value.trim();
      return cleaned || null;
    }
  }
  return null;
}

function digitsOrNull(value: string | null, length: number): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length === length ? digits : null;
}

function optionalBrazilianDate(value: string | null): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  return isoDateSchema.parse(`${match[3]}-${match[2]}-${match[1]}`);
}

function rowFiscalYear(row: Record<string, string>): 2026 {
  const raw = valueByHeader(row, ['Ano']);
  if (raw && Number(raw) !== 2026) throw new Error(`Relatório público fora do exercício 2026: ${raw}.`);
  return 2026;
}

function required(row: Record<string, string>, key: string): string {
  const value = row[key]?.trim();
  if (!value) throw new Error(`Relatório público PDDEInfo sem campo obrigatório: ${key}.`);
  return value;
}

export function parseBrazilianMoneyCents(value: string): number {
  const normalized = value.trim();
  if (!/^-?\d{1,3}(?:\.\d{3})*,\d{2}$|^-?\d+,\d{2}$/.test(normalized)) {
    throw new Error(`Valor monetário brasileiro inválido: ${value}.`);
  }
  const negative = normalized.startsWith('-');
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [integerPart, fractionPart] = unsigned.split(',');
  const units = BigInt(integerPart.replace(/\./g, ''));
  const cents = units * 100n + BigInt(fractionPart);
  const signed = negative ? -cents : cents;
  const number = Number(signed);
  if (!Number.isSafeInteger(number)) throw new RangeError(`Valor monetário fora da faixa segura: ${value}.`);
  return number;
}

function brazilianDateToIso(value: string): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`Data brasileira inválida: ${value}.`);
  return isoDateSchema.parse(`${match[3]}-${match[2]}-${match[1]}`);
}

export function normalizeAttendanceRow(row: Record<string, string>): PddeInfoAttendanceObservation {
  const fiscalYear = Number(required(row, 'Ano'));
  if (fiscalYear !== 2026) throw new Error(`Atendimento fora do exercício 2026: ${fiscalYear}.`);
  const costCents = parseBrazilianMoneyCents(required(row, 'Valor Custeio'));
  const capitalCents = parseBrazilianMoneyCents(required(row, 'Valor Capital'));
  const totalCents = parseBrazilianMoneyCents(required(row, 'Valor Total'));
  if (sumMoneyCents([costCents, capitalCents], 'total do atendimento') !== totalCents) {
    throw new Error('Relatório de atendimento contém total diferente de custeio + capital.');
  }
  return {
    fiscalYear: 2026,
    schoolInep: inepSchema.parse(required(row, 'Código Escola').replace(/\D/g, '')),
    uexCnpj: cnpjSchema.parse(required(row, 'CNPJ Executora').replace(/\D/g, '')),
    schoolName: required(row, 'Nome Escola'),
    programName: required(row, 'Programa'),
    destination: required(row, 'Destinação'),
    studentCount: (() => {
      const raw = valueByHeader(row, ['Quantidade Alunos']);
      if (!raw) return null;
      const value = Number(raw.replace(/\D/g, ''));
      return Number.isSafeInteger(value) && value >= 0 ? value : null;
    })(),
    costCents,
    capitalCents,
    totalCents,
    paymentOrderDate: brazilianDateToIso(required(row, 'Data da Ord. de Pagamento')),
  };
}

export function normalizeBalanceRow(
  row: Record<string, string>,
  coverageThrough: string,
): PddeInfoBalanceObservation {
  const coverage = isoDateSchema.parse(coverageThrough);
  if (!coverage.startsWith('2026-')) throw new Error(`Saldo fora da cobertura 2026: ${coverage}.`);
  const checkingBalanceCents = parseBrazilianMoneyCents(required(row, 'Saldo Conta'));
  const fundBalanceCents = parseBrazilianMoneyCents(required(row, 'Saldo Fundos'));
  const savingsBalanceCents = parseBrazilianMoneyCents(required(row, 'Saldo Poupança'));
  const rdbCdbBalanceCents = parseBrazilianMoneyCents(required(row, 'Saldo RDB/CDB'));
  const investmentBalanceCents = sumMoneyCents(
    [fundBalanceCents, savingsBalanceCents, rdbCdbBalanceCents],
    'saldo total aplicado',
  );
  return {
    coverageThrough: coverage,
    uexCnpj: cnpjSchema.parse(required(row, 'CNPJ').replace(/\D/g, '')),
    bank: required(row, 'Banco'),
    agency: required(row, 'Agência'),
    account: required(row, 'Conta'),
    programName: required(row, 'Descrição Programa FNDE'),
    checkingBalanceCents,
    fundBalanceCents,
    savingsBalanceCents,
    rdbCdbBalanceCents,
    investmentBalanceCents,
    totalReportedBalanceCents: sumMoneyCents(
      [checkingBalanceCents, investmentBalanceCents],
      'saldo total informado',
    ),
  };
}

export function normalizeAccountingRow(row: Record<string, string>): PddeInfoAccountingObservation {
  const fiscalYear = Number(required(row, 'Ano'));
  if (fiscalYear !== 2026) throw new Error(`Prestação de contas fora do exercício 2026: ${fiscalYear}.`);
  const suspension = required(row, 'Suspensão de Pagamento UEx').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (!['SIM', 'NAO'].includes(suspension)) throw new Error(`Situação de suspensão desconhecida: ${suspension}.`);
  return {
    fiscalYear: 2026,
    programName: required(row, 'Programa'),
    schoolInep: inepSchema.parse(required(row, 'Código da Escola').replace(/\D/g, '')),
    uexCnpj: cnpjSchema.parse(required(row, 'CNPJ da Executora').replace(/\D/g, '')),
    accountingStatus: required(row, 'Situação Prestação de Contas UEx'),
    paymentSuspended: suspension === 'SIM',
    expectedTotalCents: parseBrazilianMoneyCents(required(row, 'Valor Total Previsto')),
  };
}


export function normalizeRegistrationRow(row: Record<string, string>): PddeInfoRegistrationObservation {
  rowFiscalYear(row);
  const schoolInep = digitsOrNull(valueByHeader(row, ['Código Escola', 'Código INEP']), 8);
  if (!schoolInep) throw new Error('Relatório cadastral sem Código Escola válido.');
  return {
    fiscalYear: 2026,
    schoolInep,
    schoolName: valueByHeader(row, ['Escola', 'Nome Escola']) ?? schoolInep,
    location: valueByHeader(row, ['Localização']),
    uexCnpj: digitsOrNull(valueByHeader(row, ['CNPJ UEX', 'CNPJ Executora']), 14),
    uexName: valueByHeader(row, ['Razão Social', 'Nome Executora']),
    network: valueByHeader(row, ['Rede de Atendimento']),
    mandateStatus: valueByHeader(row, ['Mandato Dirigente']),
    mandateEndDate: optionalBrazilianDate(valueByHeader(row, ['Data Fim do Mandato'])),
    updatedDate: optionalBrazilianDate(valueByHeader(row, ['Data Atualização'])),
    updatedTime: valueByHeader(row, ['Hora Atualização']),
    phone: (() => {
      const ddd = valueByHeader(row, ['DDD']);
      const phone = valueByHeader(row, ['Telefone']);
      return phone ? [ddd, phone].filter(Boolean).join(' ') : null;
    })(),
  };
}

export function normalizeAccountOpeningRow(row: Record<string, string>): PddeInfoAccountOpeningObservation {
  rowFiscalYear(row);
  const schoolInep = digitsOrNull(valueByHeader(row, ['Código Escola', 'Código INEP']), 8);
  if (!schoolInep) throw new Error('Relatório de abertura de conta sem Código Escola válido.');
  const status = valueByHeader(row, ['Situação']);
  if (!status) throw new Error('Relatório de abertura de conta sem coluna Situação.');
  return {
    fiscalYear: 2026,
    schoolInep,
    uexCnpj: digitsOrNull(valueByHeader(row, ['CNPJ UEX', 'CNPJ Executora', 'CNPJ']), 14),
    programName: valueByHeader(row, ['Programa']),
    bank: valueByHeader(row, ['Banco']),
    agency: valueByHeader(row, ['Agência']),
    account: valueByHeader(row, ['Conta']),
    status,
  };
}

export function normalizeSuspensionRow(row: Record<string, string>): PddeInfoSuspensionObservation {
  rowFiscalYear(row);
  const schoolInep = digitsOrNull(valueByHeader(row, ['Código Escola', 'Código INEP']), 8);
  if (!schoolInep) throw new Error('Relatório de suspensão sem Código Escola válido.');
  const suspensionType = valueByHeader(row, ['Tipo de Suspensão', 'Suspensão', 'Motivo Suspensão', 'Motivo']);
  if (!suspensionType) throw new Error('Relatório de suspensão sem motivo/tipo identificável.');
  return {
    fiscalYear: 2026,
    schoolInep,
    uexCnpj: digitsOrNull(valueByHeader(row, ['CNPJ UEX', 'CNPJ Executora', 'CNPJ']), 14),
    programName: valueByHeader(row, ['Programa']),
    destination: valueByHeader(row, ['Destinação']),
    suspensionType,
    detail: valueByHeader(row, ['Descrição', 'Detalhe', 'Orientação']),
  };
}
