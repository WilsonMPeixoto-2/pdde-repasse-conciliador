# Arquitetura atual e direção de evolução

## Estado atual — v0.5.0 / baseline 14/08/2026

O repositório possui hoje **duas camadas maduras que ainda precisam ser unidas institucionalmente**:

1. o motor financeiro atual, já capaz de coletar PDDEInfo + SIGEF, produzir visão operacional/fiscal e Excel v3;
2. a infraestrutura institucional em código, com API, fila, worker, evidências, Storage e migrations Supabase/Postgres.

Além delas, permanecem no repositório arquivos de frontend/runtime de uma geração anterior do extrator. Esse legado **não representa uma aplicação atualmente publicada**.

A arquitetura continua deliberadamente determinística. IA, navegador automatizado ou agentes podem auxiliar pesquisa, diagnóstico e adaptação de estrutura, mas não decidem o resultado financeiro final.

## Fluxo financeiro atualmente comprovado

```text
Lista-mestre 163 escolas
        │
        ▼
PDDEInfo HTTP por INEP
        │
        ├── identidade da escola / UEx / CNPJ
        ├── contas atuais por programa
        ├── repasses / ações / parcelas
        └── HTML bruto preservável
        │
        ▼
Contas mapeadas
        │
        ▼
SIGEF Extrato público direto
        │
        ├── valida identidade bancária retornada
        ├── coleta páginas / cobertura
        ├── histórico e documento
        ├── crédito / débito
        └── contraparte quando disponível
        │
        ▼
Monitor bruto
        │
        ├── histórico recebido da fonte
        └── filtro operacional para 2026
        │
        ▼
Visão operacional 2026
        │
        ├── repasses e estados de associação
        ├── movimentos normalizados
        └── registros candidatos à conferência
        │
        ▼
Visão fiscal humana
        │
        ├── escola → programa/ação → parcela
        ├── escola → conta → extrato cronológico
        └── linguagem neutra de evidência
        │
        ├── JSON fiscal
        └── Excel Fiscal v3
```

Em 14/08/2026 esse fluxo foi validado na carteira integral:

- 163/163 escolas PDDEInfo;
- 284/284 contas SIGEF completas;
- 394 movimentos pertencentes a 2026;
- 520 registros de repasse/parcela;
- 0 contas parciais/falhas na rodada.

Detalhes: [`BASELINE_TECNICO_2026-08-14.md`](BASELINE_TECNICO_2026-08-14.md).

## Coleta PDDEInfo

Principais módulos:

1. `backend/adapters/pddeinfo-http.ts` — consulta pública e política HTTP;
2. `backend/adapters/pddeinfo-html.ts` — interpretação/identidade;
3. `backend/adapters/pddeinfo-normalizer.ts` — pagamentos, ações, parcelas e contas;
4. `backend/application/collect-pddeinfo.ts` — orquestração da coleta institucional existente;
5. scripts de monitoramento — reutilizam a mesma fonte no fluxo financeiro atual.

Invariantes:

- identidade devolvida precisa corresponder ao INEP/SME consultado;
- conta parcial é erro, não dado aceitável;
- mais de uma conta corrente candidata para o mesmo programa não é escolhida arbitrariamente;
- destinação financeira relevante desconhecida gera erro explícito;
- valores são validados em centavos inteiros;
- conta corrente ausente não é preenchida com histórico ou outro programa.

## SIGEF Extrato público direto

O adaptador atual é `backend/adapters/sigef-public-statement.ts`.

A rota é construída com:

- banco;
- agência;
- conta;
- CNPJ da UEx;
- código de programa;
- período.

O adaptador:

- valida a identidade da página retornada;
- preserva conta alfanumérica e dígito `X`;
- trata encoding legado;
- possui timeout/controle de falha;
- observa paginação/cobertura;
- produz movimentos com operação, valor, data, documento, histórico e contraparte;
- classifica tecnicamente alguns históricos sem substituir o texto original;
- mantém resultado `COMPLETE`, `PARTIAL` ou `ERROR`.

Códigos efetivamente usados na rodada integral de 14/08/2026:

- `02` — PDDE Básico;
- `0B` — PDDE Qualidade;
- `0A` — PDDE Equidade.

O normalizador também conhece `Z9` para Educação Integral. Novos códigos devem ser comprovados pela fonte, não deduzidos por nome.

## Regra temporal

O monitor bruto pode receber movimentos históricos porque a própria fonte SIGEF pode devolvê-los. Isso não altera o contrato do produto:

> **a visão operacional corrente é 2026.**

Portanto:

- movimentos anteriores podem ser preservados no bruto/evidência;
- a visão operacional/fiscal deve filtrar o exercício;
- histórico não preenche lacunas de 2026;
- uma futura visualização histórica deverá ser separada.

Essa regra deverá ser reforçada quando `MONITORING` virar job institucional.

## Visão operacional

`backend/application/build-monitoring-operational-view.ts` transforma o monitor bruto em duas coleções principais:

### Repasses

Cada registro conserva:

- escola;
- programa;
- ação;
- parcela;
- valor programado;
- pagamento informado;
- data PDDEInfo;
- conta correspondente, quando exibida;
- associação bancária, quando possível.

Estados técnicos atuais incluem:

- `PROGRAMADO_NAO_PAGO`;
- `CREDITO_CONFIRMADO`;
- `PAGO_SEM_CONTA_ATUAL`;
- `PAGO_CREDITO_NAO_LOCALIZADO`;
- `CREDITO_AMBIGUO`;
- `CONSULTA_INCONCLUSIVA`.

Esses nomes são internos. A camada humana deve usar linguagem proporcional à prova, como **“Crédito compatível localizado no extrato SIGEF”**.

### Movimentações

As categorias auxiliares atuais incluem:

- `REPASSE_FNDE`;
- `APLICACAO_FINANCEIRA`;
- `RESGATE_APLICACAO`;
- `PAGAMENTO_TRANSFERENCIA`;
- `PAGAMENTO_CARTAO`;
- `RENDIMENTO_FINANCEIRO`;
- `ENTRADA_TERCEIRO`;
- `TARIFA_BANCARIA`;
- `ESTORNO_REVERSAO`;
- `MOVIMENTO_NAO_CLASSIFICADO`.

Categoria auxiliar nunca substitui `history` e `document` originais.

## Visão fiscal humana

`backend/application/build-fiscal-human-view.ts` organiza a informação para leitura humana.

Contrato principal:

```text
Escola
├── Repasses
│   └── Programa/Ação
│       └── Parcela
└── Extratos
    └── Conta/Programa
        └── Movimentações cronológicas
```

A apresentação:

- separa valor programado, pagamento informado e crédito SIGEF;
- mantém parcela explícita (`1ª Parcela`, `2ª Parcela`, `P1`, `P2` ou sem divisão);
- usa linguagem temporal neutra quando o PDDEInfo ainda não informou pagamento;
- não converte movimento bancário em julgamento de regularidade;
- deixa evidência técnica disponível em nível mais profundo.

## Excel Fiscal v3

`scripts/export-fiscal-workbook.ts` produz nove abas:

1. `Visão Geral`;
2. `Unidades`;
3. `Repasses por Escola`;
4. `Extratos por Escola`;
5. `Registros para Conferência`;
6. `BASE - Repasses`;
7. `BASE - Movimentos`;
8. `BASE - Contas`;
9. `Legenda e Fontes`.

O Excel é uma camada de produto complementar, não apenas serialização do frontend.

## Modelo de evidência

`backend/core/evidence.ts` define eventos canônicos:

- `EXECUTION_REQUESTED`;
- `EXECUTION_STARTED`;
- `EXECUTION_FINISHED`;
- `SOURCE_ATTEMPT_RECORDED`;
- `ARTIFACT_PRESERVED`;
- `OBSERVATION_RECORDED`;
- `FINDING_RECORDED`.

Cada evento persistido possui, conforme o contrato:

- `eventId`;
- `runId`;
- origem;
- exercício;
- INEP opcional;
- data/hora;
- payload;
- sequência;
- `previousHash`;
- `eventHash` SHA-256.

Observações de fonte e achados do `CONCILIADOR` permanecem semanticamente separados.

## Backend institucional em código

A segunda camada da arquitetura já possui:

- `backend/application/execution-command-service.ts`;
- `backend/application/execution-worker.ts`;
- fila `execution_jobs`;
- API institucional em `backend/api/`;
- adaptadores Supabase;
- Storage privado de artefatos;
- idempotência;
- read models de execução/achados/artefatos/histórico escolar.

A migration `20260813064845_institutional_backend.sql` materializa `execution_jobs`, views de leitura e funções de enqueue/claim/complete/recovery.

A migration `20260813235000_single_pending_execution.sql` impõe uma única execução `QUEUED`/`RUNNING` por vez.

### Limitação arquitetural atual

Os jobs institucionais ainda contemplam principalmente:

- `PDDEINFO`;
- `RECONCILIATION`.

Enquanto isso, o melhor fluxo financeiro completo existe em scripts/workflows.

Essa é a lacuna que o próximo corte resolve.

## Arquitetura alvo imediata

```text
Frontend fiscal futuro
        │
        ▼
API fiscal/read models
        │
        ▼
Supabase dedicado
        │
        ├── estado financeiro corrente
        ├── execution_jobs
        ├── evidence_events
        └── Storage de artefatos
        │
        ▼
Worker institucional
        │
        ▼
MONITORING 2026
        │
        ├── PDDEInfo
        ├── SIGEF Extrato
        ├── visão operacional
        ├── visão fiscal
        └── Excel/JSON/evidências
```

O frontend não deve reconstruir o domínio a partir de `evidence_events`. A trilha append-only atende auditoria/histórico; o produto necessita de um **read model financeiro corrente** adequado a carteira e prontuário.

## Postgres / Supabase

As migrations estão versionadas e testadas, mas ainda **não foram aplicadas a um projeto Supabase dedicado**.

Não existe banco institucional desta plataforma em produção em 14/08/2026.

A implantação futura deve revisar as migrations contra o modelo financeiro corrente antes de aplicá-las, em vez de assumir que todo schema preparado durante a evolução deve ser publicado sem reavaliação.

## Frontend e runtime legado

Arquivos como:

- `index.html`;
- `src/main.ts`;
- `backend/index.ts`;
- `SOURCE_MANIFEST.json`;

representam a geração AppDeploy/extrator V2.

Eles continuam úteis como referência histórica e podem conter soluções reaproveitáveis, mas **não constituem o site atual**, pois não há site institucional publicado.

O frontend fiscal novo será construído depois que o backend possuir `MONITORING`, persistência corrente e API adequada.

## Invariantes

- exercício operacional atual: 2026;
- dinheiro é comparado em centavos inteiros;
- CNPJ, banco, agência, conta, INEP, código SME e documento permanecem texto;
- fonte ausente ou cobertura insuficiente nunca vira confirmação nem ausência definitiva;
- observação externa e conclusão derivada permanecem separadas;
- conta divergente entre fontes nunca é escolhida automaticamente;
- conta ausente no PDDEInfo não é inferida de histórico ou programa diferente;
- cabeçalho, destinação ou estrutura desconhecida geram erro explícito;
- histórico SIGEF bruto é preservado mesmo quando existe classificação auxiliar;
- conteúdo externo capaz de virar fórmula no Excel é neutralizado;
- aplicações/resgates não são convertidos em posição atual de investimento;
- CAPTCHA/login/restrição não serão contornados.

## Próxima ordem técnica

1. consolidar documentação/baseline;
2. promover o monitoramento a `MONITORING` institucional;
3. criar/conectar Supabase dedicado + read model financeiro;
4. expor API fiscal;
5. construir/publicar frontend novo;
6. integrar novas fontes somente depois que agregarem evidência real ao produto.

Conhecimentos e oportunidades ainda não materializados estão registrados em [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).