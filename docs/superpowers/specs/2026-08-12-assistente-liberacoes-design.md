# Assistente de Liberações 2026 — desenho da recuperação v0.2.0

## Contexto

A `main` remota contém o marco v0.1.0 do conciliador auditável. Uma evolução posterior, identificada no histórico como v0.2.0/commit local `d01ba05`, foi validada em ambiente temporário, mas não chegou ao GitHub. Este documento reconstrói a funcionalidade perdida sem alterar o contrato do núcleo de conciliação já publicado.

## Objetivo

Adicionar uma camada operacional que prepare as exportações de **SIGEF Liberações** para o conciliador existente. O assistente deve aceitar arquivos `.xls` com nomes arbitrários, validar seu conteúdo contra o PDDEInfo e a carteira de escolas, preservar os arquivos brutos, gerar cópias canônicas `CNPJ__PROGRAMA.xls` e produzir uma planilha de controle auditável.

## Escopo funcional

### Programas suportados

O assistente trabalha exclusivamente com os quatro códigos já reconhecidos pelo projeto:

- `02` — PDDE;
- `0A` — PDDE Equidade;
- `0B` — PDDE Qualidade;
- `Z9` — PDDE Educação Integral.

### Entrada

- arquivo JSON do PDDEInfo usado pelo conciliador;
- pasta de trabalho (`workspace`);
- exercício alvo, por exemplo `2026`.

O `workspace` pode conter `.xls` com qualquer nome, inclusive em subpastas. As pastas geradas pelo próprio assistente são ignoradas em novas varreduras.

### Carteira esperada

A carteira de pares `CNPJ/programa` é construída pela união de:

1. programas bancários reconhecidos nas contas de cada escola do PDDEInfo; e
2. programas presentes nos registros financeiros normalizados pelo núcleo atual.

Essa união evita perder um programa apenas porque uma das duas seções da fonte não o expôs naquela coleta.

### Identificação e validação do arquivo

Para cada `.xls` candidato, o assistente:

1. lê o HTML/Windows-1252 entregue pelo SIGEF;
2. extrai o CNPJ e os metadados da consulta;
3. identifica o programa pelas linhas financeiras e, quando necessário, pelo filtro `Programa`;
4. verifica se o arquivo apresenta indícios compatíveis com o exercício solicitado;
5. confirma que o par `CNPJ/programa` pertence à carteira;
6. delega a validação estrutural e financeira final ao `parseSigefReleaseHtml` existente.

Nenhum arquivo inválido, de exercício divergente ou fora da carteira pode virar arquivo canônico.

### Organização do workspace

O assistente cria e mantém:

```text
workspace/
├── originais/
│   ├── 02/
│   ├── 0A/
│   ├── 0B/
│   └── Z9/
├── liberacoes/
│   └── CNPJ__PROGRAMA.xls
└── controle/
    └── controle-liberacoes-EXERCICIO.xlsx
```

Os originais são preservados por conteúdo, com hash curto no nome para impedir colisão silenciosa. A pasta `liberacoes/` é a interface direta com o comando já existente `npm run reconcile -- --releases-dir ...`.

### Duplicidade, atualização e conflito

Para um mesmo par `CNPJ/programa`:

- conteúdo idêntico: `DUPLICADO_EQUIVALENTE`, sem nova cópia canônica;
- conteúdo diferente, mas com conjunto de liberações semanticamente idêntico: duplicado equivalente;
- consulta mais nova cujo conjunto de liberações é um superconjunto do canônico: `ATUALIZADO`, substituindo de forma segura a cópia canônica;
- divergência não monotônica, consulta mais antiga que mudaria o conteúdo ou registros incompatíveis: `CONFLITO`, sem sobrescrever o canônico.

Isso permite execução incremental sem transformar uma nova exportação legítima em conflito, mas impede regressões silenciosas.

### Pasta incorreta

Quando o arquivo estiver dentro de uma pasta cujo nome é um dos códigos `02`, `0A`, `0B` ou `Z9` e o conteúdo indicar outro programa, o assistente registra `PASTA_INCORRETA`. O original é preservado, mas o arquivo não é promovido à pasta canônica até ser revisto.

### Idempotência

A reexecução com os mesmos arquivos não cria novas cópias, não altera arquivos canônicos sem necessidade e produz os mesmos estados operacionais. O relatório de controle pode ter nova data de geração, mas a cobertura e as decisões sobre os arquivos permanecem estáveis.

## Planilha de controle

A planilha terá quatro abas obrigatórias:

### Resumo

Exercício, data de geração, quantidade de escolas, pares esperados, pares disponíveis, faltantes, arquivos processados, conflitos, erros e caminho da pasta canônica.

### Cobertura

Uma linha por par esperado: escola, CNPJ, programa, situação, quantidade de registros, data da consulta e caminho do arquivo canônico.

### Arquivos

Uma linha por `.xls` examinado: caminho de origem, hash, CNPJ, programa, evidência do exercício, resultado, caminho preservado e caminho canônico.

### Pendências

Itens que exigem ação humana: par faltante, arquivo inválido/corrompido, exercício divergente, arquivo fora da carteira, pasta incorreta ou conflito.

## Interface de linha de comando

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026
```

Opções adicionais podem incluir `--generated-at` apenas para testes/reprodutibilidade.

## Compatibilidade

O núcleo de conciliação não muda de contrato. Após a preparação:

```bash
npm run reconcile -- \
  --pdde-info /caminho/pddeinfo.json \
  --movements /caminho/movimentacoes.csv \
  --releases-dir /caminho/coleta-liberacoes/liberacoes \
  --output /caminho/conciliacao.xlsx \
  --year 2026 \
  --requested-through 2026-08-12
```

## Critérios de aceitação

- aceita `.xls` com nome arbitrário;
- reconhece e organiza os quatro programas;
- valida CNPJ, programa, exercício e carteira;
- preserva originais;
- gera `CNPJ__PROGRAMA.xls` apenas quando seguro;
- detecta duplicidades, atualizações, conflitos, arquivos inválidos e pastas incorretas;
- é incremental e idempotente;
- gera `Resumo`, `Cobertura`, `Arquivos` e `Pendências`;
- mantém compatibilidade com `loadSigefReleaseExports` e `reconcileFiles`;
- todo comportamento novo possui teste automatizado.