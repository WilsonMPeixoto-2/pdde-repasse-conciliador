# Baseline financeiro público da 4ª CRE — 2026

**Data da coleta:** 16/08/2026 (UTC)  
**Carteira:** 163 unidades escolares da 4ª CRE  
**Exercício:** 2026  
**Fonte desta etapa:** relatórios públicos complementares do PDDEInfo/FNDE  
**Modo:** backfill de todos os meses de saldo de 2026 publicados no formulário até a data da execução

## Resultado executivo

A execução integral da carteira foi concluída sem falhas de coleta e comprovou que os relatórios públicos do FNDE podem ser usados como uma camada complementar de acompanhamento financeiro de 2026.

| Medida | Resultado |
|---|---:|
| Unidades selecionadas | 163 |
| CNPJs únicos de UEx localizados | 163 |
| Registros de atendimento/repasse | 169 |
| Registros de prestação de contas | 311 |
| Posições mensais de saldo | 2.690 |
| Séries conta/programa distintas | 461 |
| Artefatos brutos preservados | 1.304 |
| Falhas de coleta | 0 |
| Duplicidades lógicas de saldo | 0 |
| Inconsistências aritméticas de saldo | 0 |

## Cobertura temporal comprovada

O formulário público de saldos publicou, na data da execução, posições para:

- 31/01/2026;
- 28/02/2026;
- 31/03/2026;
- 30/04/2026;
- 31/05/2026;
- 30/06/2026.

A posição mais recente disponível nessa fonte era, portanto, **30/06/2026**.

Isso significa que o saldo público do FNDE **não é um saldo bancário em tempo real de agosto**. O sistema deve sempre apresentar a data de referência junto ao valor.

## Atendimento e ordens de pagamento

Foram normalizados 169 registros de atendimento, distribuídos da seguinte forma:

| Destinação | Registros | Custeio | Capital | Total |
|---|---:|---:|---:|---:|
| PDDE Básico - 1ª Parcela | 111 | R$ 412.877,25 | R$ 219.707,75 | R$ 632.585,00 |
| PDDE Básico - Primeira Infância - P1 | 52 | R$ 81.034,00 | R$ 51.596,00 | R$ 132.630,00 |
| Escola das Adolescências 2026 | 6 | R$ 43.680,00 | R$ 18.720,00 | R$ 62.400,00 |
| **Total** | **169** | **R$ 537.591,25** | **R$ 290.023,75** | **R$ 827.615,00** |

Datas de ordem de pagamento observadas:

- PDDE Básico - 1ª Parcela: 39 registros em 30/04/2026 e 72 em 04/08/2026;
- Primeira Infância - P1: 18 em 29/04/2026, 33 em 22/05/2026 e 1 em 08/07/2026;
- Escola das Adolescências 2026: 6 em 12/05/2026.

**Regra semântica obrigatória:** a data de ordem de pagamento é um registro administrativo do FNDE. Ela não deve ser apresentada como data de crédito bancário confirmado.

## Prestação de contas

Foram encontrados 311 registros:

- 163 para PDDE;
- 148 para PDDE QUALIDADE.

Na fotografia consultada, todos os 311 registros estavam com situação **Adimplente** e nenhum apresentou suspensão de pagamento.

Esse campo deve ser apresentado como **situação informada pela fonte pública na data da consulta**, sem transformar o dado em conclusão geral de auditoria ou regularidade financeira.

## Série mensal de saldos

Foram identificadas 461 séries distintas por escola/CNPJ/programa/conta.

Distribuição da presença mensal:

- 444 séries presentes nos seis fechamentos de janeiro a junho;
- 13 séries presentes apenas em janeiro;
- 2 séries presentes de janeiro a abril;
- 1 série presente de janeiro a fevereiro;
- 1 série presente de janeiro a março.

As 17 séries que não aparecem em todos os seis meses tinham saldo observado de **R$ 0,00** nos meses em que foram publicadas. Os meses ausentes continuam sendo tratados como **ausência**, e não são preenchidos artificialmente com zero.

### Quantidade de posições por fechamento

| Referência | Posições publicadas |
|---|---:|
| 31/01/2026 | 461 |
| 28/02/2026 | 448 |
| 31/03/2026 | 447 |
| 30/04/2026 | 446 |
| 31/05/2026 | 444 |
| 30/06/2026 | 444 |

### Posição agregada em 30/06/2026

A soma das 444 posições de conta/programa publicadas para 30/06/2026 foi:

| Componente | Valor |
|---|---:|
| Saldo em conta | R$ 278.017,30 |
| Saldo em fundos | R$ 1.364.017,11 |
| Saldo em poupança | R$ 0,00 |
| Saldo RDB/CDB | R$ 0,00 |
| **Saldo total informado** | **R$ 1.642.034,41** |

Distribuição das 444 posições em junho:

- 288 com saldo total positivo;
- 155 com saldo total igual a zero;
- 1 com saldo total negativo.

**Regra semântica obrigatória:** `Saldo Fundos`, `Saldo Poupança` e `Saldo RDB/CDB` representam **posição aplicada na data de referência**. Esses valores não são sinônimo de rendimento. Rendimento exige movimento explícito ou análise temporal adequada.

## Programas nas posições de junho

| Programa | Posições em 30/06/2026 |
|---|---:|
| PDDE | 218 |
| PDDE QUALIDADE | 164 |
| PDDE EQUIDADE | 57 |
| PDDE/PDE-ESCOLA | 5 |
| **Total** | **444** |

Cada posição de junho correspondeu a uma combinação bancária única dentro da escola; não foi encontrada a mesma conta bancária duplicada em mais de um rótulo de programa no mesmo mês.

## Posições negativas que exigem contexto

Foram observadas 8 posições mensais negativas de pequena monta em `Saldo Conta`, concentradas em duas unidades. Não houve saldo aplicado negativo.

### 0430002 EM TEOTONIO VILELA — INEP 33069450

Conta PDDE, Banco do Brasil, agência 1254, conta 0000044571:

- 31/01/2026: **-R$ 10,18**;
- 28/02/2026: **-R$ 1,03**.

### 0431608 CM ARI PIMENTEL — INEP 33144710

Conta PDDE, Banco do Brasil, agência 3189, conta 000002483X:

- 31/01/2026: **-R$ 0,37**;
- 28/02/2026: **-R$ 0,50**;
- 31/03/2026: **-R$ 0,05**;
- 30/04/2026: **-R$ 0,05**;
- 31/05/2026: **-R$ 0,06**;
- 30/06/2026: **-R$ 0,06**.

Essas posições devem ser tratadas como **fatos descritivos a conferir**, não como indicação automática de irregularidade. A fonte pública isolada não informa a causa do saldo negativo.

## Regras de integridade validadas

A execução integral confirmou:

1. 163/163 unidades da lista-mestre foram processadas;
2. foi localizado um CNPJ único para cada uma das 163 UEs;
3. não houve falha de coleta;
4. não houve duplicidade da chave escola/CNPJ/programa/banco/agência/conta/data;
5. em todas as 2.690 posições, `fundos + poupança + RDB/CDB = total aplicado`;
6. em todas as 2.690 posições, `saldo em conta + total aplicado = saldo total informado`;
7. meses ausentes não foram convertidos em zero;
8. a data de cobertura foi preservada em cada posição.

## Consequência para o produto

O backfill comprovou que a Plataforma pode trabalhar com uma série temporal real de 2026 sem ampliar o escopo para exercícios antigos.

O monitoramento rotineiro deve consultar apenas o mês mais recente publicado, enquanto o backfill de 2026 serve para reconstrução inicial ou reparo da série histórica.

A camada de apresentação deve usar esses fatos em recortes humanos, por exemplo:

- posição financeira mais recente da unidade;
- composição entre conta e aplicações;
- evolução mensal;
- lista de contas/programas;
- relação nominal de unidades por indicador;
- comparação entre repasses informados e evidências bancárias disponíveis.

Ela **não deve** expor ao usuário comum URLs brutas, hashes, parsers, tentativas de requisição, IDs internos, logs ou regras técnicas de associação.

## Limites deste baseline

Este baseline comprova a extração e normalização dos relatórios públicos complementares do PDDEInfo. Ele não substitui:

- o PDDEInfo principal já usado para programação/pagamento informado;
- o SIGEF para movimentações e evidências de crédito;
- o Portal da Transparência, cuja integração ainda depende de credencial oficial;
- eventual fonte bancária institucional autorizada.

A conciliação final continua sendo construída por fontes independentes, sem transformar um único sistema em autoridade para fatos que ele não comprova.