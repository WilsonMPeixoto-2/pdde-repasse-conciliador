from pathlib import Path

# 1. Remove helper obsoleto depois que a conta passou a carregar todas as posições.
p = Path('backend/application/build-human-financial-view.ts')
t = p.read_text()
if 'function positionFor(' in t:
    start = t.index('function positionFor(')
    end = t.index('function accountNote(', start)
    p.write_text(t[:start] + t[end:])

# 2. Home: referência real, sem uma timeline global que o snapshot corrente não comprova.
p = Path('src/product/pages/PortfolioPage.tsx')
t = p.read_text()
if 'className="coverage-strip"' in t:
    start = t.index('        <div className="coverage-strip"')
    end = t.index('        </div>\n      </section>', start) + len('        </div>')
    replacement = '''        <div className="reference-note" aria-label={portfolio.referenceLabel}>
          <div>
            <span className="reference-note__eyebrow">Referência dos saldos</span>
            <strong>{portfolio.referenceLabel}</strong>
          </div>
          <span className="reference-note__coverage">{portfolio.metrics.accountsWithPosition} de {portfolio.metrics.accountsTotal} contas com posição nessa referência</span>
        </div>'''
    p.write_text(t[:start] + replacement + t[end:])

# 3. Assets absolutos para URLs profundas na raiz do produto.
p = Path('vite.config.ts')
t = p.read_text().replace("  base: './',", "  base: '/',")
p.write_text(t)

# 4. Smoke: captura antes do gate e lista ofensores caso exista overflow.
p = Path('scripts/frontend-product-smoke.mjs')
t = p.read_text()
start = t.index('async function assertNoMainOverflow(page) {')
end = t.index('\n\nasync function smoke', start)
replacement = r'''async function assertNoMainOverflow(page) {
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
}'''
t = t[:start] + replacement + t[end:]
old = '''  await assertNoTechnicalMetadata(page);
  await assertNoMainOverflow(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });
'''
new = '''  await assertNoTechnicalMetadata(page);
  await page.screenshot({ path: new URL(`home-${suffix}.png`, output).pathname, fullPage: true });
  await assertNoMainOverflow(page);
'''
if old in t:
    t = t.replace(old, new, 1)
anchor = '  await page.screenshot({ path: new URL(`school-${suffix}.png`, output).pathname, fullPage: true });\n'
if 'await direct.goto(`${base}/unidades/33069093`' not in t:
    direct = '''  const direct = await context.newPage();
  await direct.goto(`${base}/unidades/33069093`, { waitUntil: 'networkidle' });
  await direct.getByRole('heading', { name: 'EM ALBINO SOUZA CRUZ' }).waitFor();
  await direct.close();
'''
    if anchor not in t:
        raise RuntimeError('screenshot escolar não encontrado')
    t = t.replace(anchor, anchor + direct, 1)
p.write_text(t)

# 5. Tipos CSS do Vite.
Path('src/vite-env.d.ts').write_text('/// <reference types="vite/client" />\n')

# 6. Frontend legado não é mais entrypoint e não deve participar do typecheck do produto.
for legacy in ('src/main.ts', 'src/styles.css'):
    path = Path(legacy)
    if path.exists():
        path.unlink()
