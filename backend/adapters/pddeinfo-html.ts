import { load, type CheerioAPI } from 'cheerio';
import { canonicalText } from '../core/normalization';

export const PDDEINFO_HTML_PARSER_VERSION = '0.4.0';

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

function findSubcard(
  $: CheerioAPI,
  wantedTitle: string,
): Parameters<CheerioAPI>[0] | null {
  const wanted = canonicalText(wantedTitle);
  for (const card of $('.govbr-subcard').toArray()) {
    const title = clean($(card).find('.govbr-subcard-title').first().text());
    if (canonicalText(title).startsWith(wanted)) return card;
  }
  return null;
}

function gridValue(
  $: CheerioAPI,
  scope: Parameters<CheerioAPI>[0],
  wantedLabel: string,
): string | null {
  const wanted = canonicalText(wantedLabel);
  for (const item of $(scope).find('.grid-dados-escola-item').toArray()) {
    const label = clean($(item).find('.label').first().text()).replace(/:$/, '');
    if (canonicalText(label) !== wanted) continue;
    const value = clean($(item).find('.value').first().text());
    return value || null;
  }
  return null;
}

function strongBlockValue(
  $: CheerioAPI,
  scope: Parameters<CheerioAPI>[0] | null,
  wantedLabel: string,
): string {
  if (!scope) return '';
  const wanted = canonicalText(wantedLabel);
  for (const strong of $(scope).find('strong').toArray()) {
    const label = clean($(strong).text()).replace(/:$/, '');
    if (canonicalText(label) !== wanted) continue;
    const parentText = clean($(strong).parent().text());
    const rawLabel = clean($(strong).text());
    return clean(parentText.slice(parentText.indexOf(rawLabel) + rawLabel.length).replace(/^\s*:?\s*/, ''));
  }
  return '';
}

function currentIdentity(
  $: CheerioAPI,
): { inep: string; denomination: string } | null {
  const card = findSubcard($, 'Dados da escola');
  if (!card) return null;
  const identification = gridValue($, card, 'Identificação');
  if (!identification) return null;
  const match = identification.match(/^(\d{7})\s+(.+?)\s+-\s+(\d{8})$/);
  if (!match) {
    throw new Error(`PDDEInfo: identificação atual da escola em formato inesperado: ${identification}.`);
  }
  return {
    inep: match[3],
    denomination: `${match[1]} ${match[2]}`,
  };
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
  if (uexStatusTable || eexStatusTable) {
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

  const uexCard = findSubcard($, 'Unidade Executora Própria');
  const eexCard = findSubcard($, 'Situação da Unidade Executora - EEx');
  if (!uexCard && !eexCard) {
    return {
      uexRegistration: '',
      mandate: '',
      mandateStartDate: '',
      mandateEndDate: '',
      uexAccounting: '',
      eexAdhesion: '',
      eexAccounting: '',
    };
  }

  const uexText = uexCard ? clean($(uexCard).text()) : '';
  const mandateMatch = uexText.match(
    /IN[IÍ]CIO DO MANDATO:\s*(\d{2}\/\d{2}\/\d{4}).*?FIM DO MANDATO:\s*(\d{2}\/\d{2}\/\d{4})/i,
  );
  const mandateStartDate = mandateMatch?.[1] ?? '';
  const mandateEndDate = mandateMatch?.[2] ?? '';
  return {
    uexRegistration: strongBlockValue($, uexCard, 'Dados Cadastrais'),
    mandate: mandateStartDate && mandateEndDate
      ? `${mandateStartDate} a ${mandateEndDate}`
      : '',
    mandateStartDate,
    mandateEndDate,
    uexAccounting: strongBlockValue($, uexCard, 'Prestação de Contas'),
    eexAdhesion: strongBlockValue($, eexCard, 'Adesão ao PDDE'),
    eexAccounting: strongBlockValue($, eexCard, 'Prestação de Contas'),
  };
}

function parseAccounts($: CheerioAPI): PddeInfoRawAccount[] {
  const table = findTable($, (headers) => (
    headers.some((header) => header.includes('PROGRAMA ACAO'))
    && headers.includes('BANCO')
    && headers.includes('AGENCIA')
    && headers.includes('CONTA')
  ));
  if (!table) {
    if ($('.govbr-school-card-body').length > 0) return [];
    throw new Error('PDDEInfo: tabela de dados bancários não localizada.');
  }

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
  const finance: PddeInfoRawFinance[] = [];

  for (const table of $('table').toArray()) {
    const headers = tableHeaders($, table);
    const text = canonicalText($(table).text());
    if (!(
      headers.includes('DESTINACAO')
      && headers.some((header) => header.includes('VL FINAL DEVIDO TOTAL'))
      && text.includes('PAGO')
    )) continue;

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
      data: headers.findIndex((header) => header.startsWith('DATA ORD')),
    };

    const card = $(table).closest('.govbr-subcard');
    const programLabel = clean(card.find('.govbr-subcard-title > span').first().text());

    for (const row of $(table).find('tr').slice(1).toArray()) {
      const cells = rowCells($, row);
      const rawDestination = cells[indexes.destinacao] ?? '';
      const destination = canonicalText(rawDestination);
      if (!rawDestination || destination.includes('SUBTOTAL') || destination.includes('TOTAL GERAL')) continue;
      const destinacao = programLabel
        ? `${programLabel} / ${rawDestination}`
        : rawDestination;
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
        // No layout atual a data aparece uma única vez no cabeçalho do programa.
        // Ela não é propagada para cada destinação/parcela, pois isso produziria
        // uma associação linha-a-linha que o próprio HTML não sustenta.
        data: indexes.data >= 0 ? cells[indexes.data] ?? '' : '',
      });
    }
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
  const current = currentIdentity($);
  if (!schoolTable && !current) {
    throw new Error('PDDEInfo: bloco de identificação da escola não localizado.');
  }
  const rawInep = schoolTable
    ? requiredLabelValue($, schoolTable, 'Cod. Escola', 'identificação da escola')
    : current!.inep;
  const rawDenomination = schoolTable
    ? requiredLabelValue($, schoolTable, 'Nome Escola', 'identificação da escola')
    : current!.denomination;
  const identity = validateIdentity(rawInep, rawDenomination, options.expectedSchool);

  const uexTable = findTable($, (_headers, text) => text.includes('EXECUTORA') && text.includes('CNPJ'));
  const uexCard = findSubcard($, 'Unidade Executora Própria');
  if (!uexTable && !uexCard) {
    throw new Error('PDDEInfo: bloco da Unidade Executora Própria não localizado.');
  }
  const uex = uexTable
    ? requiredLabelValue($, uexTable, 'Executora', 'Unidade Executora Própria')
    : gridValue($, uexCard!, 'Executora');
  const cnpj = uexTable
    ? requiredLabelValue($, uexTable, 'CNPJ', 'Unidade Executora Própria')
    : gridValue($, uexCard!, 'CNPJ');
  if (!uex) throw new Error('PDDEInfo: Unidade Executora Própria não contém Executora.');
  if (!cnpj) throw new Error('PDDEInfo: Unidade Executora Própria não contém CNPJ.');

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
