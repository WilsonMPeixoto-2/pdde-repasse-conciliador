# Encontrabilidade e Navegação Financeira Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tornar escola, repasses, saldos, contas e movimentações encontráveis por caminhos diretos, preservando toda a semântica financeira e o fluxo de consulta ao vivo existentes.

**Architecture:** O frontend continuará usando `PortfolioContext` como fonte única da carteira. As novas visões `/repasses` e `/saldos` operarão apenas sobre `HumanPortfolioSchool`, enquanto o prontuário detalhado continuará carregando `HumanSchool` sob demanda. A mudança é de arquitetura da informação e componentes de navegação, sem novo endpoint ou regra financeira.

**Tech Stack:** React 19, React Router, TypeScript, Vite, Vitest, CSS existente do produto.

**Spec:** `docs/superpowers/specs/2026-08-19-ux-encontrabilidade-navegacao-design.md`

## Global Constraints

- Preservar os conceitos distintos `Previsto`, `Pagamento informado`, `Crédito localizado` e `Saldo informado/conhecido`.
- Não criar endpoint, backend, persistência ou nova fonte de dados.
- `/repasses` e `/saldos` devem usar exclusivamente `portfolio.schools`.
- O prontuário escolar continua usando `loadSchool(inep)` somente após abrir uma escola.
- O fluxo `Fazer nova consulta` e a proteção contra cobertura parcial não podem mudar.
- `Todas` é o filtro inicial de Escolas e `Código SME` é a ordenação inicial.
- Links contextuais do prontuário usam hashes semânticos e foco acessível.

---

### Task 1: Navegação global e rotas financeiras

**Files:**
- Modify: `src/product/components/AppHeader.tsx`
- Modify: `src/product/App.tsx`
- Create: `src/product/pages/RepasseOverviewPage.tsx`
- Create: `src/product/pages/BalancesOverviewPage.tsx`
- Test: `tests/unit/frontend-financial-navigation.test.ts`

**Interfaces:**
- Consumes: `usePortfolio(): PortfolioContextValue`, `HumanPortfolioSchool`, `schoolMatchesSearch`, `formatMoney`, `formatDate`.
- Produces: rotas `/repasses` e `/saldos`; links globais `Início`, `Escolas`, `Repasses`, `Saldos e contas`.

- [ ] **Step 1: Write failing navigation/route tests**

Criar um teste que renderize `AppHeader` em `MemoryRouter` e exija os quatro destinos; renderizar as duas páginas com `PortfolioContext` mockado e verificar que elas usam a carteira consolidada, não `loadSchool`.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- --run tests/unit/frontend-financial-navigation.test.ts`
Expected: FAIL porque links e páginas ainda não existem.

- [ ] **Step 3: Implement minimal routes and pages**

Adicionar imports e rotas em `App.tsx`. Em `AppHeader.tsx`, trocar a navegação por:

```tsx
<NavLink to="/" end>Início</NavLink>
<NavLink to="/unidades">Escolas</NavLink>
<NavLink to="/repasses">Repasses</NavLink>
<NavLink to="/saldos">Saldos e contas</NavLink>
```

As páginas devem ler `state.data.schools`, aceitar busca por `schoolMatchesSearch` e ordenar por SME/nome.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `npm test -- --run tests/unit/frontend-financial-navigation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: adiciona navegação financeira direta`

### Task 2: Busca global e atalhos operacionais na home

**Files:**
- Create: `src/product/components/GlobalSchoolFinder.tsx`
- Create: `src/product/components/FinancialTaskLinks.tsx`
- Modify: `src/product/pages/PortfolioPage.tsx`
- Modify/Create CSS: `src/product/design/findability.css`
- Modify: `src/product/App.tsx` para importar o CSS se necessário
- Test: `tests/unit/frontend-home-findability.test.ts`

**Interfaces:**
- `GlobalSchoolFinder` props: `{ schools: readonly HumanPortfolioSchool[]; maxResults?: number }`.
- `FinancialTaskLinks` não recebe dados; produz links para `/repasses`, `/saldos`, `/unidades`.

- [ ] **Step 1: Write failing home findability tests**

O teste deve exigir busca por nome, SME e INEP, resultado com link `/unidades/:inep`, e atalhos `Ver repasses`, `Ver saldos e contas`, `Ver todas as escolas`.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- --run tests/unit/frontend-home-findability.test.ts`
Expected: FAIL pela ausência dos componentes.

- [ ] **Step 3: Implement minimal searchable finder and task links**

A busca inicia vazia; com termo vazio não mostra lista extensa. Com termo, filtra `schools` por `schoolMatchesSearch`, limita inicialmente a 6 resultados e mostra nome, SME e INEP. O componente deve usar `aria-live` para contagem e links navegáveis por teclado.

- [ ] **Step 4: Insert operational layer above analytics**

Em `PortfolioPage`, manter título e refresh no topo, depois inserir busca e atalhos antes de `2026 em números`.

- [ ] **Step 5: Run focused test and verify GREEN**

Run: `npm test -- --run tests/unit/frontend-home-findability.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `feat: promove busca de escola na página inicial`

### Task 3: Reorganizar a página Escolas para localização previsível

**Files:**
- Modify: `src/product/pages/SchoolsPage.tsx`
- Modify: `src/product/design/portfolio-schools.css`
- Test: `tests/unit/frontend-schools-findability.test.ts`

**Interfaces:**
- Consumes: filtros atuais e `PortfolioSchoolList` sem alterar o domínio financeiro.
- Produces: filtro inicial `all`, ordenação inicial `sme`, copy introdutória orientada à consulta.

- [ ] **Step 1: Write failing default-state test**

Exigir que `SchoolsPage` inicialize com `filter='all'`, `sort='sme'`, mantenha filtros de acompanhamento e apresente copy neutra de consulta financeira.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- --run tests/unit/frontend-schools-findability.test.ts`
Expected: FAIL porque hoje a ordenação inicial é `attention`.

- [ ] **Step 3: Implement minimal state/copy hierarchy change**

Trocar `useState<SortMode>('attention')` por `'sme'`; manter filtros existentes, mas agrupá-los visualmente como secundários. Atualizar título/lead para priorizar localizar/comparar escolas.

- [ ] **Step 4: Run focused test and verify GREEN**

Run: `npm test -- --run tests/unit/frontend-schools-findability.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: simplifica localização na carteira de escolas`

### Task 4: Navegação local do prontuário e âncoras semânticas

**Files:**
- Create: `src/product/components/SchoolSectionNav.tsx`
- Modify: `src/product/pages/SchoolPage.tsx`
- Modify: `src/product/components/RouteEffects.tsx`
- Modify: `src/product/design/findability.css`
- Test: `tests/unit/frontend-school-section-navigation.test.ts`

**Interfaces:**
- `SchoolSectionNav` props: `{ hasMovements: boolean; hasAccounting: boolean }`.
- IDs: `resumo`, `repasses`, `contas-saldos`, `movimentacoes`, `prestacao-contas`.
- `RouteEffects` passa a observar `pathname` e `hash`.

- [ ] **Step 1: Write failing section-nav/hash tests**

Exigir menu local com Resumo/Repasses/Contas e saldos; Movimentações apenas se houver movimentos; Prestação de contas apenas se houver itens; IDs de seção únicos e links com hashes corretos.

- [ ] **Step 2: Run focused test and verify RED**

Run: `npm test -- --run tests/unit/frontend-school-section-navigation.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `SchoolSectionNav` and section IDs**

Calcular:

```ts
const hasMovements = school.accounts.some((account) => account.movements.length > 0);
const hasAccounting = school.accounting.length > 0;
```

Adicionar `id="resumo"`, `id="repasses"`, `id="contas-saldos"`, `id="prestacao-contas"`; adicionar um único `id="movimentacoes"` imediatamente antes do primeiro `MovementLedger` real.

- [ ] **Step 4: Make hash navigation focus-aware**

`RouteEffects` deve tentar localizar `document.getElementById(hash.slice(1))` quando a página ready existir, definir `tabIndex=-1`, focar e `scrollIntoView({ block: 'start' })`; sem hash, manter foco no `main` e scroll no topo.

- [ ] **Step 5: Run focused test and verify GREEN**

Run: `npm test -- --run tests/unit/frontend-school-section-navigation.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

Commit: `feat: adiciona navegação interna ao prontuário financeiro`

### Task 5: Visões especializadas de Repasses e Saldos

**Files:**
- Refine: `src/product/pages/RepasseOverviewPage.tsx`
- Refine: `src/product/pages/BalancesOverviewPage.tsx`
- Create: `src/product/components/FinancialSchoolOverviewList.tsx` ou dois componentes especializados se a API compartilhada ficar confusa
- Modify: `src/product/design/findability.css`
- Test: `tests/unit/frontend-repasses-overview.test.ts`
- Test: `tests/unit/frontend-balances-overview.test.ts`

**Interfaces:**
- Repasses: escola, previsto, pagamento informado, crédito localizado, situação; link `/unidades/:inep#repasses`.
- Saldos: escola, saldo conhecido, referência, contas com posição/total, cobertura; link `/unidades/:inep#contas-saldos`.

- [ ] **Step 1: Write failing semantic-evidence tests**

Repasses deve provar que os três valores aparecem separados e o link usa `#repasses`. Saldos deve provar saldo, referência, cobertura e link `#contas-saldos`.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --run tests/unit/frontend-repasses-overview.test.ts tests/unit/frontend-balances-overview.test.ts`
Expected: FAIL até as visões conterem todos os campos.

- [ ] **Step 3: Implement responsive specialized lists**

Não carregar prontuários individuais. Ordenar SME/nome. Reutilizar busca e formatação já existentes. Não inferir saldo quando `knownBalanceCents` for `null`.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npm test -- --run tests/unit/frontend-repasses-overview.test.ts tests/unit/frontend-balances-overview.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: cria visões rápidas de repasses e saldos`

### Task 6: Verificação integrada, responsiva e de regressão

**Files:**
- Modify only if tests reveal defects.
- Existing smoke: `scripts/frontend-published-smoke.mjs`
- Existing workflows: `.github/workflows/*`

- [ ] **Step 1: Run full unit/integration suite**

Run: `npm test`
Expected: all non-live tests pass; only previously intentional skips remain.

- [ ] **Step 2: Run TypeScript**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Build client + live SSR bundle**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Open PR and let GitHub Actions run**

Required checks: `Verificação contínua`; `Frontend Product Smoke 2026` when Playwright infrastructure completes.

- [ ] **Step 5: Verify Vercel Preview**

Check Preview READY and fetch root, `/repasses`, `/saldos`, and one `/unidades/:inep#repasses` route. Validate desktop/mobile smoke artifacts if available.

- [ ] **Step 6: Merge only after review of diff and regressions**

Confirm no backend/Supabase/source acquisition files changed; confirm live-refresh partial guard remains intact.

- [ ] **Step 7: Verify production deployment**

Confirm production deployment for merged commit is READY and public routes return HTTP 200.
