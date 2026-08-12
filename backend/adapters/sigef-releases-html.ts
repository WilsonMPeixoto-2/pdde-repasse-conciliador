import { load, type CheerioAPI } from 'cheerio';
import { z } from 'zod';
import { canonicalCnpj, canonicalText } from '../core/normalization';
import { sigefReleaseSchema, sourceSnapshotSchema, type SigefRelease, type SourceSnapshot } from '../core/schemas';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const optionsSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  programCode: z.string().min(1),
  targetCnpjs: z.array(z.string().min(1)).min(1),
  sourceUrl: z.string().url(),
  timezoneOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/).default('-03:00'),
}).strict();

const REQUIRED_HEADERS = [
  'DATA DE PAGAMENTO',
  'ORDEM BANCARIA',
  'VALOR',
  'PROGRAMA',
  'BANCO',
  'AGENCIA',
  'CONTA CORRENTE',
] as const;

const MONTHS: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
};

interface ReleaseAction {
  programName: string;
  actionCode: string;
  installmentCode: string | null;
}

export interface SigefReleaseHtmlResult {
  query: {
    fiscalYear: number;
    programCode: string;
  };
  entity: {
    cnpj: string;
    name: string;
    state: string;
    city: string;
  };
  releases: SigefRelease[];
  source: SourceSnapshot;
  statistics: {
    releaseRows: number;
    tables: number;
  };
}

function decodeSource(source: Uint8Array | string): string {
  if (typeof source === 'string') return source;
  return new TextDecoder('windows-1252').decode(source);
}

function cellsInRow($: CheerioAPI, element: Parameters<CheerioAPI>[0]): string[] {
  return $(element).children('th,td').toArray().map((cell) => $(cell).text().replace(/\s+/g, ' ').trim());
}

function filterValue($: CheerioAPI, label: string): string {
  const wanted = canonicalText(label);
  for (const row of $('#filtros tr').toArray()) {
    const cells = cellsInRow($, row);
    for (let index = 0; index < cells.length; index += 1) {
      const current = canonicalText(cells[index]);
      if (current === wanted && cells[index + 1]) return cells[index + 1].trim();
      if (current.startsWith(`${wanted} `)) return cells[index].replace(/^[^:]+:\s*/, '').trim();
    }
  }
  throw new Error(`XLS de Liberações não contém o metadado ${label}.`);
}

function parseQueryTimestamp(value: string, timezoneOffset: string): { timestamp: string; date: string } {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Data da consulta inválida no XLS de Liberações: ${value}.`);
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  isoDate.parse(date);
  return { timestamp: `${date}T${match[4]}:${match[5]}:${match[6]}${timezoneOffset}`, date };
}

function parseReleaseDate(value: string, rowNumber: number): string {
  const match = value.trim().toUpperCase().match(/^(\d{2})\/([A-Z]{3})\/(\d{2}|\d{4})$/);
  if (!match) throw new Error(`Liberações linha ${rowNumber}: Data de Pagamento inválida: ${value}.`);
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const rawYear = Number(match[3]);
  const year = match[3].length === 2 ? 2000 + rawYear : rawYear;
  if (!month) throw new Error(`Liberações linha ${rowNumber}: mês desconhecido em ${value}.`);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`Liberações linha ${rowNumber}: data impossível em ${value}.`);
  }
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseBrazilianMoneyCents(value: string, rowNumber: number): number {
  const match = value.trim().match(/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!match) throw new Error(`Liberações linha ${rowNumber}: Valor inválido: ${value}.`);
  const cents = BigInt(match[1].replace(/\./g, '')) * 100n + BigInt(match[2]);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error(`Liberações linha ${rowNumber}: Valor excede o limite seguro.`);
  return Number(cents);
}

function normalizedInstallment(value: string): string | null {
  if (!value.trim()) return null;
  const digits = value.replace(/\D/g, '').replace(/^0+/, '');
  return digits || null;
}

function installmentFromProgram(program: string): string | null {
  const text = canonicalText(program);
  if (/\b(?:1|PRIMEIRA) PARC(?:ELA)?\b/.test(text)) return '1';
  if (/\b(?:2|SEGUNDA) PARC(?:ELA)?\b/.test(text)) return '2';
  if (/\bP1\b/.test(text)) return 'P1';
  return null;
}

function mapReleaseAction(programCode: string, rawProgram: string, explicitInstallment: string): ReleaseAction | null {
  const text = canonicalText(rawProgram);
  const describedInstallment = installmentFromProgram(rawProgram);
  const columnInstallment = normalizedInstallment(explicitInstallment);
  if (describedInstallment && columnInstallment && describedInstallment !== columnInstallment) {
    throw new Error(`Parcela divergente entre coluna e descrição do programa: ${rawProgram}.`);
  }
  const installmentCode = columnInstallment ?? describedInstallment;

  if (programCode === '02') {
    if (text.includes('PRIMEIRA INFANCIA')) {
      return { programName: 'PDDE', actionCode: 'PDDE_PRIMEIRA_INFANCIA', installmentCode: installmentCode ?? 'P1' };
    }
    if (text.includes('MANUTENCAO ESCOLAR') || text.includes('PDDE ED BASICA') || text.includes('PDDE BASICO')) {
      return { programName: 'PDDE', actionCode: 'PDDE_BASICO', installmentCode };
    }
  }
  if (programCode === '0B') {
    if (text.includes('EDUCACAO CONECTADA')) return { programName: 'PDDE Qualidade', actionCode: 'EDUCACAO_CONECTADA', installmentCode };
    if (text.includes('ESCOLA E COMUNIDADE')) return { programName: 'PDDE Qualidade', actionCode: 'ESCOLA_E_COMUNIDADE', installmentCode };
    if (text.includes('ESCOLA DAS ADOLESCENCIAS')) return { programName: 'PDDE Qualidade', actionCode: 'ESCOLA_DAS_ADOLESCENCIAS', installmentCode };
    if (text.includes('CANTINHO DA LEITURA')) return { programName: 'PDDE Qualidade', actionCode: 'CANTINHO_DA_LEITURA', installmentCode };
  }
  if (programCode === '0A' && (text.includes('PDDE SRM') || text.includes('SALA DE RECURSOS MULTIFUNCIONAIS'))) {
    return { programName: 'PDDE Equidade', actionCode: 'PDDE_SRM', installmentCode };
  }
  if (programCode === 'Z9' && text.includes('MAIS EDUCACAO')) {
    return { programName: 'PDDE Educação Integral', actionCode: 'PDDE_EDUCACAO_INTEGRAL', installmentCode };
  }
  return null;
}

function bankCode(rawBank: string, rowNumber: number): string {
  const bank = canonicalText(rawBank);
  if (bank === 'BANCO DO BRASIL') return '001';
  if (bank === 'CAIXA ECONOMICA FEDERAL') return '104';
  if (bank === 'BANCO DA AMAZONIA') return '003';
  if (bank === 'BANCO DO NORDESTE DO BRASIL') return '004';
  throw new Error(`Liberações linha ${rowNumber}: banco não mapeado: ${rawBank}.`);
}

function headerIndex(headers: string[], required: string): number {
  const index = headers.indexOf(required);
  if (index < 0) throw new Error(`XLS de Liberações não contém o cabeçalho obrigatório ${required.replace(/\b\w/g, (letter) => letter.toUpperCase())}.`);
  return index;
}

export function parseSigefReleaseHtml(
  source: Uint8Array | string,
  rawOptions: z.input<typeof optionsSchema>,
): SigefReleaseHtmlResult {
  const options = optionsSchema.parse(rawOptions);
  const programCode = options.programCode.trim().toUpperCase();
  const $ = load(decodeSource(source));
  const entityCnpj = canonicalCnpj(filterValue($, 'CNPJ'));
  const targets = new Set(options.targetCnpjs.map(canonicalCnpj));
  if (!targets.has(entityCnpj)) {
    throw new Error(`O CNPJ ${entityCnpj} do XLS de Liberações não pertence à relação autorizada.`);
  }
  const query = parseQueryTimestamp(filterValue($, 'Data da consulta'), options.timezoneOffset);
  const releases: SigefRelease[] = [];
  const tables = $('.listagem table').toArray();

  for (const table of tables) {
    const headers = $(table).find('thead th').toArray().map((header) => canonicalText($(header).text()));
    for (const required of REQUIRED_HEADERS) headerIndex(headers, required);
    const dateColumn = headerIndex(headers, 'DATA DE PAGAMENTO');
    const orderColumn = headerIndex(headers, 'ORDEM BANCARIA');
    const amountColumn = headerIndex(headers, 'VALOR');
    const installmentColumn = headers.indexOf('PARCELA');
    const programColumn = headerIndex(headers, 'PROGRAMA');
    const bankColumn = headerIndex(headers, 'BANCO');
    const agencyColumn = headerIndex(headers, 'AGENCIA');
    const accountColumn = headerIndex(headers, 'CONTA CORRENTE');

    const rows = $(table).find('tbody tr').toArray();
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const cells = cellsInRow($, rows[rowIndex]);
      const rowNumber = rowIndex + 2;
      if (cells.some((cell) => canonicalText(cell) === 'TOTAL')) continue;
      if (cells.every((cell) => !cell)) continue;
      const rawProgram = cells[programColumn] ?? '';
      const action = mapReleaseAction(programCode, rawProgram, installmentColumn >= 0 ? cells[installmentColumn] ?? '' : '');
      if (!action) throw new Error(`Liberações linha ${rowNumber}: programa não mapeado: ${rawProgram}.`);
      const amountCents = parseBrazilianMoneyCents(cells[amountColumn] ?? '', rowNumber);
      const paymentDate = parseReleaseDate(cells[dateColumn] ?? '', rowNumber);
      const orderBank = (cells[orderColumn] ?? '').trim();
      if (!orderBank) throw new Error(`Liberações linha ${rowNumber}: Ordem Bancária vazia.`);
      const installmentId = action.installmentCode ?? 'SEM_PARCELA';
      releases.push(sigefReleaseSchema.parse({
        id: `SIGEF_LIBERACOES:${entityCnpj}:${options.fiscalYear}:${action.actionCode}:${installmentId}:${orderBank}:${amountCents}`,
        schoolCnpj: entityCnpj,
        fiscalYear: options.fiscalYear,
        programCode,
        ...action,
        amountCents,
        paymentDate,
        orderBank,
        destinationAccount: {
          bank: bankCode(cells[bankColumn] ?? '', rowNumber),
          agency: (cells[agencyColumn] ?? '').trim(),
          number: (cells[accountColumn] ?? '').trim(),
        },
        sourceReference: {
          source: 'SIGEF_LIBERACOES',
          url: options.sourceUrl,
          rawProgram,
        },
      }));
    }
  }

  const sourceSnapshot = sourceSnapshotSchema.parse({
    source: 'SIGEF_LIBERACOES',
    status: 'available',
    queriedAt: query.timestamp,
    coverageThrough: query.date,
  });
  return {
    query: { fiscalYear: options.fiscalYear, programCode },
    entity: {
      cnpj: entityCnpj,
      name: filterValue($, 'Nome'),
      state: filterValue($, 'UF'),
      city: filterValue($, 'Município'),
    },
    releases,
    source: sourceSnapshot,
    statistics: { releaseRows: releases.length, tables: tables.length },
  };
}
