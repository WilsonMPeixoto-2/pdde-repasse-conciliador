# Assistente de Liberações 2026 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reconstruir a v0.2.0 perdida, adicionando preparação auditável das exportações SIGEF Liberações sem alterar o contrato do conciliador v0.1.0.

**Architecture:** Um inspetor identifica metadados do XLS-HTML e valida programa/exercício; uma camada de aplicação monta a carteira esperada, processa incrementalmente o workspace e produz arquivos canônicos; um módulo de relatório gera a planilha de controle. O `parseSigefReleaseHtml` existente permanece como validador final do conteúdo financeiro.

**Tech Stack:** Node.js >=22, TypeScript ESM, Zod 4, Cheerio, ExcelJS, Vitest, GitHub Actions.

## Global Constraints

- Programas aceitos: `02`, `0A`, `0B`, `Z9`.
- Arquivo canônico: `CNPJ__PROGRAMA.xls`.
- Nunca sobrescrever silenciosamente um canônico com conteúdo regressivo ou conflitante.
- Originais devem ser preservados por hash de conteúdo.
- `workspace/liberacoes` deve continuar compatível com `loadSigefReleaseExports`.
- Valores financeiros continuam sendo validados pelo adaptador existente.

---

### Task 1: Inspetor de XLS de Liberações

**Files:**
- Create: `backend/adapters/sigef-release-inspector.ts`
- Test: `tests/unit/sigef-release-inspector.test.ts`

**Interfaces:**
- Produces: `inspectSigefReleaseHtml(source, { fiscalYear }): ReleaseInspection`.
- `ReleaseInspection` contém CNPJ, programa detectado, data da consulta, evidências de exercício e programas brutos.

- [ ] Criar testes para detecção dos quatro programas, ano divergente, arquivo sem CNPJ e mistura de programas.
- [ ] Confirmar que os testes falham antes da implementação.
- [ ] Implementar leitura Windows-1252, filtros e inferência de programa/exercício.
- [ ] Executar os testes do inspetor.

### Task 2: Carteira esperada e processamento incremental

**Files:**
- Create: `backend/application/assist-sigef-release-exports.ts`
- Test: `tests/unit/assist-sigef-release-exports.test.ts`

**Interfaces:**
- Consumes: JSON PDDEInfo, `inspectSigefReleaseHtml`, `parseSigefReleaseHtml`.
- Produces: `assistSigefReleaseExports(options): Promise<ReleaseAssistantResult>`.

- [ ] Testar criação das quatro pastas de originais e das pastas `liberacoes`/`controle`.
- [ ] Testar arquivo arbitrariamente nomeado que vira `CNPJ__PROGRAMA.xls`.
- [ ] Testar arquivo fora da carteira, exercício divergente e pasta incorreta.
- [ ] Testar duplicado equivalente e conflito.
- [ ] Testar atualização monotônica por consulta mais nova/superconjunto.
- [ ] Testar reexecução idempotente.
- [ ] Implementar carteira pela união de contas reconhecidas e registros financeiros normalizados.
- [ ] Implementar preservação por hash SHA-256 e promoção segura do canônico.

### Task 3: Planilha de controle

**Files:**
- Create: `backend/report/release-assistant-workbook.ts`
- Test: `tests/unit/release-assistant-workbook.test.ts`

**Interfaces:**
- Consumes: `ReleaseAssistantResult`.
- Produces: `buildReleaseAssistantWorkbook(result): Promise<Buffer>`.

- [ ] Testar existência exata das abas `Resumo`, `Cobertura`, `Arquivos`, `Pendências`.
- [ ] Testar contagens do resumo e presença das pendências.
- [ ] Implementar workbook sem fórmulas e com valores literais auditáveis.
- [ ] Reabrir o buffer gerado no teste para validar o artefato real.

### Task 4: CLI e integração com package.json

**Files:**
- Create: `scripts/assist-releases.ts`
- Create: `tests/unit/assist-releases-cli.test.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `npm run releases:assist -- --pdde-info ... --workspace ... --year ...`.

- [ ] Testar argumentos obrigatórios, desconhecidos e ano inválido.
- [ ] Implementar CLI com saída JSON resumida e código de erro não zero em falha fatal.
- [ ] Adicionar script `releases:assist` e elevar versão do pacote para `0.2.0`.

### Task 5: Documentação operacional

**Files:**
- Create: `docs/ASSISTENTE_LIBERACOES.md`
- Modify: `README.md`

- [ ] Documentar fluxo de coleta, estrutura do workspace, estados e integração com `reconcile`.
- [ ] Explicar que dados públicos não são removidos do Git por sigilo, apenas arquivos operacionais grandes continuam ignorados.

### Task 6: Verificação integrada

**Files:**
- Modify only if failures prove necessary.

- [ ] Executar `npm run test`.
- [ ] Executar `npm run typecheck`.
- [ ] Executar `npm run build`.
- [ ] Executar `npm audit --audit-level=high`.
- [ ] Abrir PR contra `main` para disparar CI remoto.
- [ ] Corrigir apenas falhas comprovadas pelo CI.
- [ ] Integrar somente com todos os gates verdes.