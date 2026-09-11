# Índice documental canônico — PDDE Repasse Conciliador

**Atualização:** 11/09/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

## 1. Porta de entrada

A leitura começa em [`LEIA_PRIMEIRO.md`](LEIA_PRIMEIRO.md).

Ordem vigente:

1. `AGENTS.md`;
2. `docs/LEIA_PRIMEIRO.md`;
3. `docs/ESTADO_ATUAL_2026-09-11.md`;
4. `docs/CONTINUIDADE_WORK.md`;
5. `docs/DECISOES.md`;
6. `docs/FONTES_E_REGRAS.md` para dados/coleta/Excel;
7. `docs/ARCHITECTURE.md` para runtime/publicação;
8. `docs/INVESTIGACAO_PRATICA_FONTES_2026-09-06.md` quando a tarefa envolver novas fontes ainda experimentais;
9. código, testes, workflows, `main`, CI e produção reais.

## 2. Hierarquia de autoridade

Em caso de divergência:

1. código/testes/workflows atuais;
2. execução e produção verificadas;
3. `LEIA_PRIMEIRO` + `ESTADO_ATUAL_2026-09-11.md`;
4. `CONTINUIDADE_WORK.md`;
5. `DECISOES.md`, `FONTES_E_REGRAS.md`, `ARCHITECTURE.md` e `PROJETO.md`;
6. checkpoint prático de investigação de fontes, quando aplicável;
7. documentos históricos.

## 3. Documentos vigentes

| Caminho | Papel |
|---|---|
| `AGENTS.md` | protocolo de retomada/anti-regressão |
| `docs/LEIA_PRIMEIRO.md` | mapa de autoridade |
| `docs/ESTADO_ATUAL_2026-09-11.md` | estado factual corrente |
| `docs/CONTINUIDADE_WORK.md` | ponto operacional de retomada |
| `docs/DECISOES.md` | decisões estabilizadas |
| `docs/FONTES_E_REGRAS.md` | fontes, maturidade e semântica |
| `docs/ARCHITECTURE.md` | arquitetura corrente |
| `docs/PROJETO.md` | missão, limites e produtos |
| `docs/CONHECIMENTO_ACUMULADO.md` | pesquisa/opções classificadas |
| `docs/INVESTIGACAO_PRATICA_FONTES_2026-09-06.md` | checkpoint de testes de fontes ainda experimentais |
| `docs/INDICE_DOCUMENTAL.md` | este inventário |

## 4. Estado arquitetural de setembro

O fluxo operacional atual é:

```text
Full 163
  ↓ COMPLETE 163/163
publisher
  ↓
snapshot versionado em main
  ↓ repository_dispatch opcional
PDDE Online
```

O schedule Full 163 existe com kill-switch `PDDE_FULL_163_SCHEDULE_ENABLED` e o handoff usa `PDDE_ONLINE_DISPATCH_TOKEN`. O motor não recebe credencial do Supabase do PDDE Online.

## 5. Documentos históricos principais

- `ESTADO_ATUAL_2026-09-04.md` e anteriores;
- `HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`;
- `PRODUCTION_CHECKPOINT_2026-09-04.md` e anteriores;
- `BASELINE_*.md`;
- `docs/audits/`;
- `docs/superpowers/specs/` e `docs/superpowers/plans/` concluídos;
- `docs/history/`.

Eles preservam origem e decisões da época, mas não determinam estado corrente.

## 6. Pesquisa de fontes

Antes de repetir investigação externa, consultar:

1. `INVESTIGACAO_PRATICA_FONTES_2026-09-06.md`;
2. `FONTES_E_REGRAS.md`;
3. `CONHECIMENTO_ACUMULADO.md`;
4. histórico consolidado apenas se necessário.

## 7. Regra para planos antigos

Nenhum plano datado é executado automaticamente. Antes de agir:

- verificar se a tarefa já foi entregue;
- verificar hotfix/PR posterior;
- preservar solução mais nova;
- executar apenas a lacuna real.

## 8. Definição de continuidade salva

Uma mudança material só está documentalmente fechada quando:

- está no repositório canônico;
- o estado vigente a descreve;
- decisões/arquitetura foram atualizadas quando necessário;
- o índice aponta para o documento soberano correto;
- não depende do contexto de um chat para ser interpretada.
