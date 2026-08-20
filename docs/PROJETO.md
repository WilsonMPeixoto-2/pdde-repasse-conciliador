# Projeto PDDE — visão e evolução

## Missão

Construir uma plataforma interna para a 4ª CRE capaz de **coletar, validar, conciliar, monitorar e rastrear dados financeiros do PDDE**, preservando a distinção entre o que cada fonte realmente comprova e entregando uma experiência operacional simples, além de relatórios profissionais e auditáveis.

O caso prioritário é a carteira das **163 escolas da 4ª CRE no exercício de 2026**. Expansões de exercício, CRE ou fonte só entram quando melhorarem o produto real.

> **Estado corrente:** consulte [`ESTADO_ATUAL_2026-08-19.md`](ESTADO_ATUAL_2026-08-19.md). Baselines e planos anteriores continuam preservados como fotografias históricas e não devem ser usados isoladamente para concluir o que existe hoje.

## Fonte de verdade

- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `WilsonMPeixoto-2/extrator-pdde-4cre`: referência histórica/técnica.
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`: projeto paralelo exclusivo do Manus e somente leitura para este fluxo.

A `main` do canônico, seus testes e o estado de implantação efetivamente verificado prevalecem sobre resumos antigos.

## Evolução materializada

### 1. Extração do PDDEInfo

O projeto deixou de depender das rotinas legadas de exportação e passou a consultar diretamente as informações públicas necessárias. O experimento municipal comprovou escala e a carteira da 4ª CRE foi fixada em 163 INEPs conhecidos.

A ausência de conta ou valor na coleta corrente permanece ausência. Histórico não é promovido silenciosamente a dado de 2026.

### 2. Evidência financeira e SIGEF

A leitura financeira passou a separar:

- valor programado;
- pagamento informado pelo PDDEInfo;
- ordem/liberação quando disponível;
- crédito compatível localizado no extrato SIGEF;
- movimentação bancária;
- estorno/devolução;
- consulta inconclusiva.

A consulta pública do extrato SIGEF foi incorporada ao repositório canônico. A rodada integral de 14/08/2026 completou 163/163 escolas e 284/284 contas então mapeadas, sem converter os movimentos históricos devolvidos pela fonte em fatos correntes de 2026.

### 3. Relatórios públicos complementares do FNDE

Os relatórios públicos complementares do PDDEInfo/FNDE deixaram de ser apenas pesquisa e foram **integrados e validados** para:

- atendimento/ordens de pagamento;
- prestação de contas e suspensão informada;
- posições de saldo e aplicações por data de referência.

O backfill de 16/08/2026 normalizou 2.690 posições mensais, 461 séries conta/programa e 1.304 artefatos brutos, sem falhas de coleta. Detalhes estão em [`BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md).

### 4. Visão operacional e visão humana

O sistema mantém uma camada técnica para processamento/auditoria e uma camada humana para o produto. A experiência comum trabalha com entidades compreensíveis:

```text
4ª CRE
└── Escola
    ├── Programa / ação
    │   └── Parcela
    └── Conta
        ├── posição de saldo
        ├── aplicações
        └── movimentações
```

Hashes, parser, retry, URLs técnicas, número de páginas e payloads permanecem na camada de rastreabilidade, não na interface fiscal comum.

### 5. Monitoramento institucional

O job `MONITORING` está implementado em código e integra o pipeline financeiro completo. A infraestrutura do repositório inclui:

- API e worker;
- fila e idempotência;
- artefatos e eventos append-only;
- snapshots financeiros;
- read model fiscal/técnico;
- read model financeiro humano;
- adapters e migrations para Supabase/PostgreSQL.

**Código existente não é sinônimo de infraestrutura conectada.** Ainda não existe um projeto Supabase dedicado implantado para esta plataforma.

### 6. Produto web publicado

O frontend React/Vite está publicado no Vercel e hoje oferece:

- Home com posição financeira e consulta ao vivo;
- busca por nome, SME e INEP;
- carteira das escolas;
- visões consolidadas de Repasses e Saldos e contas;
- indicadores e subconjuntos acionáveis;
- prontuário financeiro por escola;
- navegação local para Resumo, Repasses, Contas e saldos, Movimentações e Prestação de contas;
- composição do saldo, série mensal e extrato de movimentações;
- atualização ao vivo com progresso por unidade e proteção contra retrato parcial;
- deep links compatíveis com o hosting Vercel.

A consulta ao vivo atualiza a sessão do navegador quando a carteira inteira termina de forma válida. Enquanto a persistência dedicada não for ligada, recarregar a página retorna ao retrato estável publicado.

### 7. Excel como produto complementar

O site prioriza compreensão, navegação e investigação. O Excel continua sendo a superfície adequada para filtros livres, cruzamentos e exportação analítica. Ambos derivam de contratos financeiros controlados e não competem para reproduzir exatamente a mesma experiência.

## Regras permanentes do produto

1. **2026 é o escopo operacional corrente.**
2. **Pagamento informado não comprova crédito bancário.**
3. **Ordem FNDE e crédito observado são fatos distintos.**
4. **Saldo sempre carrega data de referência.**
5. **Aplicação/resgate não prova rendimento acumulado nem posição atual por si só.**
6. **Ausência não é zero.**
7. **Cobertura parcial produz incerteza explícita.**
8. **Fontes independentes não se sobrescrevem.**
9. **Conciliação é determinística e auditável.**
10. **A escola é a unidade principal da experiência humana.**
11. **Indicador agregado deve permitir chegar aos casos que o compõem.**
12. **Complexidade técnica fica disponível para auditoria sem dominar a interface comum.**

## O que ainda falta para a implantação institucional definitiva

- criar e conectar um Supabase dedicado;
- aplicar as migrations no banco canônico;
- persistir de forma durável as consultas disparadas pelo site, seus artefatos e evidências;
- conectar de forma permanente fila/worker à experiência publicada;
- ativar o Portal da Transparência somente com credencial oficial;
- definir/publicar o PDF executivo final.

Essas pendências não invalidam o frontend ou o monitoramento já publicados; elas delimitam a diferença entre **consulta operacional em sessão** e **plataforma institucional persistente**.

## Documentos de referência

- estado corrente: [`ESTADO_ATUAL_2026-08-19.md`](ESTADO_ATUAL_2026-08-19.md);
- regras das fontes: [`FONTES_E_REGRAS.md`](FONTES_E_REGRAS.md);
- constituição visual: [`VISUAL_PRODUCT_CONSTITUTION_2026.md`](VISUAL_PRODUCT_CONSTITUTION_2026.md);
- baseline PDDEInfo + SIGEF: [`BASELINE_TECNICO_2026-08-14.md`](BASELINE_TECNICO_2026-08-14.md);
- baseline financeiro público: [`BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md);
- decisões: [`DECISOES.md`](DECISOES.md);
- conhecimento ainda não incorporado: [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).
