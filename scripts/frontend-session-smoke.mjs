#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const dist = new URL('../dist/', import.meta.url);
const output = new URL('../artifacts/frontend-product-smoke/', import.meta.url);
const fs = await import('node:fs/promises');
await fs.mkdir(output, { recursive: true });

const unit = { sme: '0410001', name: 'EM EMA NEGRAO DE LIMA', inep: '33069247' };
const portfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  schoolCount: 1,
  metrics: {
    schoolCount: 1,
    accountsTotal: 1,
    accountsWithPosition: 1,
    programmedCents: 418500,
    paymentInformedCents: 418500,
    creditLocatedCents: 418500,
    reportedBalanceCents: 318699,
    applicationsCents: 318699,
  },
  indicators: [{ label: '1ª parcela com pagamento informado', count: 1, units: [unit] }],
  sources: [
    { name: 'PDDEInfo', information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.' },
    { name: 'SIGEF', information: 'Movimentações das contas e créditos compatíveis localizados no extrato.' },
  ],
  schools: [unit],
};
const school = {
  fiscalYear: 2026,
  school: {
    ...unit,
    uex: 'CAIXA ESCOLAR EMA NEGRAO DE LIMA',
    cnpj: '04500463000173',
  },
  programs: [],
  accounts: [],
  accounting: [],
  followUp: [],
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
};
let polls = 0;

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/api/current/human/portfolio') return json(res, 404, { error: 'not published' });
  if (url.pathname.startsWith('/api/current/human/schools/')) return json(res, 404, { error: 'not published' });

  if (url.pathname === '/api/session') {
    if (!/^Bearer\s+.{24,}$/i.test(req.headers.authorization ?? '')) {
      return json(res, 401, { error: 'Acesso ao Modo Sessão não autorizado.' });
    }
    if (req.method === 'POST') {
      polls = 0;
      return json(res, 202, { sessionId: 'web-smoke-session', state: 'QUEUED' });
    }
    const resource = url.searchParams.get('resource') ?? 'status';
    if (resource === 'status') {
      polls += 1;
      if (polls === 1) return json(res, 200, { state: 'RUNNING', ready: false });
      if (polls === 2) return json(res, 200, { state: 'FINALIZING', ready: false });
      return json(res, 200, { state: 'COMPLETE', ready: true, temporary: true, schoolCount: 1 });
    }
    if (resource === 'portfolio') return json(res, 200, portfolio);
    if (resource === 'school') return json(res, 200, school);
    if (resource === 'export') {
      res.writeHead(200, {
        'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'content-disposition': 'attachment; filename="inteligencia-financeira-pdde-4cre-2026.xlsx"',
        'cache-control': 'no-store',
      });
      return res.end(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    }
    return json(res, 404, { error: 'unknown resource' });
  }

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

async function assertNoOverflow(page) {
  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    page: document.documentElement.scrollWidth,
  }));
  if (dimensions.page > dimensions.viewport + 2) {
    throw new Error(`Overflow horizontal do Modo Sessão: ${dimensions.page}px > ${dimensions.viewport}px.`);
  }
}

async function smoke(viewport, suffix) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'domcontentloaded' });

  await page.getByRole('heading', { name: 'Nenhuma consulta carregada' }).waitFor();
  await page.getByRole('button', { name: 'Nova consulta' }).click();
  await page.getByRole('heading', { name: 'Nova consulta temporária' }).waitFor();
  await page.getByLabel('Chave de acesso').fill('session-access-key-smoke-1234567890');
  await page.getByRole('button', { name: 'Iniciar consulta' }).click();

  await page.getByRole('heading', { name: 'Consulta em andamento' }).waitFor();
  await page.getByText(/Consultando e conciliando as fontes/i).waitFor();
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor({ timeout: 15000 });
  await page.getByText(/Consulta temporária/i).first().waitFor();
  await assertNoOverflow(page);
  await page.screenshot({ path: new URL(`session-home-${suffix}.png`, output).pathname, fullPage: true });

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Baixar Excel' }).click();
  const download = await downloadPromise;
  if (!download.suggestedFilename().endsWith('.xlsx')) throw new Error('Download do Excel não preservou o nome .xlsx.');

  await page.getByRole('link', { name: /0410001 · EM EMA NEGRAO DE LIMA/i }).click();
  await page.getByRole('heading', { name: 'EM EMA NEGRAO DE LIMA' }).waitFor();
  await assertNoOverflow(page);
  await context.close();
}

try {
  await smoke({ width: 1440, height: 1000 }, 'desktop');
  await smoke({ width: 390, height: 844 }, 'mobile');
  console.log(JSON.stringify({ status: 'PASS', mode: 'temporary-session' }, null, 2));
} finally {
  await browser.close();
  server.close();
}
