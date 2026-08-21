#!/usr/bin/env node
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { gzipSync, strToU8 } from 'fflate';
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

const portfolioSchools = [
  {
    ...units[0],
    programmedCents: 1345800,
    paymentInformedCents: 506500,
    creditLocatedCents: 506500,
    knownBalanceCents: 415143,
    referenceDate: '2026-06-30',
    accountsTotal: 1,
    accountsWithReferencePosition: 1,
    followUpCount: 1,
    paymentSuspended: false,
    repasseAccountMissing: false,
  },
  {
    ...units[1],
    programmedCents: 1000000,
    paymentInformedCents: 800000,
    creditLocatedCents: 800000,
    knownBalanceCents: 500000,
    referenceDate: '2026-06-30',
    accountsTotal: 1,
    accountsWithReferencePosition: 1,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  },
  {
    ...units[2],
    programmedCents: 1500000,
    paymentInformedCents: 900000,
    creditLocatedCents: 500000,
    knownBalanceCents: 250000,
    referenceDate: '2026-06-30',
    accountsTotal: 2,
    accountsWithReferencePosition: 1,
    followUpCount: 0,
    paymentSuspended: false,
    repasseAccountMissing: false,
  },
  {
    ...units[3],
    programmedCents: 1491400,
    paymentInformedCents: 326000,
    creditLocatedCents: 75000,
    knownBalanceCents: 163038298,
    referenceDate: '2026-06-30',
    accountsTotal: 3,
    accountsWithReferencePosition: 3,
    followUpCount: 0,
    paymentSuspended: true,
    repasseAccountMissing: false,
  },
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
    { label: 'Outra informação parcial', count: 1, units: [units[0]] },
  ],
  schools: portfolioSchools,
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
          installment: '2ª Parcela', programmedCents: 506500, paymentInformedCents: 100000,
          paymentInformedDate: '2026-08-07', paymentOrderDate: null,
          account: { bank: '001', agency: '0249', number: '0000549797' },
          creditEvidence: { status: 'Crédito não localizado', date: null, amountCents: null, document: null },
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
        { date: '2026-06-21', description: 'PAGAMENTO PIX', document: 'PX1', category: 'PAGAMENTO_TRANSFERENCIA', creditCents: null, debitCents: 124000, counterparty: { document: '12345678000190', name: 'FORNECEDOR EXEMPLO', bank: '001', agency: '1234', account: '998877' } },
        { date: '2026-06-10', description: 'APLICAÇÃO', document: 'AP1', category: 'APLICACAO_FINANCEIRA', creditCents: null, debitCents: 380000, counterparty: null },
        { date: '2026-05-06', description: 'ORDEM BANCÁRIA FNDE', document: 'OB123', category: 'REPASSE_FNDE', creditCents: 506500, debitCents: null, counterparty: null },
        { date: '2026-05-02', description: 'RENDIMENTO APLICAÇÃO', document: 'RD1', category: 'RENDIMENTO_FINANCEIRO', creditCents: 1250, debitCents: null, counterparty: null },
        { date: '2026-04-28', description: 'RESGATE AUTOMÁTICO', document: 'RG1', category: 'RESGATE_APLICACAO', creditCents: 90000, debitCents: null, counterparty: null },
        { date: '2026-04-15', description: 'PAGTO CARTÃO', document: 'CT1', category: 'PAGAMENTO_CARTAO', creditCents: null, debitCents: 27000, counterparty: { document: null, name: 'LOJA EXEMPLO', bank: null, agency: null, account: null } },
        { date: '2026-03-11', description: 'TARIFA BANCÁRIA', document: 'TF1', category: 'TARIFA_BANCARIA', creditCents: null, debitCents: 1200, counterparty: null },
        { date: '2026-02-20', description: 'PIX RECEBIDO', document: 'PR1', category: 'ENTRADA_TERCEIRO', creditCents: 5000, debitCents: null, counterparty: { document: '11122233344', name: 'ORIGEM IDENTIFICADA', bank: '237', agency: null, account: null } },
        { date: '2026-01-15', description: 'LANÇAMENTO DIVERSO', document: 'DV1', category: 'MOVIMENTO_NAO_CLASSIFICADO', creditCents: null, debitCents: 3000, counterparty: null },
      ],
      note: 'Saldo informado pelo FNDE com posição até 30/06/2026.',
    },
  ],
  accounting: [{ program: 'PDDE', status: 'ADIMPLENTE', paymentSuspended: false, expectedTotalCents: 1013000 }],
  followUp: [
    'Há pagamento informado no PDDEInfo sem crédito compatível localizado nesta coleta.',
    'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.',
  ],
};

const snapshotPartPath = '/data/frontend-product-smoke-snapshot.txt';
const encodedSnapshot = Buffer.from(gzipSync(strToU8(JSON.stringify({
  portfolio,
  schools: { [school.school.inep]: school },
})))).toString('base64');

const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };

function sendJson(res, value) {
  res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

function sendText(res, value) {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  res.end(value);
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://127.0.0.1');
  if (url.pathname === '/data/pdde-2026-snapshot.json') {
    return sendJson(res, {
      encoding: 'gzip-base64-parts',
      parts: [snapshotPartPath],
    });
  }
  if (url.pathname === snapshotPartPath) return sendText(res, encodedSnapshot);

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

async function validateMobileSchoolSectionNav(page, suffix) {
  if (suffix !== 'mobile') return;

  const nav = page.getByRole('navigation', { name: 'Seções do prontuário financeiro' });
  const next = page.getByRole('button', { name: 'Ver próximas seções' });
  const previous = page.getByRole('button', { name: 'Ver seções anteriores' });

  await nav.waitFor();
  await next.waitFor({ state: 'visible' });

  const initialScrollLeft = await nav.evaluate((element) => element.scrollLeft);
  await next.click();
  const advancedScrollLeftHandle = await page.waitForFunction((initial) => {
    const element = document.querySelector('.school-section-nav');
    if (!(element instanceof HTMLElement)) return false;
    return element.scrollLeft > initial + 2 ? element.scrollLeft : false;
  }, initialScrollLeft);
  const advancedScrollLeft = await advancedScrollLeftHandle.jsonValue();

  await previous.waitFor({ state: 'visible' });
  await previous.click();
  await page.waitForFunction((advanced) => {
    const element = document.querySelector('.school-section-nav');
    return element instanceof HTMLElement && element.scrollLeft < advanced - 2;
  }, advancedScrollLeft);
}

async function validatePortfolioSchools(context, suffix) {
  const page = await context.newPage();
  await page.goto(`${base}/unidades`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Unidades da 4ª CRE' }).waitFor();
  await page.getByRole('heading', { name: '4 unidades no recorte' }).waitFor();
  await page.getByRole('button', { name: /Com atenção\s*3/i }).waitFor();
  await page.getByRole('button', { name: /Cobertura incompleta\s*1/i }).waitFor();
  await page.getByRole('button', { name: /Pagamento suspenso\s*1/i }).waitFor();

  const rows = page.locator('.portfolio-school');
  if (await rows.count() !== 4) throw new Error('A carteira não apresentou as quatro unidades do fixture.');
  if (!(await rows.first().innerText()).includes('EM ALBINO SOUZA CRUZ')) {
    throw new Error('A ordenação padrão não respeitou o código SME.');
  }
  await page.locator('.portfolio-schools-sort select').selectOption('attention');
  await rows.first().getByText('EM CIDADE NOVA', { exact: true }).waitFor();

  await page.getByRole('button', { name: /Cobertura incompleta/i }).click();
  await page.getByRole('heading', { name: '1 unidade no recorte' }).waitFor();
  await page.getByText('EM ANIBAL FREIRE', { exact: true }).waitFor();
  if (await page.locator('.portfolio-school').count() !== 1) {
    throw new Error('O filtro de cobertura incompleta não isolou o recorte esperado.');
  }

  await page.getByRole('button', { name: /^Todas/i }).click();
  await page.getByRole('heading', { name: '4 unidades no recorte' }).waitFor();
  await assertNoTechnicalMetadata(page);
  await assertNoMainOverflow(page);
  await page.screenshot({ path: new URL(`schools-${suffix}.png`, output).pathname, fullPage: true });
  await page.close();
}

async function smoke(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor();
  await assertNoTechnicalMetadata(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });
  await assertNoMainOverflow(page);

  await validatePortfolioSchools(context, suffix);

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
  await validateMobileSchoolSectionNav(page, suffix);

  const operationalSummary = page.getByRole('region', { name: 'Leitura rápida desta escola' });
  await operationalSummary.waitFor();
  await operationalSummary.getByText('Previsto', { exact: true }).waitFor();
  await operationalSummary.getByText('Pagamento informado', { exact: true }).waitFor();
  await operationalSummary.getByText('Crédito compatível localizado', { exact: true }).waitFor();
  await operationalSummary.getByText('Saldo informado', { exact: true }).waitFor();
  await operationalSummary.getByRole('link', { name: 'Ver repasses' }).waitFor();
  const sourceUnavailable = page.getByText(
    'Há informação de fonte ainda não disponível para esta unidade; a leitura financeira permanece parcial.',
    { exact: true },
  );
  if (await sourceUnavailable.count() !== 1) {
    throw new Error('O apontamento de fonte indisponível deve aparecer uma única vez no prontuário.');
  }

  const programDisclosure = page.getByRole('button', { name: /PDDE \/ PDDE Básico/ });
  await programDisclosure.click();
  await page.getByText('Ordem FNDE 04/08/2026').waitFor();

  const composition = page.getByRole('region', { name: /Composição da posição financeira/i });
  await composition.getByRole('img', { name: /Composição conhecida do saldo/i }).waitFor();
  await composition.getByText(/Em conta · 0,03%/).waitFor();
  await composition.getByText(/Em aplicações · 99,97%/).waitFor();
  await composition.getByText('Detalhamento das aplicações').waitFor();

  await page.getByText('3 posições publicadas em 2026.').waitFor();
  await page.getByText('Última posição', { exact: true }).waitFor();
  const timelinePoint = page.getByRole('button', { name: /MAR: saldo informado/i });
  await timelinePoint.focus();
  await page.keyboard.press('Enter');
  await page.getByText('31/03/2026').last().waitFor();
  await page.keyboard.press('ArrowRight');
  await page.getByText('30/06/2026').last().waitFor();
  const axisLabels = await page.locator('.timeline__grid text').allTextContents();
  if (axisLabels.some((label) => label.includes('-'))) {
    throw new Error(`A escala de saldos positivos introduziu referência negativa: ${axisLabels.join(', ')}`);
  }

  const ledger = page.getByRole('region', { name: 'Movimentações financeiras da conta' });
  await ledger.getByText('9 movimentos apresentados nesta consulta.').waitFor();
  await ledger.getByText('Repasse FNDE', { exact: true }).waitFor();
  await ledger.getByText('Aplicação financeira', { exact: true }).waitFor();
  await ledger.getByText('Resgate de aplicação', { exact: true }).waitFor();
  await ledger.getByText('Pagamento / transferência', { exact: true }).waitFor();
  await ledger.getByText('Rendimento financeiro', { exact: true }).waitFor();
  await ledger.getByText('Movimento não classificado', { exact: true }).waitFor();
  await ledger.getByText('A diferença acima não representa o saldo da conta.', { exact: false }).waitFor();
  if (await ledger.locator('.movement-ledger__row').count() !== 9) {
    throw new Error('O ledger não apresentou todos os 9 movimentos do fixture.');
  }
  const ledgerText = await ledger.innerText();
  for (const rawCategory of ['PAGAMENTO_TRANSFERENCIA', 'APLICACAO_FINANCEIRA', 'REPASSE_FNDE', 'MOVIMENTO_NAO_CLASSIFICADO']) {
    if (ledgerText.includes(rawCategory)) {
      throw new Error(`Categoria técnica vazou no ledger: ${rawCategory}.`);
    }
  }

  await assertNoMainOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => window.scrollY <= 2);
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
  console.log(JSON.stringify({
    status: 'PASS',
    screenshots: [
      'home-desktop.png',
      'schools-desktop.png',
      'school-desktop.png',
      'home-mobile.png',
      'schools-mobile.png',
      'school-mobile.png',
    ],
  }, null, 2));
} finally {
  await browser.close();
  server.close();
}
