# Assistente de Liberações 2026

## Finalidade

O Assistente de Liberações prepara as exportações `.xls` do **SIGEF > Liberações** para o conciliador PDDE. Ele foi desenhado para reduzir o trabalho manual de renomear e organizar arquivos, sem enfraquecer as validações auditáveis já existentes no núcleo de conciliação.

O fluxo aceita arquivos `.xls` com qualquer nome, identifica o CNPJ e o programa pelo conteúdo, valida o exercício e a carteira derivada do PDDEInfo, preserva os arquivos originais e gera os arquivos canônicos `CNPJ__PROGRAMA.xls` consumidos pelo comando `reconcile`.

## Programas suportados

| Código | Programa |
|---|---|
| `02` | PDDE / PDDE Básico |
| `0A` | PDDE Equidade |
| `0B` | PDDE Qualidade |
| `Z9` | PDDE Educação Integral |

## Uso

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026
```

Para uma execução reprodutível em testes ou auditorias, é possível informar a data de geração:

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026 \
  --generated-at 2026-08-12T10:00:00-03:00
```

## Estrutura produzida

Após a execução, o workspace passa a conter:

```text
coleta-liberacoes/
├── originais/
│   ├── 02/
│   ├── 0A/
│   ├── 0B/
│   ├── Z9/
│   └── _pendentes/
├── liberacoes/
│   └── CNPJ__PROGRAMA.xls
└── controle/
    └── controle-liberacoes-2026.xlsx
```

Os diretórios `originais`, `liberacoes` e `controle` são ignorados na varredura de entradas das execuções posteriores. Assim, o próprio material gerado não volta a ser processado como se fosse um novo download.

## Carteira esperada

A carteira de pares `CNPJ/programa` é derivada do JSON do PDDEInfo. Para cada escola, o assistente considera a união dos programas reconhecidos nas contas e nos registros financeiros. Isso reduz o risco de omissão quando um programa aparece em apenas uma das seções da coleta.

Somente os quatro códigos suportados entram na carteira de Liberações.

## Validações

Para cada `.xls`, o assistente verifica:

1. se o arquivo pode ser interpretado como exportação SIGEF;
2. se existe CNPJ válido no conteúdo;
3. qual dos quatro programas o conteúdo representa;
4. se as evidências de exercício são compatíveis com o ano solicitado;
5. se o par `CNPJ/programa` pertence à carteira do PDDEInfo;
6. se a pasta informada pelo usuário, quando nomeada com código de programa, é compatível com o conteúdo;
7. se o conteúdo financeiro passa pelo mesmo parser estrutural usado pelo conciliador.

O filtro genérico `PROGRAMA DINHEIRO DIRETO NA ESCOLA`, quando presente no SIGEF, não força artificialmente o código `02`: linhas financeiras mais específicas têm precedência para identificar Qualidade, Equidade ou Educação Integral.

## Preservação dos originais

Arquivos identificados são preservados em `originais/<programa>` usando CNPJ, código do programa e os primeiros 12 caracteres do SHA-256 do conteúdo.

Exemplo:

```text
originais/0B/12345678000199__0B__a1b2c3d4e5f6.xls
```

O hash impede que a repetição do mesmo download gere cópias indefinidas. Arquivos que não podem ser identificados com segurança são preservados em `originais/_pendentes`.

## Estados dos arquivos

| Estado | Significado |
|---|---|
| `IMPORTADO` | primeiro arquivo válido do par; arquivo canônico criado |
| `DUPLICADO_EQUIVALENTE` | conteúdo financeiro equivalente ao canônico; nenhuma sobrescrita |
| `ATUALIZADO` | consulta posterior contém, de forma monotônica, todos os registros anteriores e novos registros; canônico atualizado |
| `CONFLITO` | conteúdo diverge do canônico sem representar atualização monotônica segura; canônico preservado |
| `PASTA_INCORRETA` | código da pasta diverge do programa identificado no arquivo |
| `FORA_DA_CARTEIRA` | CNPJ/programa não pertence à carteira esperada |
| `EXERCICIO_DIVERGENTE` | há evidência de outro exercício no arquivo |
| `EXERCICIO_NAO_COMPROVADO` | não há evidência suficiente para promover o arquivo com segurança |
| `ARQUIVO_INVALIDO` | arquivo não pôde ser interpretado/validado como exportação válida |

## Atualização incremental e idempotência

A execução pode ser repetida sobre o mesmo workspace. O assistente:

- não duplica originais idênticos;
- não recria arquivos canônicos quando o conteúdo é equivalente;
- aceita atualização posterior somente quando ela é um superconjunto estrito do conteúdo canônico e a data da consulta é mais recente;
- não substitui silenciosamente um arquivo canônico por conteúdo divergente ou regressivo.

Essa regra é deliberadamente conservadora. Quando há dúvida, o sistema registra uma pendência em vez de escolher uma versão por conta própria.

## Planilha de controle

O comando gera `controle/controle-liberacoes-<ano>.xlsx` com quatro abas:

### Resumo

Quantidade de escolas, pares esperados/disponíveis/faltantes, arquivos processados, conflitos, erros e caminhos do workspace.

### Cobertura

Uma linha por par esperado, com SME, escola, CNPJ, exercício, programa, situação, número de registros, data da consulta e caminho canônico.

### Arquivos

Uma linha por `.xls` examinado, com origem, SHA-256, CNPJ, programa, data da consulta, resultado, original preservado, arquivo canônico e mensagem de validação.

### Pendências

Itens que exigem ação humana, incluindo pares faltantes, conflitos, arquivos inválidos, divergência de exercício, pasta incorreta e arquivos fora da carteira.

Textos potencialmente interpretáveis como fórmulas pelo Excel são neutralizados antes de serem inseridos na planilha de controle.

## Integração com o conciliador

Depois de preparar as Liberações, use a pasta `workspace/liberacoes` diretamente no conciliador:

```bash
npm run reconcile -- \
  --pdde-info /caminho/pddeinfo.json \
  --movements /caminho/movimentacoes.csv \
  --releases-dir /caminho/coleta-liberacoes/liberacoes \
  --output /caminho/conciliacao.xlsx \
  --year 2026 \
  --requested-through 2026-08-12
```

O formato canônico permanece `CNPJ__PROGRAMA.xls`, portanto o contrato de `loadSigefReleaseExports` e do pipeline de conciliação não foi alterado.

## Auditoria e segurança operacional

- O original nunca é substituído pelo arquivo canônico.
- O canônico só é alterado por atualização monotônica comprovada.
- Conflitos permanecem explícitos na planilha de controle.
- A planilha não depende de fórmulas para suas contagens ou registros.
- Os dados usados por este projeto são públicos; a preservação de originais e hashes tem finalidade de rastreabilidade, não de ocultação de dados.
