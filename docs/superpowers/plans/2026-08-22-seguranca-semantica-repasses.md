# Segurança Semântica dos Repasses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** impedir que limitações de cobertura ou correlação automática sejam apresentadas como problema financeiro da escola e estabilizar a coleta pública antes do gate das 163 unidades.

**Architecture:** corrigir primeiro o contrato operacional de correlação, depois a tradução humana/triagem, em seguida produzir diagnóstico nominal e finalmente endurecer a aquisição de saldos FNDE. Nenhuma regra de produto será derivada de texto da interface; os estados técnicos permanecem explícitos e testáveis.

**Tech Stack:** TypeScript, Zod, Vitest, React, GitHub Actions, Node 24.

**Spec:** `docs/superpowers/specs/2026-08-22-seguranca-semantica-repasses-design.md`

## Global Constraints

- exercício corrente exclusivo: 2026;
- ausência de evidência não equivale a ausência do fato;
- não usar movimento histórico para fechar 2026;
- não promover `public/data`, merge ou deploy neste plano;
- testes RED devem falhar pelo comportamento ausente antes da implementação;
- validação 163 somente após piloto 10 `COMPLETE`.

---

### Task 1: Tornar a correlação temporalmente segura

**Files:**
- Modify: `backend/application/build-monitoring-operational-view.ts`
- Test: `tests/unit/build-monitoring-operational-view.test.ts`

**Produces:** novos estados `PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO` e `PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE`.

- [ ] **Step 1: Write the failing tests**

Adicionar casos que constroem repasse pago e conta `COMPLETE`:

```ts
expect(repasse.bankCreditStatus).toBe('PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO');
```

quando `orderDate = '2026-08-04'` e `coverageThrough = '2026-07-31'`.

Adicionar caso com cobertura suficiente e zero candidato:

```ts
expect(repasse.bankCreditStatus).toBe('PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE');
```

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- tests/unit/build-monitoring-operational-view.test.ts`
Expected: FAIL porque os novos estados ainda não existem.

- [ ] **Step 3: Implement minimal state machine**

No `reconcileRepasse`, antes do matching:

```ts
if (!correspondingAccount.coverageThrough) return inconclusive;
if (repasse.dataOrdem && correspondingAccount.coverageThrough < repasse.dataOrdem) {
  return coverageBeforePayment;
}
```

Zero candidato com cobertura suficiente retorna o novo estado de não correlação automática.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/build-monitoring-operational-view.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix: make repasse correlation coverage-aware"`

---

### Task 2: Remover falso alerta da camada humana

**Files:**
- Modify: `backend/application/build-fiscal-human-view.ts`
- Modify: `backend/application/build-human-financial-view.ts`
- Modify: `src/product/visual/school-operational-reading.ts`
- Modify: `src/product/visual/portfolio-school-triage.ts` only if needed after tests
- Test: `tests/unit/build-human-financial-indicators.test.ts`
- Test: `tests/unit/school-operational-reading.test.ts` or nearest existing equivalent

**Produces:** não correlação automática permanece visível na parcela, mas não vira `followUp` nem `attention`.

- [ ] **Step 1: Write failing tests**

Assertar que:

```ts
expect(installment.creditEvidence.status).toBe('Crédito ainda não correlacionado automaticamente');
expect(school.followUp).not.toContain(expect.stringMatching(/crédito.*não.*localizado/i));
expect(deriveSchoolOperationalReading(school).tone).toBe('clear');
```

quando este for o único estado não conclusivo.

Para cobertura anterior:

```ts
expect(installment.creditEvidence.status).toBe('Extrato ainda não cobre a data do pagamento');
```

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/build-human-financial-indicators.test.ts`
Expected: FAIL no rótulo/indicador atual.

- [ ] **Step 3: Implement minimal translation**

Atualizar `creditStatusLabel`, `repasseNote` e `followUpFor`. Remover da triagem gerencial qualquer condição baseada exclusivamente na não correlação automática.

- [ ] **Step 4: Verify GREEN + regressions**

Run: `npm test -- tests/unit/build-human-financial-indicators.test.ts`
Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix: keep correlation gaps informational"`

---

### Task 3: Produzir diagnóstico nominal das correlações

**Files:**
- Create: `backend/application/audit-repasse-correlation.ts`
- Create: `scripts/audit-repasse-correlation.ts`
- Test: `tests/unit/audit-repasse-correlation.test.ts`

**Produces:** `auditRepasseCorrelation(fiscalView)` com contagens e linhas nominais.

- [ ] **Step 1: Write failing test**

Fixture com três parcelas: confirmada, cobertura anterior e não correlacionada. Assertar contagens por estado e preservação de INEP/programa/parcela/valor/cobertura.

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/audit-repasse-correlation.test.ts`
Expected: FAIL por módulo ausente.

- [ ] **Step 3: Implement auditor determinístico**

Retornar:

```ts
{
  totalsByStatus: Record<string, number>,
  rows: Array<{
    inep: string;
    program: string;
    installment: string | null;
    paymentInformedCents: number;
    orderDate: string | null;
    account: string | null;
    coverageThrough: string | null;
    correlationStatus: string;
  }>;
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/audit-repasse-correlation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add repasse correlation audit"`

---

### Task 4: Corrigir aquisição de saldo FNDE sob erro transitório

**Files:**
- Modify: `backend/adapters/pddeinfo-public-reports.ts`
- Modify: `backend/application/collect-pddeinfo-public-portfolio.ts`
- Test: `tests/unit/pddeinfo-public-reports.test.ts`
- Test: `tests/unit/collect-pddeinfo-public-portfolio.test.ts`

**Produces:** erro `ORA-02391` não é aceito como HTTP válido e pode ser retentado/fallbackado.

- [ ] **Step 1: Write/adjust failing tests**

HTTP 200 contendo `ORA-02391` deve fazer a estratégia HTTP falhar antes do parse final e permitir estratégia seguinte. O teste de portfólio já existente exige duas tentativas com `balanceRetryAttempts: 2`.

- [ ] **Step 2: Verify RED**

Run: `npm test -- tests/unit/pddeinfo-public-reports.test.ts tests/unit/collect-pddeinfo-public-portfolio.test.ts`
Expected: FAIL no retry/fallback ausente.

- [ ] **Step 3: Implement minimal acquisition fix**

Validar `sourceErrorMessage(html)` dentro da estratégia HTTP. Para ORA-02391 lançar erro transitório de aquisição. No coletor, retentar apenas erros reconhecidos de sessão com limite explícito e atraso configurável.

- [ ] **Step 4: Verify GREEN**

Run: `npm test -- tests/unit/pddeinfo-public-reports.test.ts tests/unit/collect-pddeinfo-public-portfolio.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "fix: retry transient FNDE balance source errors"`

---

### Task 5: Parar validações integrais concorrentes em cada push

**Files:**
- Modify: `.github/workflows/sigef-full-163-validation.yml`
- Modify: `.github/workflows/financial-completeness-pilot-10.yml`
- Test: `tests/unit/github-actions-temporary-session.test.ts` if it covers trigger invariants

**Produces:** full 163 manual/final; piloto controlado; browser fallback instalável quando habilitado.

- [ ] **Step 1: Add workflow expectations where testable**

Exigir que full-163 não tenha `pull_request` automático e possua `workflow_dispatch` + `concurrency` com `cancel-in-progress: true`.

- [ ] **Step 2: Verify RED if covered by tests**

Run: `npm test -- tests/unit/github-actions-temporary-session.test.ts`

- [ ] **Step 3: Update workflows**

Full-163 fica `workflow_dispatch` e `concurrency`. Pilot também recebe `concurrency`. Instalar Chromium somente nos jobs que permitem fallback de navegador.

- [ ] **Step 4: Verify CI syntax/tests**

Run: `npm test && npm run typecheck && npm run build`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "ci: serialize real FNDE validation runs"`

---

### Task 6: Pilotar, auditar e só então liberar o gate 163

**Files:** sem mudança funcional obrigatória; artefatos de execução preservados pelo workflow.

- [ ] **Step 1:** executar piloto das 10 escolas.
- [ ] **Step 2:** exigir `COMPLETE`, 10 escolas, nenhuma posição/movimento fora de 2026 e workbook com 8 abas.
- [ ] **Step 3:** rodar auditor de correlação no artefato e registrar distribuição nominal.
- [ ] **Step 4:** somente com piloto verde, executar 163 manualmente.
- [ ] **Step 5:** verificar `COMPLETE`, paridade, CI, typecheck, build e smoke.
- [ ] **Step 6:** manter PR #41 draft até revisão final; não promover dados automaticamente.
