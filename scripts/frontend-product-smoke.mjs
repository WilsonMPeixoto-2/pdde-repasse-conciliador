#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const dist = new URL('../dist/', import.meta.url);
const output = new URL('../artifacts/frontend-product-smoke/', import.meta.url);
const fs = await import('node:fs/promises');
await fs.mkdir(output, { recursive: true });

const units = [
  { sme: '0410002', name: 'EM ALBINO SOUZA CRUZ', inep: '33069093' },
  { sme: '0410018', name: 'EM BERLIM', inep: '33069107' },
  { sme: '0410025', name: 'EM ANIBAL FREIRE', inep: '33069115' },
  { sme: '0410031', name: 'EM CIDADE NOVA', inep: '33069123' },
];

const portfolio = {
  title: 'Inteligência Financeira PDDE | 4ª CRE',
  fiscalYear: 2026,
  referenceLabel: 'Posição financeira pública disponível até 30/06/2026',
  schoolCount: units.length,
  metrics: {
    schoolCount: units.length,
    accountsTotal: 7,
    accountsWithPosition: 6,
    programmedCents: 5337200,
    paymentInformedCents: 2532500,
    creditLocatedCents: 1881500,
    reportedBalanceCents: 164203441,
    applicationsCents: 136401711,
  },
  sources: [
    { name: 'PDDEInfo', information: 'Repasses informados, contas vinculadas, saldos e situação da prestação de contas.' },
    { name: 'SIGEF', information: 'Movimentações das contas e créditos compatíveis localizados no extrato.' },
  ],
  indicators: [
    { label: 'Conta do repasse não exibida', count: 3, units: units.slice(0, 3) },
    { label: '1ª parcela com pagamento informado', count: 2, units: units.slice(0, 2) },
    { label: 'Informação parcial', count: 1, units: [units[0]] },
  ],
  schools: units,
};

const school = {
  fiscalYear: 2026,
  school: {
    inep: '33069093', sme: '0410002', name: 'EM ALBINO SOUZA CRUZ',
    uex: 'CONSELHO ESCOLA COMUNIDADE DA EM ALBINO SOUZA CRUZ', cnpj: '01856391000103',
  },
  programs: [
    {
      name: 'PDDE / PDDE Básico',
      installments: [
        {
          installment: '1ª Parcela', programmedCents: 506500, paymentInformedCents: 506500,
          paymentInformedDate: '2026-08-05', paymentOrderDate: '2026-08-04',
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: { status: 'Crédito localizado', date: '2026-08-06', amountCents: 506500, document: 'OB123' },
          note: null,
        },
        {
          installment: '2ª Parcela', programmedCents: 506500, paymentInformedCents: 0,
          paymentInformedDate: null, paymentOrderDate: null,
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: { status: 'Pagamento não informado', date: null, amountCents: null, document: null },
          note: null,
        },
      ],
    },
    {
      name: 'PDDE QUALIDADE / Educação Conectada 2026',
      installments: [{
        installment: null, programmedCents: 332800, paymentInformedCents: 0,
        paymentInformedDate: null, paymentOrderDate: null,
        account: { bank: '001', agency: '0249', number: '0000546032' },
        creditEvidence: { status: 'Pagamento não informado', date: null, amountCents: null, document: null },
        note: null,
      }],
    },
  ],
  accounts: [
    {
      program: 'PDDE', bank: '001', agency: '0249', account: '0000549797',
      positions: [
        { referenceDate: '2026-01-31', checkingBalanceCents: 111, applications: { fundsCents: 0, savingsCents: 0, rdbCdbCents: 0, totalCents: 0 }, totalReportedBalanceCents: 111 },
        { referenceDate: '2026-03-31', checkingBalanceCents: 2400, applications: { fundsCents: 100000, savingsCents: 0, rdbCdbCents: 0, totalCents: 100000 }, totalReportedBalanceCents: 102400 },
        { referenceDate: '2026-06-30', checkingBalanceCents: 111, applications: { fundsCents: 415032, savingsCents: 0, rdbCdbCents: 0, totalCents: 415032 }, totalReportedBalanceCents: 415143 },
      ],
      latestPosition: { referenceDate: '2026-06-30', checkingBalanceCents: 111, applications: { fundsCents: 415032, savingsCents: 0, rdbCdbCents: 0, totalCents: 415032 }, totalReportedBalanceCents: 415143 },
      movements: [
        { date: '2026-06-21', description: 'PAGAMENTO PIX', document: 'PX1', category: 'PAGAMENTO_TRANSFERENCIA', creditCents: null, debitCents: 124000, counterparty: { document: null, name: 'FORNECEDOR', bank: '001', agency: null, account: null } },
        { date: '2026-06-10', description: 'APLICAÇÃO', document: 'AP1', category: 'APLICACAO', creditCents: null, debitCents: 380000, counterparty: null },
        { date: '2026-05-06', description: 'CRÉDITO FNDE', document: 'OB123', category: 'CREDITO_FNDE', creditCents: 506500, debitCents: null, counterparty: null },
      ],
      note: 'Saldo informado pelo FNDE com posição até 30/06/2026.',
    },
  ],
  accounting: [{ program: 'PDDE', status: 'ADIMPLENTE', paymentSuspended: false, expectedTotalCents: 1013000 }],
  followUp: ['Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.'],
};

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

function sendJson(res, value) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/api/current/human/portfolio') return sendJson(res, portfolio);
  if (url.pathname === '/api/current/human/schools/33069093') return sendJson(res, school);
  if (url.pathname.startsWith('/api/current/human/schools/')) {
    res.writeHead(404, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not found' }));
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

async function assertNoTechnicalMetadata(page) {
  const html = (await page.locator('body').innerText()).toLowerCase();
  for (const forbidden of ['sha256', 'parser', 'sourceurl', 'pagesfetched', 'technicalclassification', 'requesthash', 'payload', 'retry', 'runid']) {
    if (html.includes(forbidden)) throw new Error(`Metadado técnico vazou no DOM: ${forbidden}`);
  }
}

async function assertNoMainOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewport = window.innerWidth;
    const offenders = [...document.querySelectorAll('body *')]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          className: typeof element.className === 'string' ? element.className : '',
          text: (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 90),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      })
      .filter((item) => item.right > viewport + 2 || item.left < -2 || item.scrollWidth > item.clientWidth + 2)
      .sort((a, b) => Math.max(b.right - viewport, b.scrollWidth - b.clientWidth) - Math.max(a.right - viewport, a.scrollWidth - a.clientWidth))
      .slice(0, 12);
    return { width: document.documentElement.scrollWidth, viewport, offenders };
  });
  if (overflow.width > overflow.viewport + 2) {
    throw new Error(`Overflow horizontal global: ${overflow.width}px > ${overflow.viewport}px. Ofensores: ${JSON.stringify(overflow.offenders)}`);
  }
}

async function smoke(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor();
  await assertNoTechnicalMetadata(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });
  await assertNoMainOverflow(page);

  const indicator = page.getByRole('link', { name: /3 unidades: Conta do repasse não exibida/i });
  await indicator.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('heading', { name: '3' }).waitFor();
  await page.evaluate(() => window.scrollTo(0, 240));
  await page.evaluate(() => {
    const link = document.querySelector('a[href="/unidades/33069093"]');
    if (!(link instanceof HTMLElement)) throw new Error('Link da unidade piloto não encontrado.');
    link.click();
  });
  await page.getByRole('heading', { name: 'EM ALBINO SOUZA CRUZ' }).waitFor();
  await page.waitForFunction(() => window.scrollY <= 2 && document.activeElement?.tagName === 'MAIN');
  await assertNoTechnicalMetadata(page);
  await assertNoMainOverflow(page);

  const programDisclosure = page.getByRole('button', { name: /PDDE \/ PDDE Básico/ });
  await programDisclosure.click();
  await page.getByText('Ordem FNDE 04/08/2026').waitFor();

  await page.getByText('3 posições publicadas em 2026.').waitFor();
  await page.getByText('Última posição').waitFor();
  const timelinePoint = page.getByRole('button', { name: /MAR: saldo informado/i });
  await timelinePoint.focus();
  await page.keyboard.press('Enter');
  await page.getByText('31/03/2026').last().waitFor();
  await page.keyboard.press('ArrowRight');
  await page.getByText('30/06/2026').last().waitFor();
  await assertNoMainOverflow(page);
  await page.screenshot({ path: new URL(`school-${suffix}.png`, output).pathname, fullPage: true });

  const direct = await context.newPage();
  await direct.goto(`${base}/unidades/33069093`, { waitUntil: 'networkidle' });
  await direct.getByRole('heading', { name: 'EM ALBINO SOUZA CRUZ' }).waitFor();
  await direct.close();
  await context.close();
}

try {
  await smoke({ width: 1440, height: 1000 }, 'desktop');
  await smoke({ width: 390, height: 844 }, 'mobile');
  console.log(JSON.stringify({ status: 'PASS', screenshots: ['home-desktop.png', 'school-desktop.png', 'home-mobile.png', 'school-mobile.png'] }, null, 2));
} finally {
  await browser.close();
  server.close();
}