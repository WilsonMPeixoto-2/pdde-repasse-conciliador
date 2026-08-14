# MONITORING institucional 2026

## Estado

**Implementado em código na branch `feat/institutional-monitoring-job`; não implantado em Supabase/Vercel.**

Este documento registra o contrato da capacidade `MONITORING`, criada depois do baseline técnico de 14/08/2026.

## Finalidade

Transformar a cadeia já validada de coleta e organização financeira em uma única capacidade do backend institucional:

```text
seleção de UEs
   ↓
PDDEInfo
   ↓
UEx / CNPJ / contas / repasses
   ↓
SIGEF Extrato público
   ↓
movimentações
   ↓
visão operacional 2026
   ↓
visão fiscal
```

O objetivo é que o futuro sistema possa solicitar uma atualização financeira sem depender de encadear scripts manualmente.

## Regra temporal

`MONITORING` opera **exclusivamente em 2026** no produto corrente.

A fonte SIGEF pode devolver linhas históricas. Elas podem ser preservadas no HTML bruto e contabilizadas como cobertura técnica, mas **somente movimentos com data em 2026 entram na visão operacional e fiscal corrente**.

Uma eventual área histórica futura deverá ser separada.

## Escopo de escolas

O comando aceita:

- ausência de filtro: carteira institucional completa;
- `schoolIneps`: subconjunto explícito da lista-mestre.

INEPs fora da lista institucional são recusados.

## Saídas

Uma execução produz três representações JSON:

1. `monitoring.json`: resultado bruto consolidado da coleta;
2. `operational.json`: reconciliação operacional;
3. `fiscal.json`: modelo humano orientado ao trabalho fiscal.

Quando `ArtifactStore`/`EvidenceEventStore` são fornecidos, os HTMLs brutos e os JSONs derivados podem ser preservados pela abstração institucional com SHA-256 e eventos `ARTIFACT_PRESERVED`.

## Cobertura parcial

Falha ou parcialidade de fonte não vira zero conclusivo.

Exemplos que tornam a execução parcial:

- escola não coletada no PDDEInfo;
- conta SIGEF com consulta parcial;
- conta SIGEF com erro;
- programa bancário ainda não reconhecido com segurança.

A visão fiscal recebe o estado de cobertura e pode apresentar `CONSULTA_DA_CONTA_INCONCLUSIVA` quando adequado.

## API institucional

Comando preparado em código:

```http
POST /api/executions/monitoring
Authorization: Bearer <token administrativo>
Idempotency-Key: <chave estável>
Content-Type: application/json
```

Corpo para carteira completa:

```json
{
  "fiscalYear": 2026
}
```

Corpo para subconjunto:

```json
{
  "fiscalYear": 2026,
  "schoolIneps": ["33069247", "33069093"]
}
```

A mesma chave de idempotência com o mesmo pedido devolve a mesma execução; reutilização conflitante da chave é rejeitada.

## Worker

`InstitutionalJobExecutor` reconhece `MONITORING` como tipo próprio e despacha a execução para `runMonitoring()`.

O worker institucional continua responsável pelo ciclo do job. Por isso o serviço recebe `manageExecutionLifecycle: false` quando chamado pelo executor, evitando duplicação de eventos de início/fim.

## Script live

`scripts/monitor-live-2026.ts` permanece como ferramenta de validação/CLI, mas **não contém mais uma segunda implementação da lógica de monitoramento**. Ele seleciona as escolas, chama `runMonitoring()` e grava o artefato solicitado.

Assim, execução manual, GitHub Actions e futuro worker usam o mesmo motor.

## Postgres/Supabase

Foi adicionada migration incremental que permite `MONITORING` em `execution_jobs` e em `enqueue_execution_job`.

Isso **não significa que exista um projeto Supabase conectado**. A migration apenas mantém o schema versionado pronto para a próxima fase.

## Próxima etapa após estabilização

Depois de validar e integrar esta capacidade, a próxima frente é:

1. criar/conectar o Supabase dedicado;
2. revisar/aplicar as migrations;
3. persistir o estado financeiro corrente em read model próprio;
4. expor leitura fiscal eficiente para o futuro frontend.
