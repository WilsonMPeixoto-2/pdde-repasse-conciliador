import { writeFile } from 'node:fs/promises';
import { chromium, type Page } from 'playwright';

const INEP = '33069247';
const REPORTS = [
  ['saldo', 'https://www.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade'],
  ['atendimento', 'https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade'],
  ['prestacao', 'https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta'],
  ['abertura-contas', 'https://www.fnde.gov.br/pddeinfo/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade'],
] as const;

async function inventory(page: Page) {
  return page.evaluate(() => ({
    url: location.href,
    title: document.title,
    forms: [...document.forms].map((form) => ({
      action: form.action,
      method: form.method,
      controls: [...form.elements].map((element) => {
        const input = element as HTMLInputElement;
        const select = element as HTMLSelectElement;
        return {
          tag: element.tagName.toLowerCase(),
          name: input.name || null,
          id: input.id || null,
          type: input.type || null,
          value: input.value || null,
          checked: typeof input.checked === 'boolean' ? input.checked : null,
          options: element.tagName === 'SELECT'
            ? [...select.options].map((option) => ({ value: option.value, text: option.text.trim(), selected: option.selected }))
            : undefined,
        };
      }),
    })),
    tables: [...document.querySelectorAll('table')].map((table) => ({
      headers: [...table.querySelectorAll('th')].map((cell) => cell.textContent?.trim() ?? ''),
      firstRows: [...table.querySelectorAll('tr')].slice(0, 5).map((row) =>
        [...row.querySelectorAll('th,td')].map((cell) => cell.textContent?.replace(/\s+/g, ' ').trim() ?? ''),
      ),
    })),
    bodyText: document.body.innerText.slice(0, 12_000),
  }));
}

async function trySchoolQuery(page: Page, kind: string) {
  const year = page.locator('select[name="ano"]');
  if (await year.count()) {
    const options = await year.locator('option').evaluateAll((items) => items.map((item) => ({ value: (item as HTMLOptionElement).value, text: item.textContent?.trim() })));
    const option2026 = options.find((item) => item.value === '2026' || item.text === '2026');
    if (option2026) await year.selectOption(option2026.value);
  }

  const inep = page.locator('input[name="co_escola"]');
  if (await inep.count()) await inep.fill(INEP);

  const municipal = page.locator('input[name="co_esfera_adm[]"][value="2"]');
  if (await municipal.count()) await municipal.check().catch(() => undefined);

  const uf = page.locator('input[name="siglaUf[]"][value="RJ"]');
  if (await uf.count()) await uf.check().catch(() => undefined);

  const reportType = page.locator('input[name="tpRelatorio"][value="1"]');
  if (await reportType.count()) await reportType.check().catch(() => undefined);

  const submit = page.locator('input[name="consultar"], button[name="consultar"], input[value="Consultar"], button:has-text("Consultar")').first();
  if (!(await submit.count())) return { submitted: false, reason: 'submit não localizado' };

  const requests: string[] = [];
  const recordRequest = (request: { url(): string }) => {
    const url = request.url();
    if (url.includes('/pddeinfo/')) requests.push(url);
  };
  page.on('request', recordRequest);
  try {
    await Promise.all([
      page.waitForLoadState('networkidle', { timeout: 30_000 }).catch(() => undefined),
      submit.click(),
    ]);
    return { submitted: true, kind, requests: [...new Set(requests)], after: await inventory(page) };
  } finally {
    page.off('request', recordRequest);
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const output: Record<string, unknown> = {
    probedAt: new Date().toISOString(),
    inep: INEP,
    reports: {},
  };
  try {
    for (const [kind, url] of REPORTS) {
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
        const before = await inventory(page);
        const query = kind === 'saldo' ? null : await trySchoolQuery(page, kind);
        (output.reports as Record<string, unknown>)[kind] = { before, query };
      } catch (cause) {
        (output.reports as Record<string, unknown>)[kind] = {
          error: cause instanceof Error ? cause.stack ?? cause.message : String(cause),
        };
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
  }
  const target = process.argv[2] ?? 'fnde-public-reports-probe.json';
  await writeFile(target, JSON.stringify(output, null, 2), 'utf8');
  console.log(`probe escrito em ${target}`);
}

await main();
