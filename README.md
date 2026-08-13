# Plataforma PDDE — 4ª CRE

Este repositório é a **fonte canônica de implementação** do projeto de coleta, validação, conciliação e rastreabilidade financeira do PDDE para as 163 unidades da 4ª CRE/SME-Rio.

O produto distingue evidências de fontes diferentes sem transformar ausência, atraso ou indisponibilidade em conclusões financeiras indevidas.

## Estado atual

Marco atual: **v0.4.0**.

Já estão implementados e testados:

- coleta autônoma do PDDEInfo das 163 escolas por INEP;
- preservação de HTML bruto, JSON normalizado, URL, data/hora, SHA-256 e versão do parser;
- retries, timeout, lotes conservadores e isolamento de falhas por escola;
- classificação explícita da coleta como `COMPLETE` ou `PARTIAL`;
- trilha **append-only** de eventos de evidência com sequência, hash anterior e SHA-256 do evento;
- detecção de adulteração, quebra de sequência e `eventId` duplicado;
- persistência das tentativas, artefatos e encerramento das coletas PDDEInfo;
- persistência dos achados produzidos pelo motor de conciliação, sem confundi-los com a fonte observada;
- vínculo entre uma execução de conciliação e a coleta PDDEInfo que lhe deu origem;
- projeções de leitura por execução e por histórico escolar;
- CLI para inspeção da trilha com verificação prévia de integridade;
- migration Postgres/Supabase equivalente, com RLS fechado e mutação de eventos bloqueada;
- motor determinístico de conciliação;
- leitura de exportações do SIGEF Liberações e CSV de SIGEF Movimentações;
- Assistente de Liberações incremental e idempotente;
- relatório Excel auditável, sem fórmulas ocultas e com proteção contra formula injection.

## Validação real do v0.4

Em 13/08/2026, a implementação deste repositório repetiu a coleta real das 163 escolas com a trilha de evidências ativada:

- **163/163 escolas consultadas com sucesso**;
- **0 falhas**;
- **520 registros financeiros**;
- **169 registros com pagamento informado**;
- **47 casos sem conta correspondente de programa na visão consultada**;
- **0 warnings de normalização**;
- **493 eventos de evidência**;
- **493/493 eventos com cadeia SHA-256 íntegra**.

A mesma rodada concluiu testes, typecheck e build com sucesso. Os testes que acessam o portal real permanecem opt-in para que indisponibilidade externa do FNDE não seja tratada como regressão do código.

## Regra central de evidência

O projeto separa fatos que não são equivalentes:

1. pagamento informado no PDDEInfo;
2. ordem bancária/liberação registrada no SIGEF;
3. crédito localizado em movimentação bancária;
4. eventual confirmação por evidência bancária direta autorizada;
5. **achado derivado pelo nosso motor de conciliação**.

Uma fonte não sobrescreve silenciosamente outra. O `CONCILIADOR` aparece como origem própria dos achados derivados. Cobertura insuficiente produz estado inconclusivo, não uma resposta inventada.

## Verificação

```bash
npm ci
npm run check
```

`npm run check` executa testes, typecheck TypeScript e build. Integrações contra serviços externos ficam desativadas por padrão.

## Coleta autônoma do PDDEInfo

```bash
npm run pddeinfo:collect -- \
  --workspace /caminho/coleta-pddeinfo \
  --year 2026
```

A coleta preserva cada execução em:

```text
workspace/
├── evidence/
│   └── events.jsonl
└── runs/<run-id>/
    ├── raw/<INEP>.html
    ├── normalized/<INEP>.json
    ├── manifest.json
    └── pddeinfo-2026.json
```

`events.jsonl` é um log append-only com cadeia de hashes. Uma execução com qualquer escola não concluída é marcada como `PARTIAL`; seus artefatos permanecem disponíveis para diagnóstico, mas o conciliador recusa esse envelope como fonte completa.

Teste real opcional:

```bash
PDDEINFO_FULL_LIVE=1 npm test -- tests/integration/pddeinfo-full-live.test.ts
```

## Conciliação

```bash
npm run reconcile -- \
  --pdde-info /caminho/workspace/runs/<run-id>/pddeinfo-2026.json \
  --movements /caminho/extrato-bancario.csv \
  --releases-dir /caminho/coleta-liberacoes/liberacoes \
  --output /caminho/conciliacao.xlsx \
  --year 2026 \
  --requested-through 2026-08-12
```

Quando o `pddeinfo-2026.json` segue o layout acima, a conciliação encontra automaticamente `workspace/evidence/events.jsonl`, registra uma nova execução, um `FINDING_RECORDED` por repasse e o Excel final como artefato. Para outro layout, use `--evidence-store` explicitamente.

## Inspeção da trilha

Por execução:

```bash
npm run evidence:inspect -- \
  --store /caminho/workspace/evidence/events.jsonl \
  --run <run-id>
```

Por escola:

```bash
npm run evidence:inspect -- \
  --store /caminho/workspace/evidence/events.jsonl \
  --school <INEP>
```

A inspeção verifica primeiro a integridade da cadeia. A projeção por execução informa início, fim, status, origem, vínculo com coleta anterior e contagens de tentativas, artefatos, achados e revisões humanas.

## Postgres / Supabase

A migration `supabase/migrations/20260813050000_evidence_events.sql` materializa o mesmo modelo append-only em Postgres, com índices, `pgcrypto`, RLS fechado, trigger contra `UPDATE`/`DELETE` e função serializada de append.

**A migration ainda não foi aplicada a um projeto Supabase dedicado**, porque os projetos já conectados pertencem a outros sistemas. Isso evita misturar bases por conveniência nominal. A criação/vinculação do banco canônico será uma etapa própria.

## Assistente de Liberações

```bash
npm run releases:assist -- \
  --pdde-info /caminho/pddeinfo.json \
  --workspace /caminho/coleta-liberacoes \
  --year 2026
```

Detalhes: [`docs/ASSISTENTE_LIBERACOES.md`](docs/ASSISTENTE_LIBERACOES.md).

## Estrutura principal

- `backend/core/` — modelos, normalização, evidência e regras determinísticas;
- `backend/adapters/` — acesso às fontes e implementações de persistência;
- `backend/application/` — coleta, conciliação, portas de persistência e projeções de histórico;
- `backend/report/` — geração e validação dos relatórios Excel;
- `scripts/` — interfaces operacionais;
- `supabase/migrations/` — schema institucional versionado;
- `tests/` — regras, regressões e integrações opcionais.

## Documentação essencial

- [`docs/PROJETO.md`](docs/PROJETO.md)
- [`docs/DECISOES.md`](docs/DECISOES.md)
- [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/ASSISTENTE_LIBERACOES.md`](docs/ASSISTENTE_LIBERACOES.md)

A documentação é memória do projeto, não gate burocrático.

## Governança dos repositórios

Este é o **único repositório de implementação do fluxo ChatGPT/OpenAI**.

- `WilsonMPeixoto-2/extrator-pdde-4cre` — referência histórica/técnica;
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — projeto paralelo exclusivo do Manus, somente leitura para este fluxo.

Código, UX, testes e ideias úteis dessas referências podem ser incorporados aqui seletivamente. Nenhum desenvolvimento novo deste fluxo deve ser distribuído entre múltiplos repositórios.
