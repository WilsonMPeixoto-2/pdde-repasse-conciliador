# Estado operacional atual — 04/09/2026

**Este é o documento soberano de estado corrente a partir de 04/09/2026.**  
Documentos `ESTADO_ATUAL_*`, checkpoints e auditorias com data anterior permanecem como registros históricos e não devem ser usados isoladamente para concluir o que está implantado hoje.

## 1. Escopo corrente

- Carteira: **163 unidades escolares da 4ª CRE / SME-Rio**.
- Exercício operacional: **2026**.
- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- Produto: plataforma de inteligência financeira PDDE com site e Excel derivados do mesmo universo de informação.
- Objetivo principal: maximizar confiabilidade, completude, rastreabilidade e explicabilidade dos dados, sem transformar ausência, atraso de fonte ou inconsistência em uma conclusão falsa.

## 2. Estado de produção efetivamente verificado

### 2.1. Coleta integral oficial mais recente deste checkpoint

Workflow: `SIGEF Full 163 Validation`

- run number: **#216**;
- run id: `33906605579`;
- branch: `main`;
- head SHA: `c91c64f959a1f6dfcf335147565136fc0bf6a123`;
- conclusão: **success**;
- coleta/materialização: **success**;
- gate `COMPLETE` + 163/163: **success**;
- preservação do produto/evidências: **success**.

Artefato integral:

- nome: `sigef-full-163-2026`;
- artifact id: `9950830049`;
- SHA-256 publicado pelo GitHub Actions: `f3fa9d4324d8a9b1b341efba8960f9d0324b9fbf53401a355d471d41fa75ab22`;
- tamanho aproximado: 3,97 MB;
- não expirado no momento da validação.

### 2.2. Promoção automática do snapshot

Workflow: `Publicar snapshot financeiro validado`

- run id: `33909648939`;
- conclusão: **success**;
- commit gerado automaticamente: `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- mensagem: `data: publica snapshot financeiro validado run 33906605579`.

O manifest em `public/data/pdde-2026-snapshot.json` passou a registrar:

- `workflowRunId: 33906605579`;
- `artifactId: 9950830049`;
- `artifactName: sigef-full-163-2026`;
- `publishedAt: 2026-09-04T19:08:59.475Z`;
- snapshot dividido em 16 partes gzip/base64.

### 2.3. Vercel

Deployment associado ao commit de dados:

- deployment id: `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`;
- target: `production`;
- state: **READY**;
- commit SHA: `6004178a0394dfe011baa6dda7c4f6e87f028180`.

A consulta direta ao manifesto no alias de produção retornou HTTP 200 e os mesmos IDs `33906605579 / 9950830049`.

**Conclusão:** a cadeia coleta -> validação -> artefato -> snapshot -> main -> Vercel -> manifesto público foi comprovada ponta a ponta.

## 3. Problema estrutural encerrado em 04/09

Antes da correção, uma nova coleta podia produzir dados atuais, mas o site continuava iniciando com um snapshot histórico vinculado a:

- workflow run id `32164281411`;
- artifact id `9335143477`.

Isso criava a impressão correta de que o botão pesquisava de novo, mas os dados estáveis publicados quase não mudavam. O problema não era apenas frescor da fonte: **coleta e publicação estavam desacopladas**.

A solução foi implementada nos PRs #55 e #56:

### PR #55 — promoção automática do snapshot validado

Merge commit: `333948109de8ec8593500c23340b65df27484079`.

Passou a exigir:

1. execução `SIGEF Full 163 Validation` na `main`;
2. conclusão `success`;
3. sessão `COMPLETE`;
4. `schoolCount == 163`;
5. download do artefato da **mesma execução aprovada**;
6. materialização de portfólio + 163 prontuários;
7. validação do snapshot reidratado;
8. prevenção contra regressão para run mais antiga;
9. commit automático em `main`;
10. deploy Vercel pela integração Git.

### PR #56 — Chromium no runner integral

Merge commit: `c91c64f959a1f6dfcf335147565136fc0bf6a123`.

A primeira execução pós-PR #55, run #213 (`33902315275`), processou 163 escolas, mas terminou `PARTIAL` por três falhas de `BALANCE` causadas pela ausência de Chromium no runner. As falhas eram da mesma UEx, CNPJ `12.290.969/0001-23`, nos meses 05/2026, 06/2026 e 07/2026.

A correção instalou explicitamente:

`npx playwright install --with-deps chromium`

antes da coleta integral. O gate não foi enfraquecido. A execução seguinte oficial, #216, passou integralmente.

## 4. Falha externa conhecida que não deve ser confundida com bug do sistema

O relatório público de abertura de conta do FNDE/PDDEInfo retornou falha para as 163 UEx com erro Oracle:

`ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`

Essa falha é classificada como `ACCOUNT_OPENING` e é **suplementar**, não nuclear. O sistema preserva a falha e a cobertura indisponível, mas não transforma isso em ausência de conta nem derruba uma coleta financeira que possui cobertura suficiente pelas fontes nucleares.

Falhas bloqueantes continuam sendo, entre outras, as que afetam atendimento, prestação/contabilidade e saldo (`ATTENDANCE`, `ACCOUNTING`, `BALANCE`, `BALANCE_MONTH_DISCOVERY`).

## 5. Política de tempo de execução

Decisão explícita de 04/09/2026:

**qualidade prevalece sobre velocidade.**

Uma coleta integral pode levar muitos minutos. Isso não é problema se:

- a execução continua progredindo;
- retries/fallbacks estão funcionando;
- fontes estão sendo cruzadas;
- divergências estão sendo investigadas;
- não houve timeout/cancelamento/erro bloqueante.

Não reduzir profundidade de coleta para terminar rápido. O workflow integral atualmente possui `timeout-minutes: 120`, e o tempo disponível deve ser tratado como margem de segurança, não meta de duração.

## 6. Fontes em uso e maturidade atual

### Integradas / produtivas

- PDDEInfo principal por INEP;
- relatórios públicos PDDEInfo/FNDE para atendimento, prestação/contabilidade, saldos e aplicações;
- cadastro/mandato e demais campos complementares quando a fonte responde adequadamente;
- SIGEF extrato público e movimentações;
- recuperação complementar SIGEF para conta/liberação quando aplicável;
- fallback Playwright/Chromium quando o HTTP direto não basta.

### Integradas em código, mas condicionais/desabilitadas

- Portal da Transparência/CGU: cliente existente, mas não influencia conclusão corrente sem credencial oficial e piloto válido.

### Pesquisadas e candidatas

- SiGPC Acesso Público: candidato forte para segunda evidência de prestação de contas; precisa integração permitida e robusta diante de WAF;
- Dados Abertos FNDE: candidato para backfill/controle secundário, condicionado ao frescor real de 2026;
- painéis PDDE Total/Básico/Ações Integradas: controle cruzado e descoberta, não fonte nuclear sem exportação estável e auditável;
- novo Webservice SIGEF: existência/operação de extrato confirmada em pesquisa, mas sem credencial/documentação operacional suficiente;
- BB Gestão Ágil: potencial fonte institucional rica, sem integração atual;
- Plataforma Antonieta de Barros: potencial, ainda sem conexão produtiva certificada;
- SIGPC Ágil: não aplicável às 163 UEx na fase inicial pesquisada em setembro;
- PDDEREx: legado, não usar como fonte corrente salvo investigação histórica específica.

## 7. Regras financeiras e de coerência em vigor

1. ausência de dado não é zero;
2. zero somente é conhecido quando publicado por fonte válida na referência correspondente;
3. pagamento informado não equivale a crédito bancário;
4. ordem/liberação não equivale automaticamente a crédito observado;
5. crédito compatível exige associação por chave forte, não por valor parecido isolado;
6. saldo é fato datado;
7. conta corrente zero não significa ausência de recurso se aplicações/saldo total forem positivos;
8. aplicação/resgate não prova rendimento nem posição atual por si só;
9. dado histórico não preenche lacuna corrente de 2026;
10. fontes independentes não se sobrescrevem silenciosamente;
11. divergência entre fontes é um achado a investigar, não algo a esconder;
12. cobertura incompleta, erro de fonte ou consulta inconclusiva permanecem explícitos;
13. estado `PARTIAL` não substitui retrato válido anterior;
14. uma coleta integral nova só vira retrato publicado após o gate `COMPLETE 163/163`.

## 8. Evolução dos dados observada em setembro

A rodada integral concluída em 02/09/2026 comprovou que a consulta ao vivo realmente volta às fontes e pode detectar mudanças. Naquela comparação:

- total programado passou de R$ 2.182.050,00 para R$ 2.238.502,00;
- a mudança concentrou-se em 17 novos registros de Educação Conectada;
- pagamento informado permaneceu em R$ 827.615,00;
- crédito compatível SIGEF permaneceu em R$ 409.010,00;
- saldo observado permaneceu em R$ 1.644.171,85;
- aplicações permaneceram em R$ 1.368.045,22;
- referência de saldo permanecia 31/07/2026.

A conclusão importante não é que os números ficaram iguais, mas que **frescor da coleta e alteração do dado são coisas diferentes**. Uma execução pode ser atual e retornar os mesmos valores porque a fonte oficial ainda não publicou fatos novos.

## 9. Produto web e Excel

O produto web oferece, conforme os dados disponíveis:

- visão geral;
- escolas;
- repasses;
- contas e saldos;
- evolução mensal;
- movimentações;
- cadastro/habilitação;
- pendências/suspensões;
- prestação de contas;
- cobertura das fontes;
- prontuário por escola;
- botão de atualização/coleta;
- download do Excel humano/gerencial derivado do mesmo retrato.

Site e Excel compartilham o mesmo domínio de informação, mas não precisam ter a mesma densidade visual.

## 10. Persistência e infraestrutura ainda não institucionalizadas definitivamente

O repositório contém componentes para persistência institucional, fila, worker, evidência append-only, read models e migrations, mas ainda é necessário distinguir código existente de implantação definitiva.

Continuam como fronteiras futuras relevantes:

- Supabase dedicado e permanentemente conectado;
- persistência durável das consultas disparadas pelo site e seus artefatos;
- histórico persistente de execuções consultável pela interface;
- integrações adicionais de fontes somente após piloto e autorização adequados.

A promoção automática do snapshot validado já resolve a persistência **publicada via Git/Vercel** do retrato integral aprovado, mas não substitui uma camada institucional de banco/histórico de execução.

## 11. Próximo ponto de retomada

Para qualquer novo chat:

1. ler `docs/LEIA_PRIMEIRO.md`;
2. usar este arquivo como estado corrente;
3. ler `docs/CONTINUIDADE_WORK.md` para a fila de ações;
4. conferir `main`, workflows e produção antes de alterar código;
5. não reabrir como hipóteses problemas já resolvidos nos PRs #55/#56;
6. não repetir pesquisa de fontes já classificada sem verificar `FONTES_E_REGRAS.md` e `CONHECIMENTO_ACUMULADO.md`.

## 12. Evidência de fechamento deste checkpoint

Em 04/09/2026, a produção deixou de servir o snapshot histórico `32164281411 / 9335143477` e passou a servir o snapshot novo `33906605579 / 9950830049`.

Esse é o critério que permite declarar a extração atualizada **concluída, validada, promovida e publicada** neste checkpoint.