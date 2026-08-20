# Coerência Produto, Layout e Documentação — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir as inconsistências confirmadas na auditoria entre busca, consulta ao vivo, semântica financeira, layout, navegação e documentação sem alterar as regras financeiras nem as fontes de dados.

**Architecture:** As mudanças ficam na camada de apresentação/read model já existente. Busca continua centralizada em `schoolMatchesSearch`; a consulta ao vivo continua protegendo o retrato anterior; os novos links executivos reutilizam os filtros da carteira; Repasses e Saldos continuam consumindo somente `portfolio.schools`. Nenhuma regra de conciliação financeira será alterada.

**Tech Stack:** React 19, React Router 7, TypeScript 7, Vite 8, Vitest 4, CSS próprio, Vercel.

**Spec:** `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` e `docs/FRONTEND_PRODUCT_QA_2026.md`.

## Global Constraints

- Exercício operacional permanece exclusivamente 2026.
- `Pagamento informado`, `crédito compatível localizado` e `saldo informado` permanecem conceitos distintos.
- Ausência de dado nunca vira zero inventado.
- Nenhuma mudança no reconciliador, PDDEInfo, SIGEF ou regras de evidência.
- A carteira publicada válida não pode ser substituída por resultado parcial.
- URLs profundas do frontend precisam continuar funcionando sem capturar `/api/*`.

---

### Task 1: Busca por SME real

**Files:**
- Modify: `src/product/derive.ts`
- Test: `tests/unit/frontend-home-findability.test.ts`
- Test: `tests/unit/frontend-financial-navigation.test.ts`

**Interfaces:**
- Consumes: `schoolMatchesSearch(school, query)`.
- Produces: busca equivalente para `0431021` e `04.31.021`, preservando nome e INEP.

- [ ] **Step 1: Write the failing test** com escola armazenada como `0431021` e consulta `04.31.021`.
- [ ] **Step 2: Run the focused test** e confirmar falha por ausência de equivalência numérica.
- [ ] **Step 3: Implement minimal matching** comparando também representações somente com dígitos.
- [ ] **Step 4: Run focused tests** e confirmar aprovação.
- [ ] **Step 5: Commit.**

### Task 2: Coerência do prontuário após consulta ao vivo

**Files:**
- Modify: `src/product/PortfolioContext.tsx`
- Modify: `src/product/pages/SchoolPage.tsx`
- Test: novo teste em `tests/unit/` para atualização do prontuário em sessão.

**Interfaces:**
- Consumes: `liveGeneratedAt` e cache de escolas do contexto.
- Produces: escola já aberta passa a refletir o retrato ao vivo concluído sem reload manual.

- [ ] **Step 1: Write failing regression test** que mantém o mesmo INEP e troca o token do retrato ao vivo.
- [ ] **Step 2: Run the focused test** e observar o prontuário anterior permanecer.
- [ ] **Step 3: Implement minimal invalidation/reactivity** sem disparar consultas redundantes.
- [ ] **Step 4: Run focused tests**.
- [ ] **Step 5: Commit.**

### Task 3: Métricas financeiras sem colisão visual

**Files:**
- Modify: `src/product/design/components.css` e/ou `src/product/design/layout.css`
- Test: novo teste estrutural de classes/markup quando útil; smoke visual obrigatório para validação final.

**Interfaces:**
- Consumes: `MetricValue` e `.metrics-band` existentes.
- Produces: valores monetários extensos cabem em desktop sem invadir a coluna vizinha.

- [ ] **Step 1: Add a regression assertion** que garanta regra responsiva/encolhimento da tipografia da faixa executiva.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Implement CSS mínimo** preservando a faixa editorial e mobile 2×2.
- [ ] **Step 4: Verify GREEN** e depois validar por screenshot desktop/mobile.
- [ ] **Step 5: Commit.**

### Task 4: Indicadores executivos acionáveis

**Files:**
- Modify: `src/product/components/PortfolioExecutiveOverview.tsx`
- Modify: `src/product/pages/SchoolsPage.tsx`
- Test: `tests/unit/frontend-portfolio-executive-overview.test.ts`

**Interfaces:**
- Consumes: filtros existentes de `SchoolsPage`.
- Produces: links como `/unidades?filtro=atencao`, `/unidades?filtro=cobertura` e filtros de situação reconhecidos pela carteira.

- [ ] **Step 1: Write failing tests** exigindo links nominalmente acionáveis.
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Add query-string filter initialization** e links executivos.
- [ ] **Step 4: Verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 5: Semântica contextual em Repasses, Saldos e carteira

**Files:**
- Modify: `src/product/components/PortfolioSchoolList.tsx`
- Modify: `src/product/pages/RepasseOverviewPage.tsx`
- Modify: `src/product/pages/BalancesOverviewPage.tsx`
- Test: `tests/unit/frontend-financial-navigation.test.ts`

**Interfaces:**
- Produces: rótulos visíveis `Pagamento informado` e `Crédito localizado`; nas páginas especializadas, a coluna global é explicitamente `Acompanhamento geral` quando reutilizar a triagem transversal.

- [ ] **Step 1: Write failing copy/semantic tests.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Update labels/copy sem alterar dados.**
- [ ] **Step 4: Verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 6: Busca da Home informa total real

**Files:**
- Modify: `src/product/components/GlobalSchoolFinder.tsx`
- Test: `tests/unit/frontend-home-findability.test.ts`

**Interfaces:**
- Produces: até 6 resultados visíveis e contagem `6 de N` quando houver mais correspondências.

- [ ] **Step 1: Write failing test com mais de 6 correspondências.**
- [ ] **Step 2: Verify RED.**
- [ ] **Step 3: Separate total matches from visible slice.**
- [ ] **Step 4: Verify GREEN.**
- [ ] **Step 5: Commit.**

### Task 7: Documentação corrente e estado histórico

**Files:**
- Modify: `docs/PROJETO.md`
- Modify: `docs/FONTES_E_REGRAS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ESCOPO_V05.md`
- Modify: `docs/DECISOES.md`
- Modify: `docs/FRONTEND_PRODUCT_QA_2026.md`

**Interfaces:** documentação apenas; nenhuma mudança de runtime.

- [ ] **Step 1: Atualizar o estado corrente** do frontend publicado, `MONITORING`, relatórios públicos e consulta ao vivo.
- [ ] **Step 2: Marcar baselines/escopos antigos como snapshots históricos quando aplicável.**
- [ ] **Step 3: Definir o QA como checklist permanente e registrar a rodada atual separadamente, sem fingir homologação onde o smoke não executou.**
- [ ] **Step 4: Review diff for contradictions.**
- [ ] **Step 5: Commit.**

### Task 8: Blindagem e verificação final

**Files:**
- Modify/Create: teste de deep-link/produção apenas se necessário; evitar workflow novo sem necessidade.

- [ ] **Step 1: Run full `npm run check`.**
- [ ] **Step 2: Run smoke desktop/mobile e inspecionar screenshots.**
- [ ] **Step 3: Open PR and verify CI.**
- [ ] **Step 4: Merge only after green checks.**
- [ ] **Step 5: Verify public Vercel routes `/`, `/unidades`, `/repasses`, `/saldos`, one school deep link and `/api/live` method behavior.**
