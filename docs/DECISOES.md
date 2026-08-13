# Decisões consolidadas

Este arquivo registra somente decisões que seriam caras de rediscutir ou reconstruir. Ele não é um changelog e não precisa ser atualizado a cada alteração de código.

## 2026-08-13 — Conciliação só referencia artefato institucional comprovado

**Decisão:** antes de enfileirar uma conciliação, o backend exige um `ARTIFACT_PRESERVED` exato para cada referência recebida. Devem coincidir proprietário do path, bucket, path, SHA-256, exercício, origem e papel/tipo do arquivo. O cliente não pode enviar `sourceCollectionRunId`: esse vínculo é acrescentado internamente apenas quando o JSON PDDEInfo pertence a uma execução cujo último evento de ciclo é `EXECUTION_FINISHED/COMPLETE`. Um JSON confirmado por upload, mas sem ciclo de coleta, pode ser usado sem fabricar esse vínculo; ciclos conhecidos `RUNNING`, `PARTIAL` ou `FAILED` são recusados.

**Motivo:** uma referência bem formada não prova que o objeto foi recebido, conferido ou produzido pela execução alegada. Extrair o `runId` do texto do path também confundiria lote de entrada com coleta concluída. A trilha append-only deve governar a procedência, não dados derivados do pedido do cliente.

## 2026-08-13 — Arquivos operacionais entram por upload direto assinado

**Decisão:** JSON/CSV/XLS administrativos não atravessam o corpo da API. O backend autentica a operação, deriva um path imutável, emite um ticket de upload temporário com `upsert` desativado e registra a solicitação sem guardar URL ou token. Depois do envio direto ao bucket privado, uma confirmação protegida recalcula tamanho e SHA-256 antes de anexar `ARTIFACT_PRESERVED`.

**Motivo:** limitar memória e duração da API, permitir arquivos maiores e manter `service_role` exclusivamente no backend sem perder idempotência, proveniência ou verificação do conteúdo recebido.

## 2026-08-13 — Supabase dedicado, nunca compartilhado por conveniência

**Decisão:** o backend institucional usará um projeto Supabase exclusivo chamado de forma inequívoca. RADAR PDDE, CTRH, PDDE Online e outros bancos existentes não serão reutilizados. Enquanto o limite da organização impedir a criação, a validação cloud permanece explicitamente bloqueada; não se pausa outro sistema sem autorização própria.

**Motivo:** evitar acoplamento operacional, mistura de migrações e risco de afetar dados ou disponibilidade de aplicações independentes.

## 2026-08-13 — Requisição curta e runner durável são processos separados

**Decisão:** endpoints de comando apenas validam, aplicam idempotência, persistem o pedido e retornam `202 + runId`. Coleta PDDEInfo e conciliação rodam em worker Node 22 com fila Postgres, lease renovável e tentativas. Claim e conclusão do job registram os eventos de ciclo de vida na mesma transação.

**Motivo:** a coleta conservadora das 163 escolas não cabe com segurança em runtimes HTTP curtos. A separação também permite polling, recuperação de crash e evita duplicação acidental.

## 2026-08-13 — Chave administrativa fica exclusivamente no backend

**Decisão:** `service_role`/`sb_secret_` só existe em API e runner confiáveis. O cliente web acessa contratos HTTP; comandos exigem token administrativo próprio. Dados podem ser públicos sem tornar operações de escrita públicas.

**Motivo:** RLS e bucket privado perdem valor se a credencial que ignora políticas for entregue ao navegador.

## 2026-08-13 — Evidência operacional é append-only

**Decisão:** coletas, artefatos, observações e achados relevantes entram em uma trilha de eventos append-only. Eventos já persistidos não são atualizados nem apagados para representar “estado atual”; projeções de leitura reconstroem execução e histórico escolar a partir da sequência registrada.

Cada evento possui sequência, `previousHash` e SHA-256 próprio. A implementação local usa JSONL com verificação de integridade e o schema Postgres/Supabase adota o mesmo princípio, com escrita serializada e bloqueio de `UPDATE`/`DELETE`/`TRUNCATE`.

Observações de fontes externas mantêm a origem da própria fonte. Conclusões derivadas pelo motor são registradas separadamente com origem `CONCILIADOR` e podem apontar para a coleta que as fundamentou.

**Motivo:** preservar a história, evitar sobrescrita silenciosa de evidência e permitir auditoria/reconstrução de resultados sem confundir fato observado com conclusão derivada.

## 2026-08-12 — Um único repositório de implementação

**Decisão:** `WilsonMPeixoto-2/pdde-repasse-conciliador` é o repositório canônico do fluxo ChatGPT/OpenAI.

`extrator-pdde-4cre` passa a ser referência histórica/técnica. `EXTRATOR-PDDE-MANUS` é projeto paralelo exclusivo do Manus e somente leitura para este fluxo.

**Motivo:** impedir desenvolvimento distribuído, sobrescrita entre ferramentas e dúvida futura sobre a fonte de verdade.

## 2026-08-12 — Documentação mínima e não bloqueante

**Decisão:** documentação serve para preservar decisões, regras e conhecimento caro de reconstruir. Não será gate de CI e não precisa acompanhar cada commit, refatoração ou ajuste visual.

**Motivo:** evitar que manutenção documental vire atividade principal ou trava burocrática do desenvolvimento.

## 2026-08-12 — PDDEInfo por INEP como estratégia primária

**Decisão:** priorizar consulta direta e determinística do PDDEInfo por INEP para a carteira fixa da 4ª CRE, em vez de depender das exportações legadas do portal.

**Motivo:** a coleta direta já foi comprovada em escala municipal e no recorte das 163 unidades.

## 2026-08-12 — Não inferir dado corrente ausente

**Decisão:** ausência na fonte corrente não é zero e não autoriza preencher automaticamente conta, valor ou estado com referência histórica ou dado de outro programa.

**Motivo:** as 47 contas PDDE Básico não apresentadas em 2026 demonstraram que referências históricas podem ser múltiplas e ambíguas.

## 2026-08-12 — Fontes permanecem independentes

**Decisão:** PDDEInfo, SIGEF e demais fontes não sobrescrevem silenciosamente umas às outras. Divergências devem permanecer visíveis.

**Motivo:** cada sistema observa fatos diferentes e possui cobertura temporal própria.

## 2026-08-12 — Pagamento, OB e crédito são fatos distintos

**Decisão:** `Valor Pago` no PDDEInfo não significa automaticamente crédito bancário. Ordem bancária, crédito localizado e confirmação bancária são estados de evidência diferentes.

**Motivo:** evitar afirmação financeira mais forte do que a fonte realmente comprova.

## 2026-08-12 — Cobertura insuficiente produz estado inconclusivo

**Decisão:** indisponibilidade, CAPTCHA, arquivo ausente ou cobertura temporal insuficiente nunca são convertidos em “não pago” nem em “confirmado”.

**Motivo:** a primeira execução real parcial do conciliador demonstrou corretamente que 520 linhas deveriam permanecer inconclusivas sem Liberações.

## 2026-08-12 — CAPTCHA não será contornado

**Decisão:** CAPTCHA, autenticação ou restrição externa são estados operacionais explícitos. O projeto não implementará bypass.

**Motivo:** autonomia deve respeitar os limites técnicos e de acesso da fonte.

## 2026-08-12 — Regra financeira final é determinística

**Decisão:** IA, agentes e navegadores podem auxiliar coleta, diagnóstico de mudanças e UX. Conciliação e conclusão financeira permanecem baseadas em regras testáveis.

**Motivo:** previsibilidade, reprodutibilidade e auditabilidade.

## 2026-08-12 — Dinheiro em centavos inteiros

**Decisão:** cálculos monetários críticos usam inteiros em centavos, evitando dependência de ponto flutuante. Valores individuais e totais agregados precisam permanecer dentro da faixa de inteiros exatos do JavaScript; somas que excedam essa faixa falham explicitamente.

**Motivo:** reduzir erros de arredondamento e facilitar comparação exata.

## 2026-08-12 — Evidência forte exige chave forte

**Decisão:** valor parecido não basta para ligar pagamento, OB e crédito. A conciliação considera, conforme disponibilidade, CNPJ, exercício, programa, ação, parcela, valor, data, documento/OB e conta. Documento presente e divergente não pode ser descartado em favor de fallback por data; esse fallback só é permitido quando o movimento não informa documento.

**Motivo:** créditos fracionados, múltiplas ordens, aplicações, estornos e outros lançamentos tornam correspondência por valor isolado insegura.

## 2026-08-12 — Preservar evidência bruta quando ela agrega valor

**Decisão:** artefatos relevantes podem ser preservados com data/hora, origem e SHA-256, especialmente quando sustentam uma conclusão financeira ou permitem reproduzir parsing.

**Motivo:** permitir auditoria sem transformar todo arquivo transitório em patrimônio eterno do repositório Git.

## 2026-08-12 — Interface deve priorizar operação, não arqueologia técnica

**Decisão:** a aplicação web deve mostrar primeiro execução, escola, resumo financeiro, exceções e ações úteis. Hashes, URLs, parser, evidências e metadados ficam disponíveis em camada secundária sob demanda.

**Motivo:** experimentos paralelos mostraram melhor usabilidade quando a complexidade técnica permaneceu acessível sem dominar a tela.

## 2026-08-12 — Reaproveitar por componente, não por repositório

**Decisão:** soluções dos protótipos paralelos serão incorporadas seletivamente ao canônico. Não haverá migração cega de uma pilha inteira.

**Motivo:** cada linha possui pontos fortes distintos e também dependências/runtime que não queremos herdar automaticamente.
