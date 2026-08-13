import { load, type CheerioAPI } from 'cheerio';
import { z } from 'zod';
import { canonicalText, digits } from '../core/normalization';

const optionsSchema = z.object({
  fiscalYear: z.number().int().min(2000).max(2100),
  timezoneOffset: z.string().regex(/^[+-]\d{2}:\d{2}$/).default('-03:00'),
}).strict();

export type SupportedReleaseProgramCode = '02' | '0A' | '0B' | 'Z9';

export interface ReleaseInspection {
  cnpj: string;
  programCode: SupportedReleaseProgramCode;
  query: {
    timestamp: string;
    date: string;
  };
  fiscalYear: {
    requested: number;
    verified: boolean;
    evidence: number[];
  };
  rawPrograms: string[];
  filterProgram: string | null;
}

function decodeSource(source: Uint8Array | string): string {
  if (typeof source === 'string') return source;
  return new TextDecoder('windows-1252').decode(source);
}

function cellsInRow($: CheerioAPI, element: Parameters<CheerioAPI>[0]): string[] {
  return $(element).children('th,td').toArray().map(
    (cell) => $(cell).text().replace(/\s+/g, ' ').trim(),
  );
}

function optionalFilterValue($: CheerioAPI, label: string): string | null {
  const wanted = canonicalText(label);
  for (const row of $('#filtros tr').toArray()) {
    const cells = cellsInRow($, row);
    for (let index = 0; index < cells.length; index += 1) {
      const current = canonicalText(cells[index]);
      if (current === wanted && cells[index + 1]) return cells[index + 1].trim();
      if (current.startsWith(`${wanted} `)) {
        const value = cells[index].replace(/^[^:]+:\s*/, '').trim();
        if (value) return value;
      }
    }
  }
  return null;
}

function requiredFilterValue($: CheerioAPI, label: string): string {
  const value = optionalFilterValue($, label);
  if (!value) throw new Error(`XLS de Liberações não contém o metadado ${label}.`);
  return value;
}

function parseQueryTimestamp(value: string, timezoneOffset: string): { timestamp: string; date: string } {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
  if (!match) throw new Error(`Data da consulta inválida no XLS de Liberações: ${value}.`);
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  const parsed = new Date(`${date}T${match[4]}:${match[5]}:${match[6]}${timezoneOffset}`);
  if (!Number.isFinite(parsed.getTime())) throw new Error(`Data da consulta impossível no XLS de Liberações: ${value}.`);
  return { timestamp: `${date}T${match[4]}:${match[5]}:${match[6]}${timezoneOffset}`, date };
}

function programCodeFromText(raw: string): SupportedReleaseProgramCode | null {
  const text = canonicalText(raw);
  if (!text) return null;
  if (
    text.includes('EDUCACAO CONECTADA')
    || text.includes('ESCOLA E COMUNIDADE')
    || text.includes('ESCOLA DAS ADOLESCENCIAS')
    || text.includes('CANTINHO DA LEITURA')
    || text.includes('PDDE QUALIDADE')
  ) return '0B';
  if (
    text.includes('PDDE SRM')
    || text.includes('SALA DE RECURSOS MULTIFUNCIONAIS')
    || text.includes('PDDE EQUIDADE')
  ) return '0A';
  if (
    text.includes('MAIS EDUCACAO')
    || text.includes('PDDE EDUCACAO INTEGRAL')
    || text.includes('EDUCACAO INTEGRAL')
  ) return 'Z9';
  if (
    text.includes('PRIMEIRA INFANCIA')
    || text.includes('MANUTENCAO ESCOLAR')
    || text.includes('PDDE ED BASICA')
    || text.includes('PDDE BASICO')
    || text === 'PDDE'
    || text.includes('PROGRAMA DINHEIRO DIRETO NA ESCOLA')
  ) return '02';
  return null;
}

function releaseRows($: CheerioAPI): Array<{ rawProgram: string; rawDate: string }> {
  const result: Array<{ rawProgram: string; rawDate: string }> = [];
  for (const table of $('.listagem table').toArray()) {
    const headers = $(table).find('thead th').toArray().map((header) => canonicalText($(header).text()));
    const programColumn = headers.indexOf('PROGRAMA');
    const dateColumn = headers.indexOf('DATA DE PAGAMENTO');
    if (programColumn < 0 || dateColumn < 0) continue;
    for (const row of $(table).find('tbody tr').toArray()) {
      const cells = cellsInRow($, row);
      if (cells.some((cell) => canonicalText(cell) === 'TOTAL')) continue;
      if (cells.every((cell) => !cell)) continue;
      result.push({
        rawProgram: cells[programColumn] ?? '',
        rawDate: cells[dateColumn] ?? '',
      });
    }
  }
  return result;
}

function yearFromReleaseDate(value: string): number | null {
  const match = value.trim().toUpperCase().match(/^\d{2}\/[A-Z]{3}\/(\d{2}|\d{4})$/);
  if (!match) return null;
  const year = Number(match[1]);
  return match[1].length === 2 ? 2000 + year : year;
}

function yearsFromText(value: string): number[] {
  return [...value.matchAll(/\b(20\d{2})\b/g)].map((match) => Number(match[1]));
}

function explicitFilterYear($: CheerioAPI): number | null {
  for (const label of ['Exercício', 'Exercicio', 'Ano']) {
    const value = optionalFilterValue($, label);
    if (!value) continue;
    const match = value.match(/\b(20\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function inspectSigefReleaseHtml(
  source: Uint8Array | string,
  rawOptions: z.input<typeof optionsSchema>,
): ReleaseInspection {
  const options = optionsSchema.parse(rawOptions);
  const $ = load(decodeSource(source));
  const rawCnpj = requiredFilterValue($, 'CNPJ');
  const cnpjDigits = digits(rawCnpj);
  if (cnpjDigits.length !== 14) throw new Error(`CNPJ inválido no XLS de Liberações: ${rawCnpj}.`);

  const query = parseQueryTimestamp(requiredFilterValue($, 'Data da consulta'), options.timezoneOffset);
  const rows = releaseRows($);
  const rawPrograms = [...new Set(rows.map((row) => row.rawProgram.trim()).filter(Boolean))];
  const rowProgramCodes = new Set<SupportedReleaseProgramCode>();
  for (const rawProgram of rawPrograms) {
    const code = programCodeFromText(rawProgram);
    if (!code) throw new Error(`Programa não identificado no XLS de Liberações: ${rawProgram}.`);
    rowProgramCodes.add(code);
  }
  if (rowProgramCodes.size > 1) {
    throw new Error(`XLS de Liberações mistura mais de um programa: ${[...rowProgramCodes].join(', ')}.`);
  }

  const rowProgramCode = rowProgramCodes.values().next().value as SupportedReleaseProgramCode | undefined;
  const filterProgram = optionalFilterValue($, 'Programa');
  const filterText = canonicalText(filterProgram ?? '');
  const genericBasicFilter = filterText === 'PDDE' || filterText === 'PROGRAMA DINHEIRO DIRETO NA ESCOLA';
  const filterProgramCode = filterProgram && !(rowProgramCode && genericBasicFilter)
    ? programCodeFromText(filterProgram)
    : null;
  if (rowProgramCode && filterProgramCode && rowProgramCode !== filterProgramCode) {
    throw new Error(`Programa divergente entre filtro (${filterProgramCode}) e linhas (${rowProgramCode}) no XLS de Liberações.`);
  }
  const programCode = rowProgramCode ?? filterProgramCode ?? (genericBasicFilter ? '02' : null);
  if (!programCode) throw new Error('Não foi possível identificar o programa do XLS de Liberações.');

  const evidence = new Set<number>();
  const filterYear = explicitFilterYear($);
  if (filterYear) evidence.add(filterYear);
  for (const row of rows) {
    const releaseYear = yearFromReleaseDate(row.rawDate);
    if (releaseYear) evidence.add(releaseYear);
    for (const year of yearsFromText(row.rawProgram)) evidence.add(year);
  }
  const divergentYears = [...evidence].filter((year) => year !== options.fiscalYear).sort();
  if (divergentYears.length > 0) {
    throw new Error(
      `Exercício divergente no XLS de Liberações: evidência ${divergentYears.join(', ')}, esperado ${options.fiscalYear}.`,
    );
  }

  return {
    cnpj: cnpjDigits,
    programCode,
    query,
    fiscalYear: {
      requested: options.fiscalYear,
      verified: evidence.size > 0,
      evidence: [...evidence].sort(),
    },
    rawPrograms,
    filterProgram,
  };
}
