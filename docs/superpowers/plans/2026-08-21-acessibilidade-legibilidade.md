# Acessibilidade estrutural e legibilidade — Implementation Plan

> **Prioridade atualizada em 21/08/2026:** não executar este plano antes da conclusão do marco de completude financeira e de uma revalidação do mapa de arquivos e dos testes afetados.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar as barreiras confirmadas de contraste, foco, semântica de links, rótulos financeiros, títulos de rota e reflow sem alterar dados, regras financeiras ou o desenho geral do produto.

**Architecture:** A correção parte dos tokens globais e mantém divisores decorativos separados de bordas funcionais. As estruturas clicáveis passam a usar listas nativas, os títulos são derivados por uma função pura consumida por um efeito independente, e o smoke existente ganha verificações determinísticas de semântica, teclado e larguras reduzidas.

**Tech Stack:** React 19, React Router 7, TypeScript 7, CSS, Vitest 4, Vite 8 e Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-08-21-acessibilidade-legibilidade-design.md`

## Global Constraints

- Preservar todo conteúdo, toda regra financeira, todas as fontes, todos os endpoints e todos os valores atuais.
- Não alterar backend, schemas, migrations, persistência, Supabase, autenticação ou planilha.
- Não adicionar dependências.
- Usar `--ink-500: #5c7385`, `--focus: #1878a4` sem mistura com branco e `--control-border: #788e9c`.
- Exigir contraste mínimo de 4,5:1 para `--ink-500` e 3:1 para foco e bordas funcionais nos fundos documentados.
- Usar `ul > li > Link` nas três superfícies auditadas; nunca aplicar `role="listitem"` diretamente a `Link`.
- Manter os rótulos financeiros na árvore acessível em todas as larguras e visíveis até 700 px.
- Manter o efeito de título separado do efeito de foco e rolagem.
- Preservar o mínimo de 24×24 CSS px para alvos; 44×44 px continua preferível apenas quando não altera a altura fixa validada.
- Verificar 1440, 640, 390 e 320 CSS px sem chamar larguras reduzidas de prova de zoom real.
- Não declarar conformidade WCAG integral; registrar a ausência de teste com leitor de tela real.
- Não abrir PR, mesclar ou publicar em produção sem gate posterior explícito.
- Em cada tarefa de código, observar RED antes de GREEN e criar um commit próprio somente depois dos testes focados passarem.

---

## File Map

### Novos arquivos

- `tests/unit/frontend-accessibility-tokens.test.ts`: calcula contraste e protege a aplicação dos tokens funcionais.
- `src/product/document-title.ts`: deriva títulos de rota sem ler o DOM.
- `tests/unit/frontend-document-title.test.ts`: cobre a matriz completa de títulos.
- `tests/unit/frontend-product-smoke-accessibility.test.ts`: protege o contrato do smoke ampliado.

### Arquivos modificados

- `src/product/design/tokens.css`: valores de texto auxiliar e borda funcional.
- `src/product/design/base.css`: contorno global de foco.
- `src/product/design/components.css`: bordas de busca e botão de informação.
- `src/product/design/findability.css`: borda da busca global, botão móvel, listas nativas e rótulos financeiros.
- `src/product/design/portfolio-schools.css`: borda do seletor de ordenação.
- `src/product/design/session.css`: borda do input de sessão e botão secundário.
- `src/product/design/coherence-fixes.css`: remoção das regras que apagam rótulos financeiros.
- `src/product/components/GlobalSchoolFinder.tsx`: lista nativa para resultados.
- `src/product/pages/RepasseOverviewPage.tsx`: lista nativa e rótulos persistentes.
- `src/product/pages/BalancesOverviewPage.tsx`: lista nativa e rótulos persistentes.
- `src/product/components/RouteEffects.tsx`: efeito independente de título.
- `tests/unit/frontend-home-findability.test.ts`: contrato semântico da busca.
- `tests/unit/frontend-financial-navigation.test.ts`: contrato semântico das duas visões financeiras.
- `tests/unit/frontend-hash-route-effects.test.ts`: separação entre título e gerenciamento de foco.
- `scripts/frontend-product-smoke.mjs`: títulos, papéis, foco, alvos e reflow.
- `docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md`: adendo com resultados reais da implementação.
- `docs/CONTINUIDADE_WORK.md`: checkpoint exato do marco.

---

### Task 1: Corrigir tokens, foco e bordas funcionais

**Files:**
- Create: `tests/unit/frontend-accessibility-tokens.test.ts`
- Modify: `src/product/design/tokens.css:1-32`
- Modify: `src/product/design/base.css:20-26`
- Modify: `src/product/design/components.css:188-221`
- Modify: `src/product/design/findability.css:39-55, 516-544`
- Modify: `src/product/design/portfolio-schools.css:61-84`
- Modify: `src/product/design/session.css:50-56, 169-181`

**Interfaces:**
- Consumes: os tokens CSS atuais `--canvas`, `--paper`, `--ink-500` e `--focus`.
- Produces: `--ink-500: #5c7385`, `--control-border: #788e9c` e contorno global direto `var(--focus)`.

- [ ] **Step 1: Write the failing token and CSS contract test**

Create `tests/unit/frontend-accessibility-tokens.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

type Rgb = readonly [number, number, number];

function css(path: string): string {
  return readFileSync(path, 'utf8');
}

function token(name: string): string {
  const match = new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, 'i')
    .exec(css('src/product/design/tokens.css'));
  if (!match) throw new Error(`Token --${name} não encontrado.`);
  return match[1];
}

function rgb(hex: string): Rgb {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function linear(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: Rgb): number {
  return 0.2126 * linear(color[0])
    + 0.7152 * linear(color[1])
    + 0.0722 * linear(color[2]);
}

function contrast(foreground: string, background: string): number {
  const foregroundLuminance = luminance(rgb(foreground));
  const backgroundLuminance = luminance(rgb(background));
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function cssBlock(path: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, 's').exec(css(path));
  if (!match) throw new Error(`Seletor ${selector} não encontrado em ${path}.`);
  return match[1];
}

describe('tokens de acessibilidade do produto', () => {
  test('texto auxiliar alcança 4,5:1 nos fundos principais', () => {
    const foreground = token('ink-500');
    for (const background of [token('canvas'), token('paper'), '#f7fafb']) {
      expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });

  test('foco e borda funcional alcançam 3:1 nos fundos principais', () => {
    for (const name of ['focus', 'control-border']) {
      for (const background of [token('canvas'), token('paper'), '#f7fafb']) {
        expect(contrast(token(name), background)).toBeGreaterThanOrEqual(3);
      }
    }
  });

  test('contorno global usa a cor de foco sem clareamento', () => {
    const base = css('src/product/design/base.css');
    expect(base).toContain('outline: 3px solid var(--focus);');
    expect(base).not.toContain('color-mix(in srgb, var(--focus)');
  });

  test.each([
    ['src/product/design/components.css', '.search-field input'],
    ['src/product/design/components.css', '.info-button'],
    ['src/product/design/findability.css', '.global-school-finder__input-wrap input'],
    ['src/product/design/findability.css', '.school-section-nav__scroll-control'],
    ['src/product/design/portfolio-schools.css', '.portfolio-schools-sort select'],
    ['src/product/design/session.css', '.button--secondary'],
    ['src/product/design/session.css', '.session-field input'],
  ])('%s aplica borda funcional em %s', (path, selector) => {
    expect(cssBlock(path, selector)).toContain('var(--control-border)');
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-accessibility-tokens.test.ts
```

Expected: FAIL because `--ink-500` is still `#718797`, `--control-border` does not exist, and the global focus still uses `color-mix`.

- [ ] **Step 3: Implement the exact token and focus changes**

In `src/product/design/tokens.css`, replace the two existing auxiliary lines with:

```css
--ink-500: #5c7385;
--ink-400: var(--ink-500);
```

Immediately after the existing focus token, add:

```css
--focus: #1878a4;
--control-border: #788e9c;
```

In `src/product/design/base.css`, use:

```css
:focus-visible {
  outline: 3px solid var(--focus);
  outline-offset: 3px;
}
```

Change only the border declaration inside each existing selector:

```css
/* components.css */
.search-field input { border: 1px solid var(--control-border); }
.info-button { border: 1px solid var(--control-border); }

/* findability.css */
.global-school-finder__input-wrap input { border: 1px solid var(--control-border); }
.school-section-nav__scroll-control { border: 1px solid var(--control-border); }

/* portfolio-schools.css */
.portfolio-schools-sort select { border: 1px solid var(--control-border); }

/* session.css */
.button--secondary { border-color: var(--control-border); }
.session-field input { border-bottom: 1px solid var(--control-border); }
```

Do not replace `--ink-200` in section dividers, tables, metrics, cards or decorative separators.

- [ ] **Step 4: Run focused tests and typecheck**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-accessibility-tokens.test.ts
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
```

Expected: both commands PASS. The calculated lower bounds must remain at least 4.5 and 3.0 without rounding up a failing result.

- [ ] **Step 5: Commit Task 1**

```bash
git add tests/unit/frontend-accessibility-tokens.test.ts src/product/design/tokens.css src/product/design/base.css src/product/design/components.css src/product/design/findability.css src/product/design/portfolio-schools.css src/product/design/session.css
git commit -m "fix: corrige contraste e foco do produto"
```

---

### Task 2: Restaurar lista e link nativos na busca global

**Files:**
- Modify: `tests/unit/frontend-home-findability.test.ts:22-51`
- Modify: `src/product/components/GlobalSchoolFinder.tsx:45-66`
- Modify: `src/product/design/findability.css:66-98`

**Interfaces:**
- Consumes: `GlobalSchoolFinder` e seu contrato público atual.
- Produces: `ul.global-school-finder__list > li.global-school-finder__item > Link.global-school-finder__result`.

- [ ] **Step 1: Write the failing native semantics test**

Add this test before the shortcut test in `tests/unit/frontend-home-findability.test.ts`:

```ts
test('preserva item de lista e link como semânticas separadas', () => {
  const html = render(createElement(GlobalSchoolFinder, {
    schools,
    initialQuery: 'Afrânio',
  }));

  expect(html).toContain('<ul class="global-school-finder__list">');
  expect(html).toContain('<li class="global-school-finder__item">');
  expect(html).toContain('class="global-school-finder__result"');
  expect(html).toContain('href="/unidades/33012345"');
  expect(html).not.toContain('role="listitem"');
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-home-findability.test.ts
```

Expected: FAIL because the current output uses `<div role="list">` and assigns `role="listitem"` directly to the anchor.

- [ ] **Step 3: Implement the native list**

Replace the result list in `GlobalSchoolFinder.tsx` with:

```tsx
<ul className="global-school-finder__list">
  {results.map((school) => (
    <li className="global-school-finder__item" key={school.inep}>
      <Link
        className="global-school-finder__result"
        to={`/unidades/${school.inep}`}
      >
        <span>
          <strong>{school.name}</strong>
          <small>SME {school.sme} · INEP {school.inep}</small>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
    </li>
  ))}
</ul>
```

Extend the existing list styles in `findability.css` without changing spacing:

```css
.global-school-finder__list {
  margin: var(--space-2) 0 0;
  padding: 0;
  border-top: 1px solid var(--ink-100);
  list-style: none;
}

.global-school-finder__item {
  margin: 0;
  padding: 0;
}
```

- [ ] **Step 4: Run the focused tests**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-home-findability.test.ts tests/unit/frontend-financial-navigation.test.ts
```

Expected: PASS, including all existing search and navigation checks.

- [ ] **Step 5: Commit Task 2**

```bash
git add tests/unit/frontend-home-findability.test.ts src/product/components/GlobalSchoolFinder.tsx src/product/design/findability.css
git commit -m "fix: restaura semantica dos resultados da busca"
```

---

### Task 3: Tornar as visões financeiras listas acessíveis com rótulos persistentes

**Files:**
- Modify: `tests/unit/frontend-financial-navigation.test.ts:1-96`
- Modify: `src/product/pages/RepasseOverviewPage.tsx:52-94`
- Modify: `src/product/pages/BalancesOverviewPage.tsx:57-99`
- Modify: `src/product/design/findability.css:174-264, 446-488`
- Modify: `src/product/design/coherence-fixes.css:47-90`

**Interfaces:**
- Consumes: as linhas `.financial-overview-row` e os dados já derivados pelo portfólio.
- Produces: `ul.financial-overview-list__items > li.financial-overview-list__item > Link`, além de `.financial-overview-row__label` acessível no desktop e visível até 700 px.

- [ ] **Step 1: Write failing markup and CSS tests**

Add `readFileSync` to the imports of `tests/unit/frontend-financial-navigation.test.ts`:

```ts
import { readFileSync } from 'node:fs';
```

Add these tests after `visões consolidadas usam a carteira`:

```ts
test('linhas financeiras preservam lista, item e link nativos', () => {
  for (const page of [
    renderWithRouter(createElement(RepasseOverviewPage)),
    renderWithRouter(createElement(BalancesOverviewPage)),
  ]) {
    expect(page).toContain('<ul class="financial-overview-list__items">');
    expect(page).toContain('<li class="financial-overview-list__item">');
    expect(page).toContain('class="financial-overview-row');
    expect(page).not.toContain('role="listitem"');
    expect(page.match(/financial-overview-row__label/g)).toHaveLength(4);
  }
});

test('rótulos por valor não são removidos da árvore acessível', () => {
  const findability = readFileSync('src/product/design/findability.css', 'utf8');
  const coherence = readFileSync('src/product/design/coherence-fixes.css', 'utf8');

  expect(findability).toContain('.financial-overview-row__label {');
  expect(findability).not.toMatch(
    /financial-overview-row__metric small\s*{[^}]*display:\s*none/s,
  );
  expect(coherence).not.toMatch(
    /financial-overview-row__status small\s*{[^}]*display:\s*none/s,
  );
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-financial-navigation.test.ts
```

Expected: FAIL because the pages use `div role="list"`, links with `role="listitem"`, and labels hidden with `display: none`.

- [ ] **Step 3: Implement native list wrappers and persistent labels in both pages**

Replace the current financial list in `RepasseOverviewPage.tsx` with:

```tsx
<div className="financial-overview-list">
  <div className="financial-overview-list__head" aria-hidden="true">
    <span>Escola</span>
    <span>Previsto em 2026</span>
    <span>Pagamento informado</span>
    <span>Crédito localizado</span>
    <span>Acompanhamento geral</span>
  </div>
  <ul className="financial-overview-list__items">
    {filtered.map((school) => {
      const triage = derivePortfolioSchoolTriage(school);
      return (
        <li className="financial-overview-list__item" key={school.inep}>
          <Link
            className="financial-overview-row"
            data-status={triage.status}
            to={`/unidades/${school.inep}#repasses`}
          >
            <span className="financial-overview-row__school">
              <strong>{school.name}</strong>
              <small>SME {school.sme} · INEP {school.inep}</small>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Previsto em 2026</small>
              <strong>{formatMoney(school.programmedCents)}</strong>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Pagamento informado</small>
              <strong>{formatMoney(school.paymentInformedCents)}</strong>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Crédito localizado</small>
              <strong>{formatMoney(school.creditLocatedCents)}</strong>
            </span>
            <span className="financial-overview-row__status">
              <small className="financial-overview-row__label">Acompanhamento geral</small>
              <strong>{triage.label}</strong>
            </span>
            <span className="financial-overview-row__arrow" aria-hidden="true">→</span>
          </Link>
        </li>
      );
    })}
  </ul>
</div>
```

Replace the current financial list in `BalancesOverviewPage.tsx` with:

```tsx
<div className="financial-overview-list financial-overview-list--balances">
  <div className="financial-overview-list__head" aria-hidden="true">
    <span>Escola</span>
    <span>Saldo conhecido</span>
    <span>Referência</span>
    <span>Cobertura</span>
    <span>Acompanhamento geral</span>
  </div>
  <ul className="financial-overview-list__items">
    {filtered.map((school) => {
      const triage = derivePortfolioSchoolTriage(school);
      return (
        <li className="financial-overview-list__item" key={school.inep}>
          <Link
            className="financial-overview-row financial-overview-row--balances"
            data-status={triage.status}
            to={`/unidades/${school.inep}#contas-saldos`}
          >
            <span className="financial-overview-row__school">
              <strong>{school.name}</strong>
              <small>SME {school.sme} · INEP {school.inep}</small>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Saldo conhecido</small>
              <strong>{formatMoney(school.knownBalanceCents)}</strong>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Referência</small>
              <strong>{formatDate(school.referenceDate)}</strong>
            </span>
            <span className="financial-overview-row__metric">
              <small className="financial-overview-row__label">Cobertura</small>
              <strong>{coverageLabel(school)}</strong>
            </span>
            <span className="financial-overview-row__status">
              <small className="financial-overview-row__label">Acompanhamento geral</small>
              <strong>{triage.label}</strong>
            </span>
            <span className="financial-overview-row__arrow" aria-hidden="true">→</span>
          </Link>
        </li>
      );
    })}
  </ul>
</div>
```

- [ ] **Step 4: Implement list reset and accessible label CSS**

Add after `.financial-overview-list` in `findability.css`:

```css
.financial-overview-list__items {
  margin: 0;
  padding: 0;
  list-style: none;
}

.financial-overview-list__item {
  margin: 0;
  padding: 0;
}

.financial-overview-row__label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

Delete the desktop rule that sets `.financial-overview-row__metric small` to `display: none`. In the `max-width: 700px` block, replace the old metric-label display rule with:

```css
.financial-overview-row__label {
  position: static;
  width: auto;
  height: auto;
  padding: 0;
  margin: 0;
  overflow: visible;
  clip: auto;
  white-space: normal;
  border: 0;
  display: block;
}

.financial-overview-row__status .financial-overview-row__label {
  color: var(--ink-500);
  font-size: 0.68rem;
  font-weight: 500;
}
```

In `coherence-fixes.css`, delete both rules for `.financial-overview-row__status small`. Keep the existing rules for `.financial-overview-row__status strong`.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-financial-navigation.test.ts tests/unit/frontend-repasses-overview.test.ts tests/unit/frontend-balances-overview.test.ts
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
```

Expected: all tests and typecheck PASS. Rendered rows retain their original text, values and links.

- [ ] **Step 6: Commit Task 3**

```bash
git add tests/unit/frontend-financial-navigation.test.ts src/product/pages/RepasseOverviewPage.tsx src/product/pages/BalancesOverviewPage.tsx src/product/design/findability.css src/product/design/coherence-fixes.css
git commit -m "fix: torna listas financeiras acessiveis"
```

---

### Task 4: Definir títulos específicos sem repetir foco e rolagem

**Files:**
- Create: `src/product/document-title.ts`
- Create: `tests/unit/frontend-document-title.test.ts`
- Modify: `src/product/components/RouteEffects.tsx:1-50`
- Modify: `tests/unit/frontend-hash-route-effects.test.ts:4-11`

**Interfaces:**
- Consumes: `pathname` e um objeto estrutural com `schools[].inep/name` e `indicators[].label`.
- Produces: `resolveDocumentTitle(pathname: string, data: DocumentTitleData | null): string`.

- [ ] **Step 1: Write the failing title matrix test**

Create `tests/unit/frontend-document-title.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import { resolveDocumentTitle } from '../../src/product/document-title';

const data = {
  schools: [{ inep: '33069093', name: 'EM ALBINO SOUZA CRUZ' }],
  indicators: [{ label: 'Conta do repasse não exibida' }],
};

describe('títulos das rotas do produto', () => {
  test.each([
    ['/', 'Visão geral | Inteligência Financeira PDDE | 4ª CRE'],
    ['/unidades', 'Escolas | Inteligência Financeira PDDE | 4ª CRE'],
    ['/unidades/', 'Escolas | Inteligência Financeira PDDE | 4ª CRE'],
    ['/repasses', 'Repasses 2026 | Inteligência Financeira PDDE | 4ª CRE'],
    ['/saldos', 'Saldos e contas 2026 | Inteligência Financeira PDDE | 4ª CRE'],
    ['/unidades/33069093', 'EM ALBINO SOUZA CRUZ | Inteligência Financeira PDDE | 4ª CRE'],
    ['/indicadores/conta-do-repasse-nao-exibida', 'Conta do repasse não exibida | Inteligência Financeira PDDE | 4ª CRE'],
    ['/caminho-inexistente', 'Página não encontrada | Inteligência Financeira PDDE | 4ª CRE'],
  ])('%s identifica o assunto da página', (pathname, expected) => {
    expect(resolveDocumentTitle(pathname, data)).toBe(expected);
  });

  test('usa títulos genéricos enquanto dados nomeados não chegaram', () => {
    expect(resolveDocumentTitle('/unidades/33069093', null))
      .toBe('Escola | Inteligência Financeira PDDE | 4ª CRE');
    expect(resolveDocumentTitle('/indicadores/conta-do-repasse-nao-exibida', null))
      .toBe('Indicador | Inteligência Financeira PDDE | 4ª CRE');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-document-title.test.ts
```

Expected: FAIL because `src/product/document-title.ts` does not exist.

- [ ] **Step 3: Implement the pure title resolver**

Create `src/product/document-title.ts`:

```ts
import { slugify } from './routing';

const PRODUCT_SUFFIX = 'Inteligência Financeira PDDE | 4ª CRE';

export interface DocumentTitleData {
  schools: readonly { inep: string; name: string }[];
  indicators: readonly { label: string }[];
}

function title(label: string): string {
  return `${label} | ${PRODUCT_SUFFIX}`;
}

function normalizedPath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export function resolveDocumentTitle(
  pathname: string,
  data: DocumentTitleData | null,
): string {
  const path = normalizedPath(pathname);
  if (path === '/') return title('Visão geral');
  if (path === '/unidades') return title('Escolas');
  if (path === '/repasses') return title('Repasses 2026');
  if (path === '/saldos') return title('Saldos e contas 2026');

  const schoolMatch = /^\/unidades\/([^/]+)$/.exec(path);
  if (schoolMatch) {
    const school = data?.schools.find((item) => item.inep === schoolMatch[1]);
    return title(school?.name ?? 'Escola');
  }

  const indicatorMatch = /^\/indicadores\/([^/]+)$/.exec(path);
  if (indicatorMatch) {
    const indicator = data?.indicators.find(
      (item) => slugify(item.label) === indicatorMatch[1],
    );
    return title(indicator?.label ?? 'Indicador');
  }

  return title('Página não encontrada');
}
```

- [ ] **Step 4: Add an independent title effect**

In `RouteEffects.tsx`, add imports:

```ts
import { resolveDocumentTitle } from '../document-title';
import { usePortfolio } from '../PortfolioContext';
```

Immediately after reading the location, derive and apply the title in its own effect:

```tsx
const state = usePortfolio();
const title = resolveDocumentTitle(
  pathname,
  state.status === 'ready' ? state.data : null,
);

useEffect(() => {
  document.title = title;
}, [title]);
```

Do not change the dependency list `[pathname, hash]` of the existing focus/scroll effect.

Extend `frontend-hash-route-effects.test.ts`:

```ts
test('atualiza título em efeito separado do foco e da rolagem', () => {
  const source = readFileSync('src/product/components/RouteEffects.tsx', 'utf8');
  expect(source).toContain('document.title = title');
  expect(source).toContain('}, [title]);');
  expect(source).toContain('}, [pathname, hash]);');
});
```

- [ ] **Step 5: Run title, focus and type tests**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-document-title.test.ts tests/unit/frontend-hash-route-effects.test.ts
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
```

Expected: PASS. Updating portfolio data may update `document.title`, but cannot rerun the focus/scroll effect unless `pathname` or `hash` changed.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/product/document-title.ts src/product/components/RouteEffects.tsx tests/unit/frontend-document-title.test.ts tests/unit/frontend-hash-route-effects.test.ts
git commit -m "feat: define titulos acessiveis por rota"
```

---

### Task 5: Ampliar o smoke para semântica, teclado, alvos e reflow

**Files:**
- Create: `tests/unit/frontend-product-smoke-accessibility.test.ts`
- Modify: `scripts/frontend-product-smoke.mjs:219-425`

**Interfaces:**
- Consumes: servidor e fixture já definidos pelo smoke, `assertNoMainOverflow(page)` e os contratos das Tasks 1-4.
- Produces: `assertDocumentTitle`, `assertMinimumTargetSize`, `assertFocusVisibleAndNotFullyObscured`, `assertActiveElementNotFullyObscured`, `validateRouteTitles` e `validateAccessibilityReflow`.

- [ ] **Step 1: Write the failing smoke-contract test**

Create `tests/unit/frontend-product-smoke-accessibility.test.ts`:

```ts
import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('smoke de acessibilidade e reflow', () => {
  const source = readFileSync('scripts/frontend-product-smoke.mjs', 'utf8');

  test('cobre títulos, alvos e foco não obscurecido', () => {
    expect(source).toContain('assertDocumentTitle');
    expect(source).toContain('assertMinimumTargetSize');
    expect(source).toContain('assertFocusVisibleAndNotFullyObscured');
    expect(source).toContain('assertActiveElementNotFullyObscured');
    expect(source).toContain('validateRouteTitles');
    expect(source).toContain('document.activeElement');
    expect(source).toContain('document.elementFromPoint');
    expect(source).toContain('Página não encontrada | Inteligência Financeira PDDE | 4ª CRE');
  });

  test('cobre larguras de 640 e 320 CSS px sem remover 1440 e 390', () => {
    for (const width of [1440, 640, 390, 320]) {
      expect(source).toContain(`width: ${width}`);
    }
    expect(source).toContain('validateAccessibilityReflow');
  });

  test('cobre links nativos e rótulos financeiros', () => {
    expect(source).toContain("getByRole('listitem')");
    expect(source).toContain("getByRole('link'");
    expect(source).toContain('financial-overview-row__label');
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-product-smoke-accessibility.test.ts
```

Expected: FAIL because the smoke has only 1440/390 and does not define the new assertions.

- [ ] **Step 3: Add deterministic accessibility helpers**

Add after `assertNoMainOverflow` in `scripts/frontend-product-smoke.mjs`:

```js
async function assertDocumentTitle(page, expected) {
  await page.waitForFunction((title) => document.title === title, expected);
}

async function assertMinimumTargetSize(page) {
  const undersized = await page.evaluate(() => [...document.querySelectorAll(
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), summary, [tabindex]:not([tabindex="-1"])',
  )]
    .map((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return {
        tag: element.tagName.toLowerCase(),
        name: element.getAttribute('aria-label') ?? (element.textContent ?? '').trim().slice(0, 80),
        width: rect.width,
        height: rect.height,
        rendered: rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden',
      };
    })
    .filter((item) => item.rendered && (item.width < 24 || item.height < 24)));

  if (undersized.length > 0) {
    throw new Error(`Alvos menores que 24 CSS px: ${JSON.stringify(undersized)}`);
  }
}

async function assertFocusVisibleAndNotFullyObscured(locator) {
  await locator.focus();
  const result = await locator.evaluate((element) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active !== element) {
      return { focused: false, outlined: false, visible: false };
    }

    const style = window.getComputedStyle(active);
    const rect = active.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const right = Math.min(window.innerWidth, rect.right);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const points = right > left && bottom > top
      ? [
          [(left + right) / 2, (top + bottom) / 2],
          [left + 1, top + 1],
          [right - 1, bottom - 1],
        ]
      : [];
    const visible = points.some(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (hit === active || active.contains(hit));
    });

    return {
      focused: true,
      outlined: style.outlineStyle !== 'none'
        && Number.parseFloat(style.outlineWidth) >= 2
        && style.outlineColor !== 'rgba(0, 0, 0, 0)',
      visible,
    };
  });

  if (!result.focused || !result.outlined || !result.visible) {
    throw new Error(`Foco ausente, invisível ou totalmente obscurecido: ${JSON.stringify(result)}`);
  }
}

async function assertActiveElementNotFullyObscured(page, expectedId) {
  const result = await page.evaluate((id) => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || active.id !== id) {
      return { focused: false, visible: false };
    }

    const rect = active.getBoundingClientRect();
    const left = Math.max(0, rect.left);
    const right = Math.min(window.innerWidth, rect.right);
    const top = Math.max(0, rect.top);
    const bottom = Math.min(window.innerHeight, rect.bottom);
    const points = right > left && bottom > top
      ? [
          [(left + right) / 2, (top + bottom) / 2],
          [left + 1, top + 1],
          [right - 1, bottom - 1],
        ]
      : [];
    const visible = points.some(([x, y]) => {
      const hit = document.elementFromPoint(x, y);
      return hit !== null && (hit === active || active.contains(hit));
    });
    return { focused: true, visible };
  }, expectedId);

  if (!result.focused || !result.visible) {
    throw new Error(`Destino de rota sem foco ou totalmente obscurecido: ${JSON.stringify(result)}`);
  }
}
```

- [ ] **Step 4: Add a browser check for every route title**

Add before `validateAccessibilityReflow`:

```js
async function validateRouteTitles() {
  const context = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  const page = await context.newPage();
  const routes = [
    ['/', 'Visão geral | Inteligência Financeira PDDE | 4ª CRE'],
    ['/unidades', 'Escolas | Inteligência Financeira PDDE | 4ª CRE'],
    ['/repasses', 'Repasses 2026 | Inteligência Financeira PDDE | 4ª CRE'],
    ['/saldos', 'Saldos e contas 2026 | Inteligência Financeira PDDE | 4ª CRE'],
    ['/unidades/33069093', 'EM ALBINO SOUZA CRUZ | Inteligência Financeira PDDE | 4ª CRE'],
    ['/indicadores/conta-do-repasse-nao-exibida', 'Conta do repasse não exibida | Inteligência Financeira PDDE | 4ª CRE'],
    ['/caminho-inexistente', 'Página não encontrada | Inteligência Financeira PDDE | 4ª CRE'],
  ];

  for (const [path, expected] of routes) {
    await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
    await assertDocumentTitle(page, expected);
  }

  await context.close();
}
```

- [ ] **Step 5: Add the reflow route validator**

Add before `smoke(viewport, suffix)`:

```js
async function validateAccessibilityReflow(viewport, suffix) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: /Inteligência financeira/i }).waitFor();
  await assertDocumentTitle(page, 'Visão geral | Inteligência Financeira PDDE | 4ª CRE');
  await assertNoMainOverflow(page);
  await assertMinimumTargetSize(page);

  const finder = page.locator('.global-school-finder');
  await finder.getByRole('searchbox', { name: 'Encontrar uma escola' }).fill('Albino');
  const finderItem = finder.getByRole('listitem');
  const finderLink = finderItem.getByRole('link', { name: /EM ALBINO SOUZA CRUZ/i });
  await finderLink.waitFor();
  await assertFocusVisibleAndNotFullyObscured(finderLink);

  await page.goto(`${base}/repasses`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Repasses 2026' }).waitFor();
  await assertDocumentTitle(page, 'Repasses 2026 | Inteligência Financeira PDDE | 4ª CRE');
  const repasseList = page.locator('.financial-overview-list').getByRole('list');
  if (await repasseList.getByRole('listitem').count() !== 4) {
    throw new Error(`Lista de repasses inválida em ${suffix}.`);
  }
  const repasseLink = repasseList.getByRole('link', {
    name: /EM ALBINO SOUZA CRUZ.*Previsto em 2026.*Pagamento informado.*Crédito localizado/i,
  });
  await repasseLink.waitFor();
  if (viewport.width <= 700 && !await repasseLink.locator('.financial-overview-row__label').first().isVisible()) {
    throw new Error(`Rótulo financeiro não ficou visível em ${suffix}.`);
  }
  await assertNoMainOverflow(page);
  await assertMinimumTargetSize(page);

  await page.goto(`${base}/saldos`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'Saldos e contas 2026' }).waitFor();
  await assertDocumentTitle(page, 'Saldos e contas 2026 | Inteligência Financeira PDDE | 4ª CRE');
  const balanceList = page.locator('.financial-overview-list').getByRole('list');
  const balanceLink = balanceList.getByRole('link', {
    name: /EM ALBINO SOUZA CRUZ.*Saldo conhecido.*Referência.*Cobertura/i,
  });
  await balanceLink.waitFor();
  if (viewport.width <= 700 && !await balanceLink.locator('.financial-overview-row__label').first().isVisible()) {
    throw new Error(`Rótulo de saldo não ficou visível em ${suffix}.`);
  }
  await assertNoMainOverflow(page);
  await assertMinimumTargetSize(page);

  await page.goto(`${base}/unidades/33069093#repasses`, { waitUntil: 'networkidle' });
  await page.getByRole('heading', { name: 'EM ALBINO SOUZA CRUZ' }).waitFor();
  await assertDocumentTitle(page, 'EM ALBINO SOUZA CRUZ | Inteligência Financeira PDDE | 4ª CRE');
  await page.waitForFunction(() => document.activeElement?.id === 'repasses');
  await assertActiveElementNotFullyObscured(page, 'repasses');
  await assertNoMainOverflow(page);
  await assertMinimumTargetSize(page);
  await assertFocusVisibleAndNotFullyObscured(
    page.getByRole('navigation', { name: 'Seções do prontuário financeiro' })
      .getByRole('link', { name: 'Resumo' }),
  );

  await context.close();
}
```

- [ ] **Step 6: Protect titles in the existing full smoke**

Add assertions immediately after each corresponding heading becomes ready:

```js
await assertDocumentTitle(page, 'Visão geral | Inteligência Financeira PDDE | 4ª CRE');
```

Inside `validatePortfolioSchools`:

```js
await assertDocumentTitle(page, 'Escolas | Inteligência Financeira PDDE | 4ª CRE');
```

After the indicator page heading:

```js
await assertDocumentTitle(page, 'Conta do repasse não exibida | Inteligência Financeira PDDE | 4ª CRE');
```

After the school heading, both in the navigated page and in `direct`:

```js
await assertDocumentTitle(page, 'EM ALBINO SOUZA CRUZ | Inteligência Financeira PDDE | 4ª CRE');
await assertDocumentTitle(direct, 'EM ALBINO SOUZA CRUZ | Inteligência Financeira PDDE | 4ª CRE');
```

- [ ] **Step 7: Invoke every title and the new widths without duplicating screenshots**

Keep the two existing full smokes and their six screenshots. Add dedicated checks afterward:

```js
await validateRouteTitles();
await smoke({ width: 1440, height: 1000 }, 'desktop');
await validateAccessibilityReflow({ width: 640, height: 900 }, 'reflow-640');
await smoke({ width: 390, height: 844 }, 'mobile');
await validateAccessibilityReflow({ width: 320, height: 844 }, 'reflow-320');
```

Do not add `reflow-640` or `reflow-320` to the screenshot manifest because these runs are assertion-only.

- [ ] **Step 8: Run static and focused verification**

Run:

```bash
./node_modules/.bin/vitest run tests/unit/frontend-product-smoke-accessibility.test.ts tests/unit/frontend-document-title.test.ts tests/unit/frontend-financial-navigation.test.ts tests/unit/frontend-home-findability.test.ts
node --check scripts/frontend-product-smoke.mjs
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
```

Expected: all commands PASS.

- [ ] **Step 9: Run the real browser smoke when Chromium is available**

Run:

```bash
./node_modules/.bin/vite build
node scripts/frontend-product-smoke.mjs
```

Expected: JSON with `"status": "PASS"` and the same six screenshot names. If Playwright reports that Chromium is absent, record that exact environmental blocker; do not substitute the source-contract test for browser evidence and do not claim the smoke passed.

- [ ] **Step 10: Commit Task 5**

```bash
git add tests/unit/frontend-product-smoke-accessibility.test.ts scripts/frontend-product-smoke.mjs
git commit -m "test: amplia smoke de acessibilidade e reflow"
```

---

### Task 6: Executar verificação integral e registrar o checkpoint

**Files:**
- Modify: `docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md:final`
- Modify: `docs/CONTINUIDADE_WORK.md:seção 11`

**Interfaces:**
- Consumes: os cinco commits anteriores e suas evidências reais.
- Produces: checkpoint retomável com comandos, resultados, limitações, branch e commits exatos.

- [ ] **Step 1: Confirm a clean implementation diff before the full suite**

Run:

```bash
git status --short --branch
git diff --check HEAD~5..HEAD
git diff --stat origin/main...HEAD
```

Expected: only the intended branch is ahead; no unstaged file; no whitespace error; no backend, migration, API, planilha or financial-contract file in the diff.

- [ ] **Step 2: Run the full local verification**

Run each command separately so a failure retains its own evidence:

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
./node_modules/.bin/vite build
./node_modules/.bin/vite build --config vite.live.config.ts
node --check scripts/frontend-product-smoke.mjs
git diff --check
```

Expected: every command exits 0. Record the exact Vitest file/test totals and both build summaries from the terminal output.

- [ ] **Step 3: Run or explicitly defer the browser gate**

Run:

```bash
node scripts/frontend-product-smoke.mjs
```

Expected when Chromium exists: PASS for 1440, 640, 390 and 320, with six accepted screenshots from the two full flows. If Chromium remains unavailable, preserve the exact error in the checkpoint and leave the browser gate pending for the authorized CI run; no merge or publication can rely only on the static smoke test.

- [ ] **Step 4: Inspect generated screenshots when the smoke passed**

Open these files at original resolution and reject any loading, clipping or wrong-state capture:

```text
artifacts/frontend-product-smoke/home-desktop.png
artifacts/frontend-product-smoke/schools-desktop.png
artifacts/frontend-product-smoke/school-desktop.png
artifacts/frontend-product-smoke/home-mobile.png
artifacts/frontend-product-smoke/schools-mobile.png
artifacts/frontend-product-smoke/school-mobile.png
```

Verify that contrast is visibly strengthened without collapsing hierarchy, rows keep their grid, labels appear in the mobile financial lists, and the sticky navigation preserves its height and controls.

- [ ] **Step 5: Append the implementation evidence to the audit**

Add `## 10. Verificação da implementação` to the audit. Record, using the literal values produced in Steps 1-4:

- branch and commit range;
- exact focused and full Vitest totals;
- typecheck result;
- client and SSR build results;
- browser-smoke result or its exact environmental blocker;
- screenshots actually inspected, including dimensions and SHA-256 only when files exist;
- confirmation that no reader de tela real or real browser zoom was run;
- confirmation that production was not changed.

Do not copy the pre-implementation ratios as post-implementation evidence; use the token-test outputs and browser results from this execution.

- [ ] **Step 6: Update the continuity checkpoint**

In section 11 of `docs/CONTINUIDADE_WORK.md`:

- change the state from planning to the exact implementation state reached;
- list every implementation commit in order;
- record every verification command and its real result;
- distinguish a passed local check from a pending CI/browser check;
- retain the reader-screen and real-zoom limits;
- set the next gate to review, CI/visual evidence, PR readiness, merge or deploy as actually applicable;
- keep the statement that production remains unchanged.

- [ ] **Step 7: Verify docs and commit the checkpoint**

Run:

```bash
git diff --check
! rg -n "TBD|TODO|FIXME|PLACEHOLDER" docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md docs/CONTINUIDADE_WORK.md
git status --short
```

Expected: `git diff --check` PASS; the scan returns no placeholder; status lists only the two intended documentation files.

Commit:

```bash
git add docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md docs/CONTINUIDADE_WORK.md
git commit -m "docs: registra verificacao do marco de acessibilidade"
```

- [ ] **Step 8: Final branch verification**

Run:

```bash
git status --short --branch
git log --oneline --decorate origin/main..HEAD
git diff --check origin/main...HEAD
git diff --name-only origin/main...HEAD
```

Expected: clean branch; initial audit/spec commit, plan commit, five implementation commits and final checkpoint commit all visible above `origin/main`; no diff-check error; only the frontend, tests, smoke and documentation files named in this plan.

Stop before push, PR readiness, merge or deploy. Report evidence and request the next explicit authorization.
