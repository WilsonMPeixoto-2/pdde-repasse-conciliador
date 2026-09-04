> [!IMPORTANT]
> **DOCUMENTO HISTÓRICO.** Este arquivo registra a fotografia de 30/08–03/09/2026 e foi supersedido como estado corrente por [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md). Não use as expressões “estado atual”, “pendente” ou “próximo passo” abaixo para decidir ações presentes sem primeiro ler `LEIA_PRIMEIRO.md` e o estado soberano mais recente.

# Estado operacional — fotografia iniciada em 30/08/2026

Este documento substituiu o checkpoint de 19/08/2026 **naquele momento**. Desde 04/09/2026 ele é histórico. As seções abaixo são preservadas para registrar a evolução material do projeto e não para determinar o estado corrente.

## Escopo corrente naquele checkpoint

- Carteira institucional: **163 unidades escolares da 4ª CRE / SME-Rio**.
- Exercício operacional: **2026**.
- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `extrator-pdde-4cre`: referência histórica/técnica.
- `EXTRATOR-PDDE-MANUS`: projeto paralelo somente leitura para este fluxo.

## O que estava materializado

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

O frontend React/Vite estava publicado no Vercel e possuía:

- Home financeira;
- busca por escola;
- carteira das 163 unidades;
- visões globais de **Escolas, Repasses, Contas e saldos, Evolução mensal, Movimentações, Cadastro e habilitação, Pendências e suspensões, Prestação de contas e Cobertura das fontes**;
- indicadores acionáveis;
- prontuário financeiro por escola;
- navegação do prontuário por `Resumo`, `Cadastro`, `Repasses`, `Contas e saldos`, `Movimentações`, `Pendências` e `Prestação de contas` quando havia dados;
- composição do saldo e série mensal;
- extrato de movimentações;
- consulta ao vivo da carteira com progresso por unidade;
- download do Excel humano diretamente da Home, derivado do retrato financeiro exibido;
- preservação do retrato anterior quando a atualização falhava ou terminava parcial;
- deep links da SPA no Vercel.

## O que ainda não estava implantado definitivamente naquele checkpoint

- **Supabase dedicado** para esta plataforma;
- aplicação das migrations no banco canônico definitivo;
- persistência durável das consultas disparadas pelo site;
- fila/worker institucional permanentemente conectado ao frontend publicado;
- persistência durável de artefatos/evidências das consultas web em infraestrutura dedicada;
- credencial oficial e ativação do Portal da Transparência como fonte operacional;
- PDF executivo final.

Naquele estado, uma consulta ao vivo completa atualizava a sessão do navegador e recarregar a página retornava ao retrato estável publicado. **Essa afirmação foi parcialmente supersedida em 04/09 pela promoção automática e durável do snapshot integral validado via Git/Vercel.**

## Regras financeiras que permanecem válidas

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

## Hierarquia documental histórica deste arquivo

A hierarquia que constava neste checkpoint foi substituída pela cadeia soberana de `AGENTS.md`, `LEIA_PRIMEIRO.md`, `ESTADO_ATUAL_2026-09-04.md` e `INDICE_DOCUMENTAL.md`.

## Manutenção técnica e qualidade — 30/08/2026

O ciclo de manutenção de dependências foi isolado das frentes de completude financeira e segurança semântica. O objetivo era modernizar infraestrutura e testes sem alterar regras financeiras.

### Atualizações aprovadas para produção naquele ciclo

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
- MSW para testes de integrações HTTP;
- execução E2E em desktop e mobile dentro do workflow de smoke do produto.

A dívida conhecida de contraste permanecia explicitamente rastreada; violações críticas ou sérias inesperadas continuavam bloqueando o gate.

### Atualização deliberadamente adiada

Zod permanecia em 4.4.3 naquele ciclo, condicionado a maturação e benchmark.

## Publicação do refresh em 30/08/2026

O refresh de dependências e gates foi integrado à `main` pelo PR #45, com merge funcional em `6711ccf81ea458cb84563710102cd6a8270d6408`.

Gates pós-merge:

- `Verificação contínua`: run `33339818684`, `success`;
- `Frontend Product Smoke 2026`: run `33339818696`, `success`.

A publicação ficou temporariamente bloqueada pela cota diária da Vercel. Até o reset, o domínio continuou servindo o deployment anterior `dpl_BcgcVXiFv3vcRoZ1BCw3gMBFNMAF`.

## Fechamento de produção — 31/08/2026

Após o reset da cota, a integração Git foi acionada novamente a partir da `main` pelo commit `107a78d92de0d089445cdeb3911d98cdf4f3b859`, sem alteração funcional adicional.

A publicação foi concluída:

- deployment Vercel `dpl_J74Zef4USvkMjjPG21yXLbRM1gGv`;
- `production`;
- `main`;
- estado `READY`;
- aliases canônicos atribuídos;
- build Vite concluído;
- auditoria de dependências do build: 0 vulnerabilidades.

Homologação pública daquele checkpoint:

- `/repasses`: HTTP 200;
- `/saldos`: HTTP 200;
- `/unidades`: HTTP 200;
- `/api/live` via GET: HTTP 405 conforme contrato;
- erros de runtime na última hora: zero.

## Exportação do retrato exibido — 02/09/2026

O produto passou a expor **Baixar planilha Excel** ao lado de **Fazer nova consulta**. A exportação reutiliza o gerador canônico e não dispara uma segunda coleta.

- estado inicial: arquivo derivado do snapshot publicado;
- após consulta ao vivo completa: arquivo derivado dos mesmos 163 prontuários exibidos;
- cobertura escolar incompleta bloqueia exportação;
- nome: `inteligencia-financeira-pdde-4cre-2026.xlsx`;
- ExcelJS carregado sob demanda.

## Ampliação do universo de informação — 02/09/2026

O read model humano e os produtos passaram a incorporar:

- programação por custeio/capital;
- ajustes por custeio/capital;
- pagamento informado por custeio/capital;
- quantidade de alunos;
- cadastro/mandato/atualização da UEx;
- situação de abertura de conta;
- ocorrência textual da conta;
- suspensões/motivos;
- cobertura por conjunto de fonte.

### Navegação global daquele marco

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

### Excel humano

Dez abas correspondentes às mesmas dimensões operacionais.

### Regra de cobertura

Cadastro, abertura de conta e suspensão eram conjuntos complementares. Falha técnica nesses relatórios não deveria converter um resultado financeiro completo em ausência de dado nem apagar o retrato anterior.

### Fontes ainda fora do pipeline naquele momento

- Portal da Transparência sem credencial oficial;
- SiGPC Acesso Público como candidato;
- painéis PDDE como candidatos a controle secundário;
- Dados Abertos FNDE como candidato a controle/backfill;
- SIGPC Ágil sem UEx na fase inicial pesquisada.

## Comparação antes × depois da consulta ao vivo — 03/09/2026

A ação `Fazer nova consulta` passou a gerar comparação explícita entre retrato anterior e os 163 prontuários produzidos pela nova consulta, incluindo totais, referências, contagens, escolas alteradas e fontes indisponíveis.

Requisições às fontes passaram a solicitar `no-cache/no-store` onde aplicável.

## Supersessão em 04/09/2026

Este documento termina antes do fechamento dos PRs #55/#56. A partir de 04/09, o sistema passou a promover automaticamente o snapshot integral validado para `main`/Vercel, com proveniência da run/artefato e prova do manifesto público. Para esse estado, ler `ESTADO_ATUAL_2026-09-04.md` e `PRODUCTION_CHECKPOINT_2026-09-04.md`.