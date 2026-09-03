#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const dist = new URL('../dist/', import.meta.url);
const output = new URL('../artifacts/frontend-product-smoke/', import.meta.url);
await mkdir(output, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  const wanted = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\/+/, '');
  const safe = normalize(wanted).replace(/^(\.\.(\/|\\|$))+/, '');
  let path = join(dist.pathname, safe);
  try {
    const info = await stat(path);
    if (info.isDirectory()) path = join(path, 'index.html');
    const data = await readFile(path);
    res.writeHead(200, { 'content-type': mime[extname(path)] ?? 'application/octet-stream' });
    return res.end(data);
  } catch {
    const data = await readFile(join(dist.pathname, 'index.html'));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    return res.end(data);
  }
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Servidor de smoke sem porta TCP.');
const base = `http://127.0.0.1:${address.port}`;
const browser = await chromium.launch({ headless: true });

async function assertNoPasswordUi(page) {
  const body = await page.locator('body').innerText();
  for (const forbidden of ['Chave de acesso', 'Modo Sessão', 'Nova consulta temporária', 'Informe a chave de acesso']) {
    if (body.includes(forbidden)) throw new Error(`A interface ainda expõe texto proibido: ${forbidden}`);
  }
  if (await page.locator('input[type="password"]').count()) {
    throw new Error('A interface ainda contém campo de senha.');
  }
}

async function assertNoHorizontalOverflow(page) {
  const result = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  if (result.width > result.viewport + 2) {
    throw new Error(`Overflow horizontal: ${result.width}px > ${result.viewport}px.`);
  }
}

async function assertPrimaryMetricsFit(page) {
  const measurements = await page.locator('.metrics-band').first().locator('.metric').evaluateAll((metrics) => (
    metrics.map((metric) => {
      const value = metric.querySelector('.metric-value');
      if (!value) return null;
      const metricBox = metric.getBoundingClientRect();
      const valueBox = value.getBoundingClientRect();
      return {
        label: metric.querySelector('.metric__label')?.textContent ?? 'métrica',
        metricLeft: metricBox.left,
        metricRight: metricBox.right,
        valueLeft: valueBox.left,
        valueRight: valueBox.right,
        scrollWidth: value.scrollWidth,
        clientWidth: value.clientWidth,
      };
    }).filter(Boolean)
  ));

  for (const item of measurements) {
    const escapesOwnColumn = item.valueLeft < item.metricLeft - 1 || item.valueRight > item.metricRight + 1;
    const clipsInternally = item.scrollWidth > item.clientWidth + 1;
    if (escapesOwnColumn || clipsInternally) {
      throw new Error(`Valor da métrica "${item.label}" não cabe na própria coluna.`);
    }
  }
}

async function assertFormattedSmeSearch(page) {
  const input = page.getByLabel('Encontrar uma escola');
  await input.fill('04.10.001');
  await page.getByText('EM EMA NEGRAO DE LIMA', { exact: true }).waitFor();
  await input.fill('');
}

async function assertCoreNavigation(page) {
  for (const name of [
    'Visão geral',
    'Escolas',
    'Repasses',
    'Contas e saldos',
    'Evolução mensal',
    'Movimentações',
    'Cadastro e habilitação',
    'Pendências e suspensões',
    'Prestação de contas',
    'Cobertura das fontes',
  ]) {
    await page.getByRole('link', { name, exact: true }).first().waitFor();
  }
}

async function assertSchoolAnchor(page, expectedHash, expectedHeading) {
  const firstSchool = page.locator('.data-table tbody a').first();
  await firstSchool.waitFor();
  await firstSchool.click();
  await page.waitForLoadState('networkidle');
  if (!page.url().includes(expectedHash)) {
    throw new Error(`Navegação da escola não preservou a âncora ${expectedHash}: ${page.url()}`);
  }
  await page.getByRole('heading', { name: expectedHeading, exact: true }).waitFor();
  await assertNoHorizontalOverflow(page);
}

async function smoke(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor();
  await page.getByRole('heading', { name: 'O que você precisa consultar?' }).waitFor();
  await page.getByText(/163 unidades/i).first().waitFor();
  await assertCoreNavigation(page);
  await assertNoPasswordUi(page);
  await assertNoHorizontalOverflow(page);
  await assertPrimaryMetricsFit(page);
  await assertFormattedSmeSearch(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });

  await page.goto(`${base}/unidades`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Unidades da 4ª CRE' }).waitFor();
  await page.getByRole('heading', { name: '163 unidades no recorte' }).waitFor();
  await assertCoreNavigation(page);
  await assertNoPasswordUi(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: new URL(`unidades-${suffix}.png`, output).pathname, fullPage: true });

  const pages = [
    ['/repasses', 'Repasses', 'repasses'],
    ['/saldos', 'Contas e Saldos', 'saldos'],
    ['/evolucao', 'Evolução Mensal', 'evolucao'],
    ['/movimentacoes', 'Movimentações', 'movimentacoes'],
    ['/cadastro', 'Cadastro e Habilitação', 'cadastro'],
    ['/pendencias', 'Pendências e Suspensões', 'pendencias'],
    ['/prestacao-contas', 'Prestação de Contas', 'prestacao-contas'],
    ['/cobertura', 'Cobertura das Fontes', 'cobertura'],
  ];

  for (const [path, heading, screenshot] of pages) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: heading, exact: true }).first().waitFor();
    await assertCoreNavigation(page);
    await assertNoPasswordUi(page);
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: new URL(`${screenshot}-${suffix}.png`, output).pathname, fullPage: true });
  }

  await page.goto(`${base}/repasses`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Repasses', exact: true }).waitFor();
  await assertSchoolAnchor(page, '#repasses', 'Repasses');

  await page.goto(`${base}/saldos`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Contas e Saldos', exact: true }).waitFor();
  await assertSchoolAnchor(page, '#contas-saldos', 'Contas e saldos');

  await context.close();
}

try {
  await smoke({ width: 1440, height: 1000 }, 'desktop');
  await smoke({ width: 390, height: 844 }, 'mobile');
  console.log('Frontend financeiro aprovado em desktop/mobile: home, escolas, dez dimensões de dados e âncoras do prontuário.');
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
