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
