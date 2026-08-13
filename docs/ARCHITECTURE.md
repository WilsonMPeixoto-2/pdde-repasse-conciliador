# Arquitetura atual e direção de evolução

## Estado atual — v0.2.0

O núcleo atual materializa, por UEx, programa, ação e parcela, a correspondência entre três evidências oficiais:

1. pagamento informado no PDDEInfo;
2. ordem bancária e conta destinatária do SIGEF Liberações;
3. crédito correspondente no SIGEF Movimentações.

A arquitetura é deliberadamente determinística. IA, navegador automatizado ou agentes podem auxiliar coleta e diagnóstico, mas não decidem o resultado financeiro final.

## Fluxo atual

```text
PDDEInfo JSON ───────────────┐
                            │
SIGEF Liberações XLS ───────┼─> normalização/validação ─> conciliação ─> Excel auditável
                            │
SIGEF Movimentações CSV ────┘
```

Principais módulos:

1. `pddeinfo-normalizer.ts` converte o retorno do PDDEInfo em pagamentos esperados.
2. `sigef-release-inspector.ts` identifica CNPJ, exercício, programa e data da consulta nas exportações do SIGEF.
3. `load-sigef-release-exports.ts` incorpora a pasta canônica ou manifesto de Liberações.
4. `sigef-releases-html.ts` interpreta o `.xls`, fisicamente HTML em Windows-1252.
5. `sigef-movements-csv.ts` lê o CSV nacional em fluxo e filtra a carteira relevante.
6. `reconciliation-pipeline.ts` valida procedência e cobertura das fontes.
7. `portfolio-reconciliation.ts` isola cada ação/parcela e resolve candidatos sem inferência silenciosa.
8. `reconciliation.ts` aplica estados gerenciais e códigos de razão.
9. `reconciliation-workbook.ts` gera, relê e audita o Excel antes da gravação.
10. o Assistente de Liberações prepara as exportações de forma incremental e idempotente antes da conciliação.

## Invariantes

- dinheiro é comparado em centavos inteiros;
- CNPJ, banco, agência, conta, INEP, código SME e OB permanecem texto;
- fonte ausente ou cobertura insuficiente nunca vira confirmação nem ausência definitiva;
- uma liberação só participa da linha compatível em CNPJ, exercício, programa, ação e parcela;
- um movimento bancário só participa quando existe contexto documental suficiente;
- conta divergente entre fontes nunca é escolhida automaticamente;
- conta ausente no PDDEInfo não é inferida a partir de histórico ou programa diferente;
- cabeçalho, destinação ou estrutura desconhecida geram erro explícito;
- conteúdo externo capaz de virar fórmula no Excel é neutralizado;
- relatórios financeiros não dependem de fórmulas ocultas para provar seus resultados;
- o workbook final é relido e validado antes de ser considerado concluído.

## Direção da plataforma

O produto final deve evoluir sem substituir o núcleo determinístico por lógica de interface:

```text
Aplicação web operacional
        │
        ▼
Orquestrador de coletas e execuções
        │
        ├── PDDEInfo
        ├── SIGEF Liberações
        ├── SIGEF Movimentações/Extratos
        └── fontes complementares
        │
        ▼
Modelo canônico de dados + evidências
        │
        ▼
Motor determinístico de conciliação
        │
        ├── resultado operacional
        ├── exceções/revisão
        ├── rastreabilidade
        └── Excel profissional
```

Persistência, histórico de execuções, evidências brutas, autenticação e interface web ainda não são considerados parte consolidada do repositório apenas porque existam em protótipos paralelos. Eles entram na plataforma somente quando forem incorporados e validados aqui.

## Direção de UX

As implementações paralelas demonstraram uma direção de interface que vale preservar como referência, sem herdar seus runtimes:

- aparência institucional sóbria e alta densidade útil de informação;
- execução e situação da carteira visíveis antes dos detalhes técnicos;
- lista de escolas e resumo financeiro como foco da auditoria;
- rastreabilidade, hashes, URLs e artefatos em camada secundária sob demanda;
- estados financeiros em linguagem clara e com cores semânticas;
- tooltips para explicar estados de evidência;
- foco por teclado e modo de alto contraste;
- comportamento responsivo para desktop e celular;
- evitar painéis e notificações que ocupem espaço sem apoiar decisão operacional.

O repositório `EXTRATOR-PDDE-MANUS` é uma referência de leitura para essa direção visual, não uma dependência de código ou runtime.

## Limites atuais

- obtenção autônoma do SIGEF continua limitada por CAPTCHA em rotas relevantes;
- o fluxo principal ainda é executado por CLI;
- a interface web definitiva ainda não está integrada ao motor de conciliação;
- persistência institucional, autenticação e armazenamento de evidências serão incorporados em etapas posteriores;
- arquivos operacionais grandes permanecem fora do Git quando não agregam valor ao histórico do código.

## Dependência transitiva

O ExcelJS 4.4.0 ainda declara `uuid ^8.3.0`. O projeto força `uuid 11.1.1`, versão corrigida para a vulnerabilidade transitiva monitorada. A chamada utilizada pelo ExcelJS é `v4()`, preservada nessa versão. Geração, serialização e releitura do workbook permanecem cobertas por testes. O override deve ser removido quando uma futura versão do ExcelJS atualizar sua dependência nativa.
