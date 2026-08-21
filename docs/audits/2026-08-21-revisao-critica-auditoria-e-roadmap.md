# Revisão crítica da auditoria de continuidade e correção do roadmap

**Data:** 21/08/2026

**Natureza:** errata interpretativa e decisão de continuidade

**Documento revisto:** `AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`

## 1. Regra de preservação

A auditoria integral de 20/08 permanece preservada sem alteração. Seu conteúdo, seus fatos e seu SHA-256 continuam sendo evidência histórica do diagnóstico realizado naquele momento.

Este documento não reescreve a auditoria. Ele corrige duas conclusões estratégicas depois da recuperação de instruções históricas e da recontagem dos artefatos financeiros:

1. não há prova suficiente de que o retrabalho tenha sido causado principalmente pelo início prematuro do frontend;
2. a diferença entre o histórico financeiro coletado e o histórico publicado deve voltar ao topo do roadmap.

## 2. Conflito documental que a auditoria não resolveu

A auditoria afirmou que o principal problema foi iniciar a entrega antes do fechamento das perguntas de produto e classificou o frontend anterior ao fechamento de A–H como quebra de processo de alta severidade.

O conjunto documental recuperado contém, porém, instruções anteriores em sentido diferente:

- `docs/history/PROMPT_NOVO_CHAT_WORK_PDDE.txt`, linha 171: as decisões essenciais já estavam tomadas, não se deveria abrir nova deliberação teórica e o trabalho deveria avançar para código real;
- `docs/history/HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.md`, linha 75: documentação é memória, não gate burocrático;
- o mesmo handoff, linha 562: a análise deveria terminar em implementação.

Posteriormente, `docs/PRODUCT_DECISION_GATE_2026.md` registrou que o frontend final não deveria começar antes da definição de A–H. No material auditável do repositório não foi localizada uma decisão humana que promovesse esse gate posterior a condição retroativa e obrigatória, substituindo expressamente as instruções anteriores.

O fato comprovado, portanto, é um **conflito documental não resolvido**. Não é uma quebra humana de processo comprovada.

## 3. Conclusões reclassificadas

| Afirmação | Classificação após revisão |
| --- | --- |
| Houve retrabalho em caminhos temporários de sessão, runtime, chave, senha e snapshot estático | comprovada |
| Houve documentação desatualizada e comandos que mudaram de significado | comprovada |
| O frontend teve problemas reais de identidade, conta, hierarquia e acessibilidade | comprovada |
| O frontend inteiro foi um erro por ter começado antes de A–H | não comprovada; conclusão superada |
| A causa principal do loop foi a implementação prematura da interface | não comprovada; peso causal excessivo |
| O desenvolvimento iterativo era incompatível com as instruções humanas | contradita pelas instruções recuperadas |
| O histórico mensal coletado não chegou ao produto publicado | comprovada e prioritária |

Os fatos técnicos da auditoria continuam válidos onde possuem evidência própria. O que deixa de orientar o roadmap é a interpretação causal que transformou o `PRODUCT_DECISION_GATE_2026.md` em regra retroativa sem comprovação de aprovação humana.

## 4. Recontagem do retrato financeiro publicado

O artefato usado pelo snapshot público foi a execução `32164281411`, artefato `9335143477`, nome `sigef-full-163-2026`. A recontagem de `financial-intelligence.json`, `human-financial.json` e do snapshot embarcado encontrou:

| Medida | Resultado |
| --- | ---: |
| Escolas | 163 |
| Contas no read model humano | 335 |
| Posições publicadas | 335 |
| Contas com mais de uma posição | 0 |
| Data de todas as posições publicadas | 31/07/2026 |
| Movimentações de 2026 no modelo financeiro | 408 |
| Movimentações de 2026 no modelo humano | 408 |

A paridade foi conferida por uma chave composta de escola, banco, agência, conta, data, documento, histórico, direção e valor. Os dois conjuntos possuem 408 chaves únicas, com zero ausente no humano e zero excedente. O `financial-intelligence.json` dessa execução já contém somente os movimentos normalizados para o exercício corrente.

Não foi encontrada perda das 408 movimentações de 2026 entre o modelo financeiro e o humano. A quantidade muito maior de linhas históricas presente nos HTMLs do SIGEF abrange outros exercícios e não é comparável a esse recorte; esses movimentos não devem ser inseridos silenciosamente em 2026.

A lacuna real está nas posições mensais. O backfill validado de 16/08 havia materializado 2.690 posições e 461 séries entre janeiro e junho. O retrato publicado posteriormente contém apenas a posição mais recente de cada uma das 335 contas nele retidas. O componente de série temporal aceita várias posições, mas recebe um único ponto por conta.

## 5. Teste de realidade: EM Professor Carneiro Ribeiro

No retrato recontado da escola `33069409`:

- a conta PDDE `0000549827` possui crédito de R$ 3.155,00 em 03/05/2026 e posição de R$ 3.155,00 em conta corrente em 31/07/2026;
- a conta PDDE Qualidade `0000546461` possui posição de R$ 3.459,73 integralmente aplicada em 31/07/2026, mas nenhuma movimentação de 2026 publicada no read model.

O primeiro caso permite dizer que o crédito foi observado e que a posição mais recente continuava em conta na data indicada. O segundo permite dizer apenas que existe posição aplicada sem evento de origem observado em 2026. Não autoriza inventar quando ocorreu a entrada ou a aplicação, nem incorporar automaticamente movimentos de 2025.

Esse caso define o padrão semântico do próximo marco: explicar o que foi observado, declarar a cobertura e tornar explícita a ausência de eventos de origem no recorte corrente.

## 6. Roadmap corrigido

### Marco corrente

**Completude financeira publicada de 2026**:

1. coletar todas as posições mensais de 2026 disponíveis no fluxo oficial;
2. preservar no produto as séries relevantes, inclusive quando a última posição for zero;
3. apresentar primeira e última posição observadas, atividade de 2026 e cobertura real por conta;
4. sinalizar posição não nula sem entrada de 2026 observada e aplicação atual sem evento de aplicação de 2026 observado;
5. gerar site e planilha a partir do mesmo contrato humano;
6. provar paridade no piloto de dez escolas e depois nas 163 unidades.

### Marco posterior preparado

A auditoria, a especificação e o plano de acessibilidade de 21/08 continuam tecnicamente válidos e preservados. A implementação deixa de ser o marco corrente e passa a ser o próximo candidato, sujeito a revalidação sobre o código modificado pela completude financeira.

### Trabalhos ainda posteriores

- validação orientada com usuários comuns;
- persistência institucional e Supabase dedicado;
- contexto histórico anterior a 2026 em área explicitamente separada;
- novas fontes e PDF executivo.

## 7. Decisão vigente

O projeto não volta a uma fase abstrata de fechamento de A–H. Ele avança iterativamente, com especificação curta, TDD, evidência real e checkpoint versionado.

O próximo plano de implementação deve ser derivado da especificação `docs/superpowers/specs/2026-08-21-completude-financeira-publicada-design.md`, depois de sua revisão humana. Até essa aprovação, nenhum código funcional deste novo marco está autorizado por este documento.
