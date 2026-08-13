# Conciliador de Repasses PDDE — 4ª CRE

Marco `v0.2.0` da ferramenta que concilia, por escola, ação e parcela, três evidências oficiais:

1. pagamento informado no PDDEInfo;
2. ordem bancária e conta destinatária exportadas de **SIGEF Liberações**;
3. crédito correspondente no CSV de **SIGEF Movimentações**.

A versão publicada `v21` do extrator permanece intacta. Este projeto evolui seu núcleo de conciliação de modo independente e testável.

## O que já funciona

- normalização estrita do retorno real das 163 escolas da 4ª CRE;
- leitura em fluxo do CSV SIGEF com 478.855 linhas, sem carregar o arquivo integralmente em memória;
- leitura do `.xls` de Liberações, que o SIGEF entrega como HTML em Windows-1252;
- **Assistente de Liberações** que aceita `.xls` com qualquer nome, identifica CNPJ/programa/exercício e organiza os quatro programas suportados;
- preservação de originais por hash, geração de `CNPJ__PROGRAMA.xls`, detecção de duplicidades, atualizações monotônicas, conflitos, pasta incorreta e arquivo fora da carteira;
- planilha de controle das Liberações com `Resumo`, `Cobertura`, `Arquivos` e `Pendências`;
- importação em lote da pasta canônica de Liberações com conferência de cobertura;
- comparação por CNPJ, exercício, programa, ação, parcela, valor, data, conta e ordem bancária;
- soma controlada de múltiplos créditos ligados à mesma ordem bancária;
- complemento de conta ausente somente quando uma liberação correspondente e confiável a fornece;
- relatório `.xlsx` com as abas `Conciliação`, `Exceções` e `Metadados`;
- releitura e auditoria do Excel antes da gravação;
- valores financeiros calculados em centavos inteiros e ausência deliberada de fórmulas nos relatórios;
- neutralização de textos potencialmente interpretáveis como fórmulas pelo Excel.

## Status controlados da conciliação

- `REPASSE_CONFIRMADO`
- `ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO`
- `PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO`
- `DIVERGENCIA_REVISAO_NECESSARIA`
- `SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA`
- `CONSULTA_INCONCLUSIVA`

Uma indisponibilidade ou cobertura insuficiente de fonte nunca é convertida em confirmação nem em ausência de pagamento.

## Instalação e verificações

```bash
npm ci
npm run check
```

O comando `npm run check` executa testes, compilação TypeScript estrita e build do frontend preservado da v21.

## 1. Preparar as exportações de Liberações

Não é mais necessário renomear manualmente cada download do SIGEF. Coloque os `.xls` em um workspace e execute:

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026
```

O assistente cria:

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

Programas suportados:

- `02` — PDDE / PDDE Básico;
- `0A` — PDDE Equidade;
- `0B` — PDDE Qualidade;
- `Z9` — PDDE Educação Integral.

A execução é incremental e idempotente. Um arquivo canônico não é substituído por conteúdo conflitante; atualizações são aceitas apenas quando uma consulta posterior contém todos os registros anteriores e acrescenta novos registros.

Detalhes operacionais: [`docs/ASSISTENTE_LIBERACOES.md`](docs/ASSISTENTE_LIBERACOES.md).

## 2. Executar a conciliação

Use diretamente a pasta `liberacoes` produzida pelo assistente:

```bash
npm run reconcile -- \
  --pdde-info /caminho/pddeinfo.json \
  --movements /caminho/extrato-bancario.csv \
  --releases-dir /caminho/coleta-liberacoes/liberacoes \
  --output /caminho/conciliacao.xlsx \
  --year 2026 \
  --requested-through 2026-08-12
```

A importação canônica usa nomes como:

```text
12345678000190__02.xls
12345678000190__0B.xls
```

O conciliador confere o CNPJ do nome contra o conteúdo do arquivo, rejeita pares alheios à carteira e informa os pares esperados, importados e faltantes. Arquivos `.xls` mal nomeados não são ignorados silenciosamente.

### Alternativa por manifesto

O manifesto de Liberações é um array JSON. Caminhos relativos são resolvidos a partir do próprio manifesto:

```json
[
  {
    "path": "./exports/12345678000190__02.xls",
    "programCode": "02",
    "sourceUrl": "https://www.fnde.gov.br/sigefweb/index.php/liberacoes/visualizaexcel/..."
  }
]
```

Use `--release-manifest` quando precisar preservar a URL específica de cada exportação. `--release-manifest` e `--releases-dir` são alternativas mutuamente exclusivas.

Sem manifesto nem pasta, a ferramenta registra a fonte Liberações como indisponível para cada CNPJ/programa e classifica as linhas afetadas como `CONSULTA_INCONCLUSIVA`.

Use `--overwrite` somente quando quiser substituir conscientemente um arquivo de conciliação já existente.

## Primeira execução real parcial

Executada em 11/08/2026, ainda sem as exportações de Liberações 2026:

- 163 escolas;
- 520 registros financeiros;
- 169 registros com pagamento no PDDEInfo;
- 478.855 movimentos SIGEF lidos;
- 167 movimentos das UEx/programas-alvo;
- cobertura observada de Movimentações até 29/05/2026;
- 520 consultas inconclusivas;
- 0 repasses confirmados, como exigido pela ausência da evidência de Liberações.

O resultado parcial é um artefato gerado e, por isso, não integra o histórico Git.

## Estrutura principal

- `backend/core/`: esquemas, normalização e motor de conciliação;
- `backend/adapters/`: leitores e inspetores de PDDEInfo, Liberações e Movimentações;
- `backend/application/`: composição da carteira, Assistente de Liberações e execução por arquivos;
- `backend/report/`: geração e validação dos relatórios Excel;
- `scripts/assist-releases.ts`: preparação das exportações de Liberações;
- `scripts/reconcile.ts`: interface de linha de comando da conciliação;
- `tests/unit/`: regras e regressões sintéticas;
- `tests/integration/`: verificações opcionais contra arquivos oficiais locais;
- `docs/ARCHITECTURE.md`: fluxo, invariantes e limites do núcleo;
- `docs/ASSISTENTE_LIBERACOES.md`: operação e estados do Assistente de Liberações.

## Dados públicos e arquivos grandes

Os dados utilizados são públicos. Bases nacionais, exportações operacionais e relatórios gerados ficam fora do Git apenas por tamanho, ruído de histórico e reprodutibilidade. Fixtures pequenas e deliberadas podem ser versionadas em `tests/fixtures/`.

## Próximo corte

Completar a coleta real das exportações de Liberações 2026 para os pares CNPJ/programa da carteira, revisar as pendências produzidas pelo assistente, executar a conciliação completa e, somente depois de revisar as exceções, integrar a nova experiência à aplicação web candidata.
