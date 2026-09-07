import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildSigefPublicStatementUrl,
  decodeSigefHtml,
  fetchSigefPublicPage,
  parseSigefPublicPage,
} from '../backend/adapters/sigef-public-statement-core';
import {
  buildSigefPublicStatementExportUrl,
  parseSigefPublicExport,
} from '../backend/adapters/sigef-public-statement';

interface ProbeResult {
  month: number;
  detailed: {
    url: string;
    finalUrl: string | null;
    movementCount: number;
    latestMovementDate: string | null;
    declaredTotal: number | null;
    error: string | null;
  };
  export: {
    url: string;
    finalUrl: string | null;
    movementCount: number;
    latestMovementDate: string | null;
    bytes: number;
    error: string | null;
  };
}

function positiveInt(value: string, label: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`${label} inválido: ${value}.`);
  return parsed;
}

function monthsFromEnv(value: string | undefined): number[] {
  const raw = value ?? '1,4,5,6,7,8,9,10,11,12';
  const months = [...new Set(raw.split(',').map((part) => positiveInt(part.trim(), 'Mês')))];
  if (months.some((month) => month < 1 || month > 12)) throw new Error(`Meses inválidos: ${raw}.`);
  return months.sort((left, right) => left - right);
}

function latestMovementDate(movements: readonly { movementDate: string }[]): string | null {
  return movements.length > 0
    ? movements.map((movement) => movement.movementDate).sort().at(-1) ?? null
    : null;
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

async function fetchExportHtml(url: string): Promise<{ html: string; bytes: number; finalUrl: string }> {
  const signal = AbortSignal.timeout(45_000);
  const response = await fetch(url, {
    redirect: 'follow',
    signal,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151 Safari/537.36 PDDE-4CRE/0.6',
      Accept: 'text/html,application/xhtml+xml,application/octet-stream;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Cache-Control': 'no-cache, no-store, max-age=0',
      Pragma: 'no-cache',
    },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const raw = Buffer.from(await response.arrayBuffer());
  if (raw.byteLength > 8 * 1024 * 1024) throw new Error('Resposta excedeu 8 MiB.');
  return {
    html: decodeSigefHtml(raw, response.headers.get('content-type')),
    bytes: raw.byteLength,
    finalUrl: response.url,
  };
}

const output = resolve(process.argv[2] ?? 'artifacts/sigef-period-probe.json');
const cnpj = process.env.SIGEF_PROBE_CNPJ ?? '03.178.700/0001-69';
const programCode = process.env.SIGEF_PROBE_PROGRAM ?? '02';
const account = {
  bank: process.env.SIGEF_PROBE_BANK ?? '001',
  agency: process.env.SIGEF_PROBE_AGENCY ?? '0249',
  number: process.env.SIGEF_PROBE_ACCOUNT ?? '0000562858',
};
const year = positiveInt(process.env.SIGEF_PROBE_YEAR ?? '2026', 'Ano');
const months = monthsFromEnv(process.env.SIGEF_PROBE_MONTHS);
const results: ProbeResult[] = [];

for (const month of months) {
  const detailedUrl = buildSigefPublicStatementUrl({ cnpj, programCode, account, startYear: year, startMonth: month });
  const exportUrl = buildSigefPublicStatementExportUrl({ cnpj, programCode, account, startYear: year, startMonth: month });
  const result: ProbeResult = {
    month,
    detailed: {
      url: detailedUrl,
      finalUrl: null,
      movementCount: 0,
      latestMovementDate: null,
      declaredTotal: null,
      error: null,
    },
    export: {
      url: exportUrl,
      finalUrl: null,
      movementCount: 0,
      latestMovementDate: null,
      bytes: 0,
      error: null,
    },
  };

  try {
    const fetched = await fetchSigefPublicPage(detailedUrl, AbortSignal.timeout(45_000));
    const parsed = parseSigefPublicPage(fetched.html, fetched.url, { cnpj, programCode, account });
    result.detailed.finalUrl = fetched.url;
    result.detailed.movementCount = parsed.movements.length;
    result.detailed.latestMovementDate = latestMovementDate(parsed.movements);
    result.detailed.declaredTotal = parsed.declaredTotal;
  } catch (cause) {
    result.detailed.error = errorText(cause);
  }

  try {
    const fetched = await fetchExportHtml(exportUrl);
    const parsed = parseSigefPublicExport(fetched.html, fetched.finalUrl, { cnpj, programCode, account });
    result.export.finalUrl = fetched.finalUrl;
    result.export.bytes = fetched.bytes;
    result.export.movementCount = parsed.movements.length;
    result.export.latestMovementDate = latestMovementDate(parsed.movements);
  } catch (cause) {
    result.export.error = errorText(cause);
  }

  results.push(result);
  console.log(JSON.stringify(result));
}

const document = {
  generatedAt: new Date().toISOString(),
  target: { cnpj, programCode, account, year, months },
  results,
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
console.log(`Resultado preservado em ${output}`);
