import { load, type CheerioAPI } from 'cheerio';
import { canonicalText } from '../core/normalization';

export const PDDEINFO_HTML_PARSER_VERSION = '0.3.0';

export interface PddeInfoExpectedSchool {
  inep: string;
  sme: string;
  nome: string;
}

export interface PddeInfoRawAccount {
  programa: string;
  banco: string;
  agencia: string;
  conta: string;
  saldo: string;
  ocorrencia: string;
}

export interface PddeInfoRawSchoolStatus {
  uexRegistration: string;
  mandate: string;
  mandateStartDate: string;
  mandateEndDate: string;
  uexAccounting: string;
  eexAdhesion: string;
  eexAccounting: string;
}

export interface PddeInfoRawFinance {
  destinacao: string;
  devidoCusteio: string;
  devidoCapital: string;
  devidoTotal: string;
  ajusteCusteio: string;
  ajusteCapital: string;
  ajusteTotal: string;
  finalDevidoTotal: string;
  pagoCusteio: string;
  pagoCapital: string;
  pagoTotal: string;
  data: string;
}

export interface PddeInfoRawSchool {
  inep: string;
  sme: string;
  nome: string;
  denominacaoFnde: string;
  uex: string;
  cnpj: string;
  accounts: PddeInfoRawAccount[];
  finance: PddeInfoRawFinance[];
  status: PddeInfoRawSchoolStatus;
  source: string;
  sourceIdentity: {
    inep: string;
    sme: string;
    denominacao: string;
  };
}

export interface ParsePddeInfoSchoolHtmlOptions {
  expectedSchool: PddeInfoExpectedSchool;
  sourceUrl: string;
}

function clean(value: string | null | undefined): string {
  return (value ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function rowCells($: CheerioAPI, row: Parameters<CheerioAPI>[0]): string[] {
  return $(row).find('th,td').toArray().map((cell) => clean($(cell).text()));
}

function tableHeaders($: CheerioAPI, table: Parameters<CheerioAPI>[0]): string[] {
  const firstRow = $(table).find('tr').first();
  return rowCells($, firstRow).map(canonicalText);
}

function findTable(
  $: CheerioAPI,
  predicate: (headers: string[], tableText: string) => boolean,
): Parameters<CheerioAPI>[0] | null {
  for (const table of $('table').toArray()) {
    const headers = tableHeaders($, table);
    const text = canonicalText($(table).text());
    if (predicate(headers, text)) return table;
  }
  return null;
}

function labelValue(
  $: CheerioAPI,
  table: Parameters<CheerioAPI>[0],
  wantedLabel: string,
): string | null {
  const wanted = canonicalText(wantedLabel);
  for (const row of $(table).find('tr').toArray()) {
    const cells = rowCells($, row);
    for (let index = 0; index + 1 < cells.length; index += 1) {
      if (canonicalText(cells[index]) === wanted) return cells[index + 1];
    }
  }
  return null;
}

function requiredLabelValue(
  $: CheerioAPI,
  table: Parameters<CheerioAPI>[0],
  label: string,
  context: string,
): string {
  const value = labelValue($, table, label);
  if (!value) throw new Error(`PDDEInfo: ${context} não contém ${label}.`);
  return value;
}

function column(headers: string[], matcher: (header: string) => boolean, label: string): number {
  const index = headers.findIndex(matcher);
  if (index < 0) throw new Error(`PDDEInfo: coluna financeira/bancária ausente: ${label}.`);
  return index;
}


function optionalLabelValue(
  $: CheerioAPI,
  table: Parameters<CheerioAPI>[0] | null,
  label: string,
): string {
  if (!table) return '';
  return labelValue($, table, label) ?? '';
}

function parseMandateDates(value: string): { start: string; end: string } {
  const dates = value.match(/\b\d{2}\/\d{2}\/\d{4}\b/g) ?? [];
  return {
    start: dates[0] ?? '',
    end: dates[1] ?? '',
  };
}

function parseInstitutionalStatus($: CheerioAPI): PddeInfoRawSchoolStatus {
  const uexStatusTable = findTable($, (_headers, text) => (
    text.includes('DADOS CADASTRAIS')
    && text.includes('MANDATO DO DIRIGENTE')
    && text.includes('PRESTACAO DE CONTAS')
  ));
  const eexStatusTable = findTable($, (_headers, text) => (
    text.includes('ADESAO AO PDDE')
    && text.includes('PRESTACAO DE CONTAS')
  ));
  const mandate = optionalLabelValue($, uexStatusTable, 'Mandato do dirigente');
  const mandateDates = parseMandateDates(mandate);
  return {
    uexRegistration: optionalLabelValue($, uexStatusTable, 'Dados Cadastrais'),
    mandate,
    mandateStartDate: mandateDates.start,
    mandateEndDate: mandateDates.end,
    uexAccounting: optionalLabelValue($, uexStatusTable, 'Prestação de Contas'),
    eexAdhesion: optionalLabelValue($, eexStatusTable, 'Adesão ao PDDE'),
    eexAccounting: optionalLabelValue($, eexStatusTable, 'Prestação de Contas'),
  };
}

function parseAccounts($: CheerioAPI): PddeInfoRawAccount[] {
  const table = findTable($, (headers) => (
    headers.some((header) => header.includes('PROGRAMA ACAO'))
    && headers.includes('BANCO')
    && headers.includes('AGENCIA')
    && headers.includes('CONTA')
  ));
  if (!table) throw new Error('PDDEInfo: tabela de dados bancários não localizada.');

  const headers = tableHeaders($, table);
  const programIndex = column(headers, (header) => header.includes('PROGRAMA ACAO'), 'Programa/Ação');
  const bankIndex = column(headers, (header) => header === 'BANCO', 'Banco');
  const agencyIndex = column(headers, (header) => header === 'AGENCIA', 'Agência');
  const accountIndex = column(headers, (header) => header === 'CONTA', 'Conta');
  const balanceIndex = column(headers, (header) => header === 'SALDO', 'Saldo');
  const occurrenceIndex = headers.findIndex((header) => header === 'OCORRENCIA');

  const accounts: PddeInfoRawAccount[] = [];
  for (const row of $(table).find('tr').slice(1).toArray()) {
    const cells = rowCells($, row);
    const programa = cells[programIndex] ?? '';
    if (!programa || canonicalText(programa).includes('TOTAL')) continue;
    accounts.push({
      programa,
      banco: cells[bankIndex] ?? '',
      agencia: cells[agencyIndex] ?? '',
      conta: cells[accountIndex] ?? '',
      saldo: cells[balanceIndex] ?? '',
      ocorrencia: occurrenceIndex >= 0 ? cells[occurrenceIndex] ?? '' : '',
    });
  }
  return accounts;
}

function parseFinance($: CheerioAPI): PddeInfoRawFinance[] {
  const table = findTable($, (headers, text) => (
    headers.includes('DESTINACAO')
    && headers.some((header) => header.includes('VL FINAL DEVIDO TOTAL'))
    && text.includes('PAGO')
  ));
  if (!table) throw new Error('PDDEInfo: tabela financeira de destinações não localizada.');

  const headers = tableHeaders($, table);
  const indexes = {
    destinacao: column(headers, (header) => header === 'DESTINACAO', 'Destinação'),
    devidoCusteio: column(headers, (header) => header.includes('DEVIDO CUSTEIO'), 'Vl Devido Custeio'),
    devidoCapital: column(headers, (header) => header.includes('DEVIDO CAPITAL'), 'Vl Devido Capital'),
    devidoTotal: column(headers, (header) => header.includes('DEVIDO TOTAL') && !header.includes('FINAL'), 'Vl Devido Total'),
    ajusteCusteio: column(headers, (header) => header.includes('AJUSTE CUSTEIO'), 'Vl Ajuste Custeio'),
    ajusteCapital: column(headers, (header) => header.includes('AJUSTE CAPITAL'), 'Vl Ajuste Capital'),
    ajusteTotal: column(headers, (header) => header.includes('AJUSTE TOTAL'), 'Vl Ajuste Total'),
    finalDevidoTotal: column(headers, (header) => header.includes('FINAL DEVIDO TOTAL'), 'Vl Final Devido Total'),
    pagoCusteio: column(headers, (header) => header.includes('PAGO CUSTEIO'), 'Vl Pago Custeio'),
    pagoCapital: column(headers, (header) => header.includes('PAGO CAPITAL'), 'Vl Pago Capital'),
    pagoTotal: column(headers, (header) => header.includes('PAGO TOTAL'), 'Valor Pago Total'),
    data: column(headers, (header) => header.startsWith('DATA ORD'), 'Data Ord. Pagamento'),
  };

  const finance: PddeInfoRawFinance[] = [];
  for (const row of $(table).find('tr').slice(1).toArray()) {
    const cells = rowCells($, row);
    const destinacao = cells[indexes.destinacao] ?? '';
    const destination = canonicalText(destinacao);
    if (!destinacao || destination.includes('SUBTOTAL') || destination.includes('TOTAL GERAL')) continue;
    finance.push({
      destinacao,
      devidoCusteio: cells[indexes.devidoCusteio] ?? '',
      devidoCapital: cells[indexes.devidoCapital] ?? '',
      devidoTotal: cells[indexes.devidoTotal] ?? '',
      ajusteCusteio: cells[indexes.ajusteCusteio] ?? '',
      ajusteCapital: cells[indexes.ajusteCapital] ?? '',
      ajusteTotal: cells[indexes.ajusteTotal] ?? '',
      finalDevidoTotal: cells[indexes.finalDevidoTotal] ?? '',
      pagoCusteio: cells[indexes.pagoCusteio] ?? '',
      pagoCapital: cells[indexes.pagoCapital] ?? '',
      pagoTotal: cells[indexes.pagoTotal] ?? '',
      data: cells[indexes.data] ?? '',
    });
  }
  if (finance.length === 0) {
    throw new Error('PDDEInfo: tabela financeira localizada, mas nenhuma destinação foi extraída.');
  }
  return finance;
}

function validateIdentity(rawInep: string, rawDenomination: string, expected: PddeInfoExpectedSchool) {
  if (rawInep !== expected.inep) {
    throw new Error(`PDDEInfo: INEP retornado ${rawInep} diverge do INEP solicitado ${expected.inep}.`);
  }

  const denominationMatch = clean(rawDenomination).match(/^(\d{7})\s+(.+)$/);
  const sourceSme = denominationMatch?.[1] ?? expected.sme;
  const sourceName = denominationMatch?.[2] ?? clean(rawDenomination);
  if (sourceSme !== expected.sme) {
    throw new Error(`PDDEInfo: identidade SME retornada ${sourceSme} diverge da unidade esperada ${expected.sme}.`);
  }
  if (canonicalText(sourceName) !== canonicalText(expected.nome)) {
    throw new Error(`PDDEInfo: nome retornado "${sourceName}" diverge da unidade esperada "${expected.nome}".`);
  }
  return { sourceSme, sourceName };
}

export function parsePddeInfoSchoolHtml(
  html: string,
  options: ParsePddeInfoSchoolHtmlOptions,
): PddeInfoRawSchool {
  if (!html.trim()) throw new Error('PDDEInfo: resposta HTML vazia.');
  const $ = load(html);

  const schoolTable = findTable($, (_headers, text) => (
    text.includes('COD ESCOLA') && text.includes('NOME ESCOLA')
  ));
  if (!schoolTable) throw new Error('PDDEInfo: bloco de identificação da escola não localizado.');
  const rawInep = requiredLabelValue($, schoolTable, 'Cod. Escola', 'identificação da escola');
  const rawDenomination = requiredLabelValue($, schoolTable, 'Nome Escola', 'identificação da escola');
  const identity = validateIdentity(rawInep, rawDenomination, options.expectedSchool);

  const uexTable = findTable($, (_headers, text) => text.includes('EXECUTORA') && text.includes('CNPJ'));
  if (!uexTable) throw new Error('PDDEInfo: bloco da Unidade Executora Própria não localizado.');
  const uex = requiredLabelValue($, uexTable, 'Executora', 'Unidade Executora Própria');
  const cnpj = requiredLabelValue($, uexTable, 'CNPJ', 'Unidade Executora Própria');

  const accounts = parseAccounts($);
  const finance = parseFinance($);
  const status = parseInstitutionalStatus($);

  return {
    inep: rawInep,
    sme: identity.sourceSme,
    nome: identity.sourceName,
    denominacaoFnde: rawDenomination,
    uex,
    cnpj,
    accounts,
    finance,
    status,
    source: options.sourceUrl,
    sourceIdentity: {
      inep: rawInep,
      sme: identity.sourceSme,
      denominacao: rawDenomination,
    },
  };
}
