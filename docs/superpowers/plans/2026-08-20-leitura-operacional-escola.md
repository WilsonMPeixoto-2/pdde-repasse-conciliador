# Leitura Operacional da Escola Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o topo do prontuário de uma escola para explicar a cadeia financeira e apresentar pontos de acompanhamento acionáveis antes dos detalhes.

**Architecture:** Um derivador puro converte `HumanSchool` em itens de acompanhamento sem alterar o contrato de dados. Um componente React apresenta a sequência de evidências, o saldo datado e as ações; `SchoolPage` conserva as seções detalhadas existentes e deixa de repetir o acompanhamento em uma barra lateral.

**Tech Stack:** TypeScript 7, React 19, React Router 7, CSS responsivo, Vitest 4 e Playwright 1.62.

**Spec:** `docs/superpowers/specs/2026-08-20-leitura-operacional-escola-design.md`

## Global Constraints

- Não alterar backend, schemas compartilhados, migrations, fontes ou conciliação.
- Não apresentar `Previsto` como recebido nem `Pagamento informado` como crédito bancário.
- Não transformar ausência de saldo em zero.
- Não inferir regularidade financeira a partir da ausência de apontamentos.
- Preservar as âncoras `#resumo`, `#repasses`, `#contas-saldos`, `#movimentacoes` e `#prestacao-contas`.
- Não remover programas, parcelas, contas, posições, movimentos ou prestação de contas.
- Não executar merge ou deploy neste marco.

---

### Task 1: Read model visual dos pontos de acompanhamento

**Files:**
- Create: `src/product/visual/school-operational-reading.ts`
- Create: `tests/unit/frontend-school-operational-reading.test.ts`

**Interfaces:**
- Consumes: `HumanSchool` de `src/product/types.ts`.
- Produces: `deriveSchoolOperationalReading(school: HumanSchool): SchoolOperationalReading`.

- [x] **Step 1: escrever o teste vermelho dos estados estruturados**

Criar fixtures literais para uma escola com pagamento suspenso, parcela paga sem conta, crédito não localizado, conta sem posição e mensagem de fonte indisponível. Exigir títulos humanos, destinos corretos e ausência de duplicação.

```ts
const reading = deriveSchoolOperationalReading(school);
expect(reading.tone).toBe('attention');
expect(reading.attentionItems.map((item) => [item.title, item.target])).toEqual([
  ['Pagamento suspenso informado', '#prestacao-contas'],
  ['Pagamento informado sem conta exibida', '#repasses'],
  ['Pagamento informado sem crédito compatível localizado', '#repasses'],
  ['Conta sem posição pública de saldo', '#contas-saldos'],
  ['Informação de fonte ainda não disponível', null],
]);
```

- [x] **Step 2: executar o teste e confirmar a falha correta**

Run: `./node_modules/.bin/vitest run tests/unit/frontend-school-operational-reading.test.ts`

Expected: FAIL porque o módulo `school-operational-reading.ts` ainda não existe.

- [x] **Step 3: implementar o derivador mínimo**

Criar os tipos públicos descritos na especificação. Derivar itens a partir de `accounting`, `programs[].installments`, `accounts[].latestPosition` e mensagens residuais de `followUp`. Usar chaves determinísticas e eliminar mensagens já representadas.

- [x] **Step 4: adicionar o caso sem apontamentos**

```ts
expect(deriveSchoolOperationalReading(clearSchool)).toEqual({
  tone: 'clear',
  statusLabel: 'Sem apontamento no retrato atual',
  attentionItems: [],
});
```

Run: `./node_modules/.bin/vitest run tests/unit/frontend-school-operational-reading.test.ts`

Expected: PASS.

- [x] **Step 5: revisar mutações realistas**

Confirmar que o teste falha se um destino for trocado, se um item estruturado desaparecer, se uma mensagem conhecida voltar duplicada ou se o estado sem apontamentos virar uma certificação de regularidade.

### Task 2: Componente de leitura rápida

**Files:**
- Create: `src/product/components/SchoolOperationalSummary.tsx`
- Create: `tests/unit/frontend-school-operational-summary.test.ts`
- Modify: `src/product/pages/SchoolPage.tsx`

**Interfaces:**
- Consumes: `HumanSchool`, `deriveSchoolSummary` e `deriveSchoolOperationalReading`.
- Produces: seção `id="resumo"` com cadeia financeira, saldo datado e lista de ações.

- [x] **Step 1: escrever o teste vermelho do markup público**

Renderizar o componente real com `renderToStaticMarkup`. Exigir:

```ts
expect(html).toContain('Leitura rápida desta escola');
expect(html).toContain('Previsto');
expect(html).toContain('Pagamento informado');
expect(html).toContain('Registro do PDDEInfo');
expect(html).toContain('Crédito compatível localizado');
expect(html).toContain('Movimento compatível no SIGEF');
expect(html).toContain('Saldo informado');
expect(html).toContain('href="#repasses"');
```

O teste deve também exigir a data da posição e verificar que um saldo `null` produz `Não disponível`, não `R$ 0,00`.

- [x] **Step 2: executar o teste e confirmar a falha correta**

Run: `./node_modules/.bin/vitest run tests/unit/frontend-school-operational-summary.test.ts`

Expected: FAIL porque `SchoolOperationalSummary` ainda não existe.

- [x] **Step 3: implementar o componente mínimo**

Usar elementos semânticos `section`, `ol`, `aside` e links de âncora. Reutilizar `formatMoney` e `formatDate`. Não introduzir gráficos ou dependências.

- [x] **Step 4: integrar em `SchoolPage`**

Substituir o bloco antigo de métricas por `<SchoolOperationalSummary school={school} />`. Remover a barra lateral duplicada e manter as seções detalhadas em um único fluxo vertical.

- [x] **Step 5: executar os testes focados**

Run: `./node_modules/.bin/vitest run tests/unit/frontend-school-operational-summary.test.ts tests/unit/frontend-school-section-navigation.test.ts tests/unit/frontend-school-summary-coverage.test.ts`

Expected: PASS.

### Task 3: Hierarquia visual responsiva

**Files:**
- Create: `src/product/design/school-operational.css`
- Modify: `src/product/App.tsx`
- Modify: `src/product/pages/SchoolPage.tsx`

**Interfaces:**
- Consumes: classes emitidas por `SchoolOperationalSummary`.
- Produces: leitura horizontal em desktop, empilhamento previsível em mobile e estados perceptíveis sem depender apenas de cor.

- [x] **Step 1: estender o smoke antes do CSS**

Modificar `scripts/frontend-product-smoke.mjs` para exigir `Leitura rápida desta escola`, os três estágios financeiros, o primeiro link de acompanhamento e uma única ocorrência do texto de fonte indisponível.

- [x] **Step 2: executar o smoke e confirmar a lacuna visual/comportamental**

Run: `node scripts/frontend-product-smoke.mjs`

Expected: FAIL antes da integração do novo resumo ou antes das regras responsivas.

O bloqueio local permaneceu porque o executável Chromium do Playwright não está instalado. O smoke foi então ligado ao workflow visual do PR. A primeira execução útil confirmou duas lacunas do próprio roteiro: ele ainda simulava endpoints removidos e exigia uma ordenação padrão diferente da interface atual. O fixture passou a servir o mesmo snapshot `gzip-base64-parts` consumido pela aplicação e passou a validar separadamente a ordenação padrão por SME e a opção `Atenção primeiro`.

- [x] **Step 3: criar o CSS do componente**

Implementar:

- grade de três estágios em desktop;
- conectores puramente decorativos com `aria-hidden` no markup;
- bloco de saldo separado;
- lista de acompanhamento com texto e ação;
- breakpoint até `700px` com uma coluna;
- valores com `font-variant-numeric: tabular-nums`;
- quebra segura de valores e textos longos.

- [x] **Step 4: importar o CSS e executar o smoke**

Adicionar `import './design/school-operational.css';` em `src/product/App.tsx`.

Run: `node scripts/frontend-product-smoke.mjs`

Expected: PASS em 1440×1000 e 390×844, sem overflow horizontal.

O CSS foi importado, os dois builds foram aprovados e o smoke determinístico passou no CI em desktop e mobile na execução nº 366 (`32429811398`). O mesmo workflow executou depois o smoke da publicação real.

### Task 4: Regressão completa e evidência visual

**Files:**
- Modify: `docs/CONTINUIDADE_WORK.md`
- Inspect: `artifacts/frontend-product-smoke/school-desktop.png`
- Inspect: `artifacts/frontend-product-smoke/school-mobile.png`

**Interfaces:**
- Consumes: implementação integrada.
- Produces: evidência testável e ponto exato de retomada.

- [x] **Step 1: executar testes afetados**

Run:

```bash
./node_modules/.bin/vitest run \
  tests/unit/frontend-school-operational-reading.test.ts \
  tests/unit/frontend-school-operational-summary.test.ts \
  tests/unit/frontend-school-summary-coverage.test.ts \
  tests/unit/frontend-school-section-navigation.test.ts \
  tests/unit/frontend-school-live-refresh.test.ts \
  tests/unit/frontend-human-domain.test.ts
```

Expected: PASS.

- [x] **Step 2: executar verificação ampla**

Run:

```bash
./node_modules/.bin/vitest run
./node_modules/.bin/tsc -p tsconfig.test.json --noEmit
./node_modules/.bin/vite build
./node_modules/.bin/vite build --config vite.live.config.ts
node scripts/frontend-product-smoke.mjs
git diff --check
```

Expected: todos os comandos com exit code 0.

Resultado final:

- 134 arquivos de teste aprovados e 4 ignorados;
- 444 testes aprovados e 6 ignorados;
- typecheck aprovado;
- build frontend e build live aprovados;
- `git diff --check` aprovado;
- `Verificação contínua` aprovada no run `32429811537`;
- `Frontend Product Smoke 2026` aprovado no run `32429811398`.

- [x] **Step 3: inspecionar as duas capturas da escola**

Verificar visualmente:

- informação principal acima dos detalhes;
- acompanhamento visível sem rolagem extensa no mobile;
- nenhuma repetição do mesmo apontamento;
- sequência financeira legível;
- saldo visualmente separado;
- ausência de cortes ou overflow.

As capturas finais foram inspecionadas em resolução original. A auditoria detectou uma folha de estilos existente, mas não importada, para o extrato financeiro. O problema recebeu teste de regressão, correção, novo CI e novas capturas antes da aceitação. Evidência e riscos restantes estão em `docs/audits/2026-08-20-leitura-operacional-escola.md`.

- [x] **Step 4: atualizar o checkpoint**

Registrar commit local, árvore, testes, arquivos alterados, riscos restantes e primeiro comando da próxima sessão em `docs/CONTINUIDADE_WORK.md` e no handoff persistente externo.

### Task 5: Preparação segura para publicação

**Files:**
- Inspect: todos os arquivos modificados do marco.

**Interfaces:**
- Consumes: diff verificado e autorização do usuário.
- Produces: escopo pronto para stage, commit, push e PR em rascunho, sem executar merge ou deploy.

- [x] **Step 1: revisar o diff integral**

Run: `git status --short --branch && git diff --check && git diff --stat && git diff`

- [x] **Step 2: solicitar autorizações externas separadas**

Antes de executar cada ação, confirmar autorização para:

1. stage dos caminhos exatos;
2. commit;
3. push do branch;
4. criação ou atualização de um único PR em rascunho.

- [x] **Step 3: preservar limites**

Não alterar `main`, não marcar PR como pronto, não mesclar e não executar deploy.
