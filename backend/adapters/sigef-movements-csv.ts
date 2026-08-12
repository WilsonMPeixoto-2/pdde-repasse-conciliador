import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { parse } from 'csv-parse';
import { z } from 'zod';
import { canonicalCnpj, canonicalProgramCode } from '../core/normalization';
import { sigefMovementSchema, type SigefMovement, type SourceSnapshot } from '../core/schemas';

const REQUIRED_HEADERS = [
  'OPERACAO',
  'CO_PROGRAMA_FNDE',
  'NO_PROGRAMA_FNDE',
  'NU_BANCO',
  'NU_AGENCIA',
  'NU_CONTA_CORRENTE',
  'DT_EXTRACAO',
  'DT_MOVIMENTO',
  'NU_SEQ_CONTA_CORRENTE',
  'VL_MOVIMENTO',
  'NU_CNPJ',
  'NU_DOCUMENTO',
  'DS_HISTORICO',
] as const;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(
  (value) => Number.isFinite(Date.parse(`${value}T00:00:00Z`)),
  'data ISO inválida',
);

const optionsSchema = z.object({
  targetCnpjs: z.array(z.string().min(1)).min(1),
  programCodes: z.array(z.string().min(1)).optional(),
  queriedAt: z.string().refine((value) => Number.isFinite(Date.parse(value))),
  requestedThrough: isoDate,
}).strict();

type RawRecord = Record<string, string>;

export interface SigefMovementCsvStatistics {
  rowsRead: number;
  eligibleProgramRows: number;
  targetRows: number;
  creditRows: number;
  debitRows: number;
  requestedThrough: string;
  coverageLagDays: number | null;
}

export interface SigefMovementCsvResult {
  movements: SigefMovement[];
  source: SourceSnapshot;
  statistics: SigefMovementCsvStatistics;
}

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEB: 2,
  MAR: 3,
  APR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AUG: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DEC: 12,
};

function parseSigefDate(value: string, field: string, rowNumber: number): string {
  const match = value.trim().toUpperCase().match(/^(\d{2})-([A-Z]{3})-(\d{2}|\d{4})$/);
  if (!match) throw new Error(`SIGEF linha ${rowNumber}: ${field} inválido: ${value || '(vazio)'}`);
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const rawYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
  if (!month) throw new Error(`SIGEF linha ${rowNumber}: ${field} possui mês desconhecido: ${value}`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`SIGEF linha ${rowNumber}: ${field} possui data impossível: ${value}`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseMoneyCents(value: string, field: string, rowNumber: number): number {
  const normalized = value.trim();
  const match = normalized.match(/^(?:(\d+)(?:\.(\d{1,2}))?|\.(\d{1,2}))$/);
  if (!match) throw new Error(`SIGEF linha ${rowNumber}: ${field} inválido: ${value || '(vazio)'}`);
  const whole = match[1] ?? '0';
  const decimal = match[2] ?? match[3] ?? '';
  const cents = BigInt(whole) * 100n + BigInt(decimal.padEnd(2, '0') || '0');
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error(`SIGEF linha ${rowNumber}: ${field} excede o limite seguro`);
  }
  return Number(cents);
}

function differenceInDays(later: string, earlier: string): number {
  const laterMs = Date.parse(`${later}T00:00:00Z`);
  const earlierMs = Date.parse(`${earlier}T00:00:00Z`);
  return Math.max(0, Math.round((laterMs - earlierMs) / 86_400_000));
}

function validateHeaders(rawHeaders: string[]): string[] {
  const headers = rawHeaders.map((header) => header.trim());
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length) {
    throw new Error(`CSV do SIGEF possui cabeçalho duplicado: ${[...new Set(duplicates)].join(', ')}`);
  }
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) {
    throw new Error(`CSV do SIGEF não contém cabeçalhos obrigatórios: ${missing.join(', ')}`);
  }
  return headers;
}

function stableMovementId(record: RawRecord, movementDate: string, amountCents: number): string {
  return [
    'SIGEF',
    record.CO_PROGRAMA_FNDE,
    record.NU_CNPJ,
    record.NU_SEQ_CONTA_CORRENTE,
    movementDate,
    record.OPERACAO,
    record.NU_DOCUMENTO,
    amountCents,
  ].map((value) => String(value).trim()).join(':');
}

export async function parseSigefMovementCsv(
  source: AsyncIterable<Uint8Array | string>,
  rawOptions: z.input<typeof optionsSchema>,
): Promise<SigefMovementCsvResult> {
  const options = optionsSchema.parse(rawOptions);
  const targets = new Set(options.targetCnpjs.map(canonicalCnpj));
  const programs = options.programCodes
    ? new Set(options.programCodes.map(canonicalProgramCode))
    : null;

  const parser = parse({
    bom: true,
    columns: validateHeaders,
    delimiter: ';',
    encoding: 'utf8',
    relax_column_count: false,
    skip_empty_lines: true,
  });
  const completion = pipeline(Readable.from(source), parser);

  const movements: SigefMovement[] = [];
  let rowsRead = 0;
  let eligibleProgramRows = 0;
  let targetRows = 0;
  let creditRows = 0;
  let debitRows = 0;
  let coverageThrough: string | undefined;

  try {
    for await (const raw of parser) {
      rowsRead += 1;
      const rowNumber = rowsRead + 1;
      const record = raw as RawRecord;
      const programCode = canonicalProgramCode(record.CO_PROGRAMA_FNDE ?? '');
      if (programs && !programs.has(programCode)) continue;
      eligibleProgramRows += 1;

      const movementDate = parseSigefDate(record.DT_MOVIMENTO ?? '', 'DT_MOVIMENTO', rowNumber);
      if (!coverageThrough || movementDate > coverageThrough) coverageThrough = movementDate;

      const cnpj = canonicalCnpj(record.NU_CNPJ ?? '');
      if (!targets.has(cnpj)) continue;
      targetRows += 1;

      const operation = record.OPERACAO?.trim().toUpperCase();
      if (operation !== 'C' && operation !== 'D') {
        throw new Error(`SIGEF linha ${rowNumber}: OPERACAO inválida: ${record.OPERACAO || '(vazio)'}`);
      }
      const normalizedOperation = operation === 'C' ? 'credit' : 'debit';
      if (normalizedOperation === 'credit') creditRows += 1;
      else debitRows += 1;

      const amountCents = parseMoneyCents(record.VL_MOVIMENTO ?? '', 'VL_MOVIMENTO', rowNumber);
      const movement = sigefMovementSchema.parse({
        id: stableMovementId(record, movementDate, amountCents),
        schoolCnpj: cnpj,
        programCode,
        operation: normalizedOperation,
        amountCents,
        movementDate,
        account: {
          bank: String(record.NU_BANCO ?? '').trim(),
          agency: String(record.NU_AGENCIA ?? '').trim(),
          number: String(record.NU_CONTA_CORRENTE ?? '').trim(),
        },
        document: String(record.NU_DOCUMENTO ?? '').trim(),
        history: String(record.DS_HISTORICO ?? '').trim(),
      });
      movements.push(movement);
    }
    await completion;
  } catch (error) {
    parser.destroy();
    await completion.catch(() => undefined);
    throw error;
  }

  const coverageLagDays = coverageThrough
    ? differenceInDays(options.requestedThrough, coverageThrough)
    : null;
  const sourceSnapshot: SourceSnapshot = {
    source: 'SIGEF_MOVIMENTACOES',
    status: 'available',
    queriedAt: options.queriedAt,
    ...(coverageThrough ? { coverageThrough } : {}),
    ...(coverageLagDays && coverageLagDays > 0
      ? { detail: `Arquivo solicitado até ${options.requestedThrough}, com movimentos observados até ${coverageThrough}.` }
      : {}),
  };

  return {
    movements,
    source: sourceSnapshot,
    statistics: {
      rowsRead,
      eligibleProgramRows,
      targetRows,
      creditRows,
      debitRows,
      requestedThrough: options.requestedThrough,
      coverageLagDays,
    },
  };
}
