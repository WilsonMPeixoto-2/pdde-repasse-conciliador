# Cobertura Temporal e Escalada de Fontes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separar sucesso operacional de suficiência temporal da evidência e integrar a rota pública SIGEF `conta-corrente/visualizaexcel` como fallback quando o extrato paginado não alcança a data de um pagamento conhecido.

**Architecture:** O status `COMPLETE/PARTIAL` permanece operacional. Um novo avaliador puro calcula cobertura temporal por pagamento e agrega `SUFFICIENT/OUT_OF_COVERAGE/UNKNOWN`. O coletor SIGEF recebe `requiredThrough` e só consulta a exportação alternativa quando a rota paginada fica atrás dessa data; os movimentos são unidos sem sobrescrever evidência de origem.

**Tech Stack:** TypeScript 7, Node 22+, Vitest 4, Cheerio, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-05-cobertura-temporal-escalada-fontes-design.md`

## Global Constraints

- Exercício operacional permanece 2026.
- Ausência não é zero.
- Pagamento informado não equivale a crédito bancário.
- `COMPLETE` continua descrevendo execução, não frescor financeiro.
- Fallback não contorna CAPTCHA/autenticação.
- Fonte alternativa não apaga nem reescreve silenciosamente a evidência da fonte primária.
- Aplicação/resgate não reconstrói saldo atual nem rendimento.

---

### Task 1: Avaliador determinístico de cobertura temporal

**Files:**
- Create: `backend/core/payment-temporal-coverage.ts`
- Test: `tests/unit/payment-temporal-coverage.test.ts`

**Interfaces:**
- Consumes: pagamentos normalizados com `school.inep`, `programCode`, `account`, `amountPaidCents`, `paymentDate`; observações de conta com `inep`, `programCode`, `account`, `coverageThrough`.
- Produces: `assessPaymentTemporalCoverage(...)` e tipos `PaymentTemporalCoverageAssessment`, `PaymentTemporalCoverageSummary`.

- [ ] **Step 1: Write the failing tests**

Criar testes que exijam:

```ts
expect(summary.status).toBe('OUT_OF_COVERAGE');
expect(summary.sufficientCount).toBe(1);
expect(summary.outOfCoverageCount).toBe(1);
expect(summary.unknownCount).toBe(1);
```

Casos mínimos: cobertura igual/posterior, cobertura anterior, sem conta forte, pagamento sem data e precedência agregada.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/payment-temporal-coverage.test.ts`
Expected: FAIL porque o módulo/função ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Implementar chave forte `INEP + programCode + canonicalAccount(account)` e estados:

```ts
type PaymentTemporalCoverageStatus = 'SUFFICIENT' | 'OUT_OF_COVERAGE' | 'UNKNOWN';
```

Apenas pagamentos com `amountPaidCents > 0` entram no denominador. Nunca inferir cobertura por valor semelhante.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/payment-temporal-coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: avalia cobertura temporal dos pagamentos`

---

### Task 2: Integrar cobertura temporal ao monitor sem rebaixar COMPLETE

**Files:**
- Modify: `backend/application/run-monitoring.ts`
- Test: `tests/unit/monitoring-temporal-coverage.test.ts`

**Interfaces:**
- Consumes: `assessPaymentTemporalCoverage` da Task 1.
- Produces: `raw.quality.paymentTemporalCoverage` e `coverage.paymentTemporalCoverage` com o mesmo resumo determinístico.

- [ ] **Step 1: Write the failing test**

Fixture com coleta tecnicamente completa, pagamento em `2026-08-05` e conta coberta apenas até `2026-05-28`:

```ts
expect(result.status).toBe('COMPLETE');
expect(result.raw.quality.paymentTemporalCoverage.status).toBe('OUT_OF_COVERAGE');
expect(result.raw.quality.paymentTemporalCoverage.outOfCoverageCount).toBe(1);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/monitoring-temporal-coverage.test.ts`
Expected: FAIL porque `quality.paymentTemporalCoverage` ainda não existe.

- [ ] **Step 3: Write minimal implementation**

Normalizar os pagamentos uma única vez no fluxo de `runMonitoring`, avaliar contra `accountResults` e publicar o resumo sem alterar a lógica existente de `complete`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/monitoring-temporal-coverage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: separa completude operacional de cobertura temporal`

---

### Task 3: Fallback público SIGEF via visualizaexcel

**Files:**
- Modify: `backend/adapters/sigef-public-statement.ts`
- Test: `tests/unit/sigef-public-statement-export.test.ts`

**Interfaces:**
- Extende entrada de `collectSigefPublicAccount` com `requiredThrough?: string`.
- Produz `buildSigefPublicStatementExportUrl(...)` e usa fallback `EXCEL_EXPORT` somente quando `coverageThrough < requiredThrough`.

- [ ] **Step 1: Write the failing tests**

Exigir:

```ts
expect(buildSigefPublicStatementExportUrl(input)).toContain('/conta-corrente/visualizaexcel/');
```

E, usando fetch injetável/fixture realista:

```ts
expect(exportCalls).toBe(0); // quando paginado já cobre a data
expect(exportCalls).toBe(1); // quando paginado fica atrás
expect(result.coverageThrough).toBe('2026-08-05');
```

Também testar deduplicação entre rota paginada e exportação.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/sigef-public-statement-export.test.ts`
Expected: FAIL porque builder/fallback ainda não existem.

- [ ] **Step 3: Write minimal implementation**

Adicionar rota:

```text
https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/visualizaexcel/banco/{banco}/agencia/{agencia}/contacorrente/{conta}/cnpj/{cnpj}/programa/{programa}/data/{MMYYYY}
```

Parsear a exportação como HTML de download, validar CNPJ/programa, reutilizar as mesmas regras de data, dinheiro, classificação e fingerprint. Mesclar movimentos por id/fingerprint. Se o fallback falhar, retornar o resultado primário com cobertura insuficiente e metadado de falha complementar; não fabricar movimentos.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/sigef-public-statement-export.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: amplia extrato SIGEF com fallback de exportacao`

---

### Task 4: Acionar fallback apenas para contas que precisam cobrir pagamento conhecido

**Files:**
- Modify: `backend/application/run-monitoring.ts`
- Test: `tests/unit/monitoring-sigef-escalation.test.ts`

**Interfaces:**
- Consumes: pagamentos normalizados e `collectSigefPublicAccount(requiredThrough)`.
- Produces: `requiredThrough` por chave forte escola + programa + conta.

- [ ] **Step 1: Write the failing test**

Fixture com duas contas: uma com pagamento em agosto e outra sem pagamento recente. Verificar que somente a primeira recebe `requiredThrough: '2026-08-05'`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- tests/unit/monitoring-sigef-escalation.test.ts`
Expected: FAIL porque `requiredThrough` ainda não é passado.

- [ ] **Step 3: Write minimal implementation**

Criar mapa determinístico dos pagamentos positivos por `INEP|programCode|canonicalAccount(account)` e passar a data mais recente ao coletor SIGEF. Sem conta forte, não disparar fallback por aproximação.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- tests/unit/monitoring-sigef-escalation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat: escala fonte SIGEF conforme data do pagamento`

---

### Task 5: Documentação e verificação integral

**Files:**
- Modify: `docs/ESTADO_ATUAL_2026-09-04.md` ou criar estado soberano de 05/09 se a mudança for promovida
- Modify: `docs/CONTINUIDADE_WORK.md`
- Modify: `docs/DECISOES.md`
- Modify: `docs/FONTES_E_REGRAS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/INDICE_DOCUMENTAL.md`

**Interfaces:**
- Documenta diferença entre execução completa e cobertura temporal, e classifica `SIGEF visualizaexcel` como fonte pública integrada após validação.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- tests/unit/payment-temporal-coverage.test.ts tests/unit/monitoring-temporal-coverage.test.ts tests/unit/sigef-public-statement-export.test.ts tests/unit/monitoring-sigef-escalation.test.ts`
Expected: PASS, 0 failures.

- [ ] **Step 2: Run full project verification**

Run: `npm run check`
Expected: testes, typecheck e build com exit code 0.

- [ ] **Step 3: Review diff against spec**

Confirmar que:

```text
COMPLETE != cobertura temporal suficiente
fallback só é chamado quando necessário
fonte original permanece rastreável
CAPTCHA não é contornado
ausência não vira zero
```

- [ ] **Step 4: Update canonical docs**

Registrar somente o que foi efetivamente implementado/verificado; não promover o BB Gestão Ágil nem outras fontes ainda não integradas.

- [ ] **Step 5: Commit**

Commit: `docs: registra cobertura temporal e nova rota SIGEF`
