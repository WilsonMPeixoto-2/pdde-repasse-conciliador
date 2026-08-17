import { createHash } from 'node:crypto';
import { load, type CheerioAPI } from 'cheerio';
import {
  canonicalAccount,
  canonicalCnpj,
  canonicalDocument,
  canonicalProgramCode,
  canonicalText,
} from '../core/normalization';
import {
  sigefMovementSchema,
  type BankAccount,
  type SigefMovement,
} from '../core/schemas';

export type SigefMovementClass =
  | 'REPASSE_FNDE'
  | 'APLICACAO_FINANCEIRA'
  | 'RESGATE_APLICACAO'
  | 'PAGAMENTO_TRANSFERENCIA'
  | 'PAGAMENTO_CARTAO'
  | 'RENDIMENTO_FINANCEIRO'
  | 'ENTRADA_TERCEIRO'
  | 'TARIFA_BANCARIA'
  | 'ESTORNO_REVERSAO'
  | 'MOVIMENTO_NAO_CLASSIFICADO';

export interface SigefPublicMovement extends SigefMovement {
  classification: SigefMovementClass;
  counterparty: {
    document: string | null;
    name: string | null;
    bank: string | null;
    agency: string | null;
    account: string | null;
  };
  sourceUrl: string;
}

export interface SigefPublicPage {
  identity: {
    cnpj: string;
    name: string;
    account: BankAccount;
    programCode: string;
    programLabel: string;
  };
  movements: SigefPublicMovement[];
  declaredTotal: number | null;
  pageUrls: string[];
}

export interface SigefAccountResult {
  status: 'COMPLETE' | 'PARTIAL';
  pagesFetched: number;
  declaredTotal: number | null;
  movements: SigefPublicMovement[];
  coverageThrough: string | null;
}

const BASE = 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento';
const HEADERS = [
  'DATA',
  'CREDITO',
  'DEBITO',
  'DOCUMENTO',
  'HISTORICO',
  'CNPJ BENEFICIARIO',
  'RAZAO SOCIAL',
  'BANCO BENEFICIARIO',
  'AGENCIA BENEFICIARIO',
  'CONTA CORRENTE BENEFICIARIO',
] as const;

function alphaNum(value: string, label: string): string {
  const output = value.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  if (!output) throw new Error(`${label} vazio para SIGEF Extrato.`);
  return output;
}

export function formatSigefAccount(value: string): string {
  const output = alphaNum(value, 'Conta');
  if (!/^\d+[A-Z]?$/.test(output)) throw new Error(`Conta inválida: ${value}.`);
  return output.padStart(10, '0');
}

function formatBank(value: string): string {
  const output = alphaNum(value, 'Banco');
  if (!/^\d{1,3}$/.test(output)) throw new Error(`Banco inválido: ${value}.`);
  return output.padStart(3, '0');
}

function formatAgency(value: string): string {
  const output = alphaNum(value, 'Agência');
  if (!/^\d{1,4}[A-Z]?$/.test(output)) throw new Error(`Agência inválida: ${value}.`);
  return output.padStart(4, '0');
}

export function buildSigefPublicStatementUrl(input: {
  cnpj: string;
  programCode: string;
  account: BankAccount;
  startMonth?: number;
  startYear: number;
}): string {
  const cnpj = input.cnpj.replace(/\D/g, '').padStart(14, '0');
  if (!/^\d{14}$/.test(cnpj)) throw new Error(`CNPJ inválido: ${input.cnpj}.`);

  const month = input.startMonth ?? 1;
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error('Mês inicial inválido.');
  }

  const program = alphaNum(input.programCode, 'Programa');
  return `${BASE}/banco/${formatBank(input.account.bank)}`
    + `/agencia/${formatAgency(input.account.agency)}`
    + `/contacorrente/${formatSigefAccount(input.account.number)}`
    + `/cnpj/${cnpj}`
    + `/programa/${program}`
    + `/data/${String(month).padStart(2, '0')}${input.startYear}`;
}

function decodeScore(text: string): number {
  let score = 0;
  for (const hint of ['Extrato', 'Crédito', 'Débito', 'Razão Social', 'Agência', 'Beneficiário']) {
    if (text.includes(hint)) score += 4;
  }
  return score
    - (text.match(/�/g) ?? []).length * 8
    - (text.match(/Ã.|Â./g) ?? []).length * 3;
}

export function decodeSigefHtml(bytes: Buffer, contentType: string | null): string {
  const declared = contentType
    ?.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1]
    ?.toLowerCase();

  if (declared && ['windows-1252', 'cp1252', 'iso-8859-1', 'latin1'].includes(declared)) {
    return new TextDecoder('windows-1252').decode(bytes);
  }
  if (declared === 'utf-8' || declared === 'utf8') {
    return new TextDecoder('utf-8').decode(bytes);
  }

  const utf8 = new TextDecoder('utf-8').decode(bytes);
  const windows1252 = new TextDecoder('windows-1252').decode(bytes);
  return decodeScore(utf8) >= decodeScore(windows1252) ? utf8 : windows1252;
}

export async function fetchSigefPublicPage(
  url: string,
  signal?: AbortSignal,
): Promise<{ url: string; queriedAt: string; rawBytes: Buffer; html: string }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    signal?.throwIfAborted();
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(new Error('Timeout SIGEF Extrato.')),
      25_000,
    );
    const onAbort = () => controller.abort(signal?.reason);
    signal?.addEventListener('abort', onAbort, { once: true });

    try {
      const response = await fetch(url, {
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36 PDDE-4CRE/0.6',
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.byteLength > 8 * 1024 * 1024) {
        throw new Error('SIGEF Extrato excedeu 8 MiB em uma página.');
      }

      const html = decodeSigefHtml(bytes, response.headers.get('content-type'));
      const text = canonicalText(html.replace(/<[^>]+>/g, ' '));
      if (/\bCAPTCHA\b/.test(text)) {
        throw new Error('SIGEF Extrato solicitou CAPTCHA; coleta interrompida.');
      }
      if (!response.ok) throw new Error(`SIGEF Extrato respondeu HTTP ${response.status}.`);
      if (!text.includes('EXTRATO') || !text.includes('CONTA CORRENTE')) {
        throw new Error('SIGEF Extrato retornou conteúdo inesperado.');
      }

      return {
        url: response.url,
        queriedAt: new Date().toISOString(),
        rawBytes: bytes,
        html,
      };
    } catch (error) {
      lastError = error;
      signal?.throwIfAborted();
      const permanent = error instanceof Error
        && (
          error.message.includes('CAPTCHA')
          || error.message.includes('conteúdo inesperado')
          || error.message.includes('8 MiB')
        );
      if (permanent || attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(
        resolve,
        700 * 2 ** (attempt - 1) + Math.floor(Math.random() * 250),
      ));
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', onAbort);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Falha desconhecida no SIGEF Extrato.');
}

function cells($: CheerioAPI, row: Parameters<CheerioAPI>[0]): string[] {
  return $(row)
    .children('th,td')
    .toArray()
    .map((cell) => $(cell).text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim());
}

function valueAfterLabel($: CheerioAPI, label: string): string {
  const wanted = canonicalText(label);
  for (const row of $('tr').toArray()) {
    const rowCells = cells($, row);
    for (let index = 0; index < rowCells.length; index += 1) {
      if (canonicalText(rowCells[index]) === wanted && rowCells[index + 1]) {
        return rowCells[index + 1].trim();
      }
    }
  }
  throw new Error(`SIGEF Extrato não contém ${label}.`);
}

function money(value: string, row: number): number {
  const raw = value.trim();
  if (!raw || raw === '-' || raw === '0' || raw === '0,00') return 0;
  const match = raw.match(/^(\d{1,3}(?:\.\d{3})*|\d+),(\d{2})$/);
  if (!match) throw new Error(`SIGEF Extrato linha ${row}: valor inválido ${value}.`);

  const cents = BigInt(match[1].replace(/\./g, '')) * 100n + BigInt(match[2]);
  if (cents > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new Error('Valor SIGEF excede limite seguro.');
  }
  return Number(cents);
}

function dateIso(value: string, row: number): string {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) throw new Error(`SIGEF Extrato linha ${row}: data inválida ${value}.`);

  const date = new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1])));
  if (
    date.getUTCFullYear() !== Number(match[3])
    || date.getUTCMonth() !== Number(match[2]) - 1
    || date.getUTCDate() !== Number(match[1])
  ) {
    throw new Error(`Data impossível: ${value}.`);
  }
  return `${match[3]}-${match[2]}-${match[1]}`;
}

function nullable(value: string): string | null {
  const normalized = value.trim();
  return !normalized || normalized === '-' ? null : normalized;
}

export function classifySigefMovement(
  operation: 'credit' | 'debit',
  historyRaw: string,
): SigefMovementClass {
  const history = canonicalText(historyRaw);

  if (operation === 'credit' && history.includes('ORDEM BANCARIA')) {
    return 'REPASSE_FNDE';
  }

  // Estornos precisam vir antes de resgates/tarifas para não classificar
  // "ESTORNO RESGATE AUTOMATICO" como resgate normal.
  if (history.includes('ESTORNO') || history.includes('REVERS')) {
    return 'ESTORNO_REVERSAO';
  }

  // Tarifa de devolução de cheque é uma tarifa, não a devolução financeira em si.
  if (history.includes('TARIFA') || history.includes('TAXA DO BANCO')) {
    return 'TARIFA_BANCARIA';
  }

  if (history.includes('DEVOLVID') || history.includes('DEVOLUCAO')) {
    return 'ESTORNO_REVERSAO';
  }

  if (history.includes('RESGATE')) return 'RESGATE_APLICACAO';
  if (operation === 'credit' && history.includes('TRANSFERIDO DA POUPANCA')) {
    return 'RESGATE_APLICACAO';
  }

  if (
    operation === 'credit'
    && (
      history.includes('RENDIMENTO')
      || history.includes('REMUNERACAO')
      || history.includes('JUROS')
    )
  ) {
    return 'RENDIMENTO_FINANCEIRO';
  }

  if (operation === 'debit' && (history.includes('APLIC') || history.includes('BB FIX'))) {
    return 'APLICACAO_FINANCEIRA';
  }

  if (operation === 'debit' && history.includes('PAGTO CARTAO')) {
    return 'PAGAMENTO_CARTAO';
  }

  if (
    operation === 'debit'
    && (
      history.includes('TRANSFERENCIA ENVIADA')
      || history.includes('PIX ENVIADO')
      || history.includes('PAGAMENTO')
      || history.includes('TV POR ASSINATURA')
      || history.includes('CHEQUE COMPENSADO')
      || history.includes('CHEQUE PAGO EM OUTRA AGENCIA')
      || history.includes('TED TRANSF')
      || history === 'IMPOSTOS'
    )
  ) {
    return 'PAGAMENTO_TRANSFERENCIA';
  }

  if (
    operation === 'credit'
    && (
      history.includes('PIX RECEBIDO')
      || history.includes('TRANSFERENCIA RECEBIDA')
      || history.includes('DEPOSITO ONLINE')
      || history.includes('DEPOSITO CHEQUE BB LIQUIDADO')
      || history.includes('TED TRANSFERENCIA ELETR.DISPON')
    )
  ) {
    return 'ENTRADA_TERCEIRO';
  }

  return 'MOVIMENTO_NAO_CLASSIFICADO';
}

function movementFingerprint(input: {
  cnpj: string;
  program: string;
  account: BankAccount;
  date: string;
  operation: string;
  document: string;
  amount: number;
  history: string;
  counterparty: string;
}): string {
  return createHash('sha256').update([
    input.cnpj,
    input.program,
    canonicalAccount(input.account),
    input.date,
    input.operation,
    canonicalDocument(input.document),
    input.amount,
    canonicalText(input.history),
    canonicalDocument(input.counterparty),
  ].join('|')).digest('hex');
}

function movementId(fingerprint: string, occurrence: number): string {
  return `SIGEF_EXTRATO:${fingerprint}:${String(occurrence).padStart(4, '0')}`;
}

export function parseSigefPublicPage(
  html: string,
  sourceUrl: string,
  expected: { cnpj: string; programCode: string; account: BankAccount },
): SigefPublicPage {
  const $ = load(html);
  const pageText = canonicalText($.root().text());
  if (/\bCAPTCHA\b/.test(pageText)) {
    throw new Error('SIGEF Extrato solicitou CAPTCHA; coleta interrompida.');
  }

  const cnpj = canonicalCnpj(valueAfterLabel($, 'CNPJ'));
  const name = valueAfterLabel($, 'Razão Social');
  const bankMatch = valueAfterLabel($, 'Banco').match(/^(\d{1,3})\b/);
  if (!bankMatch) throw new Error('Banco inválido no SIGEF Extrato.');

  const account: BankAccount = {
    bank: bankMatch[1].padStart(3, '0'),
    agency: valueAfterLabel($, 'Agência').replace(/\s+/g, ''),
    number: valueAfterLabel($, 'Conta Corrente').replace(/[^0-9A-Z]/gi, '').toUpperCase(),
  };

  const programRaw = valueAfterLabel($, 'Programa');
  const programMatch = programRaw.match(/^([0-9A-Z]+)\s*-\s*(.+)$/i);
  if (!programMatch) throw new Error(`Programa inválido no SIGEF Extrato: ${programRaw}.`);
  const programCode = canonicalProgramCode(programMatch[1]);

  if (cnpj !== canonicalCnpj(expected.cnpj)) {
    throw new Error(`CNPJ divergente no SIGEF Extrato: ${cnpj}.`);
  }
  if (programCode !== canonicalProgramCode(expected.programCode)) {
    throw new Error(`Programa divergente no SIGEF Extrato: ${programCode}.`);
  }
  if (canonicalAccount(account) !== canonicalAccount(expected.account)) {
    throw new Error('Conta divergente no SIGEF Extrato.');
  }

  const movements: SigefPublicMovement[] = [];
  const occurrences = new Map<string, number>();

  for (const table of $('table').toArray()) {
    const rows = $(table).find('tr').toArray();
    if (!rows.length) continue;

    const headers = cells($, rows[0]).map(canonicalText);
    if (!HEADERS.every((header) => headers.includes(header))) continue;
    const indexByHeader = Object.fromEntries(
      HEADERS.map((header) => [header, headers.indexOf(header)]),
    ) as Record<(typeof HEADERS)[number], number>;

    for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
      const row = cells($, rows[rowIndex]);
      const dateRaw = row[indexByHeader.DATA] ?? '';
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateRaw.trim())) continue;

      const credit = money(row[indexByHeader.CREDITO] ?? '', rowIndex + 1);
      const debit = money(row[indexByHeader.DEBITO] ?? '', rowIndex + 1);
      if ((credit > 0) === (debit > 0)) {
        throw new Error(`SIGEF Extrato linha ${rowIndex + 1}: crédito/débito ambíguos.`);
      }

      const operation = credit > 0 ? 'credit' as const : 'debit' as const;
      const amount = credit || debit;
      const movementDate = dateIso(dateRaw, rowIndex + 1);
      const document = (row[indexByHeader.DOCUMENTO] ?? '').trim();
      const history = (row[indexByHeader.HISTORICO] ?? '').trim();
      const counterpartyDocument = nullable(row[indexByHeader['CNPJ BENEFICIARIO']] ?? '');

      const fingerprint = movementFingerprint({
        cnpj,
        program: programCode,
        account,
        date: movementDate,
        operation,
        document,
        amount,
        history,
        counterparty: counterpartyDocument ?? '',
      });
      const occurrence = (occurrences.get(fingerprint) ?? 0) + 1;
      occurrences.set(fingerprint, occurrence);

      const base = sigefMovementSchema.parse({
        id: movementId(fingerprint, occurrence),
        schoolCnpj: cnpj,
        programCode,
        operation,
        amountCents: amount,
        movementDate,
        account,
        document,
        history,
      });

      movements.push({
        ...base,
        classification: classifySigefMovement(operation, history),
        sourceUrl,
        counterparty: {
          document: counterpartyDocument,
          name: nullable(row[indexByHeader['RAZAO SOCIAL']] ?? ''),
          bank: nullable(row[indexByHeader['BANCO BENEFICIARIO']] ?? ''),
          agency: nullable(row[indexByHeader['AGENCIA BENEFICIARIO']] ?? ''),
          account: nullable(row[indexByHeader['CONTA CORRENTE BENEFICIARIO']] ?? ''),
        },
      });
    }
  }

  const range = pageText.match(/EXIBINDO DE (\d+) ATE (\d+) DE (\d+)/);
  const pageUrls = new Set<string>();
  const expectedPath = `/cnpj/${cnpj}/`;
  const expectedAccount = `/CONTACORRENTE/${formatSigefAccount(account.number)}/`;

  for (const anchor of $('a[href]').toArray()) {
    const href = $(anchor).attr('href');
    if (!href) continue;
    try {
      const url = new URL(href, sourceUrl);
      const path = decodeURIComponent(url.pathname);
      if (!path.includes('/extrato-conta-corrente-detalhamento/')) continue;
      if (!path.includes(expectedPath)) continue;
      if (!path.toUpperCase().includes(expectedAccount)) continue;
      if (!path.toUpperCase().includes(`/PROGRAMA/${programCode}/`)) continue;
      url.hash = '';
      pageUrls.add(url.toString());
    } catch {
      // A verificação final de cobertura denuncia paginação incompleta.
    }
  }

  if (!movements.length && !pageText.includes('NENHUM REGISTRO ENCONTRADO')) {
    throw new Error('SIGEF Extrato não trouxe movimentos nem ausência explícita.');
  }

  return {
    identity: {
      cnpj,
      name,
      account,
      programCode,
      programLabel: programMatch[2].trim(),
    },
    movements,
    declaredTotal: range ? Number(range[3]) : null,
    pageUrls: [...pageUrls],
  };
}

export async function collectSigefPublicAccount(input: {
  cnpj: string;
  programCode: string;
  account: BankAccount;
  startYear: number;
  startMonth?: number;
  maxPages?: number;
  signal?: AbortSignal;
  onPage?: (page: { index: number; url: string; rawBytes: Buffer }) => Promise<void>;
}): Promise<SigefAccountResult> {
  const startUrl = buildSigefPublicStatementUrl(input);
  const queue = [startUrl];
  const scheduled = new Set(queue);
  const seen = new Set<string>();
  const byId = new Map<string, SigefPublicMovement>();
  let declaredTotal: number | null = null;
  let pagesFetched = 0;
  let coverageThrough: string | null = null;

  while (queue.length) {
    input.signal?.throwIfAborted();
    if (pagesFetched >= (input.maxPages ?? 500)) {
      throw new Error('Limite de paginação excedido no SIGEF Extrato.');
    }

    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const fetched = await fetchSigefPublicPage(url, input.signal);
    pagesFetched += 1;
    await input.onPage?.({ index: pagesFetched, url: fetched.url, rawBytes: fetched.rawBytes });

    const parsed = parseSigefPublicPage(fetched.html, fetched.url, {
      cnpj: input.cnpj,
      programCode: input.programCode,
      account: input.account,
    });

    if (parsed.declaredTotal !== null) {
      if (declaredTotal !== null && declaredTotal !== parsed.declaredTotal) {
        throw new Error(`Total SIGEF mudou durante paginação: ${declaredTotal} -> ${parsed.declaredTotal}.`);
      }
      declaredTotal = parsed.declaredTotal;
    }

    for (const movement of parsed.movements) {
      const previous = byId.get(movement.id);
      if (previous && JSON.stringify(previous) !== JSON.stringify(movement)) {
        throw new Error(`Conflito no movimento ${movement.id}.`);
      }
      byId.set(movement.id, movement);
      if (!coverageThrough || movement.movementDate > coverageThrough) {
        coverageThrough = movement.movementDate;
      }
    }

    for (const next of parsed.pageUrls) {
      if (!scheduled.has(next)) {
        scheduled.add(next);
        queue.push(next);
      }
    }
  }

  const movements = [...byId.values()].sort(
    (left, right) => right.movementDate.localeCompare(left.movementDate) || left.id.localeCompare(right.id),
  );

  return {
    status: declaredTotal === null || declaredTotal === movements.length ? 'COMPLETE' : 'PARTIAL',
    pagesFetched,
    declaredTotal,
    movements,
    coverageThrough,
  };
}
