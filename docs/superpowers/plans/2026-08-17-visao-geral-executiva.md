# Visão Geral Executiva 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a home em uma visão executiva compacta de estágios financeiros, cobertura e prioridades escolares, reutilizando o read model já existente.

**Architecture:** Criar um modelo puro de apresentação derivado de `HumanPortfolio`, reutilizando `derivePortfolioSchoolTriage`. A página consome esse modelo em componentes focados e não cria novos endpoints ou regras financeiras. A carteira `/unidades` continua sendo o drill-down completo.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Playwright, CSS próprio, contratos Zod existentes.

## Global Constraints
- Não colapsar previsto, pagamento informado e crédito localizado em uma única métrica.
- Não chamar diferença entre estágios de execução, receita, gasto ou saldo.
- Não criar score opaco de risco.
- Não introduzir nova dependência.
- Funcionar nos modos persistente e temporário.
- Mobile 390 px sem overflow horizontal.

---

### Task 1: Modelo executivo puro

**Files:**
- Create: `src/product/visual/portfolio-executive-summary.ts`
- Test: `tests/unit/frontend-portfolio-executive-summary.test.ts`

**Interfaces:**
- Consumes: `HumanPortfolio` e `derivePortfolioSchoolTriage(school)`.
- Produces: `derivePortfolioExecutiveSummary(portfolio)` com `evidenceStages`, `statusCounts`, `attentionCount`, `coverageIncompleteCount` e `prioritySchools`.

- [ ] **Step 1: Write the failing test**

Testar que:
```ts
const summary = derivePortfolioExecutiveSummary(portfolio);
expect(summary.statusCounts).toEqual({ suspended: 1, attention: 1, no_accounts: 1, partial: 1, ready: 1 });
expect(summary.prioritySchools.map((item) => item.school.inep)).toEqual([
  '33000001', '33000002', '33000003', '33000004',
]);
expect(summary.evidenceStages.map((item) => item.valueCents)).toEqual([
  portfolio.metrics.programmedCents,
  portfolio.metrics.paymentInformedCents,
  portfolio.metrics.creditLocatedCents,
]);
```
Também testar que valores zero permanecem zero e que escola `ready` não entra em `prioritySchools`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/frontend-portfolio-executive-summary.test.ts`
Expected: FAIL porque o módulo ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Implementar tipos explícitos e uma única passagem por `portfolio.schools`; ordenar prioridades por `triage.priority` decrescente, depois SME; limitar a 5.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/frontend-portfolio-executive-summary.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/product/visual/portfolio-executive-summary.ts tests/unit/frontend-portfolio-executive-summary.test.ts
git commit -m "feat: derive portfolio executive summary"
```

### Task 2: Componentes executivos da home

**Files:**
- Create: `src/product/components/PortfolioExecutiveOverview.tsx`
- Create: `src/product/design/portfolio-executive.css`
- Modify: `src/product/pages/PortfolioPage.tsx`
- Modify: `src/product/App.tsx`

**Interfaces:**
- Consumes: retorno de `derivePortfolioExecutiveSummary(portfolio)`.
- Produces: seção acessível com fluxo financeiro, distribuição de situação e até 5 prioridades com links para prontuários e `/unidades`.

- [ ] **Step 1: Add component-level smoke expectations first**

No smoke, exigir textos `Fluxo de evidência financeira`, `Cobertura da carteira`, `Prioridades do momento`, os três rótulos financeiros e links das unidades prioritárias.

- [ ] **Step 2: Run smoke to verify it fails**

Expected: FAIL porque as novas seções não existem.

- [ ] **Step 3: Implement the components**

O fluxo usa barras horizontais normalizadas pelo maior valor observado, mas sempre imprime o valor monetário. Se o maior valor for zero, largura visual mínima é zero e o texto continua presente. A distribuição usa contagens e rótulos em texto. Prioridades mostram status, unidade, cobertura e primeiro motivo da triagem.

- [ ] **Step 4: Replace the old six-school preview**

Remover `portfolio.schools.slice(0, 6)` e a lista nominal genérica da home. O acesso à carteira inteira permanece em `/unidades`.

- [ ] **Step 5: Run unit tests, typecheck and build**

Run:
```bash
npm test
npm run typecheck
npm run build
```
Expected: PASS; registrar eventual warning de bundle sem mascará-lo.

- [ ] **Step 6: Commit**

```bash
git add src/product/components/PortfolioExecutiveOverview.tsx src/product/design/portfolio-executive.css src/product/pages/PortfolioPage.tsx src/product/App.tsx scripts/frontend-product-smoke.mjs
git commit -m "feat: add executive portfolio overview"
```

### Task 3: Validação visual e responsiva

**Files:**
- Modify if needed: `src/product/design/portfolio-executive.css`
- Modify if needed: `scripts/frontend-product-smoke.mjs`

**Interfaces:**
- Consumes: build final do produto.
- Produces: screenshots desktop/mobile dos modos persistente e temporário sem overflow.

- [ ] **Step 1: Run GitHub Actions on the final HEAD**

Expected: `Verificação contínua` e `Frontend Product Smoke 2026` com conclusão `success`.

- [ ] **Step 2: Download and inspect screenshots**

Revisar home desktop e 390 px, com atenção a densidade, wrapping de valores e prioridade visual.

- [ ] **Step 3: Fix any visual regression and rerun both gates**

Qualquer ajuste posterior exige nova execução dos dois workflows no novo HEAD.

- [ ] **Step 4: Confirm PR state**

PR #26 deve permanecer aberto e mergeável; não realizar merge nesta fase.
