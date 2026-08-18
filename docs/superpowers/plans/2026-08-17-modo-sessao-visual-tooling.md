# Modo Sessão e Tooling Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir consultas temporárias sem Supabase, reutilizando o pipeline financeiro existente para gerar read model humano, visualização web e Excel, enquanto integra uma base visual avançada sem adotar estética pronta de terceiros.

**Architecture:** o motor `runFinancialIntelligenceMonitoring()` continua sendo a única fonte de interpretação financeira. O Modo Sessão fornece apenas uma camada efêmera de execução/estado/entrega; os stores persistentes permanecem opcionais. O frontend continua consumindo o mesmo contrato humano compartilhado. Ferramentas visuais entram atrás de adapters/componentes próprios: D3 para matemática/escala, Motion para transições, Radix para comportamentos acessíveis e TanStack Virtual para listas grandes.

**Tech Stack:** TypeScript 7, React 19, Vite 8, Vitest, Playwright, ExcelJS, Motion for React, d3-array, d3-scale, d3-shape, d3-time-format, Radix Primitives, TanStack React Virtual.

## Global Constraints

- A Constituição Visual em `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` permanece normativa.
- Nenhuma biblioteca nova define aparência, paleta, tipografia ou container model.
- Ausência de dado continua diferente de zero.
- Pagamento informado, ordem FNDE, crédito compatível e saldo permanecem semanticamente separados.
- O Modo Sessão não publica snapshots institucionais e não exige Supabase.
- O Excel temporário usa o mesmo `buildHumanFinancialWorkbook()` da exportação humana atual.
- Fechar/expirar a sessão pode eliminar o resultado; isso deve ser informado ao usuário.
- Extração integral de 163 UEs não deve depender de uma única request Vercel de longa duração.
- Desktop e mobile são composições irmãs; interação essencial nunca depende somente de hover.

---

### Task 1: Integrar a stack visual avançada

**Files:** `package.json`, `package-lock.json`, `src/product/visual/*`, testes unitários.

- [ ] Instalar `motion`, `d3-array`, `d3-scale`, `d3-shape`, `d3-time-format`, `@radix-ui/react-tooltip`, `@radix-ui/react-popover`, `@radix-ui/react-collapsible`, `@radix-ui/react-dialog` e `@tanstack/react-virtual`.
- [ ] Adicionar tipos D3 somente se os pacotes instalados não fornecerem tipagem suficiente.
- [ ] Criar adapters próprios para escalas/paths temporais e motion tokens, sem estilos de terceiros.
- [ ] Criar provider Radix Tooltip e primitive de informação contextual acessível.
- [ ] Validar `npm ci`, testes, typecheck e build.

### Task 2: Preparar o executor temporário sem persistência

**Files:** `backend/application/session/*`, `tests/unit/session-*`.

- [ ] Escrever teste RED que executa uma sessão com stores persistentes ausentes e recebe `human` + caminhos temporários.
- [ ] Definir estados `QUEUED | RUNNING | COMPLETE | PARTIAL | FAILED | EXPIRED` e progresso humano por fase.
- [ ] Reutilizar `runFinancialIntelligenceMonitoring()`; não duplicar lógica de fonte ou conciliação.
- [ ] Gerar workbook humano diretamente do mesmo read model concluído.
- [ ] Limitar paths/identificadores para impedir leitura fora do workspace temporário.

### Task 3: Criar contrato HTTP do Modo Sessão

**Files:** API de sessão, schemas compartilhados e testes.

- [ ] `POST /api/session-runs` cria consulta temporária validada.
- [ ] `GET /api/session-runs/:id` retorna apenas estado/progresso humano.
- [ ] `GET /api/session-runs/:id/portfolio` retorna o contrato humano após conclusão.
- [ ] `GET /api/session-runs/:id/schools/:inep` retorna prontuário da própria sessão.
- [ ] `GET /api/session-runs/:id/export.xlsx` entrega o workbook humano.
- [ ] Sessão inexistente/expirada retorna estado explícito, não zero nem portfólio vazio.

### Task 4: Adaptar o frontend para fonte temporária ou persistente

**Files:** `src/product/api.ts`, contextos de sessão/portfólio, páginas.

- [ ] Estado inicial sem snapshot mostra ação `Nova consulta`, não erro técnico.
- [ ] Durante execução, mostrar progresso por fases e contagens observáveis.
- [ ] Após conclusão, montar exatamente as telas atuais a partir do portfólio da sessão.
- [ ] Manter URLs internas e drill-down por escola/indicador.
- [ ] Oferecer exportação Excel da mesma sessão.
- [ ] Marcar claramente `Consulta temporária · dados não armazenados permanentemente`.

### Task 5: Evoluir visualizações usando a nova stack

**Files:** timeline, visualizações de portfólio e listas extensas.

- [ ] Migrar matemática da timeline para D3 scale/shape sem alterar semântica das lacunas.
- [ ] Usar Motion apenas em mudança de estado, seleção, disclosure e entrada/saída de conteúdo relevante.
- [ ] Usar Radix para tooltip/popover/dialog onde profundidade contextual realmente exige.
- [ ] Usar virtualização somente para listas volumosas de movimentações.
- [ ] Manter alternativa textual e teclado/toque.

### Task 6: QA e entrega

- [ ] Testes RED/GREEN por capacidade nova.
- [ ] `npm run check` verde.
- [ ] Playwright desktop/mobile cobre estado vazio, execução, resultado, indicador, escola, timeline e Excel disponível.
- [ ] Nenhum overflow global, metadado técnico ou estado visual enganoso.
- [ ] Preview Vercel somente depois de build/smoke aprovados.
- [ ] PR separado para revisão antes do merge na `main`.
