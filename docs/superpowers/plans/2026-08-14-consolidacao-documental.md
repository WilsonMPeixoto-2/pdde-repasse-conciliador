# Consolidação documental e baseline técnico Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidar a memória institucional do projeto em 14/08/2026, alinhar os documentos canônicos ao código atual e preservar descobertas relevantes ainda não materializadas.

**Architecture:** A documentação será dividida entre um baseline factual e verificável, documentos canônicos de arquitetura/decisão/escopo e um registro separado de conhecimento acumulado. Ideias de pesquisa serão classificadas por grau de comprovação para não serem confundidas com capacidades já implementadas.

**Tech Stack:** Markdown, GitHub, TypeScript/Node.js como contexto do repositório, GitHub Actions para verificação do branch.

## Global Constraints

- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` é somente leitura para este fluxo.
- Exercício operacional atual: **2026**.
- Dados de exercícios anteriores podem ser preservados como evidência bruta, mas não podem ser misturados à visão operacional corrente.
- Não afirmar que Supabase, Vercel, frontend novo ou plataforma institucional estão implantados enquanto isso não tiver ocorrido de fato.
- Distinguir sempre: implementado no código, validado com dados reais, implantado/conectado e publicado.
- Não transformar pesquisa/protótipo em capacidade oficial sem incorporação e validação no repositório canônico.

---

### Task 1: Criar baseline factual de 14/08/2026

**Files:**
- Create: `docs/BASELINE_TECNICO_2026-08-14.md`

**Interfaces:**
- Consumes: estado da `main` em `6e8b359f1bc0a69be27641568c8449df7cd2e3ad`, artefatos reais da coleta 163 UEs e CI do commit.
- Produces: referência factual para novos chats e futuras comparações.

- [ ] **Step 1:** Registrar SHA, estado de implantação e matriz código/validação/implantação/publicação.
- [ ] **Step 2:** Registrar métricas verificadas da coleta real de 163 UEs e da visão operacional/fiscal.
- [ ] **Step 3:** Registrar invariantes de 2026 e a sequência técnica aprovada.
- [ ] **Step 4:** Revisar o arquivo contra os artefatos de `monitor-all-163`, visão operacional e Excel fiscal.
- [ ] **Step 5:** Commitar o baseline.

### Task 2: Preservar conhecimento ainda não materializado

**Files:**
- Create: `docs/CONHECIMENTO_ACUMULADO.md`

**Interfaces:**
- Consumes: pesquisas de fontes, debates de UX, comparações com Manus e repositório histórico, decisões ainda não implementadas.
- Produces: memória de oportunidades e aprendizados para novos chats sem confundir pesquisa com feature.

- [ ] **Step 1:** Definir rótulos de maturidade (`INCORPORADO`, `VALIDADO_FORA_DO_CANONICO`, `PILOTO_NECESSARIO`, `NAO_PRIORIZADO`).
- [ ] **Step 2:** Registrar direção de produto/UX, hierarquia de navegação e linguagem fiscal.
- [ ] **Step 3:** Registrar fontes pesquisadas e próximos experimentos por fonte.
- [ ] **Step 4:** Registrar aprendizados das referências paralelas e limites de governança.
- [ ] **Step 5:** Adicionar checklist de retomada para novos chats.
- [ ] **Step 6:** Commitar o conhecimento acumulado.

### Task 3: Atualizar documentos canônicos de visão e decisão

**Files:**
- Modify: `README.md`
- Modify: `docs/PROJETO.md`
- Modify: `docs/DECISOES.md`

**Interfaces:**
- Consumes: baseline e conhecimento acumulado.
- Produces: entrada curta e coerente para qualquer pessoa/agente que abra o repositório.

- [ ] **Step 1:** Atualizar README para v0.5.0 e incluir estado real de implantação.
- [ ] **Step 2:** Atualizar a evolução do projeto até SIGEF direto, visão operacional/fiscal e Excel v3.
- [ ] **Step 3:** Registrar decisões de 14/08/2026 sobre foco 2026, distinção código/implantação e visão fiscal como contrato de produto.
- [ ] **Step 4:** Conferir links e ausência de afirmações de deploy inexistente.
- [ ] **Step 5:** Commitar o grupo.

### Task 4: Atualizar arquitetura, escopo, fontes e visão fiscal

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/ESCOPO_V05.md`
- Modify: `docs/FONTES_E_REGRAS.md`
- Modify: `docs/VISAO_FISCAL.md`

**Interfaces:**
- Consumes: código atual dos adaptadores, monitoramento, backend institucional e Excel v3.
- Produces: documentação técnica alinhada à implementação atual.

- [ ] **Step 1:** Representar separadamente monitoramento atual, backend institucional em código e implantação futura.
- [ ] **Step 2:** Atualizar estado do SIGEF Extrato direto para validado nas contas mapeadas das 163 UEs.
- [ ] **Step 3:** Tornar `MONITORING` institucional a próxima prioridade de backend.
- [ ] **Step 4:** Atualizar as nove abas do Excel Fiscal v3 e a hierarquia planejada do frontend.
- [ ] **Step 5:** Preservar histórico de 13/08 como documento histórico, sem reescrevê-lo retroativamente.
- [ ] **Step 6:** Commitar o grupo.

### Task 5: Verificar a consolidação

**Files:**
- Review: todos os Markdown alterados/criados no branch.

**Interfaces:**
- Consumes: branch documental completo.
- Produces: evidência de consistência antes de PR/merge.

- [ ] **Step 1:** Comparar o branch com `main` e revisar todos os arquivos alterados.
- [ ] **Step 2:** Buscar termos obsoletos críticos (`v0.4.0`, `CAPTCHA_REQUIRED / não automatizado` para o extrato direto, `quatro visões`, afirmações de deploy).
- [ ] **Step 3:** Executar CI do repositório no branch e confirmar testes, typecheck e build.
- [ ] **Step 4:** Corrigir qualquer divergência encontrada.
- [ ] **Step 5:** Abrir PR e integrar somente após verificação fresca.
