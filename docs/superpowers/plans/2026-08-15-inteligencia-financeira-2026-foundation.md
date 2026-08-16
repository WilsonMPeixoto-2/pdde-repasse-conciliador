# Fundação da Inteligência Financeira 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrar os novos relatórios públicos FNDE ao monitoramento 2026, criar snapshots temporais e persistência institucional, preparar o Portal da Transparência e separar definitivamente o modelo técnico da apresentação humana.

**Architecture:** O `MONITORING` continua sendo o motor institucional. A coleta pública FNDE entra como colaborador independente e testável; snapshots constituem o fato temporal persistente; o read model humano deriva dos fatos já normalizados e não expõe metadados técnicos. 2025 permanece apenas em um caminho contextual separado.

**Tech Stack:** TypeScript 7, Node 24, Zod 4, Vitest 4, p-queue 9, Supabase/Postgres, Cheerio, Playwright/Crawlee já instalados.

## Global Constraints

- Exercício corrente obrigatório: `2026`.
- Exercício contextual permitido: `2025`, nunca misturado ao cálculo corrente.
- Dinheiro em centavos inteiros.
- Ausência/cobertura insuficiente nunca vira zero.
- Data de ordem de pagamento nunca vira data de crédito bancário.
- Saldo aplicado nunca vira rendimento por inferência.
- Metadados técnicos continuam preservados, mas não aparecem em saídas humanas.
- Frontend final fica fora desta branch; haverá gate explícito de decisão de produto depois da fundação de dados.

---

### Task 1: Contrato temporal 2026/2025

**Files:**
- Create: `backend/core/fiscal-scope.ts`
- Test: `tests/unit/fiscal-scope.test.ts`

**Interfaces:**
- Produces: `CURRENT_FISCAL_YEAR`, `CONTEXT_FISCAL_YEAR`, `assertCurrentFiscalYear(year)`, `assertContextFiscalYear(year)`, `isCurrentFiscalDate(date)`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';
import {
  assertContextFiscalYear,
  assertCurrentFiscalYear,
  CURRENT_FISCAL_YEAR,
} from '../../backend/core/fiscal-scope';

describe('fiscal scope', () => {
  it('fixa 2026 como exercício corrente', () => {
    expect(CURRENT_FISCAL_YEAR).toBe(2026);
    expect(assertCurrentFiscalYear(2026)).toBe(2026);
    expect(() => assertCurrentFiscalYear(2025)).toThrow(/2026/);
  });

  it('aceita 2025 apenas como contexto histórico', () => {
    expect(assertContextFiscalYear(2025)).toBe(2025);
    expect(() => assertContextFiscalYear(2024)).toThrow(/2025/);
  });
});
```

- [ ] **Step 2: Run CI and verify RED**

Expected: module `backend/core/fiscal-scope.ts` missing.

- [ ] **Step 3: Implement minimal contract**

```ts
export const CURRENT_FISCAL_YEAR = 2026 as const;
export const CONTEXT_FISCAL_YEAR = 2025 as const;
export function assertCurrentFiscalYear(value: number): 2026 { ... }
export function assertContextFiscalYear(value: number): 2025 { ... }
```

- [ ] **Step 4: Verify GREEN in CI**

---

### Task 2: Coleta pública FNDE da carteira

**Files:**
- Create: `backend/application/collect-pddeinfo-public-portfolio.ts`
- Modify: `backend/application/run-monitoring.ts`
- Test: `tests/unit/collect-pddeinfo-public-portfolio.test.ts`
- Test: `tests/unit/run-monitoring-public-reports.test.ts`

**Interfaces:**
- Consumes: `fetchPddeInfoPublicReport`, normalizadores de attendance/accounting/balance e `createRateLimitedQueue`.
- Produces: `collectPddeInfoPublicPortfolio(options): Promise<PddeInfoPublicPortfolioResult>`.
- `PddeInfoPublicPortfolioResult` contém `attendance`, `accounting`, `balances`, `failures`, `balanceReferenceMonth`, `coverageThrough`.

- [ ] **Step 1: Test deduplicação e isolamento de falha**

```ts
const result = await collectPddeInfoPublicPortfolio({
  schools: [schoolA, schoolB],
  fiscalYear: 2026,
  fetchReport: fakeFetch,
  availableBalanceMonths: ['06-2026', '05-2026'],
});
expect(balanceCalls.filter((call) => call.cnpj === sharedCnpj)).toHaveLength(1);
expect(result.failures).toEqual(expect.arrayContaining([
  expect.objectContaining({ kind: 'ACCOUNTING', inep: schoolB.inep }),
]));
expect(result.attendance.length).toBeGreaterThan(0);
```

- [ ] **Step 2: Verify RED in CI**
- [ ] **Step 3: Implement concurrency conservatively (3), HTTP first, browser fallback delegated to adapter, month selection dynamic from candidates**
- [ ] **Step 4: Extend `runMonitoring()` with optional public report collector and preserve result under `publicReports`, without breaking existing callers**
- [ ] **Step 5: Verify GREEN in CI**

---

### Task 3: Snapshots financeiros e série histórica

**Files:**
- Create: `backend/core/financial-snapshot.ts`
- Create: `backend/application/build-financial-series.ts`
- Test: `tests/unit/financial-snapshot.test.ts`
- Test: `tests/unit/build-financial-series.test.ts`

**Interfaces:**

```ts
export interface FinancialAccountSnapshot {
  schoolInep: string;
  uexCnpj: string;
  programName: string;
  bank: string;
  agency: string;
  account: string;
  referenceDate: string;
  checkingBalanceCents: number | null;
  fundBalanceCents: number | null;
  savingsBalanceCents: number | null;
  rdbCdbBalanceCents: number | null;
  investmentBalanceCents: number | null;
  totalReportedBalanceCents: number | null;
  source: 'PDDEINFO';
  collectedAt: string;
  artifactSha256: string | null;
}
```

- [ ] **Step 1: Test chave lógica e rejeição de 2025 na série corrente**
- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement `financialSnapshotKey(snapshot)` and `buildFinancialSeries(snapshots)`**
- [ ] **Step 4: Ensure duplicate logical snapshots are rejected, dates sorted, unknown values remain null**
- [ ] **Step 5: Verify GREEN**

---

### Task 4: Migrations institucionais

**Files:**
- Create: `supabase/migrations/20260816013000_financial_intelligence_2026.sql`
- Test: `tests/unit/financial-intelligence-migration.test.ts`

**Interfaces:**
- Database source enum/check accepts `PORTAL_TRANSPARENCIA`.
- Storage bucket accepts `application/pdf`.
- New table: `public.financial_account_snapshots`.
- New view: `public.current_financial_account_positions_2026`.

- [ ] **Step 1: Write a migration contract test that reads SQL and asserts required clauses**
- [ ] **Step 2: Verify RED because migration file is absent**
- [ ] **Step 3: Create incremental migration**

Required uniqueness:

```sql
unique (
  school_inep,
  uex_cnpj,
  program_name,
  bank,
  agency,
  account_number,
  reference_date,
  source
)
```

RLS: deny public/anon/authenticated writes and reads; service role receives controlled select/insert through explicit grants/policy pattern consistent with repository.

- [ ] **Step 4: Verify migration tests and PGlite migration suite**

---

### Task 5: Portal da Transparência e fonte opcional

**Files:**
- Modify: `backend/adapters/portal-transparencia-http.ts`
- Modify: `backend/core/source-catalog.ts`
- Test: `tests/unit/portal-transparencia-optional.test.ts`

**Interfaces:**
- Produces `createPortalTransparenciaClientFromEnv(env)` returning `{ enabled: false }` without key or `{ enabled: true, client }` with key.
- No key never throws during composition of `MONITORING`.

- [ ] **Step 1: Write failing test for disabled-without-key and enabled-with-key**
- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement env factory without logging key**
- [ ] **Step 4: Keep source catalog state `CREDENTIAL_REQUIRED` when environment is not configured**
- [ ] **Step 5: Verify GREEN**

---

### Task 6: Contrato humano sem metadados técnicos

**Files:**
- Create: `backend/application/build-human-financial-view.ts`
- Test: `tests/unit/build-human-financial-view.test.ts`
- Modify: `scripts/export-fiscal-workbook.ts` only where necessary to consume human fields and remove technical columns from user-facing sheets.
- Modify: `README.md`

**Interfaces:**

```ts
export interface HumanFinancialPortfolioView {
  title: 'Inteligência Financeira PDDE | 4ª CRE';
  fiscalYear: 2026;
  referenceLabel: string;
  schools: HumanFinancialSchoolView[];
}
```

School view exposes only:
- SME/name/INEP/UEx/CNPJ;
- programs;
- repasses/parcelas;
- contas;
- latest financial position + reference date;
- composition of applications;
- 2026 movements in neutral human categories;
- accounting status;
- factual follow-up indicators.

- [ ] **Step 1: Write failing test that serializes the human view and rejects forbidden tokens**

```ts
const serialized = JSON.stringify(view).toLowerCase();
for (const forbidden of [
  'sha256', 'parser', 'sourceurl', 'pagesfetched', 'technicalclassification',
  'requesthash', 'payload', 'attempts',
]) {
  expect(serialized).not.toContain(forbidden);
}
expect(view.fiscalYear).toBe(2026);
```

- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement the human view as a projection, not as a mutation of evidence records**
- [ ] **Step 4: Add human source labels and factual indicators such as `RECURSO_COM_SALDO_ELEVADO_SEM_MOVIMENTACAO_RECENTE`, but expose only neutral sentences in the presentation model**
- [ ] **Step 5: Remove technical metadata from user-facing workbook sheets; technical data remains in internal JSON/evidence**
- [ ] **Step 6: Verify GREEN**

---

### Task 7: Verification and product decision gate

**Files:**
- Modify: `README.md`
- Create: `docs/PRODUCT_DECISION_GATE_2026.md`

- [ ] Run full `npm run check` in GitHub Actions.
- [ ] Run migration PGlite tests.
- [ ] Run controlled live pilot of public FNDE reports for 10 UEs.
- [ ] If successful, run 163-UE collection with rate limits and preserve coverage/failures.
- [ ] Compare public report CNPJs/accounts against existing monitoring; never merge discrepancies silently.
- [ ] Record exactly what worked, coverage month, failures and source-side errors.
- [ ] Stop before final frontend design and record the required product decisions: navigation, information hierarchy, indicators, time-series visualization, Excel/PDF executive layout and disclosure level.

## Self-review

- All six requested implementation areas are covered.
- 2026/2025 boundary is explicit in tasks 1, 3 and 6.
- Technical metadata is preserved but prohibited in the human projection.
- Portal key is never required to complete a normal monitoring run.
- No task assumes that investment balance equals yield.
- No task interprets payment order as bank credit.
- Final frontend is intentionally excluded and guarded by a product decision gate.