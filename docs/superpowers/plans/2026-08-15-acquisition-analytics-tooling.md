# Acquisition and Analytics Tooling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar browser assistido, rate limiting, DuckDB, leitura/geração PDF, Inngest opcional e property-based testing sem substituir o coletor PDDEInfo nem o worker Supabase atuais.

**Architecture:** Novas capacidades entram como adapters/módulos auxiliares. A rota genérica de aquisição prefere fonte estruturada, depois HTTP e só então browser assistido; DuckDB pré-seleciona dados e o reconciliador permanece responsável pelos estados probatórios; Inngest é uma camada opt-in em torno de etapas explicitamente duráveis.

**Tech Stack:** Node.js >=22.12, TypeScript, Vitest, Crawlee, Playwright, p-queue, @duckdb/node-api, unpdf, Inngest, fast-check, @fast-check/vitest.

## Global Constraints

- Não substituir `fetchPddeInfoSchoolHtml` nem tornar browser obrigatório para PDDEInfo.
- CAPTCHA/desafio interativo: pausar e aguardar intervenção humana na mesma sessão; não implementar solver automático, stealth ou proxy de evasão.
- Valores monetários continuam em centavos inteiros.
- DuckDB não produz status probatório.
- Supabase `ExecutionJobQueue` e `ExecutionWorker` continuam sendo o caminho padrão.
- `npm run check` deve passar sem instalar binário Chromium no CI.
- Dependências novas devem ficar registradas no lockfile e ser verificadas por CI.

---

### Task 1: Dependências reproduzíveis

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Consumes: npm registry
- Produces: módulos disponíveis para tarefas seguintes

- [ ] **Step 1:** instalar como dependências exatas `crawlee`, `playwright`, `p-queue`, `@duckdb/node-api`, `unpdf`, `inngest`.
- [ ] **Step 2:** instalar como devDependencies exatas `fast-check` e `@fast-check/vitest`.
- [ ] **Step 3:** adicionar script `browser:install` executando `playwright install chromium`.
- [ ] **Step 4:** executar `npm run check` sem instalar Chromium e confirmar que o baseline segue verde.
- [ ] **Step 5:** commit dos manifests.

### Task 2: Rate limiting reutilizável

**Files:**
- Create: `tests/unit/rate-limited-queue.test.ts`
- Create: `backend/runtime/rate-limited-queue.ts`

**Interfaces:**
- Produces: `createRateLimitedQueue(options)` e `runRateLimited(items, worker, options)`

- [ ] **Step 1:** escrever teste que exige limite de concorrência, preservação da ordem do resultado e propagação de `AbortSignal`.
- [ ] **Step 2:** executar o teste e confirmar falha por módulo ausente.
- [ ] **Step 3:** implementar wrapper mínimo sobre `PQueue` com `concurrency`, `intervalCap`, `intervalMs`, `timeoutMs` e `strict`.
- [ ] **Step 4:** executar teste e `npm run check`.
- [ ] **Step 5:** commit.

### Task 3: Rota de aquisição e browser assistido

**Files:**
- Create: `tests/unit/source-acquisition-route.test.ts`
- Create: `tests/unit/browser-assisted-source.test.ts`
- Create: `backend/application/source-acquisition-route.ts`
- Create: `backend/adapters/browser-assisted-source.ts`
- Create: `scripts/browser-assist.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `acquireWithFallback`, `detectInteractiveChallenge`, `collectWithAssistedBrowser` e CLI `browser:assist`.

- [ ] **Step 1:** testar que a rota usa structured -> HTTP -> browser e não chama fallback posterior após sucesso.
- [ ] **Step 2:** testar detecção pura de desafio por texto/URL/selector snapshot e exigir `HumanInterventionHandler` quando detectado.
- [ ] **Step 3:** confirmar testes vermelhos.
- [ ] **Step 4:** implementar rota genérica sem tocar no coletor PDDEInfo atual.
- [ ] **Step 5:** implementar `PlaywrightCrawler` headful opcional, mantendo página/sessão aberta enquanto o handler humano aguarda confirmação.
- [ ] **Step 6:** criar CLI que abre URL, aguarda Enter quando houver desafio e grava HTML final apenas em caminho explicitamente solicitado.
- [ ] **Step 7:** executar testes e `npm run check`.
- [ ] **Step 8:** commit.

### Task 4: DuckDB analítico

**Files:**
- Create: `tests/unit/duckdb-movement-analytics.test.ts`
- Create: `backend/analytics/duckdb-movement-analytics.ts`

**Interfaces:**
- Consumes: `SigefMovement[]` normalizados.
- Produces: `DuckDbMovementAnalytics` com `loadMovements`, `findCandidates` e `summarize`.

- [ ] **Step 1:** escrever teste com movimentos sintéticos que exige filtro por CNPJ, programa, conta, valor em centavos e janela de datas.
- [ ] **Step 2:** confirmar falha por módulo ausente.
- [ ] **Step 3:** criar DuckDB `:memory:` e tabela com `BIGINT` para centavos; inserir parâmetros sem converter dinheiro para float.
- [ ] **Step 4:** implementar consulta parametrizada de candidatos e agregação.
- [ ] **Step 5:** executar teste e `npm run check`.
- [ ] **Step 6:** commit.

### Task 5: PDF como entrada e saída

**Files:**
- Create: `tests/unit/pdf-text-extractor.test.ts`
- Create: `tests/unit/html-pdf-renderer.test.ts`
- Create: `backend/adapters/pdf-text-extractor.ts`
- Create: `backend/report/html-pdf-renderer.ts`

**Interfaces:**
- Produces: `extractPdfText(bytes)` e `renderHtmlPdf(input, browserFactory?)`.

- [ ] **Step 1:** criar fixture PDF mínima em memória e teste de extração de texto/metadados.
- [ ] **Step 2:** criar teste do renderizador usando browser factory fake para verificar opções A4/background/margens sem Chromium real.
- [ ] **Step 3:** confirmar testes vermelhos.
- [ ] **Step 4:** implementar leitura com `unpdf` retornando totalPages, pages, mergedText e metadata normalizada.
- [ ] **Step 5:** implementar renderizador Playwright com browser factory injetável e fechamento garantido.
- [ ] **Step 6:** executar testes e `npm run check`.
- [ ] **Step 7:** commit.

### Task 6: Inngest opcional

**Files:**
- Create: `tests/unit/durable-step-workflow.test.ts`
- Create: `tests/unit/inngest-bridge.test.ts`
- Create: `backend/orchestration/durable-step-workflow.ts`
- Create: `backend/orchestration/inngest-bridge.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `runDurableSteps(stepRunner, steps)` e `createInngestBridge(options)`.

- [ ] **Step 1:** testar que cada etapa possui ID estável, resultado serializável e falha não executa etapa posterior.
- [ ] **Step 2:** testar que bridge fica `disabled` sem configuração e não altera a fila Supabase.
- [ ] **Step 3:** confirmar testes vermelhos.
- [ ] **Step 4:** implementar workflow neutro de step runner.
- [ ] **Step 5:** implementar adapter Inngest que mapeia `step.run()` ao workflow quando habilitado por configuração explícita.
- [ ] **Step 6:** documentar variáveis Inngest em `.env.example`, sem segredos reais.
- [ ] **Step 7:** executar testes e `npm run check`.
- [ ] **Step 8:** commit.

### Task 7: Invariantes com fast-check

**Files:**
- Create: `tests/unit/reconciliation-properties.test.ts`

**Interfaces:**
- Consumes: funções existentes de conciliação e tipos financeiros.
- Produces: suíte generativa reproduzível em Vitest.

- [ ] **Step 1:** criar propriedades para soma de centavos, invariância por reordenação de movimentos e impossibilidade de confirmar quando fonte obrigatória está indisponível.
- [ ] **Step 2:** executar testes; corrigir apenas se encontrar bug real, preservando semântica existente.
- [ ] **Step 3:** executar `npm run check` completo.
- [ ] **Step 4:** commit.

### Task 8: Integração e verificação final

**Files:**
- Modify: `backend/index.ts` apenas para exports públicos necessários.
- Modify: `README.md` com seção curta de capacidades opt-in.

**Interfaces:**
- Produces: API pública dos módulos complementares e instruções operacionais.

- [ ] **Step 1:** adicionar exports sem ativação automática.
- [ ] **Step 2:** documentar `browser:install`, `browser:assist`, DuckDB e Inngest opt-in.
- [ ] **Step 3:** executar testes unitários, typecheck, build e `npm audit`.
- [ ] **Step 4:** comparar branch com `main` e confirmar ausência de alterações não relacionadas.
- [ ] **Step 5:** abrir PR com escopo e validações.
