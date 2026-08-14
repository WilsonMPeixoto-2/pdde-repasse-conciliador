# Baseline técnico — 14/08/2026

Este documento é uma **fotografia factual** do projeto em 14/08/2026. Ele existe para permitir retomada por novos chats/agentes sem depender da memória da conversa e sem confundir código existente com sistema implantado.

Baseline da `main` usado nesta consolidação:

```text
6e8b359f1bc0a69be27641568c8449df7cd2e3ad
```

Commit: `feat: Excel fiscal em camadas para as 163 UEs`.

## 1. Estado real de implantação

A expressão “existe no projeto” precisa ser lida com cuidado. Em 14/08/2026, várias capacidades estão implementadas e validadas no repositório, mas **a plataforma institucional ainda não está implantada**.

| Capacidade | Código no canônico | Validada com dados reais | Supabase dedicado | Publicada/implantada |
|---|---:|---:|---:|---:|
| Coleta PDDEInfo por INEP | Sim | Sim | Não | Não |
| Consulta direta SIGEF Extrato | Sim | Sim | Não | Não |
| Visão operacional 2026 | Sim | Sim | Não | Não |
| Visão fiscal humana | Sim | Sim | Não | Não |
| Excel Fiscal v3 | Sim | Sim | Não se aplica | Não |
| Backend institucional (API/fila/worker/evidências) | Sim | Parcialmente por testes | Não | Não |
| Migrations Supabase | Sim | Testadas localmente/CI | Não aplicadas | Não |
| Read model financeiro corrente | Não | Não | Não | Não |
| API fiscal orientada ao prontuário | Não | Não | Não | Não |
| Frontend fiscal novo | Não | Não | Não | Não |
| Site no Vercel | Não | Não | Não | Não |

O repositório ainda contém um frontend e um runtime AppDeploy de uma geração anterior do projeto. Eles são **código legado não publicado como produto institucional atual** e não devem ser confundidos com o frontend fiscal que ainda será construído.

## 2. Regra temporal obrigatória

O produto operacional atual trabalha com **o exercício de 2026**.

Regras:

- repasses, parcelas, saldos, créditos, débitos, aplicações, resgates, tarifas, contrapartes e registros para conferência da visão corrente devem se referir a 2026;
- dados anteriores podem ser recebidos e preservados como evidência bruta quando a fonte os devolve;
- dados de 2025 ou anteriores não podem ser misturados à visão operacional de 2026;
- ausência de evidência em 2026 deve ser apresentada como ausência/inconclusão **na cobertura de 2026**, nunca preenchida com um movimento histórico apenas para completar a narrativa.

## 3. Coleta real integral das 163 UEs

Artefato bruto de referência da rodada validada de 14/08/2026:

```text
Monitoramento_PDDE_4CRE_2026_bruto.json
```

Resultado verificado:

- **163** escolas solicitadas;
- **163** escolas coletadas no PDDEInfo;
- **0** falhas PDDEInfo;
- **284** contas mapeadas e consultadas no SIGEF;
- **284** consultas de conta completas;
- **0** parciais;
- **0** falhas;
- **0** contas de programa desconhecido na rodada;
- **51.547** movimentações históricas recebidas das páginas SIGEF;
- **394** movimentações pertencentes ao exercício de 2026.

Cobertura de contas atuais observada na rodada:

- `0B` — PDDE Qualidade: **163** contas;
- `02` — PDDE Básico: **116** contas;
- `0A` — PDDE Equidade: **5** contas.

Total: **284** contas.

O normalizador também conhece `Z9` para PDDE Educação Integral, mas esse código não compôs as 284 contas consultadas nesta rodada de referência.

## 4. Repasses 2026

A visão operacional da mesma rodada contém **520 registros de repasse/parcela**.

Totais:

- previsto/programado no PDDEInfo: **R$ 2.182.050,00**;
- pagamento informado no PDDEInfo: **R$ 827.615,00**;
- créditos compatíveis localizados no SIGEF: **R$ 409.010,00**.

Distribuição por ação/parcela:

| Ação | Parcela | Registros | Programado | Pagamento informado | Crédito SIGEF localizado |
|---|---|---:|---:|---:|---:|
| PDDE Básico | 1ª Parcela | 111 | R$ 632.585,00 | R$ 632.585,00 | R$ 215.995,00 |
| PDDE Básico | 2ª Parcela | 111 | R$ 632.585,00 | R$ 0,00 | R$ 0,00 |
| PDDE Básico — Primeira Infância | P1 | 52 | R$ 132.630,00 | R$ 132.630,00 | R$ 130.615,00 |
| PDDE Básico — Primeira Infância | P2 | 52 | R$ 132.630,00 | R$ 0,00 | R$ 0,00 |
| Educação Conectada | sem divisão | 145 | R$ 467.220,00 | R$ 0,00 | R$ 0,00 |
| Escola das Adolescências | sem divisão | 6 | R$ 62.400,00 | R$ 62.400,00 | R$ 62.400,00 |
| Escola e Comunidade | sem divisão | 43 | R$ 122.000,00 | R$ 0,00 | R$ 0,00 |

Estados operacionais da rodada:

- **96** registros com crédito bancário compatível localizado;
- **26** com pagamento informado no PDDEInfo e crédito compatível ainda não localizado na coleta SIGEF;
- **47** com pagamento informado, mas sem conta correspondente exibida na coleta atual do PDDEInfo;
- **351** com pagamento ainda não informado no PDDEInfo.

A linguagem destinada ao usuário não deve expor `CREDITO_CONFIRMADO` como afirmação mais forte que a evidência. A apresentação fiscal usa **“Crédito compatível localizado no extrato SIGEF”**.

## 5. Movimentações SIGEF de 2026

A visão operacional classificou, de forma auxiliar e sem substituir o histórico bancário original:

| Categoria auxiliar | Lançamentos | Valor acumulado da categoria |
|---|---:|---:|
| Crédito FNDE | 96 | R$ 409.010,00 |
| Aplicação financeira | 69 | R$ 178.205,03 |
| Resgate de aplicação | 84 | R$ 12.365,44 |
| Pagamento / transferência | 81 | R$ 12.354,54 |
| Pagamento por cartão | 0 | R$ 0,00 |
| Rendimento financeiro explicitamente identificado | 0 | R$ 0,00 |
| Entrada registrada no extrato | 61 | R$ 12.371,42 |
| Tarifa bancária | 2 | R$ 8,39 |
| Estorno/reversão | 0 | R$ 0,00 |
| Movimento não classificado | 1 | R$ 1.206,41 |

O único movimento não classificado na rodada permaneceu assim deliberadamente. Não se deve inventar categoria para fechar 100% das linhas.

A ausência de linha explicitamente classificada como rendimento também **não prova ausência de rendimento**.

## 6. Regras de evidência já consolidadas

- `Valor Pago` no PDDEInfo não é sinônimo de dinheiro creditado na conta.
- Pagamento informado, ordem bancária, crédito bancário e evidência bancária direta são fatos diferentes.
- Fonte ausente ou consulta incompleta não vira zero, ausência definitiva ou irregularidade.
- Conta atual ausente não é preenchida automaticamente com conta histórica.
- Contas e identificadores permanecem texto; dígito `X` é preservado.
- Dinheiro crítico é tratado em centavos inteiros.
- Histórico e documento do SIGEF são preservados literalmente; classificações são auxiliares.
- O sistema não decide automaticamente regularidade da despesa ou da prestação de contas.
- CAPTCHA/login/restrição não serão contornados.

## 7. Visão fiscal e Excel v3

O contrato de apresentação humana é centrado em:

```text
4ª CRE
└── Unidade escolar
    ├── Programa / ação
    │   └── Parcela
    └── Conta / programa
        └── Movimentações
            └── Evidência
```

O Excel Fiscal v3 materializa essa lógica em nove abas:

1. `Visão Geral`;
2. `Unidades`;
3. `Repasses por Escola`;
4. `Extratos por Escola`;
5. `Registros para Conferência`;
6. `BASE - Repasses`;
7. `BASE - Movimentos`;
8. `BASE - Contas`;
9. `Legenda e Fontes`.

A rodada de referência gerou **137 registros para conferência** sem convertê-los automaticamente em irregularidades.

## 8. Backend institucional: o que existe e o que falta

Já existe código para:

- API institucional;
- fila `execution_jobs`;
- worker de uma execução por vez;
- idempotência;
- estados `QUEUED`, `RUNNING`, `COMPLETE`, `PARTIAL`, `FAILED`;
- trilha append-only de evidências;
- Storage privado e artefatos com SHA-256;
- projeções de execuções, achados, artefatos e histórico escolar;
- migrations Postgres/Supabase.

Hoje, porém, o backend institucional reconhece como jobs principais apenas `PDDEINFO` e `RECONCILIATION`.

O melhor fluxo financeiro atual ainda é orquestrado pelos scripts de monitoramento. A próxima mudança estrutural é torná-lo um job institucional `MONITORING`.

## 9. CI e validações: o que elas provam hoje

O workflow geral `ci.yml` executa testes, typecheck e build e é uma proteção importante contra regressões de código.

Ainda assim, **CI verde não significa que a plataforma institucional esteja integrada ou publicada**. Neste baseline:

- o frontend legado e o backend institucional são testados/compilados em contratos diferentes;
- ainda não existe teste ponta a ponta de um frontend fiscal novo usando um backend implantado e um Supabase dedicado;
- os workflows de validação integral do monitoramento nasceram em feature branches específicas e precisam ser consolidados como política durável quando `MONITORING` virar capacidade institucional;
- validações live contra fontes externas continuam sendo tratadas separadamente do CI determinístico, para que indisponibilidade do FNDE não seja confundida com regressão do código.

Portanto, ao avaliar o estado do projeto, conferir **qual camada foi validada** e não transformar “build passou” em “produto implantado”.

## 10. Próxima sequência técnica aprovada

1. **Consolidação documental e baseline técnico**.
2. **`MONITORING` institucional**: PDDEInfo → SIGEF → operacional → fiscal → artefatos.
3. **Supabase dedicado + persistência/read model financeiro corrente**.
4. **API fiscal** orientada à carteira e ao prontuário de cada escola.
5. **Frontend novo + publicação**, somente depois de haver contrato de leitura adequado.
6. **Ampliação de fontes e fechamento de lacunas**, seguida de limpeza do legado.

## 11. Regra para retomar o projeto em outro chat

Antes de alterar código, um novo chat deve:

1. ler `README.md`;
2. ler este baseline;
3. ler `docs/CONHECIMENTO_ACUMULADO.md`;
4. ler `docs/DECISOES.md`, `docs/FONTES_E_REGRAS.md` e `docs/VISAO_FISCAL.md` quando a tarefa tocar essas áreas;
5. verificar a `main` atual no GitHub e comparar com o SHA deste baseline;
6. ler o código real da área a ser alterada;
7. não assumir que um handoff antigo é mais atual do que a `main`.

Se o código e este baseline divergirem porque o projeto evoluiu, **o código atual e as evidências da execução mais recente prevalecem**, e a documentação deve ser atualizada sem apagar o histórico útil.