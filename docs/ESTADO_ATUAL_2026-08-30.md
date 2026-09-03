# Estado operacional atual — 30/08/2026

Este documento substitui o checkpoint de 19/08/2026 como **índice factual do estado corrente** da Plataforma de Inteligência Financeira PDDE | 4ª CRE. Documentos com datas anteriores continuam úteis como baseline, auditoria ou registro de decisão, mas não devem ser usados isoladamente para concluir o que está ou não implantado hoje.

## Escopo corrente

- Carteira institucional: **163 unidades escolares da 4ª CRE / SME-Rio**.
- Exercício operacional: **2026**.
- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `extrator-pdde-4cre`: referência histórica/técnica.
- `EXTRATOR-PDDE-MANUS`: projeto paralelo somente leitura para este fluxo.

## O que está materializado

### Coleta e inteligência financeira

- consulta PDDEInfo por INEP;
- coleta do extrato público SIGEF para contas elegíveis;
- conciliação determinística entre pagamento informado e crédito compatível;
- recuperação complementar de conta/liberação no SIGEF quando aplicável;
- relatórios públicos complementares do PDDEInfo/FNDE para atendimento, prestação de contas e saldos;
- snapshots e série mensal de saldos/aplicações de 2026;
- classificação auxiliar neutra das movimentações, preservando histórico/documento original;
- job institucional `MONITORING` implementado em código;
- read model fiscal/técnico e read model financeiro humano separados;
- Excel humano e Excel técnico/auditoria.

### Produto web publicado

O frontend React/Vite está publicado no Vercel e possui:

- Home financeira;
- busca por escola;
- carteira das 163 unidades;
- visões globais de **Escolas, Repasses, Contas e saldos, Evolução mensal, Movimentações, Cadastro e habilitação, Pendências e suspensões, Prestação de contas e Cobertura das fontes**;
- indicadores acionáveis;
- prontuário financeiro por escola;
- navegação do prontuário por `Resumo`, `Cadastro`, `Repasses`, `Contas e saldos`, `Movimentações`, `Pendências` e `Prestação de contas` quando houver dados;
- composição do saldo e série mensal;
- extrato de movimentações;
- consulta ao vivo da carteira com progresso por unidade;
- download do Excel humano diretamente da Home, sempre derivado do mesmo retrato financeiro que está sendo exibido;
- preservação do retrato anterior quando a atualização falha ou termina parcial;
- deep links da SPA no ambiente Vercel.

## O que ainda não está implantado definitivamente

- **Supabase dedicado** para esta plataforma;
- aplicação das migrations no banco canônico definitivo;
- persistência durável das consultas disparadas pelo site;
- fila/worker institucional permanentemente conectado ao frontend publicado;
- persistência durável de artefatos/evidências das consultas web em infraestrutura dedicada;
- credencial oficial e ativação do Portal da Transparência como fonte operacional;
- PDF executivo final.

Enquanto o Supabase dedicado não for conectado, uma consulta ao vivo completa atualiza a sessão do navegador. Recarregar a página retorna ao retrato estável publicado.

## Regras financeiras que continuam obrigatórias

1. `Pagamento informado` não equivale a crédito bancário.
2. Ordem FNDE/OB e crédito observado são fatos distintos.
3. A expressão humana preferida é `Crédito compatível localizado`, salvo evidência mais forte.
4. Saldo sempre carrega data de referência; não é saldo bancário em tempo real.
5. Saldo aplicado não é rendimento.
6. Ausência de dado não é zero.
7. Cobertura parcial não prova ausência.
8. Dados históricos não completam silenciosamente lacunas de 2026.
9. Fontes independentes não se sobrescrevem.
10. Conciliação financeira é determinística e testável; IA não decide regularidade financeira.

## Hierarquia documental

Para evitar que fotografias antigas do projeto sejam confundidas com estado corrente:

1. **README.md** — visão operacional resumida atual;
2. **este documento** — estado corrente consolidado;
3. `FONTES_E_REGRAS.md` — regras de evidência e maturidade das fontes;
4. `VISUAL_PRODUCT_CONSTITUTION_2026.md` — princípios permanentes de apresentação;
5. `DECISOES.md` — registro datado de decisões, não status operacional;
6. `BASELINE_*.md`, auditorias e planos datados — fotografias históricas que permanecem válidas apenas no contexto de sua data.

Em caso de conflito sobre **o que existe hoje**, prevalecem o código da `main`, os testes/verificações do commit corrente, o README e este estado operacional, nessa ordem.


## Manutenção técnica e qualidade — 30/08/2026

O ciclo de manutenção de dependências foi isolado das frentes de completude financeira e segurança semântica. O objetivo é modernizar infraestrutura e testes sem alterar regras financeiras.

### Atualizações aprovadas para produção

- Vite 8.2.2;
- Vitest 4.1.11;
- @vitejs/plugin-react 6.1.1;
- @supabase/supabase-js 2.112.4;
- @tanstack/react-virtual 3.14.10;
- @electric-sql/pglite 0.5.8;
- @types/react-dom 19.2.5;
- Motion 13.1.1;
- GitHub Actions checkout/setup-node/upload-artifact em v6/v6/v7;
- Dependabot semanal para npm e GitHub Actions;
- remoção da dependência opcional explícita @rollup/rollup-linux-x64-gnu.

### Novos gates de qualidade

- @playwright/test para jornadas reais em Chromium;
- @axe-core/playwright para regressões de acessibilidade;
- MSW para testes de integrações HTTP sem substituir manualmente fetch;
- execução E2E em desktop e mobile dentro do workflow de smoke do produto.

A dívida conhecida de contraste permanece explicitamente rastreada no teste de acessibilidade; violações críticas ou sérias inesperadas continuam bloqueando o gate.

### Atualização deliberadamente adiada

Zod permanece em 4.4.3. A série 4.5 não foi promovida neste ciclo porque a decisão do projeto exige maturação e benchmark antes da atualização. Compatibilidade aparente em CI não substitui esse gate.

## Relação com PRs pendentes

As frentes de completude financeira e segurança semântica permanecem separadas. O refresh de dependências é construído diretamente sobre a `main` para que possa ser validado e promovido sem carregar alterações funcionais dessas frentes.


## Publicação do refresh em 30/08/2026

O refresh de dependências e gates foi integrado à `main` pelo PR #45, com merge funcional em `6711ccf81ea458cb84563710102cd6a8270d6408`.

Os gates pós-merge da `main` foram aprovados:

- `Verificação contínua`: run `33339818684`, `success`;
- `Frontend Product Smoke 2026`: run `33339818696`, `success`, incluindo jornada Playwright desktop/mobile e Axe.

A publicação do novo commit no Vercel ficou **externamente bloqueada** em 30/08/2026 pela cota diária do plano gratuito: `api-deployments-free-per-day`, 100/100 deployments consumidos, 0 restantes. A própria API da Vercel informou reset para **31/08/2026 às 19:46:57 (America/Sao_Paulo)**.

Até esse reset, o domínio público continua servindo com segurança o deployment anterior `dpl_BcgcVXiFv3vcRoZ1BCw3gMBFNMAF`, associado ao commit `6cab204dcd2bc49da233a1d8fca966b2607b3d36`. O deep link `/repasses` respondeu HTTP 200 e `/api/live` respondeu HTTP 405 para GET, conforme contrato. A consulta de erros de runtime da última hora retornou zero ocorrências.

**Consequência:** código, CI e documentação do refresh estão integrados à `main`; a promoção do novo build para o domínio público não pode ser afirmada como concluída enquanto a Vercel não aceitar um novo deployment. Não promover previews antigos do PR #43, pois pertencem à pilha #41/#42.


## Fechamento de produção — 31/08/2026

Após o reset da cota diária da Vercel, a integração Git foi acionada novamente a partir da `main` sem qualquer alteração funcional adicional. O commit `107a78d92de0d089445cdeb3911d98cdf4f3b859` possui a mesma árvore validada `1232a855796c307a00739ff8fa5358e9185d8522` do checkpoint anterior e serviu exclusivamente para disparar a publicação.

A publicação foi concluída com sucesso:

- deployment Vercel: `dpl_J74Zef4USvkMjjPG21yXLbRM1gGv`;
- target: `production`;
- branch: `main`;
- commit publicado: `107a78d92de0d089445cdeb3911d98cdf4f3b859`;
- estado: `READY`;
- `aliasError`: ausente;
- aliases canônicos atribuídos, incluindo `pdde-repasse-conciliador.vercel.app`;
- build Vite 8.2.2 cliente + SSR concluído com sucesso;
- `npm ci`: concluído;
- auditoria de dependências do build: 0 vulnerabilidades.

Homologação pública após a promoção:

- `/repasses`: HTTP 200;
- `/saldos`: HTTP 200;
- `/unidades`: HTTP 200;
- `/api/live` via GET: HTTP 405, conforme contrato do endpoint;
- erros de runtime na última hora: zero.

O bloqueio por quota registrado em 30/08 permanece apenas como histórico. O refresh de dependências e gates está, a partir de 31/08/2026, **integrado à `main`, validado e publicado em produção**.

Os PRs #41 e #42 permanecem Draft e continuam fora desta publicação. O antigo PR #43 não deve ser promovido.


## Exportação do retrato exibido — 02/09/2026

O produto web passa a expor a ação **Baixar planilha Excel** ao lado de **Fazer nova consulta**. A exportação reutiliza o gerador canônico da planilha humana e não dispara uma segunda coleta:

- no estado inicial, o arquivo é derivado do snapshot publicado;
- após uma consulta ao vivo completa, o arquivo é derivado dos mesmos 163 prontuários mantidos na sessão e usados pela interface;
- cobertura escolar incompleta bloqueia a exportação;
- nome do arquivo: `inteligencia-financeira-pdde-4cre-2026.xlsx`;
- ExcelJS é carregado sob demanda apenas quando a exportação é solicitada.

A limitação de persistência permanece a mesma: enquanto não houver publicação durável do novo retrato, recarregar a página retorna ao snapshot estável publicado.


## Ampliação do universo de informação — 02/09/2026

A implementação corrente amplia o read model humano e os produtos de apresentação para aproveitar informações oficiais antes descartadas ou não coletadas.

### Dados incorporados

- programação por custeio e capital;
- ajustes por custeio e capital;
- pagamento informado por custeio e capital;
- quantidade de alunos do relatório de atendimento;
- cadastro, mandato e atualização da UEx;
- situação de abertura de conta;
- ocorrência textual da conta publicada no PDDEInfo;
- suspensões e seus motivos;
- cobertura explícita por conjunto de fonte.

### Arquitetura do site

Navegação global:

- Visão geral;
- Escolas;
- Repasses;
- Contas e saldos;
- Evolução mensal;
- Movimentações;
- Cadastro e habilitação;
- Pendências e suspensões;
- Prestação de contas;
- Cobertura das fontes.

Prontuário da escola:

- Resumo;
- Cadastro;
- Repasses;
- Contas e saldos;
- Movimentações, quando houver;
- Pendências;
- Prestação de contas, quando houver.

### Excel humano

A exportação canônica passa a usar dez abas:

1. Visão Geral;
2. Escolas;
3. Repasses;
4. Contas e Saldos;
5. Evolução Mensal;
6. Movimentações;
7. Cadastro e Habilitação;
8. Pendências e Suspensões;
9. Prestação de Contas;
10. Cobertura das Fontes.

### Regra de cobertura

Cadastro, abertura de conta e suspensão são conjuntos complementares. Falha técnica nesses relatórios fica registrada como cobertura indisponível e **não converte um resultado financeiro completo em ausência de dado nem apaga o retrato anterior**. Atendimento, prestação de contas, saldo e a cadeia PDDEInfo/SIGEF continuam sujeitos aos gates de completude financeira já existentes.

### Fontes ainda fora do pipeline corrente

- Portal da Transparência: cliente implementado, sem credencial oficial configurada;
- SiGPC Acesso Público: candidato a segunda evidência de prestação;
- painéis PDDE Total/Básico/Ações Integradas: candidatos a controle secundário;
- Dados Abertos FNDE: candidato a controle/backfill;
- SIGPC Ágil: lançado em 31/08/2026, mas UEx não integram a fase inicial informada pelo FNDE.

Essas fontes não são apresentadas como integradas antes de piloto/contrato real.
