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

async function smoke(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor();
  await page.getByText(/163 unidades/i).first().waitFor();
  await assertNoPasswordUi(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });

  await page.goto(`${base}/unidades`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Unidades da 4ª CRE' }).waitFor();
  await page.getByRole('heading', { name: '163 unidades no recorte' }).waitFor();
  await assertNoPasswordUi(page);
  await assertNoHorizontalOverflow(page);
  await page.screenshot({ path: new URL(`unidades-${suffix}.png`, output).pathname, fullPage: true });

  await context.close();
}

try {
  await smoke({ width: 1440, height: 1000 }, 'desktop');
  await smoke({ width: 390, height: 844 }, 'mobile');
  console.log('Frontend publicado sem senha: desktop/mobile aprovados com carteira real de 163 unidades.');
} finally {
  await browser.close();
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
