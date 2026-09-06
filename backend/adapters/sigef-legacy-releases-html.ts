import { load, type CheerioAPI } from 'cheerio';
import { canonicalText } from '../core/normalization';
import {
  parseSigefReleaseHtml,
  type SigefReleaseHtmlResult,
} from './sigef-releases-html';

export interface ParseSigefLegacyReleaseOptions {
  fiscalYear: number;
  programCode: string;
  targetCnpjs: string[];
  sourceUrl: string;
  queriedAt: string;
}

const LEGACY_HEADERS = [
  'DATA PGTO',
  'OB',
  'VALOR',
  'PROGRAMA',
  'BANCO',
  'AGENCIA',
  'C/C',
] as const;

function decodeLegacySource(source: Uint8Array | string): string {
  return typeof source === 'string'
    ? source
    : new TextDecoder('windows-1252').decode(source);
}

function cellsInRow($: CheerioAPI, element: Parameters<CheerioAPI>[0]): string[] {
  return $(element)
    .children('th,td')
    .toArray()
    .map((cell) => $(cell).text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim());
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isoDateFromBrazilian(value: string, label: string): string {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`${label} inválida em Liberações legadas: ${value}.`);
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    throw new Error(`${label} impossível em Liberações legadas: ${value}.`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function brazilianDateFromIso(value: string): string {
  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function findEntityMetadata($: CheerioAPI): {
  cnpj: string;
  name: string;
  city: string;
  state: string;
} {
  const cells = $('td,th').toArray().map((cell) => $(cell).text().replace(/\s+/g, ' ').trim());
  const entityText = cells.find((value) => /^Entidade\.\.:/i.test(value));
  if (!entityText) throw new Error('Liberações legadas não contêm a identificação da entidade.');
  const entity = entityText.match(/^Entidade\.\.:\s*([0-9./-]+)\s*-\s*(.+)$/i);
  if (!entity) throw new Error(`Identificação de entidade inválida em Liberações legadas: ${entityText}.`);

  const municipalityText = cells.find((value) => /^Munic[ií]pio\.:/i.test(value));
  if (!municipalityText) throw new Error('Liberações legadas não contêm o município da entidade.');
  const municipality = municipalityText.match(/^Munic[ií]pio\.:\s*(.+?)\s*-\s*([A-Z]{2})$/i);
  if (!municipality) {
    throw new Error(`Município inválido em Liberações legadas: ${municipalityText}.`);
  }

  return {
    cnpj: entity[1].trim(),
    name: entity[2].trim(),
    city: municipality[1].trim(),
    state: municipality[2].toUpperCase(),
  };
}

function findCoverageThrough($: CheerioAPI): string {
  const text = $.root().text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ');
  const match = text.match(/Dados referentes ao fechamento do dia:\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (!match) throw new Error('Liberações legadas não informam a data de fechamento da fonte.');
  return isoDateFromBrazilian(match[1], 'Data de fechamento');
}

function normalizedHeader(value: string): string {
  const header = canonicalText(value);
  if (header === 'DATA PGTO') return 'Data de pagamento';
  if (header === 'OB') return 'Ordem Bancária';
  if (header === 'C/C') return 'Conta Corrente';
  if (header === 'AGENCIA') return 'Agência';
  if (header === 'PARCELA') return 'Parcela';
  if (header === 'VALOR') return 'Valor';
  if (header === 'PROGRAMA') return 'Programa';
  if (header === 'BANCO') return 'Banco';
  return value.trim();
}

function normalizedReleaseTables($: CheerioAPI): string[] {
  const output: string[] = [];

  for (const table of $('table').toArray()) {
    const rows = $(table).find('tr').toArray();
    let headerRowIndex = -1;
    let headers: string[] = [];

    for (let index = 0; index < rows.length; index += 1) {
      const candidate = cellsInRow($, rows[index]).map(canonicalText);
      if (LEGACY_HEADERS.every((header) => candidate.includes(header))) {
        headerRowIndex = index;
        headers = cellsInRow($, rows[index]);
        break;
      }
    }

    if (headerRowIndex < 0) continue;
    const bodyRows: string[] = [];
    for (const row of rows.slice(headerRowIndex + 1)) {
      const cells = cellsInRow($, row);
      if (cells.length === 0 || cells.every((cell) => !cell)) continue;
      if (canonicalText(cells[0] ?? '').startsWith('TOTAL')) continue;
      if (cells.some((cell) => canonicalText(cell) === 'TOTAL')) continue;
      bodyRows.push(`<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`);
    }

    output.push(
      `<table><tr>${headers.map((header) => `<th>${escapeHtml(normalizedHeader(header))}</th>`).join('')}</tr>${bodyRows.join('')}</table>`,
    );
  }

  if (output.length === 0) {
    throw new Error('Liberações legadas não contêm tabela financeira reconhecível.');
  }
  return output;
}

/**
 * A rotina Oracle legada publica os mesmos dados de Liberações do SIGEF com
 * rótulos e metadados diferentes. Esta normalização converte apenas a forma do
 * HTML para reutilizar o parser canônico, sem alterar valores, OB ou conta.
 */
export function parseSigefLegacyReleaseHtml(
  source: Uint8Array | string,
  options: ParseSigefLegacyReleaseOptions,
): SigefReleaseHtmlResult {
  if (Number.isNaN(Date.parse(options.queriedAt))) {
    throw new Error(`Instante de consulta inválido para Liberações legadas: ${options.queriedAt}.`);
  }

  const html = decodeLegacySource(source);
  const $ = load(html);
  const entity = findEntityMetadata($);
  const coverageThrough = findCoverageThrough($);
  const tables = normalizedReleaseTables($);
  const syntheticQueryDate = `${brazilianDateFromIso(coverageThrough)} 00:00:00`;
  const normalizedHtml = `<html><body>
<table>
<tr><th>CNPJ</th><td>${escapeHtml(entity.cnpj)}</td><th>Nome</th><td>${escapeHtml(entity.name)}</td></tr>
<tr><th>UF</th><td>${escapeHtml(entity.state)}</td><th>Município</th><td>${escapeHtml(entity.city)}</td></tr>
<tr><th>Data da consulta</th><td>${syntheticQueryDate}</td></tr>
</table>
${tables.join('\n')}
</body></html>`;

  const parsed = parseSigefReleaseHtml(normalizedHtml, {
    fiscalYear: options.fiscalYear,
    programCode: options.programCode,
    targetCnpjs: options.targetCnpjs,
    sourceUrl: options.sourceUrl,
  });

  return {
    ...parsed,
    source: {
      ...parsed.source,
      queriedAt: options.queriedAt,
      coverageThrough,
    },
  };
}
