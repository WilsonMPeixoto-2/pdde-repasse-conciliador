# Plataforma PDDE — 4ª CRE

Este repositório é a **fonte canônica de implementação** do projeto de coleta, validação, conciliação e rastreabilidade financeira do PDDE para as 163 unidades da 4ª CRE/SME-Rio.

O produto nasceu como um extrator de dados do PDDEInfo e evoluiu para uma ferramenta que precisa distinguir evidências de fontes diferentes sem transformar ausência, atraso ou indisponibilidade em conclusões financeiras indevidas.

## Estado atual

Marco atual: **v0.2.0**.

Já estão implementados e testados:

- normalização dos dados financeiros das 163 escolas;
- motor determinístico de conciliação;
- leitura de exportações do **SIGEF Liberações** (`.xls` que contém HTML em Windows-1252);
- leitura em fluxo do CSV de **SIGEF Movimentações**;
- Assistente de Liberações incremental e idempotente;
- preservação de arquivos originais por SHA-256 no workspace operacional;
- validação por CNPJ, exercício, programa, ação, parcela, valor, data, conta e ordem bancária;
- valores monetários tratados em centavos inteiros;
- relatório Excel auditável, sem fórmulas ocultas e com proteção contra formula injection;
- estados explícitos para confirmação, divergência, ausência limitada à fonte e consulta inconclusiva.

A primeira execução real parcial do conciliador processou 163 escolas, 520 registros financeiros e 478.855 movimentos SIGEF. Como a fonte de Liberações ainda não estava disponível naquela rodada, o resultado correto foi **0 repasses confirmados e 520 consultas inconclusivas**.

## Regra central de evidência

O projeto separa fatos que não são equivalentes:

1. **pagamento informado no PDDEInfo**;
2. **ordem bancária/liberação registrada no SIGEF**;
3. **crédito localizado em movimentação bancária**;
4. eventual confirmação por evidência bancária direta autorizada.

Uma fonte não sobrescreve silenciosamente outra. Cobertura insuficiente produz estado inconclusivo, não uma resposta inventada.

## Verificação local

```bash
npm ci
npm run check
```

`npm run check` executa testes, typecheck TypeScript e build.

## Assistente de Liberações

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026
```

O assistente organiza exportações dos programas `02`, `0A`, `0B` e `Z9`, preserva originais e produz a pasta canônica de Liberações e a planilha de controle.

Detalhes: [`docs/ASSISTENTE_LIBERACOES.md`](docs/ASSISTENTE_LIBERACOES.md).

## Conciliação

```bash
npm run reconcile -- \
  --pdde-info /caminho/pddeinfo.json \
  --movements /caminho/extrato-bancario.csv \
  --releases-dir /caminho/coleta-liberacoes/liberacoes \
  --output /caminho/conciliacao.xlsx \
  --year 2026 \
  --requested-through 2026-08-12
```

## Estrutura principal

- `backend/core/` — modelos, normalização e regras determinísticas;
- `backend/adapters/` — leitura e inspeção das fontes;
- `backend/application/` — composição da carteira e fluxos de aplicação;
- `backend/report/` — geração e validação dos relatórios Excel;
- `scripts/` — interfaces operacionais;
- `tests/` — regras, regressões e integrações opcionais.

## Documentação essencial

- [`docs/PROJETO.md`](docs/PROJETO.md) — visão, evolução, escopo e governança dos repositórios;
- [`docs/DECISOES.md`](docs/DECISOES.md) — decisões consolidadas que não devem ser rediscutidas a cada sessão;
- [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md) — estado das fontes e semântica financeira;
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura atual e direção de evolução;
- [`docs/ASSISTENTE_LIBERACOES.md`](docs/ASSISTENTE_LIBERACOES.md) — operação da coleta de Liberações.

A documentação é memória do projeto, não gate burocrático. Alterações comuns de código não exigem atualização documental; os documentos acima são atualizados quando uma decisão, fonte, regra de negócio ou arquitetura muda de forma material.

## Governança dos repositórios

Este é o **único repositório de implementação do fluxo ChatGPT/OpenAI**.

Outros repositórios podem ser consultados como referências técnicas:

- `WilsonMPeixoto-2/extrator-pdde-4cre` — snapshot histórico e operacional de implementações anteriores;
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — projeto paralelo exclusivo do Manus, **somente leitura para este fluxo**.

Código, UX, testes e ideias úteis dessas referências podem ser estudados e incorporados aqui de forma seletiva. Nenhum desenvolvimento novo deste fluxo deve ser distribuído entre múltiplos repositórios.

## Dados

Os dados utilizados são públicos. Bases grandes, exportações operacionais e relatórios gerados podem permanecer fora do Git por tamanho, reprodutibilidade e ruído de histórico, não por sigilo.
