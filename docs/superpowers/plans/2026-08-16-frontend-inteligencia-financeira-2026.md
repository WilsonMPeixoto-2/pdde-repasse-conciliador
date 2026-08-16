# Frontend Inteligência Financeira PDDE 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a experiência web final da Plataforma de Inteligência Financeira das Verbas do PDDE/2026 da 4ª CRE sobre o read model humano já validado, com Home híbrida, carteira navegável, página da unidade, profundidade sob demanda, linha temporal 2026, indicadores acionáveis e composição responsiva real.

**Architecture:** O frontend deixa de reconstruir regras financeiras no navegador e passa a consumir exclusivamente um contrato humano servido pela API institucional. A camada visual será migrada de um `main.ts` monolítico para React + Vite com componentes focados, tokens CSS e funções puras de projeção/ordenação. O backend mantém o read model fiscal técnico separado e expõe novos endpoints humanos somente leitura; o frontend nunca recebe hash, parser, payload, URLs brutas ou metadados técnicos.

**Tech Stack:** TypeScript 7, Vite 8, React, React DOM, React Router, CSS custom properties, Lucide, Zod, Vitest, Playwright/Chromium para smoke visual, API institucional Node/Supabase existente.

## Global Constraints

- Exercício operacional padrão e obrigatório: **2026**.
- 2025 pode aparecer apenas como contexto histórico excepcional e nunca compõe totais correntes.
- Ausência de dado não é zero; lacunas temporais precisam permanecer visíveis.
- `Pagamento informado` não é `crédito localizado`; `crédito localizado` não é automaticamente `repasse confirmado`.
- `Saldo informado` sempre carrega a data de cobertura da fonte.
- Metadados técnicos, regras internas e detalhes de implementação não aparecem na experiência fiscal comum.
- Cor tem significado semântico estável e nunca é a única forma de comunicar estado.
- Todo indicador quantitativo por unidade deve carregar e abrir a lista nominal das unidades que o compõem.
- Qualquer elemento que pareça interativo deve executar uma ação útil.
- Mobile é recomposição da informação, não desktop comprimido nem tabela horizontal por padrão.
- Visualizações devem aumentar compreensão; não sugerem causalidade não comprovada.
- Profundidade sob demanda não pode ocultar caveats que alterem a interpretação do dado.
- A Constituição Visual em `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` é requisito normativo deste plano.

---

## File Structure

### Backend / contrato humano

- Modify: `backend/application/institutional-read-repository.ts` — incluir contrato de leitura humana corrente.
- Modify: `backend/application/institutional-read-service.ts` — adicionar métodos tipados para portfólio e escola humanos.
- Modify: `backend/adapters/supabase-institutional-read-repository.ts` — ler `current_human_financial_snapshots` e `current_human_financial_schools`.
- Modify: `backend/api/institutional-api.ts` — expor `/api/current/human/portfolio` e `/api/current/human/schools/:inep`.
- Test: `tests/unit/institutional-human-read-api.test.ts`.
- Test: `tests/unit/supabase-institutional-human-read-repository.test.ts`.

### Frontend / domínio visual

- Create: `src/product/types.ts` — tipos e schemas Zod do read model humano.
- Create: `src/product/api.ts` — cliente somente leitura da visão humana.
- Create: `src/product/format.ts` — moeda, data, conta e rótulos em PT-BR.
- Create: `src/product/derive.ts` — agregações puras para posição financeira, indicadores, programas, contas e timeline.
- Test: `tests/unit/frontend-human-derive.test.ts`.

### Frontend / design system

- Create: `src/product/design/tokens.css` — paleta semântica, tipografia, espaçamento, raio, borda, elevação e motion.
- Create: `src/product/design/base.css` — reset, foco, tipografia, tabular numbers e acessibilidade.
- Create: `src/product/design/components.css` — shell, botões, disclosure, listas, valores e estados.
- Create: `src/product/design/layout.css` — composição desktop/tablet/mobile.

### Frontend / React

- Replace: `src/main.ts` por `src/main.tsx` — apenas bootstrap do app.
- Create: `src/product/App.tsx` — shell e rotas.
- Create: `src/product/components/AppHeader.tsx` — identidade curta, exercício 2026 e navegação essencial.
- Create: `src/product/components/MetricValue.tsx` — valor financeiro com semântica visual.
- Create: `src/product/components/Disclosure.tsx` — expansão acessível com estado claro.
- Create: `src/product/components/IndicatorLink.tsx` — indicador acionável para lista filtrada.
- Create: `src/product/components/SourceInfo.tsx` — origem em linguagem humana, sob demanda.
- Create: `src/product/components/Timeline2026.tsx` — visualização temporal acessível e clicável, com lacunas explícitas.
- Create: `src/product/components/SchoolSearch.tsx` — busca e filtros da carteira.
- Create: `src/product/pages/PortfolioPage.tsx` — Home híbrida A+B+C aprovada.
- Create: `src/product/pages/IndicatorPage.tsx` — lista nominal proveniente do indicador.
- Create: `src/product/pages/SchoolsPage.tsx` — carteira completa com busca.
- Create: `src/product/pages/SchoolPage.tsx` — página da unidade com posição, programas, contas, timeline, movimentações e prestação.
- Create: `src/product/pages/NotFoundPage.tsx`.
- Modify: `index.html` — bootstrap React e título final do produto.

### Dependências / configuração

- Modify: `package.json` e `package-lock.json` — React, React DOM, React Router e plugin React do Vite.
- Create or Modify: `vite.config.ts` — React plugin e proxy de desenvolvimento `/api`.
- Modify: `tsconfig.json` e `tsconfig.test.json` — JSX react-jsx e inclusão dos novos módulos.

### QA

- Create: `tests/unit/frontend-human-contract.test.ts` — garante que chaves técnicas não entram no schema de apresentação.
- Create: `tests/unit/frontend-timeline.test.ts` — ordenação, lacunas, zero vs ausente e seleção.
- Create: `.github/workflows/frontend-product-smoke.yml` — build, API fake mínima e screenshots desktop/mobile com Playwright.
- Create: `docs/FRONTEND_PRODUCT_QA_2026.md` — checklist visual e semântico da primeira versão.

---

### Task 1: Expor o read model humano pela API institucional

**Files:** backend read repository/service/API + dois testes unitários.

**Interfaces:**
- Produces: `getCurrentHumanPortfolio(): Promise<HumanFinancialPortfolioView | null>`.
- Produces: `getCurrentHumanSchool(inep: string): Promise<HumanFinancialSchoolView | null>`.
- HTTP: `GET /api/current/human/portfolio`.
- HTTP: `GET /api/current/human/schools/:inep`.

- [ ] Escrever testes falhando para portfolio, escola, 404 e validação INEP.
- [ ] Executar testes focados e confirmar RED por ausência dos métodos/endpoints.
- [ ] Implementar leitura Supabase das duas tabelas humanas com validação Zod e exercício literal 2026.
- [ ] Conectar os métodos ao `InstitutionalReadService`.
- [ ] Expor endpoints somente GET e sem metadados técnicos adicionais.
- [ ] Rodar testes focados e suíte existente.
- [ ] Commit: `feat: expoe read model humano na api`.

### Task 2: Migrar a camada visual para React sem migrar regras financeiras

**Files:** package/config/index/main + `src/product/App.tsx`.

**Interfaces:**
- `main.tsx` monta `<App />`.
- `App` controla apenas rotas e shell.
- Nenhuma função de conciliação, seleção de conta ou extração fica no navegador.

- [ ] Adicionar dependências React/Router e plugin Vite de forma reprodutível no lockfile.
- [ ] Habilitar JSX `react-jsx`.
- [ ] Criar bootstrap mínimo e rotas `/`, `/unidades`, `/indicadores/:slug`, `/unidades/:inep`.
- [ ] Preservar o backend e os scripts de Excel fora do bundle da UI.
- [ ] Rodar build para confirmar migração antes de adicionar telas.
- [ ] Commit: `feat: estrutura frontend react da plataforma`.

### Task 3: Criar contrato frontend, cliente e projeções puras

**Files:** `types.ts`, `api.ts`, `format.ts`, `derive.ts` + testes.

**Interfaces:**
- `loadHumanPortfolio(signal?)` retorna portfólio humano validado.
- `loadHumanSchool(inep, signal?)` retorna escola humana validada.
- `derivePortfolioMetrics(portfolio)` retorna totais visíveis de 2026.
- `deriveSchoolSummary(school)` retorna previsto, pago informado, créditos localizados, saldo e aplicação sem inventar valores ausentes.
- `buildAccountTimeline2026(accountPositions)` preserva meses ausentes como `null`.

- [ ] Escrever testes RED com valores reais representativos, incluindo ausência ≠ zero.
- [ ] Criar schemas Zod que aceitam apenas campos humanos necessários.
- [ ] Implementar formatadores PT-BR com centavos inteiros e `Intl`.
- [ ] Implementar agregações puras sem somar `null` como zero silenciosamente.
- [ ] Implementar cliente fetch com erro humano e AbortSignal.
- [ ] Rodar testes e commit: `feat: adiciona dominio de apresentacao financeira`.

### Task 4: Implementar design system semântico

**Files:** CSS de tokens/base/components/layout.

**Interfaces:** classes e custom properties consumidas pelos componentes React.

- [ ] Definir papéis cromáticos separados: estrutural, pago informado, crédito localizado, confirmação, atenção, erro técnico e neutro.
- [ ] Definir escala tipográfica editorial com números financeiros protagonistas e `font-variant-numeric: tabular-nums`.
- [ ] Definir foco visível, hover, selected, disabled e `prefers-reduced-motion`.
- [ ] Definir espaçamento e bordas com preferência por composição aberta antes de cards.
- [ ] Definir breakpoints de recomposição e alvos de toque.
- [ ] Rodar build e commit: `feat: adiciona design system semantico`.

### Task 5: Construir Home híbrida e indicadores acionáveis

**Files:** `PortfolioPage`, `MetricValue`, `IndicatorLink`, `SchoolSearch`, `SourceInfo`.

**Interfaces:**
- Topo responde “qual é a posição financeira de 2026?”.
- Segundo nível responde “como está evoluindo?”.
- Terceiro nível responde “onde preciso olhar?”.
- Todo indicador navega para `/indicadores/:slug` preservando sua lista nominal.

- [ ] Criar primeiro viewport com quatro métricas fortes, sem grade genérica de cards aninhados.
- [ ] Diferenciar visualmente previsto, pago informado, crédito localizado e saldo informado.
- [ ] Inserir referência temporal do saldo próxima ao valor, não em log/metadado.
- [ ] Criar bloco de acompanhamento acionável com contagem + ação real.
- [ ] Criar acesso claro à carteira das 163 UEs e busca.
- [ ] Origem das informações fica em disclosure contextual, não painel técnico.
- [ ] Rodar build e commit: `feat: cria home da inteligencia financeira`.

### Task 6: Construir página da unidade com profundidade sob demanda

**Files:** `SchoolPage`, `Disclosure`, `MetricValue` e helpers.

**Interfaces:**
- Primeiro nível: identidade, previsto, pago, saldo, aplicação, data de cobertura.
- Segundo nível: programas e parcelas.
- Terceiro nível: contas, movimentos, prestação e contexto.

- [ ] Mostrar identidade com SME e INEP em peso secundário.
- [ ] Mostrar posição financeira principal com valores que respiram e status redundantes em texto.
- [ ] Programas aparecem como linhas/resumos expansíveis; parcelas ficam dentro do contexto do programa.
- [ ] Conta é drill-down local para posição e movimentos, não uma coluna técnica.
- [ ] Acompanhamentos relevantes permanecem visíveis mesmo com detalhes fechados.
- [ ] Prestação de contas usa linguagem humana e não acusa irregularidade automaticamente.
- [ ] Rodar build e commit: `feat: cria pagina financeira da unidade`.

### Task 7: Implementar timeline 2026 interativa e acessível

**Files:** `Timeline2026.tsx`, helpers e testes.

**Interfaces:**
- Recebe 12 slots mensais, cada um `value | null` e eventos opcionais.
- `null` gera lacuna explícita; `0` gera ponto real em zero.
- Hover, focus e click/tap expõem o mesmo detalhe.
- Seleção do mês atualiza painel textual adjacente.

- [ ] Escrever testes RED para ordenação, lacuna e zero.
- [ ] Implementar SVG responsivo com `aria-label`/lista textual equivalente.
- [ ] Adicionar marcadores semânticos para recebimentos/eventos apenas quando comprovados.
- [ ] Implementar seleção por teclado e toque.
- [ ] Respeitar `prefers-reduced-motion`.
- [ ] Rodar testes/build e commit: `feat: adiciona timeline financeira 2026`.

### Task 8: Implementar carteira, drill-down de indicadores e navegação

**Files:** `IndicatorPage`, `SchoolsPage`, `SchoolSearch`, `NotFoundPage`.

**Interfaces:**
- Indicador carrega lista nominal exata do read model, não recalcula conjunto divergente no cliente.
- Busca permite SME, INEP e nome.
- Clique na unidade abre `/unidades/:inep`.

- [ ] Implementar lista nominal com total visível e pesquisa dentro do conjunto.
- [ ] Implementar carteira completa com busca instantânea e estados vazios úteis.
- [ ] Preservar navegação voltar/avançar e URLs compartilháveis.
- [ ] Garantir foco após navegação e títulos de documento atualizados.
- [ ] Rodar build e commit: `feat: adiciona carteira e drilldown acionavel`.

### Task 9: QA responsivo, visual, semântico e de acessibilidade

**Files:** workflow Playwright + doc QA.

**Interfaces:** screenshots 1440x1000 e 390x844; smoke de Home → indicador → escola → expansão → timeline.

- [ ] Criar smoke Playwright com API fixture humana representativa, sem dados técnicos.
- [ ] Validar desktop e mobile sem overflow horizontal do conteúdo principal.
- [ ] Validar navegação por teclado, foco, disclosure e indicador.
- [ ] Validar que hover possui equivalente focus/tap.
- [ ] Validar que `Pago informado`, `Crédito localizado` e `Saldo` não usam o mesmo rótulo semântico.
- [ ] Validar que nenhum campo proibido (`sha256`, `parser`, `sourceUrl`, `payload`, `retry`) aparece no DOM.
- [ ] Capturar screenshots e inspecionar visualmente contra as referências aprovadas e a Constituição Visual.
- [ ] Corrigir qualquer drift de hierarquia, densidade, cor, tipografia ou mobile antes do PR.
- [ ] Commit: `test: valida experiencia visual da plataforma`.

### Task 10: Gate final e integração

- [ ] Rodar `npm run check` no head limpo.
- [ ] Rodar smoke Playwright desktop/mobile.
- [ ] Verificar diff contra `main` e ausência de arquivos temporários.
- [ ] Abrir PR com inventário visual, interações verificadas e limitações externas.
- [ ] Aguardar CI + smoke.
- [ ] Merge por squash com `expected_head_sha` se todos os gates estiverem verdes.
- [ ] Confirmar novo SHA da `main`.

## External Gates Not To Fake

1. **Supabase dedicado:** a infraestrutura de persistência existe no código, mas criar projeto real continua dependendo de escolha explícita de organização/plano/custo. Não reutilizar RADAR PDDE ou outro banco existente por conveniência.
2. **Portal da Transparência:** o frontend pode exibir a fonte somente quando houver dado publicado no read model. Consulta autenticada real continua dependendo da chave oficial em segredo de backend.
3. **Alertas preditivos/thresholds:** não inventar percentuais ou prazos de baixa execução nesta fase. A área de acompanhamento usa apenas estados já sustentados pelos dados atuais; thresholds futuros exigem decisão de produto específica.
4. **PDF executivo final:** a Constituição orienta o produto, mas a composição final do PDF permanece decisão de produto separada. Não gerar um PDF massivo apenas para marcar a caixa de “PDF pronto”.
