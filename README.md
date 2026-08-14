# Plataforma PDDE — 4ª CRE

Este repositório é a **fonte canônica de implementação** do projeto de coleta, validação, conciliação, monitoramento e rastreabilidade financeira do PDDE para as 163 unidades da 4ª CRE/SME-Rio.

O produto distingue o que cada fonte realmente comprova e evita transformar ausência, atraso, histórico ou indisponibilidade em conclusões financeiras indevidas.

## Estado atual

Marco atual: **v0.5.0**, com baseline técnico consolidado em **14/08/2026**.

A camada de dados já avançou além do antigo extrator de planilha. Estão implementados no repositório canônico:

- coleta autônoma do PDDEInfo das 163 escolas por INEP;
- preservação de HTML bruto, JSON normalizado, URL, data/hora, SHA-256 e versão do parser;
- retries, timeout, lotes conservadores e isolamento de falhas por escola;
- consulta pública direta do extrato SIGEF a partir da identidade bancária já conhecida;
- validação de CNPJ/programa/conta devolvidos pela fonte SIGEF;
- tratamento de conta alfanumérica e dígito `X`;
- preservação de histórico, documento e contraparte das movimentações;
- filtro operacional pelo exercício de **2026**;
- visão operacional de repasses e movimentações;
- visão fiscal humana por escola, programa/ação, parcela, conta e extrato;
- Excel Fiscal v3 em camadas;
- trilha append-only de evidências;
- backend institucional em código com API, fila, worker, idempotência e Storage privado;
- migrations Postgres/Supabase versionadas e testadas;
- motor determinístico de conciliação;
- Assistente de Liberações incremental e idempotente;
- testes unitários, integrações opcionais e validações live controladas.

## O que ainda NÃO está implantado

É obrigatório distinguir **código existente** de **plataforma publicada**.

Em 14/08/2026:

- **não existe projeto Supabase dedicado conectado a esta aplicação**;
- as migrations institucionais ainda não foram aplicadas a um banco canônico;
- **não existe frontend fiscal novo publicado**;
- **não existe site desta plataforma publicado no Vercel**;
- o backend institucional existe em código, mas ainda não opera como serviço implantado;
- o melhor fluxo PDDEInfo + SIGEF + operacional + fiscal ainda é orquestrado por scripts/workflows e será promovido a job institucional `MONITORING`.

O `index.html`, `src/main.ts` e o runtime AppDeploy presentes no repositório representam uma geração anterior do extrator e **não devem ser confundidos com o frontend fiscal que ainda será construído**.

## Baseline real das 163 UEs — 14/08/2026

A rodada integral validada produziu:

- **163/163** escolas coletadas no PDDEInfo;
- **0** falhas PDDEInfo;
- **284/284** contas mapeadas com consulta SIGEF completa;
- **0** consultas parciais ou falhas de conta;
- **520** registros de repasse/parcela;
- **394** movimentações SIGEF pertencentes a 2026;
- **51.547** movimentos históricos recebidos das páginas brutas, preservados sem serem misturados à visão corrente;
- **R$ 2.182.050,00** programados no PDDEInfo;
- **R$ 827.615,00** com pagamento informado no PDDEInfo;
- **R$ 409.010,00** em créditos compatíveis localizados no extrato SIGEF;
- **137** registros selecionados para conferência, sem juízo automático de irregularidade.

Detalhes e limites: [`docs/BASELINE_TECNICO_2026-08-14.md`](docs/BASELINE_TECNICO_2026-08-14.md).

## Regra temporal principal

O produto operacional atual trabalha com o exercício de **2026**.

Dados anteriores podem ser preservados como evidência bruta ou usados numa investigação histórica separada, mas não podem preencher lacunas nem compor a visão operacional corrente de 2026.

## Regra central de evidência

O projeto separa fatos que não são equivalentes:

1. pagamento informado no PDDEInfo;
2. ordem bancária/liberação registrada por fonte adequada;
3. crédito compatível localizado no extrato SIGEF;
4. eventual evidência bancária direta/autorizada;
5. **achado derivado pelo nosso motor de conciliação**.

Uma fonte não sobrescreve silenciosamente outra. Cobertura insuficiente produz estado inconclusivo, não uma resposta inventada.

Na apresentação humana, evitar linguagem mais forte que a prova disponível. Por exemplo, preferir **“Crédito compatível localizado no extrato SIGEF”** a uma afirmação genérica de crédito “confirmado”.

## Monitoramento 2026

Fluxo já comprovado em código e em coleta real:

```text
Lista-mestre 163 UEs
        │
        ▼
PDDEInfo por INEP
        │
        ├── UEx / CNPJ
        ├── contas atuais
        └── repasses / parcelas
        │
        ▼
SIGEF Extrato público direto
        │
        ├── créditos
        ├── débitos
        ├── aplicações / resgates
        ├── documento / histórico
        └── contraparte
        │
        ▼
Visão operacional 2026
        │
        ▼
Visão fiscal humana
        │
        ├── JSON
        └── Excel Fiscal v3
```

O próximo passo estrutural é retirar a orquestração principal dos scripts e transformá-la em uma capacidade institucional `MONITORING` executada pelo worker.

## Excel Fiscal v3

O gerador `monitor:fiscal:xlsx` produz nove abas:

1. `Visão Geral`;
2. `Unidades`;
3. `Repasses por Escola`;
4. `Extratos por Escola`;
5. `Registros para Conferência`;
6. `BASE - Repasses`;
7. `BASE - Movimentos`;
8. `BASE - Contas`;
9. `Legenda e Fontes`.

O Excel é um produto de análise complementar ao futuro site, não apenas uma exportação do frontend.

## Verificação

```bash
npm ci
npm run check
```

`npm run check` executa testes, typecheck TypeScript e build. Integrações contra serviços externos ficam desativadas por padrão; workflows específicos realizam validações live controladas.

## Backend institucional em código

A base institucional já contém:

- `execution_jobs`;
- fila com uma execução pendente/em andamento por vez;
- idempotência;
- worker;
- API institucional;
- eventos append-only;
- armazenamento privado de artefatos;
- SHA-256;
- projeções de execuções, achados, artefatos e histórico escolar;
- migrations Supabase/Postgres.

Hoje os jobs institucionais principais ainda são `PDDEINFO` e `RECONCILIATION`. O monitoramento completo será incorporado como `MONITORING` antes da implantação do banco e do frontend novo.

## Postgres / Supabase

As migrations em `supabase/migrations/` descrevem o modelo institucional e foram exercitadas por testes, mas **ainda não foram aplicadas a um projeto Supabase dedicado**. Bancos de outros sistemas não devem ser reutilizados por conveniência.

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
- `backend/adapters/` — fontes e persistência;
- `backend/application/` — coleta, monitoramento, conciliação, jobs e projeções;
- `backend/report/` — relatórios e validações;
- `backend/api/` — API institucional;
- `backend/runtime/` — composição/execução do backend institucional;
- `scripts/` — CLIs e orquestrações operacionais ainda não promovidas a serviço;
- `supabase/migrations/` — schema institucional versionado;
- `tests/` — regras, regressões e integrações.

## Documentação essencial para retomada

Leia nesta ordem:

1. [`docs/BASELINE_TECNICO_2026-08-14.md`](docs/BASELINE_TECNICO_2026-08-14.md)
2. [`docs/CONHECIMENTO_ACUMULADO.md`](docs/CONHECIMENTO_ACUMULADO.md)
3. [`docs/REFERENCIAS_NORMATIVAS.md`](docs/REFERENCIAS_NORMATIVAS.md), quando a tarefa envolver interpretação de pagamentos, aplicações, despesas ou conformidade
4. [`docs/PROJETO.md`](docs/PROJETO.md)
5. [`docs/DECISOES.md`](docs/DECISOES.md)
6. [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md)
7. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
8. [`docs/VISAO_FISCAL.md`](docs/VISAO_FISCAL.md)

A documentação é memória institucional, não gate burocrático. Um novo chat deve sempre conferir a `main` e os commits posteriores ao baseline antes de alterar código. Referências normativas são datadas e devem ser revalidadas antes de virarem lógica automatizada.

## Próxima sequência técnica aprovada

1. consolidar documentação e baseline;
2. promover o fluxo atual a job institucional `MONITORING`;
3. criar/conectar Supabase dedicado e read model financeiro corrente;
4. expor API orientada ao trabalho fiscal;
5. construir e publicar o frontend novo;
6. ampliar fontes e fechar lacunas, especialmente posição de aplicações/rendimentos, e então limpar o legado.

## Governança dos repositórios

Este é o **único repositório de implementação do fluxo ChatGPT/OpenAI**.

- `WilsonMPeixoto-2/extrator-pdde-4cre` — referência histórica/técnica;
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — projeto paralelo exclusivo do Manus, **somente leitura** para este fluxo.

Código, UX, testes e ideias úteis dessas referências podem ser incorporados aqui seletivamente. Nenhum desenvolvimento novo deste fluxo deve ser distribuído entre múltiplos repositórios.