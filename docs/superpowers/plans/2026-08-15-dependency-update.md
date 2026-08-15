# Atualização Controlada de Dependências Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Atualizar dependências existentes do projeto sem regressão funcional e sem introduzir novas camadas tecnológicas desnecessárias.

**Architecture:** A atualização será feita em branch isolada, usando o registry npm como fonte de versões e a suíte `npm run check` como gate obrigatório. Mudanças de versão principal serão aceitas apenas se a configuração necessária for pequena, explícita e não alterar a arquitetura do produto.

**Tech Stack:** Node.js >=22, npm lockfile v3, Vite, Tailwind CSS, TypeScript, Lucide, Vitest, Zod, Supabase JS.

## Global Constraints

- Não adicionar novas tecnologias nesta rodada.
- Não alterar regras de negócio, coletores ou modelos fiscais salvo compatibilidade estritamente necessária.
- Preservar cálculos monetários em centavos inteiros.
- Preservar `package-lock.json` reprodutível.
- Exigir `npm run check` verde antes de PR/merge.

---

### Task 1: Baseline e inventário de versões

**Files:**
- Read: `package.json`
- Read: `package-lock.json`
- Temporary workflow only if needed: `.github/workflows/dependency-update-probe.yml`

**Interfaces:**
- Consumes: scripts npm já definidos no `package.json`.
- Produces: lista de versões `current -> latest` e baseline de testes.

- [ ] **Step 1: Executar baseline limpo**

Run:
```bash
npm ci
npm run check
```
Expected: testes, typecheck e build passam antes da atualização.

- [ ] **Step 2: Consultar versões no registry**

Run:
```bash
npm outdated || true
for p in vite tailwindcss typescript lucide vitest @types/node tsx autoprefixer postcss @supabase/supabase-js cheerio csv-parse exceljs zod @electric-sql/pglite; do npm view "$p" version engines peerDependencies --json; done
```
Expected: saída registra versão atual, latest e requisitos de engine/peer.

### Task 2: Atualizar dependências compatíveis

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify only if required by a major migration: `tailwind.config.*`, `postcss.config.*`, `vite.config.*`, source imports affected solely by package API changes.

**Interfaces:**
- Consumes: inventário da Task 1.
- Produces: árvore npm atualizada e reproduzível.

- [ ] **Step 1: Atualizar versões sem mudança arquitetural**

Run targeted `npm install` commands using the exact versions discovered in Task 1, keeping packages already current unchanged.

- [ ] **Step 2: Verificar instalação limpa**

Run:
```bash
rm -rf node_modules
npm ci
```
Expected: instalação reproduzível sem erro.

- [ ] **Step 3: Rodar gate completo**

Run:
```bash
npm run check
```
Expected: PASS. Se uma major exigir migração extensa, reverter apenas essa major e manter as demais atualizações.

### Task 3: Revisão e integração

**Files:**
- Review: `package.json`
- Review: `package-lock.json`
- Review: quaisquer arquivos de configuração alterados por compatibilidade.

**Interfaces:**
- Produces: PR pequeno e auditável de atualização de dependências.

- [ ] **Step 1: Confirmar diff restrito ao escopo**

Run:
```bash
git diff --check
git diff --stat main...HEAD
```
Expected: somente dependências, lockfile, documentação mínima e compatibilidade estritamente necessária.

- [ ] **Step 2: Executar verificação final fresca**

Run:
```bash
npm ci
npm run check
```
Expected: PASS com evidência recente.

- [ ] **Step 3: Commit e PR**

Criar commit/PR com resumo das versões alteradas, majors recusadas se houver e resultado do gate completo.
