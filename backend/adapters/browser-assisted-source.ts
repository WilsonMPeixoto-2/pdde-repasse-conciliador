import { PlaywrightCrawler } from 'crawlee';
import type { Page } from 'playwright';

export interface InteractiveChallengeSnapshot {
  url: string;
  text: string;
  matchingSelectors: string[];
}

export interface InteractiveChallengeDetection {
  detected: boolean;
  reasons: string[];
}

export interface HumanInterventionContext {
  url: string;
  reasons: string[];
  attempt: number;
}

export type HumanInterventionHandler = (context: HumanInterventionContext) => Promise<void>;

export interface ResolveInteractiveChallengeOptions {
  initialSnapshot: InteractiveChallengeSnapshot;
  onIntervention?: HumanInterventionHandler;
  refreshSnapshot(): Promise<InteractiveChallengeSnapshot>;
  maxHumanAttempts?: number;
}

export interface ResolveInteractiveChallengeResult {
  resolved: boolean;
  interventions: number;
  snapshot: InteractiveChallengeSnapshot;
}

export interface AssistedBrowserCollectionOptions {
  url: string;
  interactive?: boolean;
  onIntervention?: HumanInterventionHandler;
  challengeSelectors?: string[];
  maxHumanAttempts?: number;
  timeoutMs?: number;
  now?: () => string;
}

export interface AssistedBrowserCollectionResult {
  html: string;
  sourceUrl: string;
  queriedAt: string;
  humanInterventionUsed: boolean;
  interventions: number;
}

const DEFAULT_SELECTORS = [
  '#captcha',
  '.captcha',
  '[id*="captcha" i]',
  '[class*="captcha" i]',
  'iframe[src*="recaptcha" i]',
  'iframe[src*="hcaptcha" i]',
  '[data-sitekey]',
];

const TEXT_MARKERS = [
  'captcha',
  'recaptcha',
  'hcaptcha',
  'não sou um robô',
  'nao sou um robo',
  'confirme que você não é um robô',
  'confirme que voce nao e um robo',
  'verificação de segurança',
  'verificacao de seguranca',
];

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export class HumanInterventionRequiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'HumanInterventionRequiredError';
  }
}

export function detectInteractiveChallenge(
  snapshot: InteractiveChallengeSnapshot,
): InteractiveChallengeDetection {
  const reasons: string[] = [];
  const pageText = normalized(snapshot.text);
  for (const marker of TEXT_MARKERS) {
    if (pageText.includes(normalized(marker))) reasons.push(`texto: ${marker}`);
  }
  for (const selector of snapshot.matchingSelectors) {
    reasons.push(`seletor de CAPTCHA/desafio: ${selector}`);
  }
  const url = normalized(snapshot.url);
  if (url.includes('captcha') || url.includes('challenge')) reasons.push(`URL de desafio: ${snapshot.url}`);
  return { detected: reasons.length > 0, reasons: [...new Set(reasons)] };
}

export async function resolveInteractiveChallenge(
  options: ResolveInteractiveChallengeOptions,
): Promise<ResolveInteractiveChallengeResult> {
  const maxHumanAttempts = options.maxHumanAttempts ?? 2;
  if (!Number.isSafeInteger(maxHumanAttempts) || maxHumanAttempts < 1 || maxHumanAttempts > 10) {
    throw new RangeError('maxHumanAttempts deve estar entre 1 e 10.');
  }

  let snapshot = options.initialSnapshot;
  let interventions = 0;
  while (true) {
    const challenge = detectInteractiveChallenge(snapshot);
    if (!challenge.detected) return { resolved: true, interventions, snapshot };
    if (!options.onIntervention) {
      throw new HumanInterventionRequiredError(
        `A página exige intervenção humana antes de continuar: ${challenge.reasons.join('; ')}.`,
      );
    }
    if (interventions >= maxHumanAttempts) {
      return { resolved: false, interventions, snapshot };
    }
    interventions += 1;
    await options.onIntervention({
      url: snapshot.url,
      reasons: challenge.reasons,
      attempt: interventions,
    });
    snapshot = await options.refreshSnapshot();
  }
}

async function snapshotPage(
  page: Page,
  selectors: readonly string[],
): Promise<InteractiveChallengeSnapshot> {
  const matchingSelectors: string[] = [];
  for (const selector of selectors) {
    const count = await page.locator(selector).count().catch(() => 0);
    if (count > 0) matchingSelectors.push(selector);
  }
  const text = await page.locator('body').innerText({ timeout: 3_000 }).catch(() => '');
  return { url: page.url(), text, matchingSelectors };
}

export async function collectWithAssistedBrowser(
  options: AssistedBrowserCollectionOptions,
): Promise<AssistedBrowserCollectionResult> {
  const parsedUrl = new URL(options.url).toString();
  const selectors = options.challengeSelectors ?? DEFAULT_SELECTORS;
  const timeoutMs = options.timeoutMs ?? 60_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1_000 || timeoutMs > 600_000) {
    throw new RangeError('timeoutMs do browser deve estar entre 1000 e 600000.');
  }
  const now = options.now ?? (() => new Date().toISOString());
  let result: AssistedBrowserCollectionResult | null = null;

  const crawler = new PlaywrightCrawler({
    maxConcurrency: 1,
    maxRequestsPerCrawl: 1,
    requestHandlerTimeoutSecs: Math.ceil(timeoutMs / 1_000),
    launchContext: {
      launchOptions: {
        headless: options.interactive !== true,
      },
    },
    async requestHandler({ page }) {
      const initialSnapshot = await snapshotPage(page, selectors);
      const resolution = await resolveInteractiveChallenge({
        initialSnapshot,
        ...(options.onIntervention ? { onIntervention: options.onIntervention } : {}),
        refreshSnapshot: async () => snapshotPage(page, selectors),
        maxHumanAttempts: options.maxHumanAttempts,
      });
      if (!resolution.resolved) {
        throw new HumanInterventionRequiredError(
          `O desafio permaneceu ativo após ${resolution.interventions} intervenção(ões) humana(s).`,
        );
      }
      result = {
        html: await page.content(),
        sourceUrl: page.url(),
        queriedAt: now(),
        humanInterventionUsed: resolution.interventions > 0,
        interventions: resolution.interventions,
      };
    },
  });

  await crawler.run([parsedUrl]);
  if (!result) throw new Error(`Browser assistido não produziu resultado para ${parsedUrl}.`);
  return result;
}
