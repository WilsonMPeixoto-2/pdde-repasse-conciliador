# Índice documental canônico — PDDE Repasse Conciliador

**Atualização:** 06/09/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

## 1. Objetivo deste índice

Este arquivo existe para impedir que um novo chat, agente ou ferramenta:

- leia um checkpoint antigo como se fosse estado atual;
- execute novamente uma tarefa já resolvida por hotfix/PR posterior;
- misture documentação histórica com regras vigentes;
- conclua estado de produção sem conferir `main`, workflows e Vercel;
- repita pesquisas de fontes já feitas e classificadas;
- perca o ponto exato de uma investigação prática em andamento.

A porta de entrada obrigatória é [`LEIA_PRIMEIRO.md`](LEIA_PRIMEIRO.md).

## 2. Ordem única de leitura

1. `AGENTS.md`;
2. `docs/LEIA_PRIMEIRO.md`;
3. `docs/ESTADO_ATUAL_2026-09-04.md`;
4. `docs/CONTINUIDADE_WORK.md`;
5. **se a tarefa envolver ampliação de fontes ou PR #58, ler `docs/INVESTIGACAO_PRATICA_FONTES_2026-09-06.md`;**
6. `docs/DECISOES.md`;
7. `docs/FONTES_E_REGRAS.md` quando houver dados/coleta/Excel;
8. `docs/ARCHITECTURE.md` quando houver código/runtime/publicação;
9. código, testes, workflows, `main`, CI e produção reais;
10. somente depois, auditorias/baselines/planos históricos necessários à investigação.

## 3. Hierarquia de autoridade

Em caso de divergência:

1. código/testes/workflows atuais;
2. execução e produção efetivamente verificadas;
3. `LEIA_PRIMEIRO` + `ESTADO_ATUAL` soberano;
4. `CONTINUIDADE_WORK`;
5. `DECISOES`, `FONTES_E_REGRAS`, `ARCHITECTURE`, `PROJETO`;
6. checkpoint prático corrente de investigação de fontes, quando a questão for o estado de testes externos ainda não incorporados à produção;
7. conhecimento acumulado classificado;
8. auditorias, baselines, checkpoints, specs e planos datados;
9. handoffs, prompts, fontes brutas e resumos de chat.

Um documento histórico pode conter frases corretas para a data dele e incompatíveis com o estado atual. Isso não é autoridade para regressão.

## 4. Documentos vigentes

| Caminho | Papel | Autoridade atual |
|---|---|---|
| `AGENTS.md` | Protocolo automático de retomada/anti-regressão | **Soberano para agentes** |
| `docs/LEIA_PRIMEIRO.md` | Porta de entrada e hierarquia documental | **Soberano** |
| `docs/ESTADO_ATUAL_2026-09-04.md` | Estado factual corrente em produção | **Soberano de estado** |
| `docs/CONTINUIDADE_WORK.md` | Próximo ponto operacional e regras de retomada | **Vigente** |
| `docs/INVESTIGACAO_PRATICA_FONTES_2026-09-06.md` | Testes reais de novas fontes, bloqueios, URLs e ponto exato de retomada | **Checkpoint vigente da investigação de fontes no PR #58** |
| `docs/DECISOES.md` | Decisões estabilizadas | **Vigente** |
| `docs/FONTES_E_REGRAS.md` | Fontes, maturidade e semântica financeira | **Vigente** |
| `docs/ARCHITECTURE.md` | Arquitetura corrente | **Vigente** |
| `docs/PROJETO.md` | Missão, limites e produtos | **Vigente** |
| `docs/CONHECIMENTO_ACUMULADO.md` | Pesquisa/opções com status explícito | **Vigente como memória classificada** |
| `docs/INDICE_DOCUMENTAL.md` | Inventário/autoridade | **Vigente** |
| `README.md` | Resumo público do repositório | **Vigente, mas não substitui o estado soberano** |

## 5. Evidência histórica consolidada

| Caminho | Finalidade | Uso correto |
|---|---|---|
| `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md` | Linha do tempo material de decisões/problemas/soluções | Entender origem e evitar repetição |
| `docs/PRODUCTION_CHECKPOINT_2026-09-04.md` | Prova ponta a ponta do snapshot publicado | Auditar fechamento de 04/09 |
| `docs/BASELINE_TECNICO_2026-08-14.md` | Baseline PDDEInfo + SIGEF | Fotografia de 14/08 |
| `docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md` | Baseline relatórios públicos FNDE | Fotografia de 16/08 |
| `docs/ESTADO_ATUAL_2026-08-19.md` | Antigo estado operacional | **Histórico** |
| `docs/ESTADO_ATUAL_2026-08-30.md` | Antigo estado operacional | **Histórico; não usar como corrente** |
| `docs/PRODUCTION_CHECKPOINT_2026-08-30.md` | Checkpoint Vercel de 30/08 | Histórico |
| `docs/PRODUCTION_CHECKPOINT_2026-08-31.md` | Checkpoint Vercel de 31/08 | Histórico |
| `docs/audits/` | Diagnósticos e verificações datadas | Evidência contextual |
| `docs/superpowers/specs/` | Especificações de marcos | Válidas para o marco; decisões posteriores prevalecem |
| `docs/superpowers/plans/` | Planos executáveis datados | Nunca executar sem comparar com estado atual |

## 6. Material histórico/bruto

`docs/history/` contém handoffs, prompts e materiais de pesquisa recuperados. Eles têm valor de memória, não de autoridade operacional.

Regra: **não iniciar trabalho a partir de um arquivo de `docs/history/` sem antes ler a cadeia vigente.**

## 7. Documentos temáticos vigentes ou de referência

| Caminho | Papel | Observação |
|---|---|---|
| `docs/VISAO_FISCAL.md` | Contrato de leitura fiscal/humana | Vigente se não conflitar com decisões posteriores |
| `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` | Princípios visuais | Vigente; marcos posteriores podem especializar |
| `docs/REFERENCIAS_NORMATIVAS.md` | Referências normativas | Vigente como referência |
| `docs/MONITORING_INSTITUCIONAL.md` | Contrato de monitoramento | Referência técnica; confrontar arquitetura atual |
| `docs/ASSISTENTE_LIBERACOES.md` | Caminho auxiliar de liberações | Referência técnica |
| `docs/vercel-preview.md` | Operação de preview | Referência operacional |
| `docs/ESCOPO_V05.md` | Escopo antigo de versão | Histórico |
| `docs/FRONTEND_PRODUCT_IMPLEMENTATION_2026-08-16.md` | Implementação frontend inicial | Histórico |
| `docs/FRONTEND_PRODUCT_QA_2026.md` | QA de marco anterior | Histórico |
| `docs/TECHNICAL_AUDIT_2026-08-16.md` | Auditoria técnica | Histórico |
| `docs/VALIDACAO_REAL_V05_2026-08-13.md` | Validação de v0.5 antiga | Histórico |
| `docs/PRODUCT_DECISION_GATE_2026.md` | Gate original de produto | Histórico; decisões posteriores prevalecem |

## 8. Snapshot financeiro publicado no checkpoint de 04/09

Evidência do fechamento:

- Full 163 run #216;
- run id `33906605579`;
- artefato `9950830049`;
- commit de publicação `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- Vercel `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público confirmado com `33906605579 / 9950830049`.

IDs históricos `32164281411 / 9335143477` estão superseded no estado de 04/09.

Esses IDs não são constantes: uma coleta posterior válida deve substituir o checkpoint.

## 9. Pesquisa de fontes: onde consultar antes de repetir trabalho

Para o estado **mais recente dos testes práticos** de novas fontes, ler primeiro:

- `docs/INVESTIGACAO_PRATICA_FONTES_2026-09-06.md`.

Depois consultar:

- estado e regras: `docs/FONTES_E_REGRAS.md`;
- oportunidades e limitações: `docs/CONHECIMENTO_ACUMULADO.md`;
- cronologia anterior: `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`;
- fontes brutas antigas: `docs/history/source-material/`.

O checkpoint de 06/09 registra resultados práticos já obtidos para:

- Dados Abertos FNDE 2025+;
- Antonieta de Barros / produto 59;
- SIMEC;
- Power BI PDDE;
- SiGPC Acesso Público;
- Portal da Transparência/CGU;
- BB Ágil;
- D.O. Rio/SME.

Não recomeçar essas pesquisas por páginas institucionais genéricas. Retomar do ponto técnico explicitamente registrado no checkpoint.

## 10. Regra para planos antigos

Nenhuma tarefa de plano datado deve ser executada automaticamente.

Antes:

1. verificar se já foi feita;
2. verificar se foi superada por solução posterior;
3. preservar hotfix/decisão mais nova quando melhor;
4. executar somente a parte ainda necessária;
5. atualizar a documentação após alteração material.

## 11. Definição de “salvo para continuidade”

Um estado documental só é considerado salvo quando:

- está no repositório canônico;
- está commitado e publicado em branch remota;
- o índice/LEIA_PRIMEIRO explicam seu papel;
- não depende de um chat isolado para ser interpretado;
- conflitos com documentos antigos estão resolvidos por classificação/precedência.

Arquivo local, resposta de chat ou cópia na Biblioteca não bastam sozinhos.

## 12. Próxima atualização

Quando houver mudança material em produção, fonte, regra financeira ou arquitetura:

- criar/atualizar o estado atual soberano;
- atualizar `CONTINUIDADE_WORK`;
- atualizar `DECISOES`/`FONTES_E_REGRAS`/`ARCHITECTURE` quando aplicável;
- atualizar este índice;
- não deixar o novo estado existindo apenas em conversa.

Quando a investigação do PR #58 produzir uma fonte realmente incorporável, promover a conclusão do checkpoint prático para `FONTES_E_REGRAS.md` e, se houver mudança produtiva, para um novo `ESTADO_ATUAL` soberano.