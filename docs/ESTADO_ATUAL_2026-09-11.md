# Estado Atual — 11/09/2026

**Repositório canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Universo operacional:** 163 unidades da 4ª CRE · exercício 2026  
**Regra de autoridade:** código, testes, workflows e produção real prevalecem sobre este snapshot documental.

## 1. Retrato financeiro publicado

Último snapshot integral validado usado como referência na integração com o PDDE Online:

- Full 163 workflow run: `34355577593`;
- artefato: `10107480089`;
- nome: `sigef-full-163-2026`;
- `publishedAt`: `2026-09-09T13:50:50.872Z`;
- cobertura: 163/163 escolas;
- publicação estática: `public/data/pdde-2026-snapshot.json` + partes gzip/base64;
- publicação somente após `COMPLETE` + 163/163 e validação do artefato da mesma run.

Uma execução posterior válida naturalmente substitui esses IDs. Nunca usar este documento para negar uma publicação mais nova observada no manifesto real.

## 2. Cadeia automática de produção do snapshot

A arquitetura vigente é:

```text
SIGEF Full 163 Validation
        ↓ success em main
publish-validated-snapshot
        ↓ valida artefato da mesma run
snapshot público versionado em main
        ↓
Vercel / manifesto público
```

A publicação preserva `workflowRunId`, `artifactId` e `artifactName` e rejeita regressão para run anterior.

## 3. Integração com PDDE Online

O PDDE Online possui receiver próprio em `main` desde a PR #134 (`83f069a1f1f0d38c3937fc76fa001bb602bf315b`).

A fronteira de confiança é:

```text
conciliador: coleta → valida → publica snapshot
                         ↓ repository_dispatch
PDDE Online: valida evento/manifesto → maturidade → Supabase
```

O conciliador **não recebe** `PDDE_SUPABASE_SERVICE_ROLE_KEY` e não chama diretamente a RPC do banco do PDDE Online.

## 4. Agendamento Full 163

O workflow `SIGEF Full 163 Validation` possui schedule diário:

- cron: `5 10 * * *`;
- equivalente nominal: 07:05 em `America/Sao_Paulo`;
- o agendamento nasce inerte;
- só executa automaticamente quando `vars.PDDE_FULL_163_SCHEDULE_ENABLED == 'true'`.

Push, pull request e `workflow_dispatch` continuam com o comportamento existente.

A execução integral observada em 09/09 levou aproximadamente 44 minutos. Qualidade/completude continua prevalecendo sobre duração.

## 5. Handoff orientado a evento

Depois de um snapshot **novo** ser efetivamente commitado em `main`, `publish-validated-snapshot.yml` tenta notificar:

`WilsonMPeixoto-2/pddeonlinesme-rj`

Evento:

`financial-snapshot-published-v1`

Payload:

- `sourceRepository`;
- `workflowRunId`;
- `artifactId`;
- `artifactName`;
- `publishedAt`.

O segredo esperado no conciliador é:

`PDDE_ONLINE_DISPATCH_TOKEN`

Esse token serve somente para o dispatch GitHub→GitHub e deve ter o menor privilégio possível no repositório PDDE Online.

### Falha do handoff

Ausência do token ou falha da API de dispatch:

- não desfaz o snapshot já validado/publicado;
- gera warning no workflow;
- não introduz credencial do Supabase neste repositório;
- deixa o fallback agendado do PDDE Online reconciliar o manifesto posteriormente.

## 6. Kill-switches independentes

### Motor

`PDDE_FULL_163_SCHEDULE_ENABLED=true`

Habilita a coleta Full 163 diária.

### PDDE Online

`PDDE_FINANCIAL_SYNC_ENABLED=true`

Habilita ingestão automática por evento/fallback no repositório de destino.

Os dois controles são independentes. A coleta pode permanecer automática sem autorizar publicação no banco do PDDE Online, e vice-versa.

## 7. Regras financeiras preservadas

- ausência não é zero;
- pagamento informado não equivale a crédito bancário;
- ordem/liberação e crédito observado são fatos distintos;
- resultado `PARTIAL` não substitui retrato válido;
- snapshot público exige `COMPLETE 163/163`;
- fonte suplementar quebrada não fabrica ausência;
- run antiga não substitui snapshot mais novo;
- dados e proveniência permanecem reproduzíveis/auditáveis.

## 8. Ativação ainda dependente de configuração externa

Código de automação e handoff pode estar integrado sem que a cadeia automática esteja operacionalmente ligada.

Para ativação completa são necessários, fora do código:

### neste repositório

- `PDDE_FULL_163_SCHEDULE_ENABLED=true`;
- `PDDE_ONLINE_DISPATCH_TOKEN` configurado de forma segura.

### no PDDE Online

- `PDDE_SUPABASE_URL`;
- `PDDE_SUPABASE_SERVICE_ROLE_KEY`;
- `PDDE_FINANCIAL_SYNC_ENABLED=true`, somente após homologação manual.

Não registrar valores de secrets na documentação, issues, PRs ou logs.

## 9. Próximo critério de fechamento operacional

Depois de configurar as credenciais/variáveis:

1. disparar Full 163 controlado;
2. confirmar `COMPLETE 163/163`;
3. confirmar publisher do snapshot;
4. confirmar `repository_dispatch` aceito pelo PDDE Online;
5. confirmar dry-run/maturidade no destino;
6. confirmar publicação ou idempotência no Supabase;
7. confirmar que repetição do mesmo artefato não duplica dados;
8. manter os crons como coleta primária + reconciliação de fallback.
