# Histórico consolidado — 12/08/2026 a 04/09/2026

**Finalidade:** preservar a trajetória material do projeto, os problemas enfrentados, decisões tomadas, soluções adotadas e motivos das mudanças, sem obrigar futuros chats a reconstruírem tudo por commits, auditorias e conversas dispersas.

Este documento é histórico. Para o estado corrente, usar `ESTADO_ATUAL_2026-09-04.md`.

---

## 12/08/2026 — Consolidação do repositório canônico e regras de verdade

O projeto foi reorganizado para evitar linhas paralelas e inferências financeiras frágeis.

Decisões estruturantes:

- `WilsonMPeixoto-2/pdde-repasse-conciliador` torna-se o repositório canônico;
- `extrator-pdde-4cre` permanece apenas como referência histórica/técnica;
- `EXTRATOR-PDDE-MANUS` permanece somente leitura neste fluxo;
- o exercício operacional corrente é 2026;
- histórico não completa lacunas correntes;
- ausência não é zero;
- pagamento informado, ordem/liberação e crédito observado são fatos diferentes;
- fontes independentes não se sobrescrevem silenciosamente;
- conclusões financeiras permanecem determinísticas;
- dinheiro crítico usa centavos inteiros;
- correspondência exige a chave mais forte disponível, não apenas valor parecido;
- CAPTCHA/autenticação não são contornados.

Essa base é importante porque vários problemas posteriores nasceram justamente de ambiguidades entre “a fonte disse”, “o sistema concluiu” e “o usuário viu”.

## 13/08/2026 — Evidência append-only e continuidade

Foi consolidada a ideia de preservar observações e artefatos como trilha histórica, em vez de reescrever o passado para parecer “estado atual”. Handoffs, prompts e materiais brutos foram preservados como memória, mas sem autoridade maior que código, testes e estado remoto real.

A partir daí, o projeto passa a diferenciar:

- fatos observados por fonte;
- conclusões do conciliador;
- projeção humana para site/Excel;
- evidência técnica de auditoria.

## 14/08/2026 — Baseline integral PDDEInfo + SIGEF

Foi executada e documentada uma rodada integral sobre a carteira de 163 escolas.

Resultados do baseline:

- 163/163 escolas concluídas no PDDEInfo;
- 284/284 contas SIGEF então mapeadas concluídas;
- 520 registros de repasse/parcela;
- 394 movimentos pertencentes a 2026;
- movimentos históricos recebidos no bruto ficaram fora da visão corrente;
- R$ 827.615,00 em pagamento informado no retrato;
- R$ 409.010,00 em créditos compatíveis localizados no SIGEF naquele momento.

Aprendizados:

- o SIGEF pode devolver histórico amplo, mas isso não autoriza usar movimento antigo como prova de 2026;
- agência, conta, CNPJ, INEP e documentos são identificadores textuais;
- contas com dígito `X` não podem virar número;
- paginação precisa provar cobertura antes de ausência ser concluída;
- parser desconhecido deve falhar explicitamente;
- retries tratam instabilidade como instabilidade, não como “sem dados”.

## 15–16/08/2026 — Ampliação para relatórios públicos complementares

A investigação mostrou que o ecossistema público FNDE/PDDEInfo continha muito mais informação que a interface original utilizava.

Foram incorporados e validados relatórios para atendimento/repasse, prestação de contas e posições mensais de saldo/aplicações.

Baseline de 16/08:

- 163 CNPJs de UEx localizados;
- 169 registros de atendimento/repasse;
- 311 registros de prestação de contas;
- 2.690 posições mensais de saldo;
- 461 séries conta/programa;
- cobertura então disponível de janeiro a junho/2026;
- 0 falhas de coleta e 0 inconsistências aritméticas no baseline.

Mudança conceitual importante: movimentos de aplicação/resgate observados no extrato não são suficientes para inferir posição aplicada atual. Quando a fonte publica saldo/aplicação por referência, esse fato datado é preservado separadamente.

## 16–19/08/2026 — Read model humano e frontend

O projeto deixou de pensar apenas em tabelas técnicas e passou a estruturar uma experiência orientada pela escola.

Hierarquia humana consolidada:

`4ª CRE -> Escola -> Programa/Ação -> Conta -> Parcela -> Movimentações -> Evidência`.

Regras de produto:

- interface comum não deve expor hashes, parser, retry, payload ou URL técnica como conteúdo principal;
- indicador agregado deve levar aos casos que o compõem;
- site e Excel são produtos irmãos, mas não precisam ser idênticos;
- cobertura da fonte deve ser visível;
- a consulta ao vivo não pode criar duas verdades na mesma sessão;
- resultado parcial não substitui retrato válido.

## 20–21/08/2026 — Leitura operacional da escola e regressões de frontend

Os PRs #37 e #38 consolidaram a leitura operacional por escola e a navegação do prontuário.

Durante os gates foram encontrados e eliminados problemas que não devem ser redescobertos como novidade:

1. o workflow visual testava apenas um retrato publicado e não exercitava o novo prontuário determinístico;
2. ao corrigir o gate, fixtures antigos apareceram;
3. o fixture foi migrado para o snapshot `gzip-base64-parts`;
4. surgiu expectativa antiga de ordenação e o smoke foi atualizado para a regra corrente;
5. um seletor acessível ambíguo foi corrigido;
6. inspeção visual revelou extrato sem estrutura;
7. a causa era um CSS existente não importado;
8. teste de integração passou a proteger o import.

Lição: CI verde de uma camada não garante ausência de regressão visual se o gate não exercita a experiência real.

## 30/08/2026 — Atualização de dependências e reforço de gates

As atualizações de infraestrutura foram isoladas das regras financeiras para evitar regressão semântica escondida em refresh de pacote.

Foram incorporados/fortalecidos:

- Playwright Test;
- Axe;
- MSW;
- smoke desktop/mobile;
- validação Linux de build/instalação;
- política conservadora para mudanças de dependências com impacto semântico.

Regra preservada: CI verde não substitui decisão de produto nem prova de dados reais.

## 31/08/2026 — Produção estabilizada após refresh

A documentação registrou a recuperação do deployment Vercel após o ciclo de atualização de dependências. Esse checkpoint passou a ser histórico depois das mudanças de setembro.

## 02/09/2026 — Ampliação do universo informacional do site e Excel

Uma revisão de completude mostrou que existia “um universo” de informação oficial já disponível nas fontes e ainda não levado ao produto humano.

A arquitetura do read model foi ampliada para preservar também:

- programação e pagamento separados em custeio/capital;
- ajustes;
- quantidade de alunos;
- cadastro e mandato da UEx;
- atualização cadastral e contatos quando publicados;
- situação pública de abertura de conta;
- ocorrência da conta;
- suspensões e motivos;
- prestação de contas;
- cobertura nominal das fontes.

A navegação do site e as abas do Excel foram organizadas em dez dimensões operacionais:

1. Visão geral;
2. Escolas;
3. Repasses;
4. Contas e saldos;
5. Evolução mensal;
6. Movimentações;
7. Cadastro e habilitação;
8. Pendências e suspensões;
9. Prestação de contas;
10. Cobertura das fontes.

Regra: fato estruturado não deve ser duplicado como alerta genérico, e ausência de registro não é igual a fonte indisponível.

## 02–03/09/2026 — Prova de frescor e descoberta de novos dados

A nova rodada integral mostrou alteração no total programado:

- antes: R$ 2.182.050,00;
- depois: R$ 2.238.502,00;
- diferença concentrada em 17 novos registros de Educação Conectada.

Ao mesmo tempo, outros totais permaneceram estáveis:

- pagamento informado: R$ 827.615,00;
- crédito compatível SIGEF: R$ 409.010,00;
- saldo: R$ 1.644.171,85;
- aplicações: R$ 1.368.045,22;
- referência de saldo: 31/07/2026.

Aprendizado decisivo: **uma nova coleta pode ser fresca e retornar valores iguais porque a fonte oficial ainda não publicou fatos novos**. Frescor da consulta e mudança do dado não são sinônimos.

## 03/09/2026 — Incoerência aparente entre pagamento e saldo/conta

O usuário destacou um problema de confiança: se uma escola aparece com pagamento informado, como o sistema pode mostrar conta corrente e aplicação zeradas ou não localizar o valor?

A resposta arquitetural passou a ser mais rigorosa:

- não esconder divergência;
- não usar zero como preenchimento de ausência;
- distinguir conta corrente, aplicações e saldo total;
- respeitar a data de referência;
- pesquisar fontes complementares;
- separar pagamento informado de crédito observado;
- manter estado inconclusivo quando a evidência não fecha.

No PDDE Básico, também foi consolidada a leitura operacional do 1º/2º ciclo, preservando os nomes originais das destinações e reconhecendo os caminhos regulares e Primeira Infância apenas como agregação de leitura.

No retrato validado de 31/07/2026:

- 111 unidades tinham pagamento informado na 1ª parcela regular;
- 52 tinham pagamento informado em Primeira Infância P1;
- os conjuntos cobriam as 163 unidades;
- as 52 de Primeira Infância tinham saldo positivo em conta PDDE, sendo 33 com valor em conta corrente e 19 com valor em aplicações.

Isso provou na prática por que `conta corrente = 0` não pode ser interpretado como `recurso = 0`.

## 03/09/2026 — Pesquisa de fontes complementares

Foram verificadas e classificadas novas fontes potenciais:

### SiGPC Acesso Público

- oficialmente público e descrito pelo FNDE como consulta sem cadastro prévio;
- potencial segunda evidência para situação de prestação de contas/UEx;
- prioridade alta para piloto;
- interface legada pode aplicar WAF e precisa estratégia permitida/testável.

### Portal da Transparência / CGU

- API REST oficial ativa;
- endpoints de recursos/documentos por favorecido;
- cliente já existe no repositório;
- requer token oficial obtido por autenticação Gov.br;
- candidato forte como evidência independente por CNPJ/documentos SIAFI.

### Dados Abertos FNDE

- catálogo declara execução financeira do PDDE até nível de escola, saldos e prestação de contas;
- candidato secundário forte e possível backfill;
- frescor desigual exige piloto antes de influenciar conclusão corrente.

### Painéis PDDE Total / Básico / Ações Integradas

- úteis para controle cruzado, descoberta e comparação;
- não devem virar fonte nuclear sem exportação estável e auditável por escola/UEx.

### SIGPC Ágil

- lançado em 31/08/2026;
- recebe dados bancários diretamente do Banco do Brasil em seu desenho;
- na fase pesquisada, UEx não integram o escopo inicial;
- portanto não é fonte operacional das 163 UEx neste momento.

### Novo Webservice SIGEF

- existência e operação de consulta de extrato foram identificadas em pesquisa;
- integração depende de credencial, documentação e homologação institucional.

### BB Gestão Ágil / Plataforma Antonieta de Barros

- potencial relevante;
- sem integração produtiva atual;
- não automatizar interfaces autenticadas como atalho.

## 04/09/2026 — Prova real de atualização e série cronológica

O ciclo associado ao PR #54 aprofundou a prova de dados correntes:

- coleta de série mensal disponível de saldos 2026;
- separação explícita entre posição histórica e localização corrente;
- priorização de fonte bancária oficial para posição corrente quando disponível;
- mapeamento/sondagem de extratos públicos SIGEF;
- proteção contra falso saldo corrente na planilha.

Esse ciclo preparou o terreno para identificar um problema mais profundo: **o dado novo podia ser coletado, mas não necessariamente promovido ao snapshot servido pelo site**.

## 04/09/2026 — Problema de desacoplamento entre coleta e publicação

Foi comprovado que o site ainda iniciava com um snapshot histórico vinculado a:

- workflow run `32164281411`;
- artifact `9335143477`.

Portanto, o sistema tinha duas etapas que não fechavam automaticamente o circuito:

1. coletar novos dados;
2. publicar o novo retrato.

Isso explicava por que o usuário via pouca ou nenhuma mudança mesmo após uma coleta nova.

## 04/09/2026 — PR #55: promoção automática do snapshot validado

Solução arquitetural:

- executar o Full 163 na `main`;
- publicar somente após `success`;
- baixar exatamente o artefato da execução aprovada;
- exigir `COMPLETE 163/163`;
- materializar portfólio + 163 prontuários;
- reidratar/validar o snapshot;
- registrar proveniência `workflowRunId/artifactId`;
- bloquear regressão para run mais antiga;
- commit automático em `main`;
- deixar a integração Git disparar o Vercel.

Merge commit do PR #55: `333948109de8ec8593500c23340b65df27484079`.

## 04/09/2026 — Run #213 falha por ambiente, não por regra de negócio

A execução pós-PR #55 processou 163 escolas e preservou artefato, mas terminou `PARTIAL`.

Diagnóstico do artefato:

- 166 falhas registradas;
- 163 `ACCOUNT_OPENING` vindas de erro Oracle da própria fonte FNDE;
- 3 `BALANCE` bloqueantes para o CNPJ `12.290.969/0001-23`, meses 05/2026, 06/2026 e 07/2026;
- causa das três falhas: Playwright não conseguia iniciar navegador porque Chromium não estava instalado no runner.

Importante: as 163 falhas `ACCOUNT_OPENING` são suplementares e não derrubam a coleta nuclear. As três `BALANCE` eram bloqueantes e corretamente impediram `COMPLETE`.

O gate não foi relaxado para “fazer ficar verde”.

## 04/09/2026 — PR #56: Chromium explícito no Full 163

Correção mínima:

`npx playwright install --with-deps chromium`

foi adicionada antes da coleta integral.

Merge commit: `c91c64f959a1f6dfcf335147565136fc0bf6a123`.

A correção não alterou regra financeira nem transformou falha de fonte em sucesso; apenas tornou o fallback já previsto executável no runner.

## 04/09/2026 — Run #216 fecha o circuito

A execução oficial na `main` passou integralmente:

- run #216;
- run id `33906605579`;
- coleta/materialização: success;
- gate COMPLETE 163/163: success;
- artefato `9950830049` preservado.

O workflow de publicação concluiu com sucesso e gerou o commit:

`6004178a0394dfe011baa6dda7c4f6e87f028180`.

O Vercel criou o deployment:

`dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, estado `READY`.

A verificação direta do manifesto público confirmou:

- `workflowRunId = 33906605579`;
- `artifactId = 9950830049`.

O snapshot histórico anterior deixou de ser servido.

## 04/09/2026 — Decisão explícita sobre duração da coleta

O usuário confirmou que a coleta pode demorar o tempo necessário para maximizar qualidade.

Regra consolidada:

- tempo longo é normal;
- profundidade da investigação não deve ser reduzida para acelerar;
- retries, fallbacks, cruzamentos e tratamento de incoerências devem usar o tempo necessário;
- erro é timeout, cancelamento, falha de fonte, cobertura insuficiente ou estado PARTIAL, não simplesmente muitos minutos de execução.

Essa decisão passa a ser arquitetural e deve orientar mudanças futuras.

---

# Síntese dos problemas que não devem ser redescobertos do zero

| Problema | Causa | Solução/decisão |
|---|---|---|
| ausência apresentada como zero | semântica inadequada | ausência ≠ zero; zero só com evidência publicada |
| pagamento sem crédito/saldo coerente | fontes provam fatos diferentes | separar níveis de evidência e investigar divergência |
| conta corrente zero interpretada como recurso zero | aplicação ignorada | mostrar conta corrente, aplicações, total e referência |
| dado histórico contaminando 2026 | escopo temporal frouxo | histórico nunca completa silenciosamente 2026 |
| nova coleta parecia não atualizar site | snapshot publicado preso a execução histórica | PR #55 automatizou promoção do artefato validado |
| Full 163 ficou PARTIAL mesmo com 163 escolas | fallback Playwright sem Chromium | PR #56 instala Chromium; gate continua estrito |
| 163 falhas de abertura de conta | erro Oracle do FNDE | preservar como falha suplementar; não converter em ausência |
| risco de executar plano velho após hotfix melhor | documentação/cronologia dispersa | LEIA_PRIMEIRO + AGENTS + estado soberano + histórico consolidado |
| coleta longa confundida com travamento | duração tratada como sinal de falha | qualidade > velocidade; separar execução longa de timeout |

# Regra final de continuidade

Este histórico explica **por que** as coisas estão como estão. Ele não substitui o estado corrente.

Para qualquer retomada:

1. `docs/LEIA_PRIMEIRO.md`;
2. `docs/ESTADO_ATUAL_2026-09-04.md` ou sucessor soberano;
3. `docs/CONTINUIDADE_WORK.md`;
4. só então este histórico, quando for necessário entender origem/decisões.