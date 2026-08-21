# Completude financeira publicada de 2026 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fazer o site e o workbook humano publicarem todas as posições mensais disponíveis de 2026, com atividade e cobertura por conta, sem misturar exercícios nem inferir causalidade financeira não comprovada.

**Architecture:** O pipeline existente continua sendo a única fonte operacional. `runFinancialIntelligenceMonitoring` passa a coletar saldos em `ALL_AVAILABLE_2026`; `buildHumanFinancialView` transforma posições e movimentos de 2026 em um contrato humano estável; o site, o workbook e o empacotador público consomem esse mesmo contrato, sem reclassificação local.

**Tech Stack:** TypeScript 7, Node 24, Vitest 4, Zod 4, React 19, ExcelJS 4, Vite 8.

**Spec:** `docs/superpowers/specs/2026-08-21-completude-financeira-publicada-design.md`

## Global Constraints

- Exercício operacional exclusivamente 2026.
- Movimentos de outros exercícios não entram em totais ou narrativas correntes.
- Mês sem posição significa ausência de observação, nunca saldo zero.
- Aplicação financeira não é rendimento.
- Soma de movimentos não reconcilia automaticamente o saldo.
- Ausência de evento só pode gerar flag quando a coleta de movimentos da conta estiver completa.
- Site e Excel derivam do mesmo contrato humano.
- Nenhum PR pronto, merge, promoção de dados ou deploy faz parte deste plano sem gate separado.
- TDD obrigatório para toda mudança funcional.

---

### Task 1: Propagar `ALL_AVAILABLE_2026` no monitoramento de produto

**Files:**
- Modify: `backend/application/run-financial-intelligence-monitoring.ts`
- Test: `tests/unit/run-monitoring-public-reports.test.ts`

**Interfaces:**
- Consumes: `BalanceCollectionMode` de `collect-pddeinfo-public-portfolio.ts`.
- Produces: `RunFinancialIntelligenceMonitoringOptions.balanceMode?: BalanceCollectionMode`; padrão de produto `ALL_AVAILABLE_2026`, com `LATEST` apenas quando explicitamente solicitado.

- [ ] **Step 1: Write the failing test**

Adicionar ao teste de monitoramento uma asserção de que o coletor público recebe `balanceMode: 'ALL_AVAILABLE_2026'` por padrão e outro caso que preserve `LATEST` quando informado explicitamente.

```ts
expect(publicCollector).toHaveBeenCalledWith(expect.objectContaining({
  fiscalYear: 2026,
  balanceMode: 'ALL_AVAILABLE_2026',
}));
```

- [ ] **Step 2: Verify RED on CI**

Push somente do teste. Esperado: `Verificação contínua` falhar porque o coletor ainda não recebe `balanceMode`.

- [ ] **Step 3: Implement minimal propagation**

Importar `BalanceCollectionMode`, adicionar a opção e chamar:

```ts
const balanceMode = options.balanceMode ?? 'ALL_AVAILABLE_2026';
const reports = await publicCollector({
  schools: options.schools,
  fiscalYear: 2026,
  balanceMode,
  ...(options.signal ? { signal: options.signal } : {}),
});
```

- [ ] **Step 4: Verify GREEN on CI**

Esperado: suíte, typecheck e build aprovados.

---

### Task 2: Preservar série mensal e conta que termina zerada

**Files:**
- Modify: `backend/application/build-human-financial-view.ts`
- Test: `tests/unit/build-human-financial-history.test.ts`
- Test: `tests/unit/build-human-financial-public-accounts.test.ts`

**Interfaces:**
- Consumes: `publicReports.balances` com várias posições por conta.
- Produces: `HumanFinancialAccount.positions` ordenado, deduplicado por data e com retenção da conta quando qualquer posição de 2026 for não zero.

- [ ] **Step 1: Write failing tests**

Cobrir:

```ts
expect(account.positions.map((item) => item.referenceDate)).toEqual([
  '2026-05-31',
  '2026-06-30',
]);
expect(account.latestPosition?.referenceDate).toBe('2026-06-30');
```

E uma conta encontrada apenas nos saldos que possua maio > 0 e junho = 0 deve continuar presente.

- [ ] **Step 2: Verify RED on CI**

Esperado: o caso de conta terminada zerada falha porque a implementação atual testa somente `latestPosition`.

- [ ] **Step 3: Implement deterministic position handling**

Criar helper que:

1. ordena por `coverageThrough`;
2. deduplica posições idênticas da mesma data;
3. lança erro se houver duas posições divergentes para a mesma conta/data;
4. usa `positions.some(position => position.totalReportedBalanceCents !== 0 || position.checkingBalanceCents !== 0 || position.applications.totalCents !== 0)` para decidir retenção de contas sem extrato.

- [ ] **Step 4: Verify GREEN on CI**

Esperado: testes de histórico e contas públicas aprovados, mais suíte completa verde.

---

### Task 3: Acrescentar classificação estável, cobertura, atividade e flags por conta

**Files:**
- Modify: `backend/application/build-human-financial-view.ts`
- Modify: `shared/human-financial-contract.ts`
- Test: `tests/unit/build-human-financial-view.test.ts`
- Create: `tests/unit/build-human-account-activity-2026.test.ts`

**Interfaces:**
- Produces:

```ts
type HumanMovementKind =
  | 'FNDE_CREDIT'
  | 'APPLICATION'
  | 'REDEMPTION'
  | 'PAYMENT_OR_TRANSFER'
  | 'CARD_PAYMENT'
  | 'FINANCIAL_INCOME'
  | 'THIRD_PARTY_ENTRY'
  | 'BANK_FEE'
  | 'REVERSAL'
  | 'OTHER';
```

E por conta:

```ts
coverage: {
  positionCount: number;
  firstPositionDate: string | null;
  latestPositionDate: string | null;
  movementCollectionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED' | 'NOT_AVAILABLE';
  latestMovementDate: string | null;
};
activity: {
  movementCount: number;
  creditsObservedCents: number;
  debitsObservedCents: number;
  fndeCreditsCents: number;
  applicationsCents: number;
  redemptionsCents: number;
  paymentsAndTransfersCents: number;
  financialIncomeCents: number;
  thirdPartyEntriesCents: number;
  bankFeesCents: number;
  otherCreditsCents: number;
  otherDebitsCents: number;
};
contextFlags: HumanAccountContextFlag[];
```

- [ ] **Step 1: Write failing activity tests**

Usar movimentos de todas as classes técnicas e provar que os agregados são calculados a partir do código estável, não do texto `category`.

- [ ] **Step 2: Write failing evidence-limit tests**

Cobrir:

```ts
expect(account.contextFlags).toContain('NONZERO_POSITION_WITHOUT_2026_INFLOW');
expect(account.contextFlags).toContain('NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT');
```

somente para coleta `COMPLETE`. Para `PARTIAL` e `ERROR`, esperar flags de limitação e nenhuma conclusão de ausência.

- [ ] **Step 3: Verify RED on CI**

Esperado: campos ainda inexistentes.

- [ ] **Step 4: Implement movement mapping and account summaries**

Mapear `technicalClassification` para `HumanMovementKind`, somar créditos/débitos em centavos inteiros e mapear `collectionStatus`:

```ts
COMPLETE -> COMPLETE
PARTIAL -> PARTIAL
ERROR -> FAILED
sem statement -> NOT_AVAILABLE
```

`paymentsAndTransfersCents` soma `PAYMENT_OR_TRANSFER` e `CARD_PAYMENT` debitados. `REVERSAL` entra nos agregados genéricos `otherCreditsCents`/`otherDebitsCents`, sem apagar seu `kind`.

- [ ] **Step 5: Implement context flags conservadoras**

Emitir ausência de entrada/aplicação apenas quando `movementCollectionStatus === 'COMPLETE'`. Para parcial/falha, emitir somente `MOVEMENT_COLLECTION_PARTIAL` ou `MOVEMENT_COLLECTION_FAILED`.

- [ ] **Step 6: Update shared Zod contract**

Adicionar schemas dos novos campos. Aceitar snapshot legado com defaults seguros para leitura transitória, mas fazer o builder novo sempre materializar os campos completos.

- [ ] **Step 7: Verify GREEN on CI**

Esperado: novos testes, suíte, typecheck e build verdes.

---

### Task 4: Expor a leitura `O que foi observado em 2026` no prontuário

**Files:**
- Create: `src/product/components/AccountObserved2026.tsx`
- Modify: `src/product/pages/SchoolPage.tsx`
- Modify: `src/product/design/school-operational.css`
- Create: `tests/unit/frontend-account-observed-2026.test.ts`

**Interfaces:**
- Consumes: `HumanAccount.coverage`, `activity`, `contextFlags`, `latestPosition`.
- Produces: bloco humano antes de composição, timeline e extrato.

- [ ] **Step 1: Write failing frontend contract test**

O teste deve exigir texto e campos estáveis no componente:

```ts
expect(source).toContain('O que foi observado em 2026');
expect(source).toContain('Primeira posição observada');
expect(source).toContain('Última posição observada');
expect(source).toContain('Aplicações');
expect(source).toContain('Pagamentos / transferências');
```

Também exigir as mensagens da Professor Carneiro Ribeiro previstas na especificação.

- [ ] **Step 2: Verify RED on CI**

Esperado: componente inexistente.

- [ ] **Step 3: Implement semantic component**

Renderizar `section`/`dl` sem recalcular movimentos. Para flags:

- `NONZERO_POSITION_WITHOUT_2026_INFLOW`: informar que há saldo na posição sem entrada correspondente observada em 2026;
- `NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT`: usar a redação da especificação;
- parcial/falha: apresentar limitação da coleta antes de qualquer leitura de ausência.

- [ ] **Step 4: Integrate before balance composition**

Em `SchoolPage.tsx`, inserir `<AccountObserved2026 account={account} />` dentro de cada `Disclosure`, antes de `BalanceComposition`.

- [ ] **Step 5: Add compact responsive styling**

Usar os tokens atuais; nenhuma nova paleta. Garantir reflow simples em até 700 px.

- [ ] **Step 6: Verify GREEN on CI**

Esperado: testes e builds verdes.

---

### Task 5: Fazer o workbook contar a mesma história e criar `Evolução Mensal`

**Files:**
- Modify: `backend/report/human-financial-workbook.ts`
- Test: `tests/unit/human-financial-workbook.test.ts`

**Interfaces:**
- Consumes: exatamente os campos do contrato humano.
- Produces: oito abas; `Contas e Saldos` com síntese temporal/atividade/cobertura e `Evolução Mensal` com uma linha por posição.

- [ ] **Step 1: Write failing workbook tests**

Esperar abas:

```ts
[
  'Visão Geral', 'Acompanhamento', 'Unidades', 'Repasses',
  'Contas e Saldos', 'Evolução Mensal', 'Movimentações', 'Prestação de Contas',
]
```

E provar que duas posições geram duas linhas em `Evolução Mensal`.

- [ ] **Step 2: Verify RED on CI**

Esperado: sete abas atuais.

- [ ] **Step 3: Expand `Contas e Saldos` from contract fields**

Incluir primeira/última posição, número de posições, saldo corrente, aplicações, saldo total, créditos, débitos, aplicações, resgates, pagamentos/transferências, cobertura e contexto curto.

- [ ] **Step 4: Add `buildMonthlyEvolution`**

Colunas: SME, Unidade, Programa, Conta, Data, Saldo em conta, Aplicações, Saldo total.

- [ ] **Step 5: Verify GREEN on CI**

Esperado: workbook com oito abas e suite verde.

---

### Task 6: Empacotar snapshot web e workbook de forma determinística

**Files:**
- Create: `scripts/package-human-financial-snapshot.ts`
- Modify: `package.json`
- Create: `tests/unit/package-human-financial-snapshot.test.ts`

**Interfaces:**
- Input: `human-financial.json`, `runId`, diretório de saída e metadados de artefato.
- Output: payload validado `{ portfolio, schools }`, partes gzip/base64, `pdde-2026-snapshot.json`, manifesto com contagens/checksums e workbook da mesma entrada.

- [ ] **Step 1: Write failing deterministic package test**

Executar o empacotador duas vezes sobre a mesma fixture e comparar os bytes/checksums de manifesto e partes.

- [ ] **Step 2: Verify RED on CI**

Esperado: script inexistente.

- [ ] **Step 3: Implement packer**

Usar `prepareCurrentHumanFinancialSnapshot` para validar e projetar. Remover `runId` apenas da representação pública, serializar JSON em ordem estável da carteira já ordenada, comprimir uma vez e dividir a base64 em partes de tamanho fixo.

- [ ] **Step 4: Add npm script**

```json
"monitor:package:snapshot": "node --import tsx scripts/package-human-financial-snapshot.ts"
```

- [ ] **Step 5: Verify GREEN on CI**

Esperado: determinismo comprovado e build verde.

---

### Task 7: Fechar paridade e regressão do marco antes de coleta real

**Files:**
- Modify: testes de paridade existentes quando necessário
- Create: `tests/unit/human-financial-2026-parity.test.ts`

**Interfaces:**
- Consumes: contrato humano completo.
- Produces: invariantes executáveis para posições e movimentos.

- [ ] **Step 1: Add parity tests**

Provar que:

- cada movimento humano conserva data/documento/descrição/valor do fiscal;
- cada posição retida aparece uma vez no modelo humano;
- `latestPosition` é exatamente o último item de `positions`;
- série omitida só pode ser integralmente zero e sem movimento;
- nenhum `HumanFinancialMovement.date` sai de 2026.

- [ ] **Step 2: Run full CI**

Esperado: todos os testes, typecheck e builds aprovados.

- [ ] **Step 3: Stop before promotion**

Com código verde, não alterar `public/data/`, não abrir PR pronto, não mesclar e não fazer deploy. O próximo passo é executar o piloto real de dez escolas e inspecionar seus artefatos em gate separado.
