import { Buffer } from 'node:buffer';
import {
  fetchPddeInfoSchoolHtml,
  type PddeInfoHttpResult,
} from '../adapters/pddeinfo-http';
import {
  parsePddeInfoSchoolHtml,
  type PddeInfoExpectedSchool,
  type PddeInfoRawSchool,
} from '../adapters/pddeinfo-html';
import { collectWithAssistedBrowser } from '../adapters/browser-assisted-source';

export interface PddeInfoSchoolCollectionResult {
  school: PddeInfoRawSchool;
  queriedAt: string;
  rawBytes: Buffer;
  via: 'HTTP' | 'BROWSER_ASSISTED';
}

export type FetchPddeInfoHttp = (
  options: Parameters<typeof fetchPddeInfoSchoolHtml>[0],
) => Promise<PddeInfoHttpResult>;

export type FetchPddeInfoBrowser = (options: {
  url: string;
  timeoutMs: number;
  readySelector: string;
}) => Promise<{
  html: string;
  sourceUrl: string;
  queriedAt: string;
}>;

export interface CollectPddeInfoSchoolWithFallbackOptions {
  school: PddeInfoExpectedSchool;
  fiscalYear: 2026;
  signal?: AbortSignal;
  fetchHttp?: FetchPddeInfoHttp;
  fetchBrowser?: FetchPddeInfoBrowser;
  sleep?: (milliseconds: number) => Promise<void>;
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function pddeInfoNeedsRenderedDom(cause: unknown): boolean {
  if (!(cause instanceof Error)) return false;
  return [
    'bloco de identificação da escola não localizado',
    'bloco da Unidade Executora Própria não localizado',
    'tabela financeira de destinações não localizada',
  ].some((marker) => cause.message.includes(marker));
}

function parsedResult(input: {
  html: string;
  sourceUrl: string;
  queriedAt: string;
  rawBytes: Buffer;
  via: 'HTTP' | 'BROWSER_ASSISTED';
  school: PddeInfoExpectedSchool;
}): PddeInfoSchoolCollectionResult {
  const school = parsePddeInfoSchoolHtml(input.html, {
    expectedSchool: input.school,
    sourceUrl: input.sourceUrl,
  });
  return {
    school,
    queriedAt: input.queriedAt,
    rawBytes: input.rawBytes,
    via: input.via,
  };
}

export async function collectPddeInfoSchoolWithFallback(
  options: CollectPddeInfoSchoolWithFallbackOptions,
): Promise<PddeInfoSchoolCollectionResult> {
  const fetchHttp = options.fetchHttp ?? fetchPddeInfoSchoolHtml;
  const fetchBrowser = options.fetchBrowser ?? (async ({ url, timeoutMs, readySelector }) => (
    collectWithAssistedBrowser({
      url,
      timeoutMs,
      readySelector,
      interactive: false,
    })
  ));
  const sleep = options.sleep ?? defaultSleep;
  let lastError: Error | null = null;

  for (let round = 1; round <= 2; round += 1) {
    options.signal?.throwIfAborted();
    try {
      const http = await fetchHttp({
        fiscalYear: options.fiscalYear,
        inep: options.school.inep,
        maxAttempts: 2,
        timeoutMs: 25_000,
        retryBackoffMs: 750,
        ...(options.signal ? { signal: options.signal } : {}),
      });

      try {
        return parsedResult({
          html: http.html,
          sourceUrl: http.sourceUrl,
          queriedAt: http.queriedAt,
          rawBytes: http.rawBytes ?? Buffer.from(http.html, 'utf8'),
          via: 'HTTP',
          school: options.school,
        });
      } catch (cause) {
        if (!pddeInfoNeedsRenderedDom(cause)) throw cause;
      }

      const rendered = await fetchBrowser({
        url: http.sourceUrl,
        timeoutMs: 60_000,
        readySelector: '.govbr-school-card-body',
      });
      return parsedResult({
        html: rendered.html,
        sourceUrl: rendered.sourceUrl,
        queriedAt: rendered.queriedAt,
        rawBytes: Buffer.from(rendered.html, 'utf8'),
        via: 'BROWSER_ASSISTED',
        school: options.school,
      });
    } catch (cause) {
      options.signal?.throwIfAborted();
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      if (round < 2) await sleep(1_500);
    }
  }

  throw lastError ?? new Error(
    `Falha desconhecida na coleta PDDEInfo para ${options.school.inep}.`,
  );
}
