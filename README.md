# Inteligência Financeira PDDE | 4ª CRE

**Plataforma de Inteligência Financeira das Verbas do PDDE/2026**  
**4ª Coordenadoria Regional de Educação · SME-Rio**

Este repositório é a fonte canônica de implementação do monitoramento financeiro do PDDE para as **163 unidades escolares da 4ª CRE**.

O produto coleta, preserva, cruza e apresenta fatos de fontes independentes sem transformar ausência, atraso de cobertura, histórico ou indisponibilidade em conclusões inventadas.

## Foco operacional

A plataforma trabalha, neste momento, **exclusivamente com o exercício de 2026**.

- **2026** é o exercício corrente da coleta, dos indicadores, do site e dos relatórios destinados ao usuário.
- **2025** pode ser consultado apenas como contexto histórico excepcional, por exemplo para investigar reprogramação de saldo ou mudança de conta.
- Dados anteriores não completam lacunas de 2026 e não entram silenciosamente em totais atuais.

O contrato temporal é validado em código e no banco.

## Regra central de evidência

O sistema mantém separados fatos que não são equivalentes:

1. valor programado;
2. pagamento informado no PDDEInfo;
3. data da ordem de pagamento informada pelo FNDE;
4. liberação/ordem bancária em fonte adequada;
5. crédito compatível localizado no extrato SIGEF;
6. movimentação bancária;
7. posição de saldo e aplicações na data de referência;
8. situação de prestação de contas informada pela fonte;
9. achados derivados pelo motor de conciliação.

**Pagamento informado não significa crédito bancário confirmado.**  
**Saldo publicado para 30/06/2026 não significa saldo bancário de agosto.**  
**Saldo aplicado não significa rendimento.**

Uma fonte não sobrescreve silenciosamente outra. Ausência continua sendo ausência.

## Estado atual da fundação de dados

A versão de código **v0.5.0** já contém:

- coleta do PDDEInfo principal por INEP para a lista institucional das 163 UEs;
- relatórios públicos complementares do FNDE para atendimento/repasses, cadastro e mandato, abertura de conta, suspensões, prestação de contas e saldos;
- descoberta automática do mês de saldo mais recente publicado pela fonte;
- backfill dos meses disponíveis de 2026 para construir série histórica;
- consulta do extrato público SIGEF para as contas elegíveis já identificadas;
- preservação de HTML/JSON/evidências brutas com rastreabilidade técnica interna;
- normalização monetária em centavos inteiros;
- snapshots financeiros mensais por escola/CNPJ/programa/conta;
- série histórica de saldos e aplicações;
- Portal da Transparência preparado como fonte opcional mediante credencial oficial;
- fallback de navegador assistido para fontes públicas quando o HTTP direto não basta;
- fila, worker, API institucional, idempotência, Storage privado e trilha append-only;
- read model fiscal técnico e read model financeiro humano separados;
- publicação atômica dos dois read models no PostgreSQL;
- Excel humano orientado ao trabalho fiscal;
- Excel de auditoria técnica preservado separadamente;
- frontend fiscal React/Vite publicado no Vercel;
- consulta ao vivo da carteira a partir do site, com concorrência e retentativas controladas;
- preservação do retrato anterior durante a atualização e bloqueio de promoção quando qualquer unidade termina com cobertura parcial;
- testes unitários, propriedades, PGlite/Postgres, Playwright em navegador real, gate Axe de acessibilidade, MSW, smoke desktop/mobile e validações live controladas.

## Baseline público comprovado nas 163 UEs

Em **16/08/2026**, o backfill dos relatórios públicos complementares do FNDE foi executado para a carteira integral:

| Medida | Resultado |
|---|---:|
| Unidades processadas | **163/163** |
| CNPJs únicos localizados | **163** |
| Registros de atendimento/repasse | **169** |
| Registros de prestação de contas | **311** |
| Posições mensais de saldo | **2.690** |
| Séries conta/programa distintas | **461** |
| Cobertura mensal | **jan–jun/2026** |
| Falhas de coleta | **0** |
| Duplicidades lógicas | **0** |
| Inconsistências aritméticas | **0** |

A posição pública mais recente dessa fonte, na data da coleta, era **30/06/2026**.

Na fotografia de 30/06/2026 foram encontradas 444 posições conta/programa, somando:

- saldo em conta: **R$ 278.017,30**;
- saldo em fundos: **R$ 1.364.017,11**;
- poupança: **R$ 0,00**;
- RDB/CDB: **R$ 0,00**;
- saldo total informado: **R$ 1.642.034,41**.

Foram observadas pequenas posições negativas de conta corrente em duas UEs. Elas são preservadas como **fatos a conferir**, sem inferência automática de irregularidade.

Detalhes, distribuições e limites semânticos: [`docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md).

O baseline anterior de PDDEInfo principal + SIGEF continua documentado em [`docs/BASELINE_TECNICO_2026-08-14.md`](docs/BASELINE_TECNICO_2026-08-14.md).

## Monitoramento institucional

O fluxo institucional mantém o coletor PDDEInfo+SIGEF já validado e acrescenta a camada pública FNDE:

```text
Lista-mestre · 163 UEs
        │
        ▼
MONITORING · exercício 2026
        │
        ├── PDDEInfo principal
        │     ├── UEx / CNPJ
        │     ├── cadastro / mandato
        │     ├── contas / ocorrência
        │     └── repasses / parcelas com custeio e capital
        │
        ├── Relatórios públicos FNDE
        │     ├── atendimento / ordem / quantidade de alunos
        │     ├── cadastro / mandato
        │     ├── abertura de conta
        │     ├── suspensões e seus motivos
        │     ├── prestação de contas
        │     └── saldos / aplicações por data de referência
        │
        ├── SIGEF
        │     └── movimentações e créditos compatíveis
        │
        ▼
Fatos financeiros normalizados
        │
        ├── read model técnico / auditoria
        └── read model humano / produto
```

O runtime institucional usa `backend/application/run-financial-intelligence-monitoring.ts` e publica os read models técnico e humano **na mesma transação** quando uma execução completa cobre toda a carteira institucional.

Uma coleta parcial ou um subconjunto de escolas nunca substitui o retrato corrente oficial. A mesma regra vale para a consulta ao vivo do frontend: um resultado parcial pode ser diagnosticado, mas não é promovido a novo retrato da carteira.

## Design da informação para pessoas, não para tabelas do banco

A estrutura interna pode ser extensa. A experiência do gestor/fiscal não deve ser.

### Metadados técnicos ficam fora da experiência comum

Hash, SHA-256, parser, versão do parser, URL bruta, tentativas, payloads, IDs internos, número de páginas, logs e regras técnicas permanecem disponíveis para rastreabilidade e diagnóstico no backend, mas **não aparecem em telas, Excel ou PDF destinados ao usuário comum**.

### Dados financeiros devem manter continuidade visual

Uma sequência como:

```text
Programa → Banco → Agência → Conta → Previsto → Pagamento informado → Data → Crédito
```

não pode ser interrompida por parágrafos explicando histórico, método de coleta ou regra de associação.

Explicações realmente necessárias ficam em ajuda contextual, detalhe sob demanda ou área administrativa.

### Indicador quantitativo precisa levar ao detalhe

Se o sistema mostra “47 unidades” ou “111 unidades”, o usuário precisa conseguir identificar imediatamente **quais são essas unidades**.

O read model humano implementa cada indicador como:

```text
rótulo + quantidade + lista nominal das unidades
```

No site, os indicadores funcionam como entrada para filtro/drill-down da carteira. No Excel, os números apontam para registros nominais na aba `Pendências e Suspensões`.

### Cor tem função semântica

A apresentação diferencia visualmente `Previsto` de `Pagamento informado`. O Excel humano usa verde de forma consistente para a dimensão de pagamento informado, sem depender exclusivamente da cor para transmitir o estado.

O histórico das decisões e critérios de produto permanece registrado em [`docs/PRODUCT_DECISION_GATE_2026.md`](docs/PRODUCT_DECISION_GATE_2026.md).

## Excel humano 2026

A exportação padrão destinada ao trabalho fiscal é derivada do **read model humano**, não do JSON técnico.

```bash
npm run monitor:human:xlsx -- \
  --input /caminho/human-financial.json \
  --output /caminho/inteligencia-financeira-pdde-4cre-2026.xlsx
```

Este é o único comando canônico da planilha destinada ao usuário humano.

No produto web, o botão **Baixar planilha Excel** reutiliza esse mesmo gerador canônico. Se a tela estiver mostrando o snapshot publicado, o arquivo corresponde ao snapshot publicado; após uma nova consulta completa, o arquivo corresponde aos 163 prontuários atualizados mantidos naquela sessão. A exportação não executa uma nova coleta.

O workbook humano possui dez recortes alinhados à navegação do produto:

1. `Visão Geral`;
2. `Escolas`;
3. `Repasses`;
4. `Contas e Saldos`;
5. `Evolução Mensal`;
6. `Movimentações`;
7. `Cadastro e Habilitação`;
8. `Pendências e Suspensões`;
9. `Prestação de Contas`;
10. `Cobertura das Fontes`.

As dez dimensões também estão disponíveis como abas do site. A aba `Repasses` preserva custeio, capital, ajustes, pagamento, ordem e evidência de crédito separadamente; `Contas e Saldos` preserva abertura, ocorrência e composição das aplicações; `Movimentações` mantém documento e contraparte; e `Cobertura das Fontes` distingue dado disponível, consulta sem registro, cobertura parcial e fonte indisponível.

Nenhuma dessas abas padrão replica uma “mega tabela” do backend.

A exportação detalhada de nove abas foi preservada para auditoria técnica, com nome explícito:

```bash
npm run monitor:technical:xlsx -- \
  --input /caminho/fiscal-human-view.json \
  --output /caminho/auditoria-tecnica-pdde-4cre-2026.xlsx
```

Os aliases legados `monitor:fiscal:xlsx` e `monitor:audit:xlsx` continuam apontando para esse mesmo gerador técnico para não interromper automações existentes. Eles **não** geram a planilha humana.

## Coleta e backfill 2026

Monitoramento corrente:

```bash
npm run monitor:live -- \
  --year 2026 \
  --workspace .tmp/monitor-live-2026 \
  --output artifacts/monitor-live-2026.json
```

Backfill dos meses públicos disponíveis de 2026:

```bash
npm run monitor:backfill:2026 -- \
  --ineps all \
  --workspace .tmp/backfill-public-balances-2026 \
  --output artifacts/backfill-public-balances-2026.json
```

O monitoramento rotineiro consulta apenas o mês de saldo mais recente publicado. O backfill existe para reconstrução inicial ou reparo da série histórica.

## Transparência das fontes em linguagem humana

A camada de apresentação descreve fontes pelo que elas acrescentam à análise:

- **PDDEInfo:** programação e pagamento por custeio/capital, cadastro e mandato da UEx, situação de abertura e ocorrência de contas, suspensões, saldos e prestação de contas;
- **SIGEF:** movimentações das contas e créditos compatíveis localizados no extrato;
- **Portal da Transparência:** documentos e transferências federais, quando a credencial oficial estiver configurada.

Termos de implementação como HTTP, API, parser, hash ou retry não pertencem à explicação comum destinada ao fiscal.

## Postgres / Supabase

As migrations em `supabase/migrations/` foram exercitadas em PostgreSQL embutido/PGlite e incluem:

- fila e backend institucional;
- trilha de evidência;
- job `MONITORING`;
- snapshots financeiros mensais de 2026;
- read model fiscal corrente;
- read model financeiro humano corrente;
- publicação transacional dos dois retratos;
- suporte a PDF no Storage privado;
- contrato da fonte `PORTAL_TRANSPARENCIA`.

**Ainda não foi criado/conectado um projeto Supabase dedicado a esta plataforma.** Bancos de outros sistemas não devem ser reutilizados por conveniência. A criação do recurso depende de uma decisão explícita de organização/plano/custo na plataforma Supabase.

## Portal da Transparência

O cliente para a API oficial está implementado com limitação de taxa, retry conservador, preservação do JSON bruto e consultas restritas ao exercício de 2026.

A integração permanece desabilitada quando `PORTAL_TRANSPARENCIA_API_KEY` não está configurada.

Nenhuma chave deve ser incluída em código, frontend, planilha ou documentação pública. A primeira consulta autenticada real será executada somente depois de a credencial oficial ser configurada como segredo de backend.

## Estado de implantação

É importante distinguir o que já está publicado do que ainda depende da camada institucional persistente.

### Já publicado / operacional para validação

- frontend fiscal React/Vite integrado à `main` e publicado automaticamente no Vercel;
- navegação global pelas mesmas dez dimensões do Excel humano: visão geral, escolas, repasses, contas e saldos, evolução mensal, movimentações, cadastro e habilitação, pendências e suspensões, prestação de contas e cobertura das fontes;
- retrato financeiro 2026 previamente publicado como base estável da experiência;
- ação **Fazer nova consulta**, que consulta as unidades em lotes controlados sem retirar o retrato atual da tela;
- ação **Baixar planilha Excel**, que gera o Excel humano a partir do mesmo retrato financeiro exibido na interface, sem disparar uma segunda coleta;
- endpoint server-side `/api/live` para executar a coleta de uma unidade com o pipeline financeiro real;
- atualização do retrato no navegador somente quando todas as unidades solicitadas terminam sem falha e sem cobertura parcial;
- smoke automatizado desktop/mobile e CI com testes, TypeScript e build.

### Ainda pendente para a camada institucional definitiva

- projeto Supabase dedicado conectado a este repositório;
- aplicação das migrations no banco canônico da plataforma;
- persistência durável das execuções disparadas pelo site, seus artefatos, evidências e histórico;
- publicação durável de um novo retrato completo para que ele sobreviva a recarregamento de página e novas sessões;
- backend institucional permanente usando fila/worker e os stores já implementados;
- credencial oficial do Portal da Transparência;
- definição e publicação do PDF executivo final.

A consulta ao vivo publicada hoje é deliberadamente conservadora: enquanto a persistência dedicada não for ligada, o resultado completo atualiza a sessão do navegador; ao recarregar a página, a aplicação volta ao retrato estável previamente publicado. Resultado parcial ou falho nunca substitui esse retrato.

## Verificação

```bash
npm ci
npm run check
```

`npm run check` executa testes, typecheck TypeScript e build.

A suíte cobre, entre outros pontos:

- centavos inteiros;
- escopo exclusivo 2026;
- deduplicação e isolamento de falha;
- snapshots e série histórica;
- migrations PostgreSQL;
- idempotência;
- publicação atômica dos read models;
- rollback quando a visão humana é inconsistente;
- indicadores com quantidade igual à lista nominal;
- bloqueio de metadados técnicos na projeção humana;
- consulta ao vivo com limite de concorrência, retentativas e bloqueio de retrato parcial;
- navegação interna e diferenciação semântica no Excel.

## Estrutura principal

- `backend/core/` — contratos financeiros, evidência, tempo e regras determinísticas;
- `backend/adapters/` — fontes externas e persistência;
- `backend/application/` — coleta, monitoramento, conciliação e read models;
- `backend/report/` — Excel/PDF e projeções de apresentação;
- `backend/api/` — API institucional;
- `backend/runtime/` — composição do serviço/worker;
- `src/product/` — frontend fiscal e contratos de consumo do read model humano;
- `api/` — entrypoints server-side publicados no Vercel;
- `scripts/` — CLIs e exportações;
- `supabase/migrations/` — schema institucional versionado;
- `tests/` — regras, regressões, propriedades e integrações.

## Documentação essencial

Para retomar o projeto sem depender de chats ou de arquivos locais, ler primeiro:

1. [`docs/INDICE_DOCUMENTAL.md`](docs/INDICE_DOCUMENTAL.md)
2. [`docs/CONTINUIDADE_WORK.md`](docs/CONTINUIDADE_WORK.md)
3. [`docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`](docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md)
4. [`docs/ESTADO_ATUAL_2026-08-30.md`](docs/ESTADO_ATUAL_2026-08-30.md)
5. [`docs/DECISOES.md`](docs/DECISOES.md)

Documentos estruturais complementares:

- [`docs/CONHECIMENTO_ACUMULADO.md`](docs/CONHECIMENTO_ACUMULADO.md)
- [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/PROJETO.md`](docs/PROJETO.md)
- [`docs/REFERENCIAS_NORMATIVAS.md`](docs/REFERENCIAS_NORMATIVAS.md)
- [`docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md)
- [`docs/BASELINE_TECNICO_2026-08-14.md`](docs/BASELINE_TECNICO_2026-08-14.md)

A documentação é memória institucional, não substituto da fonte de verdade. Antes de alterar código, sempre confira a `main`, os PRs abertos e os commits posteriores ao último baseline.

## Próximos gates reais

A fundação de dados e os três primeiros marcos de produto estão publicados. O marco corrente é a correção estrutural de acessibilidade e legibilidade registrada em:

- [auditoria de 21/08](docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md);
- [especificação aprovada](docs/superpowers/specs/2026-08-21-acessibilidade-legibilidade-design.md);
- [plano executável](docs/superpowers/plans/2026-08-21-acessibilidade-legibilidade.md).

Backend persistente, Supabase, histórico institucional e novas fontes continuam posteriores e dependem dos gates de produto registrados em `docs/CONTINUIDADE_WORK.md`.

## Governança dos repositórios

Este é o repositório canônico do fluxo ChatGPT/OpenAI.

- `WilsonMPeixoto-2/extrator-pdde-4cre` — referência histórica/técnica;
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — projeto paralelo exclusivo do Manus, **somente leitura** para este fluxo.

Código, UX, testes e ideias úteis das referências podem ser incorporados seletivamente aqui. Nenhum desenvolvimento novo deste fluxo deve ser distribuído entre repositórios paralelos.
