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
- relatórios públicos complementares do FNDE para atendimento/repasses, prestação de contas e saldos;
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
- testes unitários, propriedades, PGlite/Postgres e validações live controladas.

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
        │     ├── contas exibidas
        │     └── repasses / parcelas
        │
        ├── Relatórios públicos FNDE
        │     ├── atendimento / ordem de pagamento
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

Uma coleta parcial ou um subconjunto de escolas nunca substitui o retrato corrente oficial.

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

O read model humano já implementa cada indicador como:

```text
rótulo + quantidade + lista nominal das unidades
```

No site, isso deve virar filtro/drill-down. No Excel, os números apontam para uma lista nominal na aba `Acompanhamento`.

### Cor tem função semântica

A apresentação diferencia visualmente `Previsto` de `Pagamento informado`. O Excel humano usa verde de forma consistente para a dimensão de pagamento informado, sem depender exclusivamente da cor para transmitir o estado.

As decisões de produto que ainda exigem deliberação estão em [`docs/PRODUCT_DECISION_GATE_2026.md`](docs/PRODUCT_DECISION_GATE_2026.md).

## Excel humano 2026

A exportação padrão destinada ao trabalho fiscal é derivada do **read model humano**, não do JSON técnico.

```bash
npm run monitor:human:xlsx -- \
  --input /caminho/human-financial.json \
  --output /caminho/inteligencia-financeira-pdde-4cre-2026.xlsx
```

`monitor:fiscal:xlsx` aponta para o mesmo gerador humano por compatibilidade.

O workbook possui sete recortes curtos:

1. `Visão Geral`;
2. `Acompanhamento`;
3. `Unidades`;
4. `Repasses`;
5. `Contas e Saldos`;
6. `Movimentações`;
7. `Prestação de Contas`.

Nenhuma dessas abas padrão replica uma “mega tabela” do backend.

A antiga exportação detalhada foi preservada para auditoria técnica:

```bash
npm run monitor:audit:xlsx
```

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

- **PDDEInfo:** repasses informados, contas vinculadas, saldos e situação da prestação de contas;
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

## O que ainda NÃO está implantado

É importante distinguir código validado de plataforma publicada:

- não existe projeto Supabase dedicado conectado a este repositório;
- as migrations ainda não foram aplicadas ao banco canônico desta plataforma;
- o backend institucional ainda não opera como serviço implantado permanente;
- não existe frontend fiscal novo publicado;
- não existe site novo desta plataforma publicado no Vercel;
- o Portal da Transparência ainda aguarda credencial oficial.

O frontend legado presente no repositório não deve ser confundido com a experiência fiscal que será construída após o gate de decisões de produto.

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
- navegação interna e diferenciação semântica no Excel.

## Estrutura principal

- `backend/core/` — contratos financeiros, evidência, tempo e regras determinísticas;
- `backend/adapters/` — fontes externas e persistência;
- `backend/application/` — coleta, monitoramento, conciliação e read models;
- `backend/report/` — Excel/PDF e projeções de apresentação;
- `backend/api/` — API institucional;
- `backend/runtime/` — composição do serviço/worker;
- `scripts/` — CLIs e exportações;
- `supabase/migrations/` — schema institucional versionado;
- `tests/` — regras, regressões, propriedades e integrações.

## Documentação essencial

1. [`docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md)
2. [`docs/BASELINE_TECNICO_2026-08-14.md`](docs/BASELINE_TECNICO_2026-08-14.md)
3. [`docs/PRODUCT_DECISION_GATE_2026.md`](docs/PRODUCT_DECISION_GATE_2026.md)
4. [`docs/MONITORING_INSTITUCIONAL.md`](docs/MONITORING_INSTITUCIONAL.md)
5. [`docs/CONHECIMENTO_ACUMULADO.md`](docs/CONHECIMENTO_ACUMULADO.md)
6. [`docs/REFERENCIAS_NORMATIVAS.md`](docs/REFERENCIAS_NORMATIVAS.md)
7. [`docs/PROJETO.md`](docs/PROJETO.md)
8. [`docs/DECISOES.md`](docs/DECISOES.md)
9. [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md)
10. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

A documentação é memória institucional, não substituto da fonte de verdade. Antes de alterar código, sempre confira a `main`, os PRs abertos e os commits posteriores ao último baseline.

## Próximos gates reais

A fundação de dados 2026 já foi comprovada na carteira completa. As próximas dependências externas são:

1. escolher/criar o **Supabase dedicado** e aplicar as migrations;
2. configurar a credencial oficial do **Portal da Transparência** como segredo;
3. revisar o gate de decisões de produto antes do frontend final;
4. construir a API orientada ao read model humano;
5. projetar e implementar o frontend fiscal;
6. definir o formato final do PDF executivo.

## Governança dos repositórios

Este é o repositório canônico do fluxo ChatGPT/OpenAI.

- `WilsonMPeixoto-2/extrator-pdde-4cre` — referência histórica/técnica;
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — projeto paralelo exclusivo do Manus, **somente leitura** para este fluxo.

Código, UX, testes e ideias úteis das referências podem ser incorporados seletivamente aqui. Nenhum desenvolvimento novo deste fluxo deve ser distribuído entre repositórios paralelos.