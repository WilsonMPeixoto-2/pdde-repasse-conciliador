import { load } from 'cheerio';
import {
  canonicalCnpj,
  canonicalProgramCode,
  canonicalText,
} from '../core/normalization';
import type { BankAccount } from '../core/schemas';
import {
  collectSigefPublicAccount as collectSigefPublicAccountCore,
  decodeSigefHtml,
  formatSigefAccount,
  parseSigefPublicPage,
  type SigefAccountResult as CoreSigefAccountResult,
  type SigefPublicMovement,
} from './sigef-public-statement-core';

export * from './sigef-public-statement-core';

const EXPORT_BASE = 'https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel';

interface SigefPublicStatementExportUrlInput {
  cnpj: string;
  programCode: string;
  account: BankAccount;
  startYear: number;
  startMonth?: number;
}

export interface SigefPublicExportFetchResult {
  html: string;
  rawBytes: Buffer;
}

export interface SigefSupplementalExportObservation {
  attempted: true;
  url: string;
  movementCount: number;
  failure: string | null;
}

type CoreCollectInput = Parameters<typeof collectSigefPublicAccountCore>[0];
type CollectPrimary = (input: CoreCollectInput) => Promise<CoreSigefAccountResult>;
type FetchExport = (url: string, signal?: AbortSignal) => Promise<SigefPublicExportFetchResult>;

export type CollectSigefPublicAccountInput = CoreCollectInput & {
  requiredThrough?: string;
  collectPrimary?: CollectPrimary;
  fetchExport?: FetchExport;
};

function alphaNum(value: string, label: string): string {
  const normalized = value.replace(/[^0-9A-Z]/gi, '').toUpperCase();
  if (!normalized) throw new Error(`${label} vazio para exportação SIGEF.`);
  return normalized;
}

function canonicalAgency(value: string): string {
  return alphaNum(value, 'Agência').padStart(4, '0');
}

function validateMonth(month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Mês inicial inválido para exportação SIGEF: ${month}.`);
  }
  return month;
}

function validateYear(year: number): number {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Ano inicial inválido para exportação SIGEF: ${year}.`);
  }
  return year;
}

export function buildSigefPublicStatementExportUrl(
  input: SigefPublicStatementExportUrlInput,
): string {
  const cnpj = canonicalCnpj(input.cnpj);
  if (!cnpj) throw new Error('CNPJ inválido para exportação SIGEF.');
  const programCode = canonicalProgramCode(input.programCode);
  if (!programCode) throw new Error('Programa inválido para exportação SIGEF.');
  const bank = alphaNum(input.account.bank, 'Banco').padStart(3, '0');
  const agency = canonicalAgency(input.account.agency);
  const account = formatSigefAccount(input.account.number);
  const year = validateYear(input.startYear);
  const month = validateMonth(input.startMonth ?? 1);
  const date = `${String(month).padStart(2, '0')}${year}`;

  return `${EXPORT_BASE}/banco/${bank}/agencia/${agency}/contacorrente/${account}/cnpj/${cnpj}/programa/${programCode}/data/${date}`;
}

function valueAfterLabel(html: string, label: string): string {
  const $ = load(html);
  const wanted = canonicalText(label).replace(/:$/, '');
  let value = '';
  $('th,td').each((_, element) => {
    if (value) return;
    const current = canonicalText($(element).text()).replace(/:$/, '');
    if (current !== wanted) return;
    value = $(element).next('td').text().trim();
  });
  return value;
}

function syntheticIdentity(expected: {
  cnpj: string;
  programCode: string;
  account: BankAccount;
}): string {
  const cnpj = canonicalCnpj(expected.cnpj);
  const programCode = canonicalProgramCode(expected.programCode);
  if (!cnpj || !programCode) throw new Error('Identidade esperada inválida para exportação SIGEF.');
  return `<table data-pdde-synthetic-identity="true"><tr><th>CNPJ</th><td>${cnpj}</td><th>Razão Social</th><td>EXPORTACAO PUBLICA SIGEF</td></tr><tr><th>Banco</th><td>${alphaNum(expected.account.bank, 'Banco').padStart(3, '0')}</td><th>Agência</th><td>${canonicalAgency(expected.account.agency)}</td></tr><tr><th>Conta Corrente</th><td>${formatSigefAccount(expected.account.number)}</td><th>Programa</th><td>${programCode} - PROGRAMA DINHEIRO DIRETO NA ESCOLA</td></tr></table>`;
}

/**
 * A exportação `visualizaexcel` não repete banco/agência/conta no cabeçalho.
 * A identidade forte vem da URL determinística solicitada; antes de completar
 * o cabeçalho para reutilizar o parser estável, o CNPJ devolvido pela própria
 * exportação é conferido contra o CNPJ esperado.
 */
export function parseSigefPublicExport(
  html: string,
  sourceUrl: string,
  expected: {
    cnpj: string;
    programCode: string;
    account: BankAccount;
  },
) {
  const observedCnpj = canonicalCnpj(valueAfterLabel(html, 'CNPJ'));
  const expectedCnpj = canonicalCnpj(expected.cnpj);
  if (!observedCnpj || !expectedCnpj || observedCnpj !== expectedCnpj) {
    throw new Error('CNPJ divergente na exportação pública do SIGEF.');
  }

  const identity = syntheticIdentity(expected);
  const augmented = /<body[^>]*>/i.test(html)
    ? html.replace(/<body[^>]*>/i, (match) => `${match}${identity}`)
    : `<html><body>${identity}${html}</body></html>`;
  return parseSigefPublicPage(augmented, sourceUrl, {
    cnpj: expectedCnpj,
    programCode: canonicalProgramCode(expected.programCode),
    account: expected.account,
  });
}

async function defaultFetchExport(
  url: string,
  signal?: AbortSignal,
): Promise<SigefPublicExportFetchResult> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'text/html,application/xhtml+xml,application/octet-stream;q=0.9,*/*;q=0.8',
      'user-agent': 'PDDE-4CRE-Concilia/2026 (+consulta-publica-fnde)',
    },
    ...(signal ? { signal } : {}),
  });
  if (!response.ok) {
    throw new Error(`Exportação pública SIGEF respondeu HTTP ${response.status}.`);
  }
  const rawBytes = Buffer.from(await response.arrayBuffer());
  const html = decodeSigefHtml(rawBytes, response.headers.get('content-type'));
  return { html, rawBytes };
}

function movementFingerprint(movement: SigefPublicMovement): string {
  return JSON.stringify([
    movement.schoolCnpj,
    movement.programCode,
    movement.account.bank,
    movement.account.agency,
    movement.account.number,
    movement.movementDate,
    movement.operation,
    movement.amountCents,
    movement.document,
    movement.history,
    movement.counterparty.document,
    movement.counterparty.name,
    movement.counterparty.bank,
    movement.counterparty.agency,
    movement.counterparty.account,
  ]);
}

function mergeWithoutDuplicatingOverlap(
  primary: readonly SigefPublicMovement[],
  supplemental: readonly SigefPublicMovement[],
): SigefPublicMovement[] {
  const overlap = new Map<string, number>();
  for (const movement of primary) {
    const key = movementFingerprint(movement);
    overlap.set(key, (overlap.get(key) ?? 0) + 1);
  }

  const merged = [...primary];
  for (const movement of supplemental) {
    const key = movementFingerprint(movement);
    const remaining = overlap.get(key) ?? 0;
    if (remaining > 0) {
      overlap.set(key, remaining - 1);
      continue;
    }
    merged.push(movement);
  }
  return merged;
}

function latestMovementDate(movements: readonly SigefPublicMovement[]): string | null {
  return movements.length > 0
    ? movements.map((movement) => movement.movementDate).sort().at(-1) ?? null
    : null;
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

/**
 * Mantém a rota paginada como aquisição primária e escala para a exportação
 * pública somente quando há uma data financeira conhecida que a primeira rota
 * não alcança. A falha complementar nunca apaga nem rebaixa o resultado
 * primário por si só.
 */
export async function collectSigefPublicAccount(
  input: CollectSigefPublicAccountInput,
): Promise<CoreSigefAccountResult & { supplementalExport?: SigefSupplementalExportObservation }> {
  const {
    requiredThrough,
    collectPrimary = collectSigefPublicAccountCore,
    fetchExport = defaultFetchExport,
    ...coreInput
  } = input;
  const primary = await collectPrimary(coreInput);
  if (!requiredThrough || (primary.coverageThrough && primary.coverageThrough >= requiredThrough)) {
    return primary;
  }

  const url = buildSigefPublicStatementExportUrl(input);
  try {
    const fetched = await fetchExport(url, input.signal);
    const parsed = parseSigefPublicExport(fetched.html, url, {
      cnpj: input.cnpj,
      programCode: input.programCode,
      account: input.account,
    });
    const movements = mergeWithoutDuplicatingOverlap(primary.movements, parsed.movements);
    const coverageThrough = latestMovementDate(movements) ?? primary.coverageThrough;
    return {
      ...primary,
      movements,
      coverageThrough,
      supplementalExport: {
        attempted: true,
        url,
        movementCount: parsed.movements.length,
        failure: null,
      },
    };
  } catch (cause) {
    return {
      ...primary,
      supplementalExport: {
        attempted: true,
        url,
        movementCount: 0,
        failure: errorText(cause),
      },
    };
  }
}
