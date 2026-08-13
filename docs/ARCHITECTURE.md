# Arquitetura atual e direção de evolução

## Estado atual — v0.4.0

O repositório já cobre quatro responsabilidades separadas:

1. coleta autônoma e validação do PDDEInfo;
2. preservação append-only de evidências e artefatos;
3. conciliação determinística entre fontes;
4. projeções de leitura por execução e por escola.

A arquitetura continua deliberadamente determinística. IA, navegador automatizado ou agentes podem auxiliar coleta e diagnóstico, mas não decidem o resultado financeiro final.

## Fluxo atual

```text
Lista-mestre 163 escolas
        │
        ▼
PDDEInfo HTTP + parser
        │
        ├── HTML/JSON/manifest ───────────────┐
        │                                      │
        ▼                                      ▼
normalização                         trilha append-only
        │                           evidence/events.jsonl
        │                                      │
        ├─────────────┐                        │
        │             │                        │
        ▼             ▼                        │
SIGEF Liberações   SIGEF Movimentações         │
        │             │                        │
        └──────┬──────┘                        │
               ▼                               │
       conciliação determinística              │
               │                               │
               ├── FINDING_RECORDED ──────────┤
               ├── Excel + SHA-256 ───────────┤
               ▼                               ▼
          resultado                     projeções de leitura
                                   execução / histórico escolar
```

Observação de fonte e conclusão derivada permanecem separadas. Eventos gerados pelo motor usam origem `CONCILIADOR`; eles não são apresentados como se tivessem sido observados diretamente no PDDEInfo ou SIGEF.

## Modelo de evidência

`backend/core/evidence.ts` define eventos canônicos:

- `EXECUTION_STARTED`;
- `EXECUTION_FINISHED`;
- `SOURCE_ATTEMPT_RECORDED`;
- `ARTIFACT_PRESERVED`;
- `OBSERVATION_RECORDED`;
- `FINDING_RECORDED`.

Cada evento persistido possui:

- `eventId` único;
- `runId`;
- sequência monotônica;
- origem;
- exercício;
- INEP opcional;
- data/hora;
- payload tipado;
- `previousHash`;
- `eventHash` SHA-256.

### Adaptador JSONL

`backend/adapters/jsonl-evidence-store.ts` implementa o contrato imediatamente utilizável:

- append serializado mesmo com escolas processadas em paralelo;
- rejeição de `eventId` duplicado;
- verificação da cadeia antes de novos appends;
- detecção de adulteração, quebra de sequência e divergência de hash;
- leitura por execução, por escola ou integral.

O arquivo padrão é:

```text
<workspace>/evidence/events.jsonl
```

### Postgres / Supabase

`supabase/migrations/20260813050000_evidence_events.sql` materializa o mesmo princípio em Postgres:

- `pgcrypto` para SHA-256;
- índices por execução, escola e fonte/exercício;
- RLS habilitado e forçado;
- sem leitura/escrita para `anon` ou `authenticated` nesta etapa;
- `UPDATE` e `DELETE` bloqueados por trigger;
- append por função `SECURITY DEFINER` concedida apenas a `service_role`;
- `pg_advisory_xact_lock` serializa sequência e cadeia de hashes.

A migration está versionada, mas ainda **não foi aplicada a um projeto Supabase dedicado**. Os projetos já conectados pertencem a outras aplicações e não serão reutilizados por conveniência.

## Coleta PDDEInfo

Principais módulos:

1. `pddeinfo-http.ts` realiza a consulta pública por INEP com timeout/retry;
2. `pddeinfo-html.ts` interpreta e valida a identidade retornada;
3. `pddeinfo-normalizer.ts` converte a resposta em pagamentos esperados;
4. `collect-pddeinfo.ts` orquestra lotes, preserva artefatos e registra a execução;
5. `scripts/collect-pddeinfo.ts` cria automaticamente a trilha de evidências e verifica sua integridade.

Uma falha de fonte é registrada como tentativa falha da escola. Uma falha do próprio armazenamento de auditoria não é mascarada como falha da escola: a execução é interrompida.

## Conciliação

Principais módulos:

1. `sigef-release-inspector.ts` identifica metadados das exportações;
2. `load-sigef-release-exports.ts` importa manifesto ou pasta canônica;
3. `sigef-releases-html.ts` interpreta os `.xls` HTML/Windows-1252;
4. `sigef-movements-csv.ts` lê o CSV em streaming;
5. `reconciliation-pipeline.ts` valida procedência/cobertura;
6. `portfolio-reconciliation.ts` resolve candidatos sem inferência silenciosa;
7. `reconciliation.ts` produz estado e código de razão;
8. `reconcile-files.ts` gera o Excel e registra execução, achados e relatório na trilha;
9. `reconciliation-workbook.ts` gera, relê e audita o workbook.

Quando o PDDEInfo veio do layout padrão do coletor, `scripts/reconcile.ts` encontra automaticamente a mesma trilha de evidências. Uma execução do conciliador registra qual `runId` de coleta lhe serviu como origem.

## Leitura e projeções

`backend/application/evidence-history.ts` reconstrói o estado a partir dos eventos, sem criar uma segunda tabela mutável de “resumo atual”.

As projeções já disponíveis incluem:

- status, início e fim de uma execução;
- origem e exercício;
- vínculo da conciliação com a coleta anterior;
- contagem de tentativas, falhas, artefatos, achados e revisões humanas;
- linha do tempo por INEP.

`scripts/inspect-evidence.ts` expõe essas projeções por CLI e verifica a integridade da cadeia antes de apresentar resultados.

## Invariantes

- dinheiro é comparado em centavos inteiros;
- CNPJ, banco, agência, conta, INEP, código SME e OB permanecem texto;
- fonte ausente ou cobertura insuficiente nunca vira confirmação nem ausência definitiva;
- observação externa e conclusão derivada permanecem semanticamente separadas;
- eventos já persistidos não são reescritos para simular estado atual;
- conta divergente entre fontes nunca é escolhida automaticamente;
- conta ausente no PDDEInfo não é inferida de histórico ou programa diferente;
- cabeçalho, destinação ou estrutura desconhecida geram erro explícito;
- conteúdo externo capaz de virar fórmula no Excel é neutralizado;
- o workbook final é relido e validado antes de ser considerado concluído.

## Validação de escala

Em 13/08/2026, a coleta real das 163 unidades foi repetida com a persistência ligada:

- 163/163 escolas concluídas;
- 520 registros financeiros;
- 169 com pagamento informado;
- 47 sem conta correspondente de programa na visão consultada;
- 0 warnings de normalização;
- 493 eventos append-only;
- cadeia de integridade validada integralmente.

## Direção da plataforma

```text
Aplicação web operacional
        │
        ▼
API / casos de uso
        │
        ├── execução de coletas
        ├── conciliação
        ├── projeções de histórico
        └── gestão de exceções
        │
        ▼
Modelo canônico + trilha de evidências
        │
        ├── JSONL operacional/local
        └── Postgres/Supabase institucional
        │
        ▼
Fontes + motor determinístico
```

O passo seguinte é materializar o backend institucional sobre o contrato já validado, aplicar a migration em um projeto dedicado e expor as projeções por API para a futura interface web.

## Direção de UX

A aplicação deve mostrar primeiro execução, escola, resumo financeiro, exceções e ações úteis. Hashes, URLs, parser e demais metadados permanecem acessíveis numa camada secundária de rastreabilidade.

As implementações paralelas continuam sendo referência de UX, especialmente para hierarquia visual, estados semânticos, alto contraste, teclado e responsividade, sem herança automática de seus runtimes.

## Limites atuais

- obtenção autônoma do SIGEF continua limitada por CAPTCHA em rotas relevantes;
- o fluxo principal ainda é CLI;
- a migration Postgres está pronta, mas não há banco Supabase canônico criado/aplicado;
- autenticação e interface web ainda não estão integradas;
- arquivos operacionais grandes permanecem fora do Git quando não agregam valor ao histórico do código.

## Dependência transitiva

O ExcelJS 4.4.0 ainda declara `uuid ^8.3.0`. O projeto força `uuid 11.1.1`, versão corrigida para a vulnerabilidade transitiva monitorada. Geração, serialização e releitura do workbook permanecem cobertas por testes. O override deve ser removido quando uma futura versão do ExcelJS atualizar sua dependência nativa.
