# HANDOFF COMPLETO - PROJETO EXTRAÇÃO PDDE INFO
## Continuidade para novo chat no modo Work

**Data de referência:** 13/08/2026  
**Repositório canônico:** `https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Versão consolidada:** `v0.4.0`  
**Main de referência:** `df80e4a8d92e821dd9a5d4fc37c8ed1ae604a01e`  
**Próxima missão:** construir o backend institucional (v0.5), sobre o núcleo já validado.

> Este documento foi preparado para permitir que um novo chat no modo Work assuma o projeto sem depender da memória do chat anterior. A fonte final de verdade continua sendo o código executável, os testes e as execuções reais validadas no repositório canônico. Se este handoff divergir do código atual, o Work deve investigar a diferença e privilegiar o comportamento comprovado pelo código/testes, não reproduzir cegamente texto documental.

---

# 1. Missão do produto

Construir uma plataforma interna da 4ª CRE/SME-Rio capaz de **coletar, validar, conciliar e rastrear dados financeiros do PDDE**, preservando evidências, distinguindo níveis de confirmação e produzindo uma experiência web operacional e relatórios Excel profissionais e auditáveis.

O campo de prova é deliberadamente restrito a:

- **4ª CRE / SME-Rio**;
- **163 escolas/unidades**;
- **exercício 2026**.

Não ampliar para todas as CREs, vários exercícios ou uma plataforma genérica antes de o fluxo das 163 escolas funcionar de ponta a ponta. Generalização futura é desejável; expansão precoce não é.

A pergunta central do produto não é apenas “qual é o valor?”, mas:

> **Qual fonte observou este fato, qual o nível de comprovação, até quando a fonte cobre, e qual conclusão o motor pode emitir sem inventar certeza?**

---

# 2. Governança dos repositórios - decisão definitiva

## 2.1 Repositório canônico e único para desenvolvimento ChatGPT/OpenAI

`WilsonMPeixoto-2/pdde-repasse-conciliador`  
https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador

É a **única fonte de verdade de implementação** para este fluxo. Toda funcionalidade nova consolidada deve existir aqui.

Regra operacional:

> Se uma funcionalidade não está em `pdde-repasse-conciliador`, ela não faz parte oficialmente da implementação consolidada deste fluxo.

## 2.2 Referência histórica ChatGPT - somente leitura voluntária

`WilsonMPeixoto-2/extrator-pdde-4cre`  
https://github.com/WilsonMPeixoto-2/extrator-pdde-4cre

Pode ser lido, comparado e usado como fonte de soluções comprovadas. Não deve receber novo desenvolvimento deste fluxo. Portar **componentes/ideias específicas** para o canônico, nunca retomar desenvolvimento paralelo.

## 2.3 Projeto paralelo Manus - SOMENTE LEITURA ABSOLUTA

`WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`  
https://github.com/WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS

É projeto exclusivo do Manus. O Work pode ler e analisar, inclusive layout, testes e arquitetura, e pode adaptar boas ideias **para o canônico**. Não escrever absolutamente nada nesse repositório: sem branch, commit, PR, arquivo, workflow, configuração ou migration.

## 2.4 Não criar um quarto repositório

Já foi deliberado e rejeitado. Um novo repositório só criaria outra linhagem, histórico e fonte de confusão.

---

# 3. Hierarquia de verdade e política documental

A hierarquia acordada é:

1. **código executável**;
2. **testes automatizados**;
3. **execuções reais validadas e seus artefatos**;
4. documentação técnica;
5. histórico de chats.

Documentação é memória, não gate burocrático.

Regras:

- alteração comum de código **não exige** documentação por padrão;
- documentação **não** é gate de CI;
- testes testam o produto, não o texto dos documentos;
- fatos importantes devem ter um lar principal, evitando duplicação eterna;
- atualizar documentação em marcos relevantes, não em todo commit;
- não interromper implementação funcional só porque algum texto secundário ficou desatualizado;
- evitar floresta de ADRs, roadmaps e YAMLs de estado sem necessidade;
- `docs/DECISOES.md` é o registro enxuto de decisões que não devem ser rediscutidas a cada sessão.

Meta informal de foco: aproximadamente 85-90% desenvolvimento, pesquisa aplicada, testes e validação real; 10-15% preservação de conhecimento.

---

# 4. Estado consolidado atual - v0.4.0

A `main` de referência é:

`df80e4a8d92e821dd9a5d4fc37c8ed1ae604a01e`

Commit: `feat: persistência e trilha de evidências v0.4.0`

O núcleo atual já implementa e testa:

- coleta autônoma do PDDEInfo das 163 escolas por INEP;
- cliente HTTP determinístico, timeout, retry e lotes conservadores;
- parser e validação de identidade da escola retornada;
- preservação de HTML bruto/bytes, JSON, URL, data/hora e SHA-256;
- normalização de dados financeiros;
- classificação da coleta como `COMPLETE` ou `PARTIAL`;
- bloqueio do conciliador quando a coleta se declara `PARTIAL`;
- motor determinístico de conciliação;
- leitor do SIGEF Liberações (`.xls` que fisicamente contém HTML/Windows-1252);
- leitor em streaming do CSV nacional de SIGEF Movimentações;
- Assistente de Liberações incremental e idempotente;
- relatório Excel auditável, relido e validado antes de ser aceito;
- trilha append-only de evidências com cadeia SHA-256;
- persistência de tentativas, artefatos, encerramentos e achados de conciliação;
- separação entre observação da fonte e conclusão derivada do motor (`CONCILIADOR`);
- projeção de execução e histórico por escola;
- CLI `evidence:inspect`;
- migration Postgres/Supabase versionada para evidências, mas ainda não aplicada a um Supabase dedicado.

Comandos principais:

```bash
npm ci
npm run check
npm run pddeinfo:collect -- --workspace <pasta> --year 2026
npm run releases:assist -- --pdde-info <json> --workspace <pasta> --year 2026
npm run reconcile -- --pdde-info <json> --movements <csv> --releases-dir <pasta> --output <xlsx> --year 2026 --requested-through <data>
npm run evidence:inspect -- --store <events.jsonl> --run <run-id>
npm run evidence:inspect -- --store <events.jsonl> --school <INEP>
```

---

# 5. Marcos e provas já obtidas

## 5.1 Extração municipal inicial

Uma etapa anterior comprovou que a estratégia de leitura direta do HTML do PDDEInfo escala além da 4ª CRE:

- 156 páginas processadas;
- 1.559 unidades únicas;
- 3.027 registros de contas bancárias;
- 4.987 registros financeiros;
- paginação integral verificada;
- 4.987/4.987 registros financeiros reconciliados internamente sem divergência de estrutura.

Esse resultado provou que não era necessário depender da exportação quebrada/legada do portal.

## 5.2 Carteira fixa das 163 escolas

Fluxo consolidado:

```text
163 INEPs conhecidos
        ↓
consulta individual do PDDEInfo por INEP
        ↓
validação da identidade retornada
        ↓
preservação do artefato bruto
        ↓
parser + normalização
        ↓
JSON canônico / evidências
```

Na visão financeira validada de 2026:

- 116 unidades exibiam conta PDDE Básico corrente;
- 47 não exibiam conta corrente de programa na visão consultada;
- as 47 foram reconsultadas individualmente;
- ausência foi preservada, **não preenchida por histórico**.

Regra definitiva: **ausência não é zero e não autoriza promover dado histórico a dado corrente**.

## 5.3 Primeira conciliação real parcial

Rodada anterior do núcleo:

- 163 escolas;
- 520 registros financeiros;
- 169 registros com pagamento informado no PDDEInfo;
- 478.855 movimentos SIGEF lidos;
- 167 movimentos-alvo;
- cobertura observada de Movimentações até 29/05/2026;
- 520 resultados `CONSULTA_INCONCLUSIVA` porque a evidência de Liberações não estava disponível.

Isso foi considerado **comportamento correto**, não fracasso: sem cobertura suficiente, o motor não inventa confirmação nem ausência.

## 5.4 Validação real do v0.3

A implementação canônica realizou a coleta autônoma real das 163 escolas:

- 163/163 concluídas;
- 0 falhas;
- 520 registros financeiros;
- 169 com pagamento informado;
- 47 casos sem conta correspondente de programa;
- 0 warnings de normalização.

## 5.5 Validação real do v0.4

Em 13/08/2026, a coleta completa foi repetida com a nova persistência append-only ativada:

- **163/163 escolas concluídas**;
- **0 falhas**;
- **520 registros financeiros**;
- **169 registros com pagamento informado**;
- **47 casos sem conta correspondente de programa**;
- **0 warnings de normalização**;
- **493 eventos de evidência**;
- **493/493 eventos com cadeia SHA-256 íntegra**;
- testes, typecheck e build concluídos com sucesso.

O teste externo de 163 escolas permanece **opt-in**, para que instabilidade do FNDE não derrube o CI padrão.

---

# 6. Semântica financeira - NÃO simplificar

Os conceitos abaixo não são sinônimos e nunca devem ser colapsados pela API ou pela UI:

1. **Pagamento informado no PDDEInfo**: registro de pagamento/ordem conforme o PDDEInfo. Não prova crédito bancário.
2. **Ordem bancária/liberação corroborada no SIGEF**: confirma OB/data/valor/conta destinatária quando disponível. Ainda não prova crédito bancário dentro da cobertura de Movimentações.
3. **Crédito localizado**: movimento bancário compatível, associado por chave suficientemente forte.
4. **Crédito confirmado por evidência bancária direta autorizada**: nível separado e mais forte quando houver extrato/evidência adequada.
5. **Estorno/devolução**: deve alterar a interpretação do crédito inicial.
6. **Achado derivado pelo `CONCILIADOR`**: conclusão do nosso motor, nunca deve ser apresentado como se fosse observação direta do FNDE/SIGEF.
7. **Consulta inconclusiva**: falta fonte, cobertura temporal, chave suficiente ou outra informação necessária.

Estados atuais do conciliador:

- `REPASSE_CONFIRMADO`
- `ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO`
- `PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO`
- `DIVERGENCIA_REVISAO_NECESSARIA`
- `SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA`
- `CONSULTA_INCONCLUSIVA`

A UX pode trocar rótulos visuais, mas não pode apagar essas diferenças conceituais.

---

# 7. Regras de correspondência e invariantes

A conciliação usa a combinação mais forte disponível entre:

- CNPJ;
- exercício;
- programa;
- ação;
- parcela;
- valor;
- data;
- documento/ordem bancária;
- banco, agência e conta.

Proibições:

- nunca confirmar por valor semelhante isoladamente;
- nunca escolher arbitrariamente entre múltiplas contas;
- nunca usar histórico para preencher silenciosamente dado corrente;
- nunca usar conta de um programa para completar outro programa;
- nunca converter cobertura insuficiente em prova de ausência;
- nunca esconder divergência escolhendo uma “fonte preferida” que apague as demais;
- nunca tratar `Valor Pago` do PDDEInfo como confirmação bancária;
- nunca contornar CAPTCHA.

Outros invariantes:

- dinheiro crítico é tratado em **centavos inteiros**;
- CNPJ, INEP, SME, banco, agência, conta e OB permanecem texto quando necessário;
- estrutura/cabeçalho desconhecido gera erro explícito, não dado vazio silencioso;
- conteúdo externo capaz de virar fórmula no Excel deve ser neutralizado;
- workbook final é relido e auditado;
- falha de armazenamento de auditoria não deve ser mascarada como falha da escola/fonte.

---

# 8. Estado das fontes

| Fonte | Estado canônico | Uso |
|---|---|---|
| PDDEInfo - consulta por escola/INEP | AUTÔNOMA E VALIDADA | fonte primária de valores previstos/pagos e contas apresentadas |
| SIGEF Liberações | parser/exportação comprovados; coleta autônoma limitada por CAPTCHA | OB, data, valor e conta destinatária |
| SIGEF Movimentações | leitor streaming comprovado | créditos e demais movimentos; sempre registrar cobertura temporal |
| SIGEF Extrato / Conta Corrente via portal | CAPTCHA_REQUIRED | não automatizar/bypassar; aceitar artefato autorizado quando houver |
| PDDEInfo - Consulta de Saldo das Entidades | promissora em projeto paralelo; ainda não integrada ao canônico | potencial fonte complementar de conta/saldo, nunca sobrescrever silenciosamente |
| Dados Abertos FNDE / Olinda | candidato secundário | controle/cruzamento, não substituição da fonte primária |

Estratégia preferencial de scraping/coleta:

1. HTTP direto + parser determinístico;
2. navegador controlado apenas quando a interação for realmente necessária;
3. agente/IA como auxílio para diagnóstico de mudanças;
4. interromper e registrar estado em CAPTCHA/login/restrição.

---

# 9. Assistente de Liberações - capacidade já pronta

Programas reconhecidos:

- `02` - PDDE / Básico;
- `0A` - Equidade;
- `0B` - Qualidade;
- `Z9` - Educação Integral.

O Assistente:

- aceita `.xls` com qualquer nome;
- identifica CNPJ/exercício/programa;
- valida carteira esperada;
- preserva original e SHA-256;
- gera nome canônico `CNPJ__PROGRAMA.xls`;
- é incremental e idempotente;
- só atualiza automaticamente quando a nova consulta é um strict superset coerente;
- conflito real permanece conflito;
- gera `controle-liberacoes-2026.xlsx`.

Estados relevantes:

`IMPORTADO`, `DUPLICADO_EQUIVALENTE`, `ATUALIZADO`, `CONFLITO`, `PASTA_INCORRETA`, `FORA_DA_CARTEIRA`, `EXERCICIO_DIVERGENTE`, `EXERCICIO_NAO_COMPROVADO`, `ARQUIVO_INVALIDO`.

---

# 10. Modelo de evidência v0.4

Eventos canônicos em `backend/core/evidence.ts`:

- `EXECUTION_STARTED`;
- `EXECUTION_FINISHED`;
- `SOURCE_ATTEMPT_RECORDED`;
- `ARTIFACT_PRESERVED`;
- `OBSERVATION_RECORDED`;
- `FINDING_RECORDED`.

Cada evento persistido contém:

- `eventId` único;
- `runId`;
- sequência monotônica;
- origem;
- exercício;
- INEP opcional;
- data/hora;
- payload;
- `previousHash`;
- `eventHash` SHA-256.

## 10.1 Adaptador JSONL atual

`backend/adapters/jsonl-evidence-store.ts`

Características:

- append serializado sob paralelismo;
- valida integridade antes de novo append;
- rejeita `eventId` duplicado;
- detecta alteração, quebra de sequência e divergência de hash;
- leitura integral, por `runId` e por INEP.

Padrão:

```text
workspace/evidence/events.jsonl
```

## 10.2 Postgres/Supabase já desenhado

Migration:

`supabase/migrations/20260813050000_evidence_events.sql`

Inclui:

- `pgcrypto`;
- índices por execução, escola e fonte/exercício;
- RLS habilitado e forçado;
- sem acesso `anon`/`authenticated` nesta fase;
- UPDATE/DELETE bloqueados por trigger;
- append por função `SECURITY DEFINER` para `service_role`;
- `pg_advisory_xact_lock` para serializar sequência e cadeia;
- hash canonicalizado em UTC;
- função `verify_evidence_chain()`.

**Ainda não foi aplicada a um projeto Supabase canônico dedicado.**

---

# 11. Arquitetura atual

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

Pastas canônicas relevantes:

- `backend/core/` - domínio, evidência e regras;
- `backend/adapters/` - fontes e implementações de persistência;
- `backend/application/` - casos de uso/orquestração;
- `backend/report/` - Excel;
- `scripts/` - interfaces operacionais;
- `supabase/migrations/` - banco institucional versionado;
- `tests/` - unitários/regressões/integrações opt-in;
- `src/` - frontend atual/protótipo, a ser auditado antes de uso na UI definitiva.

---

# 12. Atenção: código legado/residual dentro do canônico

O novo Work deve **auditar o repositório inteiro, não apenas confiar nos nomes das pastas**.

Há, no `main`, arquivos como:

- `backend/index.ts` importando `@appdeploy/sdk` e contendo rotas antigas de extração/XLSX;
- `backend/realtime.ts`;
- `backend/realtime-subscribers.ts`;
- `SOURCE_MANIFEST.json`;
- frontend/protótipos em `src/`.

Esses arquivos coexistem com o núcleo v0.3/v0.4 e podem representar implementação histórica/AppDeploy, componentes úteis ou resíduos.

**Obrigação do Work antes de estruturar o backend institucional:**

1. ler esses arquivos;
2. rastrear imports, scripts, build e testes;
3. classificar cada parte como:
   - canônica e ativa;
   - reaproveitável, mas precisa ser portada/refatorada;
   - legado sem uso atual;
4. não apagar nem incorporar cegamente;
5. evitar criar um segundo backend paralelo ao lado de um backend antigo não compreendido;
6. remover legado apenas quando houver evidência de que não participa do build/runtime/testes e quando a nova arquitetura o substituir de forma segura.

---

# 13. Direção de UX já aprovada para a etapa futura

O backend deve preparar a futura UI para priorizar operação, não arqueologia técnica.

A interface futura deverá privilegiar:

- lista de escolas;
- busca por nome/INEP/SME;
- resumo financeiro da escola selecionada;
- execução e progresso;
- exceções e pendências;
- status financeiros em linguagem clara;
- auditoria;
- Excel;
- rastreabilidade/evidências como camada secundária expansível.

Boas referências observadas no Manus:

- identidade institucional compacta 4ª CRE/GAD;
- navegação clara entre execução/validação/auditoria;
- superfícies sóbrias, pouca decoração;
- cores semânticas;
- tooltips para estados de evidência;
- foco por teclado;
- alto contraste;
- desktop e mobile;
- sem painel de notificações ocupando espaço sem função operacional.

O Work não deve reconstruir a UI nesta fase; deve criar um backend que a suporte bem.

---

# 14. Próxima fase - v0.5 BACKEND INSTITUCIONAL

## Objetivo

Transformar os componentes hoje executados principalmente por CLI/arquivos em um **serviço backend institucional persistente**, consumível pela futura aplicação web, sem reescrever o motor financeiro já validado.

O backend novo deve **orquestrar e expor** o que já existe, não substituir regras determinísticas por uma nova camada opaca.

## Resultado-alvo

```text
Aplicação web (depois)
        │
        ▼
API / Backend institucional
        │
        ├── escolas
        ├── execuções
        ├── histórico/evidências
        ├── achados/exceções
        ├── relatórios
        └── comandos de coleta/conciliação
        │
        ▼
Casos de uso / orquestrador
        │
        ├── coletor PDDEInfo
        ├── assistente/ingestão SIGEF
        └── motor de conciliação
        │
        ▼
Postgres + Storage (Supabase dedicado)
```

---

# 15. Ordem exata de trabalho para o Work

## Fase 0 - auditoria obrigatória do estado atual

Antes de modificar código:

1. confirmar `main` e verificar se avançou além de `df80e4a8d92e821dd9a5d4fc37c8ed1ae604a01e`;
2. ler integralmente:
   - `README.md`;
   - `docs/PROJETO.md`;
   - `docs/DECISOES.md`;
   - `docs/FONTES_E_REGRAS.md`;
   - `docs/ARCHITECTURE.md`;
   - `docs/ASSISTENTE_LIBERACOES.md`;
   - `package.json` e lockfile;
   - `.github/workflows/`;
   - `supabase/migrations/`;
3. analisar o **código-fonte**, não apenas a documentação:
   - todo `backend/core/`;
   - todo `backend/adapters/`;
   - todo `backend/application/`;
   - todo `backend/report/`;
   - `scripts/`;
   - `tests/`;
   - `src/`;
   - `backend/index.ts` e `backend/realtime*`;
   - `SOURCE_MANIFEST.json`;
4. rodar/verificar `npm ci` e `npm run check` no ambiente Work;
5. produzir internamente uma classificação de código ativo x legado;
6. abrir branch própria para v0.5. Sugestão: `feat/v0.5-backend-institucional`.

Não ficar preso nessa análise. Ela deve terminar em implementação.

## Fase 1 - Supabase exclusivo do projeto

- verificar os projetos Supabase conectados;
- **não reutilizar** RADAR PDDE, CTRH, PDDE Online antigo ou qualquer banco de outro sistema;
- criar ou vincular um projeto dedicado, preferencialmente com nome inequívoco como `pdde-repasse-conciliador`;
- não exigir que o usuário instale nada no PC;
- se a ferramenta pedir uma autorização humana impossível de conceder automaticamente, pedir somente essa autorização específica;
- revisar a migration v0.4 antes de aplicar;
- aplicar a migration versionada no banco dedicado;
- validar `verify_evidence_chain()` em banco real.

## Fase 2 - adaptador Postgres real

Implementar um `PostgresEvidenceStore`/`SupabaseEvidenceStore` que respeite a mesma porta/contrato do store JSONL.

Requisitos:

- `append` pela função SQL controlada;
- leitura por execução;
- leitura por escola;
- leitura integral quando necessária;
- verificação de cadeia;
- erros claros;
- nenhum `UPDATE`/`DELETE` para “corrigir estado”;
- testes de contrato executados contra JSONL e Postgres, garantindo semântica equivalente.

O domínio não deve importar SDK Supabase diretamente. O SDK pertence ao adaptador.

## Fase 3 - armazenamento institucional dos artefatos

Projetar e implementar uma porta de artefatos e um adaptador Supabase Storage (ou solução equivalente dentro do próprio projeto) para:

- HTML bruto do PDDEInfo;
- JSON normalizado/manifest;
- arquivos de evidência relevantes;
- Excel final;
- exportações SIGEF quando incorporadas ao fluxo.

Requisitos:

- SHA-256 preservado;
- metadados da fonte/data/tamanho/tipo;
- caminho estável por execução;
- evento `ARTIFACT_PRESERVED` deve apontar para a referência institucional do artefato;
- não colocar blobs grandes em tabela Postgres se Storage for mais adequado;
- acesso deve ser controlado pelo backend. Os dados são públicos, mas isso não justifica expor `service_role` ou deixar operações de escrita públicas.

## Fase 4 - modelo de leitura do backend

Criar consultas/serviços eficientes para a futura UI, preferencialmente como projeções/views derivadas da verdade append-only, sem criar uma segunda “verdade mutável” sem necessidade.

A API precisa conseguir responder:

- lista das 163 escolas;
- escola por INEP;
- execução por `runId`;
- lista/histórico de execuções;
- linha do tempo por escola;
- achados por escola;
- exceções/revisões humanas;
- artefatos relacionados;
- relatório final associado à execução.

Se forem necessários read models materializados por performance, tratá-los explicitamente como **projeções reconstruíveis**, nunca como substitutos do log de evidências.

## Fase 5 - API institucional

Definir contratos HTTP claros. Conjunto mínimo sugerido:

### Saúde e metadados
- `GET /api/health`
- `GET /api/meta`

### Escolas
- `GET /api/schools`
- `GET /api/schools/:inep`
- `GET /api/schools/:inep/history`
- `GET /api/schools/:inep/findings`

### Execuções
- `GET /api/executions`
- `GET /api/executions/:runId`
- `GET /api/executions/:runId/events` (técnico/auditoria, não precisa ser tela primária)

### Exceções / achados
- `GET /api/findings`
- filtros por status, programa, INEP e `requiresHumanReview`.

### Artefatos / relatórios
- `GET /api/executions/:runId/artifacts`
- `GET /api/reports/:runId` ou endpoint equivalente seguro para download/stream/signed URL.

### Comandos
- `POST /api/executions/pddeinfo`
- `POST /api/reconciliations`

Não executar uma coleta de 163 escolas dentro de uma requisição curta se o runtime/deploy não suportar. A API deve criar uma execução e entregar `runId`; o trabalho longo precisa ocorrer em runner/worker/job apropriado. O Work deve verificar os limites atuais do ambiente de deploy escolhido antes de decidir a implementação.

## Fase 6 - orquestração de jobs

Criar uma camada de aplicação que permita:

1. iniciar execução;
2. registrar `EXECUTION_STARTED`;
3. executar o caso de uso;
4. persistir progresso/tentativas/artefatos;
5. encerrar `COMPLETE`, `PARTIAL` ou `FAILED`;
6. permitir polling/consulta pela API;
7. impedir duas execuções idênticas acidentais quando houver risco operacional (idempotência onde fizer sentido).

O mecanismo exato de fila/job deve ser escolhido após verificar as capacidades atuais do runtime. Evitar arquitetura de fila excessivamente sofisticada sem necessidade.

## Fase 7 - segurança proporcional

O sistema é interno e o volume de usuários é pequeno. Não construir uma fortaleza corporativa antes do produto funcionar, mas respeitar mínimos:

- nunca expor `service_role` no cliente;
- escrita apenas pelo backend/runner confiável;
- RLS coerente;
- endpoints de comando protegidos;
- logs sem segredos;
- artefatos acessados por fluxo controlado;
- dados são públicos, portanto não criar burocracia de “sigilo” artificial.

Autenticação completa da UI pode ser incremental, mas não deixar operações destrutivas/administrativas abertas.

## Fase 8 - validação real antes do merge

Critérios mínimos:

- testes unitários/contratos verdes;
- `npm run check` verde;
- migration aplicada e verificada no Supabase dedicado;
- integração real Postgres funcionando;
- executar uma coleta controlada pequena (1-3 escolas) persistindo em Postgres/Storage;
- depois, se a infraestrutura estiver estável, repetir a carteira de 163 escolas ou um teste representativo de escala;
- confirmar que os números-base não regrediram sem explicação;
- confirmar integridade da cadeia no banco;
- confirmar que testes externos continuam opt-in no CI normal;
- revisar diff completo;
- abrir PR;
- somente integrar à `main` quando verde e mergeável.

---

# 16. Definition of Done do v0.5

Considerar o backend institucional concluído quando existir, no repositório canônico:

- projeto Supabase dedicado e inequivocamente identificado;
- migrations versionadas e aplicadas;
- adaptador de evidência Postgres/Supabase real;
- armazenamento institucional de artefatos ou decisão técnica equivalente bem justificada;
- APIs de leitura para escolas, execuções, histórico, achados e artefatos;
- caminho seguro para iniciar coleta/conciliação sem bloquear request longa;
- `runId` como referência operacional central;
- resultados e evidências reconstruíveis;
- integração testada com o núcleo existente, sem duplicar regras financeiras;
- CI verde;
- execução real controlada validada;
- PR integrada à `main`.

Não é necessário, para concluir v0.5:

- redesenhar toda a interface;
- implementar dashboard final;
- resolver CAPTCHA do SIGEF;
- generalizar para outras CREs;
- criar sistema complexo de notificações;
- reescrever o reconciliador.

---

# 17. Ferramentas/skills recomendadas no Work

Usar quando disponíveis:

- **Superpowers / test-driven-development** antes da implementação de cada capacidade;
- **systematic-debugging** para falhas reais;
- **verification-before-completion** antes de afirmar conclusão;
- **requesting-code-review** antes do merge;
- **Supabase Postgres Best Practices** para schema, índices, RLS, concorrência e queries;
- GitHub para branch/PR/CI/merge;
- Supabase plugin para projeto, SQL/migrations/storage quando chegar à execução real.

Evitar transformar skills em ritual. Elas devem aumentar qualidade, não produzir burocracia.

---

# 18. Modo de trabalho esperado

- Não pedir ao usuário para repetir decisões que já estão neste handoff ou no repositório.
- Não pedir confirmação para mudanças técnicas seguras dentro do escopo já aprovado.
- Só interromper por decisão de produto relevante, autorização externa inevitável ou risco real.
- Trabalhar no repositório/nuvem. Não exigir instalações locais no computador do usuário.
- Manter atualizações curtas durante trabalho longo, com achados concretos.
- Preferir entrega parcial real a ficar preso em perguntas/planos.
- Não prometer trabalho futuro assíncrono; executar tudo que for possível na sessão.
- Não sacrificar implementação para atualizar documentação secundária.

---

# 19. Arquivos que o Work deve tratar como leitura inicial obrigatória

1. `README.md`
2. `docs/PROJETO.md`
3. `docs/DECISOES.md`
4. `docs/FONTES_E_REGRAS.md`
5. `docs/ARCHITECTURE.md`
6. `docs/ASSISTENTE_LIBERACOES.md`
7. `package.json`
8. `.github/workflows/ci.yml`
9. `supabase/migrations/20260813050000_evidence_events.sql`
10. `backend/core/evidence.ts`
11. `backend/adapters/jsonl-evidence-store.ts`
12. `backend/application/evidence-store.ts`
13. `backend/application/evidence-history.ts`
14. `backend/application/collect-pddeinfo.ts`
15. `backend/application/reconcile-files.ts`
16. `scripts/collect-pddeinfo.ts`
17. `scripts/reconcile.ts`
18. `scripts/inspect-evidence.ts`
19. testes de evidence/coleta/conciliação
20. todo o restante do `backend/`, `src/` e `SOURCE_MANIFEST.json` para detectar legado/acoplamentos.

---

# 20. Referências históricas úteis, sem reabrir desenvolvimento paralelo

## `extrator-pdde-4cre`
Pode conter soluções úteis já provadas, como:

- snapshots AppDeploy;
- Excel V3;
- testes E2E;
- eventos append-only anteriores;
- dossiê por escola;
- baselines;
- field provenance;
- tratamento de múltiplas ordens/créditos/estornos;
- fontes secundárias.

Portar seletivamente apenas se melhorar o canônico.

## `EXTRATOR-PDDE-MANUS`
Pode ser consultado para:

- UX operacional;
- organização escola + resumo financeiro;
- rastreabilidade secundária;
- estados semânticos/tooltips;
- alto contraste/acessibilidade;
- responsividade;
- ideias de fontes complementares.

**Nunca escrever nesse repositório.**

---

# 21. Observações finais para evitar regressões conceituais

O projeto já atravessou uma longa fase de exploração. O novo Work não deve começar propondo outra arquitetura genérica sem primeiro entender o que está funcionando.

Os maiores erros a evitar são:

1. criar outro repositório;
2. reimplementar o reconciliador;
3. transformar PDDEInfo “pago” em crédito confirmado;
4. usar histórico para preencher ausência corrente;
5. misturar bancos Supabase de outros projetos;
6. rodar tarefa longa dentro de request incompatível com o runtime;
7. expor `service_role`;
8. criar uma segunda verdade mutável paralela ao log append-only;
9. copiar o Manus inteiro;
10. transformar a fase backend em um projeto de documentação/arquitetura sem entrega executável.

A missão agora é **materializar a infraestrutura institucional em torno do núcleo já validado**.
