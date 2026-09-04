# LEIA PRIMEIRO — mapa de autoridade documental

**Atualização soberana:** 04/09/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Finalidade:** garantir que qualquer novo chat, agente ou ferramenta saiba o que ler, em que ordem e quais documentos são históricos.

## 1. Comece aqui

Antes de responder sobre o estado do projeto ou alterar qualquer arquivo, leia:

1. este documento;
2. [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md);
3. [`CONTINUIDADE_WORK.md`](CONTINUIDADE_WORK.md);
4. [`DECISOES.md`](DECISOES.md);
5. [`FONTES_E_REGRAS.md`](FONTES_E_REGRAS.md) para qualquer assunto de coleta/dados/Excel;
6. [`ARCHITECTURE.md`](ARCHITECTURE.md) para qualquer assunto de código/runtime/publicação;
7. código, testes, workflows, GitHub Actions e produção reais.

`AGENTS.md`, na raiz, repete essa regra em formato apropriado para agentes de desenvolvimento.

## 2. Documento soberano do estado corrente

O estado factual corrente está em:

[`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md)

Quando futuramente houver um `ESTADO_ATUAL_YYYY-MM-DD.md` mais recente e o `INDICE_DOCUMENTAL.md` o declarar soberano, ele substitui este como fotografia corrente.

**Não usar `ESTADO_ATUAL_2026-08-30.md`, `ESTADO_ATUAL_2026-08-19.md` ou checkpoints anteriores para concluir o estado presente.** Esses arquivos são registros históricos válidos apenas na data indicada.

## 3. Classes documentais

### A. Vigentes e normativos para continuidade

- `AGENTS.md` — protocolo de retomada e proteção contra regressão;
- `docs/LEIA_PRIMEIRO.md` — mapa de autoridade;
- `docs/ESTADO_ATUAL_2026-09-04.md` — fotografia corrente;
- `docs/CONTINUIDADE_WORK.md` — ponto operacional de retomada;
- `docs/DECISOES.md` — decisões estabilizadas;
- `docs/FONTES_E_REGRAS.md` — semântica das fontes e evidências;
- `docs/ARCHITECTURE.md` — arquitetura corrente;
- `docs/PROJETO.md` — missão, escopo e limites;
- `docs/CONHECIMENTO_ACUMULADO.md` — pesquisas e oportunidades, com status de maturidade;
- `docs/INDICE_DOCUMENTAL.md` — inventário e classificação.

### B. Evidência histórica importante

- `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`;
- `docs/PRODUCTION_CHECKPOINT_2026-09-04.md`;
- baselines `BASELINE_*.md`;
- checkpoints de produção anteriores;
- auditorias em `docs/audits/`;
- especificações e planos em `docs/superpowers/`.

Esses documentos registram como chegamos ao estado atual, mas não têm autoridade para reverter uma solução posterior.

### C. Material bruto / memória de origem

- `docs/history/`;
- handoffs;
- prompts de retomada;
- pesquisas brutas;
- relatórios experimentais;
- arquivos importados de fases anteriores.

Servem para reconstrução histórica, não para determinar o que fazer hoje sem confronto com o canônico atual.

## 4. Regra para resolver contradições

Se dois documentos disserem coisas incompatíveis:

1. conferir o código e os testes atuais;
2. conferir a execução/produção real;
3. verificar qual documento está classificado como vigente neste arquivo e no índice;
4. tratar o documento mais antigo como histórico, salvo se houver evidência de regressão real;
5. corrigir a documentação vigente para remover a ambiguidade.

Nunca escolher o documento antigo apenas porque ele é mais detalhado.

## 5. Estado de produção verificado em 04/09/2026

A coleta integral mais recente validada e publicada nesse checkpoint foi:

- GitHub Actions `SIGEF Full 163 Validation` run **#216**;
- run id `33906605579`;
- resultado `success`;
- 163/163 unidades;
- artefato `sigef-full-163-2026`, id `9950830049`;
- commit automático de publicação `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- Vercel deployment `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público confirmado com os mesmos IDs.

Esses números servem como prova do checkpoint. Uma execução posterior válida deve naturalmente substituí-los.

## 6. Regra de coleta longa

A duração não é critério de qualidade. O usuário aprovou explicitamente que a coleta demore o necessário para maximizar confiança.

Portanto:

- não reduzir profundidade de pesquisa para terminar mais rápido;
- não eliminar retries ou fallbacks por tempo;
- não pular fontes complementares relevantes por conveniência;
- não encerrar investigação de divergência apenas porque a coleta já está longa;
- diferenciar execução longa saudável de timeout, travamento, erro de fonte ou estado `PARTIAL`.

## 7. Regra de ausência, zero e incoerência

O projeto não pode repetir o problema que motivou a revisão de setembro:

- uma fonte informar pagamento e outra não mostrar crédito/saldo não autoriza inventar coerência;
- a divergência deve ser registrada e investigada com fontes adicionais;
- ausência não é zero;
- zero publicado é zero conhecido somente naquela fonte e referência;
- saldo em conta corrente zero não significa ausência de recurso quando há valor em aplicação ou saldo total positivo;
- toda posição de saldo precisa de data de referência.

## 8. Como usar documentos antigos

Planos, auditorias e checkpoints anteriores continuam valiosos para responder perguntas como:

- por que determinada solução existe?;
- qual problema ela resolveu?;
- que alternativa foi descartada?;
- quando uma fonte entrou no sistema?;
- qual regressão já aconteceu antes?

Eles **não** devem ser usados isoladamente para responder:

- o que está em produção agora?;
- qual é o próximo passo atual?;
- qual regra vale hoje?;
- qual fonte está integrada hoje?;
- qual versão do fluxo deve ser preservada?

## 9. Roteiro de uma retomada segura

1. ler os documentos vigentes na ordem deste arquivo;
2. conferir `main` e os últimos commits;
3. conferir PRs e workflows recentes relevantes;
4. conferir a produção real quando a tarefa tocar publicação/dados;
5. localizar a área de código afetada;
6. comparar qualquer plano antigo com as implementações posteriores;
7. executar apenas o que ainda falta;
8. atualizar a documentação se a decisão ou o estado mudar.

Esse roteiro existe para impedir que o projeto volte a andar em círculos.