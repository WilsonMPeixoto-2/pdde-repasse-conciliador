# Operação do backend institucional v0.5

## Processos

O backend usa dois processos Node.js 22 ou superior sobre o mesmo Supabase:

1. `npm run api:start` atende consultas e enfileira comandos curtos;
2. `npm run worker:start` reclama jobs com lease, renova o lease durante o trabalho e executa coleta/conciliação fora da requisição HTTP.

Para diagnóstico ou execução controlada de um único job:

```bash
npm run worker:once
```

`SIGTERM` e `SIGINT` interrompem imediatamente uma espera ociosa. Se já houver um job reclamado, o runner deixa esse job terminar e só então encerra, preservando heartbeat e conclusão terminal. Uma falha transitória de heartbeat é tentada novamente no intervalo seguinte; a conclusão cercada no Postgres determina se o lease ainda pertence à tentativa. Se o Postgres confirmar que o lease expirou ou pertence a outra tentativa, o executor antigo recebe cancelamento cooperativo, não chama a conclusão terminal e registra `LEASE_LOST` apenas no log operacional do processo; a fila permanece responsável pela retomada. Erros de infraestrutura da fila ou da RPC de conclusão encerram o processo para supervisão externa; uma falha ao gravar `COMPLETE`/`PARTIAL` nunca é convertida em um segundo pedido `FAILED`.

A API também trata `SIGTERM`/`SIGINT`: deixa de aceitar conexões, fecha as conexões ociosas e aguarda respostas ativas por até `PDDE_API_SHUTDOWN_MS` (30 segundos por padrão) antes de encerrar as conexões remanescentes. O listener de erro usado no startup é removido assim que a porta abre; erros posteriores são propagados ao processo em vez de serem consumidos por uma promise já resolvida.

A escolha é deliberada. O repositório não contém hoje uma plataforma canônica de deploy. Além disso, os limites oficiais atuais de wall-clock das Supabase Edge Functions são de 150 segundos no plano Free e 400 segundos nos planos pagos; uma coleta conservadora das 163 escolas não deve depender dessa janela. Consulte [Supabase Edge Functions — Limits](https://supabase.com/docs/guides/functions/limits).

## Variáveis de ambiente

Use `.env.example` como referência. As obrigatórias são:

- `SUPABASE_URL`;
- `SUPABASE_SECRET_KEY` ou a chave legada `SUPABASE_SERVICE_ROLE_KEY` com role `service_role`;
- `PDDE_API_COMMAND_TOKEN` no processo da API;
- `PDDE_WORKSPACE_PATH` no runner.

`PDDE_API_SHUTDOWN_MS` é opcional e aceita de 1.000 a 120.000 milissegundos.

`PDDE_API_COMMAND_TOKEN` deve ser um segredo opaco com 32 a 512 caracteres ASCII visíveis e sem espaços. Gere um valor aleatório (por exemplo, `openssl rand -base64 32`) e injete-o apenas no processo da API; não use texto memorizável nem variável `VITE_*`.

A chave administrativa é validada no startup e nunca pertence ao bundle Vite. Chaves `sb_publishable_` e JWT com role `anon` são recusadas pelo adaptador de backend.

## Contrato HTTP

Consultas públicas:

- `GET /api/health`;
- `GET /api/meta`;
- `GET /api/schools`;
- `GET /api/schools/:inep`;
- `GET /api/schools/:inep/history`;
- `GET /api/schools/:inep/findings`;
- `GET /api/executions`;
- `GET /api/executions/:runId`;
- `GET /api/executions/:runId/artifacts`;
- `GET /api/executions/:runId/report`;
- `GET /api/findings`.

O histórico de artefatos conserva relatórios produzidos por tentativas abandonadas. O endpoint singular de relatório não assina esses objetos antigos: depois de um novo `EXECUTION_STARTED`, ele retorna `404` até a tentativa corrente preservar seu próprio `REPORT`.

Listagens aceitam no máximo 100 itens por página. `GET /api/schools/:inep/history` usa 50 por padrão, retorna eventos mais recentes primeiro, `total` e `nextCursor`; as projeções de execução correspondem aos `runId` presentes naquela página. Cursores são sequências decimais canônicas dentro da faixa segura de inteiros; `runId` em detalhe, filtro ou artefatos segue o contrato de identificadores append-only (1–160 caracteres alfanuméricos, `.`, `_`, `-`, `:`). Entradas fora desses contratos retornam `400` antes da consulta ao Postgres.

Comandos administrativos:

- `POST /api/executions/pddeinfo`;
- `POST /api/reconciliations`;
- `POST /api/artifacts/uploads`;
- `POST /api/artifacts/uploads/:uploadId/confirm`.

Todos os comandos exigem `Authorization: Bearer <PDDE_API_COMMAND_TOKEN>` e JSON. Coleta, conciliação e solicitação de upload também exigem `Idempotency-Key`. Coleta e conciliação respondem `202 Accepted` com `jobId` e `runId`; a solicitação de upload responde `201 Created`, e a confirmação idempotente responde `200 OK`.

`GET /api/health` verifica a cadeia completa, mas o processo coalesce requests concorrentes e mantém o resultado por um TTL de 10 segundos. Rate limit no ingress continua recomendado como defesa adicional, sem substituir esse limite interno.

O adaptador Node limita o corpo HTTP a 1.000.000 bytes por padrão. A contagem usa os bytes efetivamente recebidos, inclusive sem `Content-Length`; ao exceder o teto em transferência chunked, a API responde `413` imediatamente e drena o restante sem aguardar o cliente encerrar o envio. O handler Web repete a contagem durante a leitura do JSON, mantendo o mesmo limite caso o contrato seja hospedado por outro adaptador ou receba um header omitido/falsificado. O media type precisa ser exatamente `application/json` (parâmetros como `charset` são aceitos), e o servidor explicita 10 s para headers, 30 s para receber a requisição, 5 s de keep-alive e no máximo 100 headers.

Exemplo de coleta pequena:

```bash
curl -X POST http://localhost:3000/api/executions/pddeinfo \
  -H "Authorization: Bearer $PDDE_API_COMMAND_TOKEN" \
  -H "Idempotency-Key: coleta-controlada-2026-08-13" \
  -H "Content-Type: application/json" \
  --data '{"fiscalYear":2026,"schoolIneps":["33069247"],"batchSize":1,"batchDelayMs":0}'
```

## Ingestão segura de arquivos operacionais

CSV/XLS/JSON de entrada não atravessam o corpo da API. O backend emite um ticket temporário para um único path imutável; o operador envia os bytes diretamente ao bucket privado e então solicita a confirmação. A URL e o token temporários expiram em duas horas e não entram no log de evidências.

Papéis aceitos:

| `role` | Extensão | Uso |
|---|---:|---|
| `PDDEINFO_JSON` | `.json` | resultado normalizado do PDDEInfo |
| `SIGEF_MOVEMENTS_CSV` | `.csv` | exportação de Movimentações |
| `SIGEF_RELEASE_XLS` | `.xls` | exportação de Liberações |

O arquivo pode ter no máximo 50 MiB. O cliente calcula SHA-256 e tamanho antes de pedir o ticket:

O `runId` aceita de 1 a 160 caracteres alfanuméricos, ponto, sublinhado, hífen, dois-pontos. `.` e `..` isolados são recusados. Nos demais segmentos do path derivado, dois-pontos não são aceitos; o cliente nunca fornece o path diretamente.

```bash
curl -X POST http://localhost:3000/api/artifacts/uploads \
  -H "Authorization: Bearer $PDDE_API_COMMAND_TOKEN" \
  -H "Idempotency-Key: movimentos-2026-08-13" \
  -H "Content-Type: application/json" \
  --data '{
    "runId":"inputs-2026-08-13",
    "fiscalYear":2026,
    "role":"SIGEF_MOVEMENTS_CSV",
    "originalName":"movimentacoes.csv",
    "sha256":"<64 caracteres hexadecimais>",
    "bytes":12345
  }'
```

A resposta `201 Created` contém `bucket`, `path`, `mediaType`, `upload.token` e `upload.expiresAt`. Com uma chave pública/publishable do Supabase — nunca `service_role` — o envio usa o método oficial `uploadToSignedUrl`:

```ts
const { error } = await supabase.storage
  .from(ticket.bucket)
  .uploadToSignedUrl(ticket.path, ticket.upload.token, file, {
    contentType: ticket.mediaType,
  });
if (error) throw error;
```

Depois do envio:

```bash
curl -X POST \
  http://localhost:3000/api/artifacts/uploads/<uploadId>/confirm \
  -H "Authorization: Bearer $PDDE_API_COMMAND_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{"runId":"inputs-2026-08-13"}'
```

A confirmação baixa o objeto pelo backend, recalcula tamanho e SHA-256 e só então anexa `ARTIFACT_PRESERVED`. Divergência ou conflito de idempotência retorna `409`; solicitação desconhecida retorna `404`. Repetir a mesma solicitação ou confirmação não duplica eventos. O ticket autoriza somente o path derivado de `runId`, papel e chave de idempotência; `upsert` fica desativado.

Para artefatos produzidos pelo runner, encontrar o mesmo path com os mesmos bytes não basta para considerar a operação idempotente: tipo, MIME, escola e metadados também precisam coincidir com o digest de identidade já armazenado. Reclassificação semântica do mesmo objeto é tratada como conflito.

Um `runId` usado apenas para agrupar uploads permanece consultável no log e nos artefatos, mas não aparece como falsa execução `UNKNOWN`. A projeção de execuções exige ao menos um evento de solicitação, início ou término da execução.

Uma conciliação só é aceita depois que **todas** as referências informadas encontram eventos `ARTIFACT_PRESERVED` exatos: mesmo bucket, path, SHA-256, exercício, origem e papel/tipo. O papel é obrigatório; ausência de `metadata.role` não equivale a compatibilidade. Referência ainda não confirmada, hash divergente ou arquivo preservado para outro papel retorna `409` sem criar job. O corpo público não aceita `sourceCollectionRunId`; o backend vincula a conciliação a uma coleta somente quando o JSON PDDEInfo pertence a um ciclo encerrado como `COMPLETE`. JSON recebido por lote sem ciclo pode ser usado, mas permanece corretamente sem vínculo de coleta. Ciclo conhecido ainda em andamento, `PARTIAL` ou `FAILED` precisa ser resolvido antes da conciliação.

Ao executar uma conciliação, o runner não confia no nome original de uma Liberação. Ele inspeciona CNPJ, programa e exercício dentro de cada XLS e materializa a pasta transitória no padrão canônico `CNPJ__PROGRAMA.xls`; dois uploads do mesmo par são rejeitados antes do cálculo financeiro.

## Persistência e recuperação

- `evidence_events` é append-only e permanece a fonte de verdade;
- `execution_jobs` é transporte operacional com idempotência, tentativas, owner e lease;
- claim e conclusão registram `EXECUTION_STARTED`/`EXECUTION_FINISHED` na mesma transação do job;
- heartbeat e conclusão exigem o número da tentativa reclamada, impedindo um processo antigo de atuar sobre um lease novo mesmo com `workerId` reutilizado;
- perda de lease confirmada pelo SQLSTATE `PDE01` aborta HTTP, esperas e pipelines cooperativos antes de iniciar novos eventos; uma operação externa já em voo pode terminar e falha de transporte isolada não dispara cancelamento;
- um lease expirado pode ser reclamado até `max_attempts`;
- ao esgotar tentativas, o próximo ciclo fecha o job como `FAILED` e registra o evento terminal;
- cada tentativa usa diretório próprio, evitando colisão de arquivos após crash;
- artefatos usam paths imutáveis `runs/<runId>/...` exclusivamente no bucket privado `pdde-evidence`; referências a outro bucket são recusadas já no comando e novamente no adaptador;
- uploads produzidos pelo runner e pela ingestão assinada usam `upsert: false`; confirmações só são aceitas quando tamanho e SHA-256 coincidem com a solicitação auditada.

O cliente PDDEInfo lê a resposta em streaming e interrompe definitivamente a tentativa acima de 10 MB. Esse teto fica abaixo do limite de 50 MB do bucket e impede que uma resposta anômala seja materializada ou repetida sem controle.

## Migrações e teste live

Aplicar, na ordem:

1. `20260813050000_evidence_events.sql`;
2. `20260813064845_institutional_backend.sql`.

Depois, com credencial administrativa disponível apenas no ambiente do teste:

```bash
SUPABASE_INSTITUTIONAL_LIVE=1 npm test -- \
  tests/integration/supabase-institutional-live.test.ts
```

O teste opt-in valida Storage, download e upload assinados, confirmação íntegra, enqueue/claim/renew/complete e `verify_evidence_chain()` no Postgres real. Ele nunca roda no CI padrão.

## Estado do provisionamento em 13/08/2026

A criação do projeto dedicado `pdde-repasse-conciliador` em `sa-east-1` foi solicitada com custo informado de US$ 0/mês. O Supabase recusou a operação porque o proprietário já atingiu o limite de dois projetos gratuitos ativos. Nenhum banco de RADAR PDDE, CTRH ou PDDE Online foi reutilizado ou alterado.

Para concluir a validação cloud é necessário liberar uma vaga de projeto na organização ou atualizar o plano e então criar o projeto dedicado. Pausar outro sistema exige decisão humana específica.
