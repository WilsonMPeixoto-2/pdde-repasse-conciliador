# Continuidade do projeto no modo Work

**Última atualização:** 31/08/2026, refresh de dependências e gates integrado à `main`, validado e publicado em produção

**Repositório canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

**Projeto Manus:** `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — somente leitura; nunca alterar

## 1. Como retomar sem depender do chat anterior

Ler, nesta ordem:

1. `docs/INDICE_DOCUMENTAL.md`;
2. `docs/CONTINUIDADE_WORK.md`;
3. `docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`;
4. `docs/ESTADO_ATUAL_2026-08-30.md`;
5. `docs/DECISOES.md`;
6. a auditoria, a especificação e o plano do marco corrente indicados abaixo;
7. `git status --short --branch` e o diff integral antes de editar.

Não reconstruir decisões a partir de documentos antigos isolados. O código e os testes do commit corrente continuam sendo a fonte técnica principal.

Um arquivo local, um commit sem push, uma resposta de chat ou uma cópia isolada na Biblioteca não podem ser descritos como documentação salva para continuidade. A definição completa e o inventário estão em `docs/INDICE_DOCUMENTAL.md`.


## 1.1. Checkpoint soberano de 30/08/2026

Este bloco prevalece sobre descrições de estado Git/produção datadas de 21/08 existentes nas seções históricas abaixo.

### Estado Git

- repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`;
- refresh final: PR #45;
- merge funcional na `main`: `6711ccf81ea458cb84563710102cd6a8270d6408`;
- PR #43 fechado como supersedido;
- PR #44 fechado e substituído por #45 por falha do conector ao retirar Draft;
- PRs #41 e #42 permanecem Draft e não foram mesclados.

### Gates pós-merge

- `Verificação contínua`, run `33339818684`: `success`;
- `Frontend Product Smoke 2026`, run `33339818696`: `success`;
- jornada real Playwright desktop/mobile: aprovada;
- Axe: aprovado para violações críticas/sérias fora da dívida conhecida de contraste;
- MSW: integrado ao teste do adapter PDDEInfo.

### Política de dependências vigente

- PGlite 0.5.8;
- Motion 13.1.1;
- Vite 8.2.2;
- Vitest 4.1.11;
- Supabase JS 2.112.4;
- React Virtual 3.14.10;
- GitHub Actions v6/v7;
- Zod **fixado em 4.4.3**, com salto para 4.5 adiado até maturação + benchmark;
- Dependabot habilitado, com Zod minor/major ignorado enquanto esse gate estiver vigente.

### Produção Vercel

O bloqueio de quota de 30/08 foi encerrado após o reset da Vercel. A árvore funcional validada foi publicada em produção em 31/08/2026 por meio do commit de acionamento `107a78d92de0d089445cdeb3911d98cdf4f3b859`.

- deployment homologado: `dpl_J74Zef4USvkMjjPG21yXLbRM1gGv`;
- estado: `READY`;
- branch: `main`;
- aliases públicos canônicos: atribuídos sem erro;
- `/repasses`, `/saldos` e `/unidades`: HTTP 200;
- `/api/live` via GET: HTTP 405 esperado;
- erros de runtime na última hora: zero.

Os PRs #41 e #42 continuam Draft e não foram incluídos. O PR #43 permanece supersedido.

Checkpoint final: `docs/PRODUCTION_CHECKPOINT_2026-08-31.md`.

## 2. Estado Git e produção após a integração

- o PR [#37](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/37) foi marcado como pronto e mesclado por merge commit em `9db6bcea2269302974303dcc8defc1d6bd57a2af`;
- o PR [#38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38) foi redirecionado de `codex/stabilize-human-workbook` para `main`, marcado como pronto e mesclado por merge commit em `f256442bf85b2879d7a9b3ffca7be30246ae4d43`;
- a `main` publicada possui árvore `c3497ea07ce754497254991e29a50368ce92c4f2`, idêntica à árvore consolidada que foi verificada antes dos merges;
- o deployment Vercel de produção é `dpl_D3YrRVGXVbX1adpYoj2fatRn8GVi`, estado `READY`, associado ao commit `f256442bf85b2879d7a9b3ffca7be30246ae4d43`;
- o domínio público canônico é <https://pdde-repasse-conciliador.vercel.app>;
- não há PR funcional pendente desses três marcos.

## 3. Primeiro marco concluído e mesclado

O PR nº 37 estabiliza:

- cadeia `Previsto → Pagamento informado → Crédito compatível localizado → Saldo` na planilha humana;
- data de geração separada da data de referência;
- acompanhamento consolidado por escola;
- indicador genérico sem duplicar o caso específico de crédito não localizado;
- comandos canônicos de exportação humana e técnica;
- documentação e workflow correspondentes.

Evidência do head remoto:

- 433 testes aprovados e 6 ignorados;
- typecheck e dois builds aprovados;
- smoke desktop/mobile aprovado;
- coleta real das 163 escolas aprovada;
- XLSX real inspecionado nas sete abas;
- 73 escolas com pagamento informado sem crédito compatível localizado;
- 0 em `Outra informação parcial`;
- 0 erros de fórmula.

Integração:

- head do PR nº 37: `995fb8300a76a7c6485c812d8587bdd6c4c265ba`;
- árvore: `72f0bf8b0d1260f4ae6006fe52de2e7adf70ebc5`;
- merge commit na `main`: `9db6bcea2269302974303dcc8defc1d6bd57a2af`;
- mesclado em 21/08/2026, antes do PR nº 38, para preservar a ancestralidade da pilha.

## 4. Segundo marco implementado e validado

**Estado atual:** integrado à `main` pelo PR nº 38 e publicado em produção.

**Nome:** leitura operacional da escola.

**Rota:** `/unidades/:inep`.

**Objetivo:** permitir que um usuário comum entenda primeiro o que foi previsto, o que foi informado como pago, o que teve crédito compatível localizado, qual é o saldo datado e o que precisa ser conferido.

Especificação:

- `docs/superpowers/specs/2026-08-20-leitura-operacional-escola-design.md`

Plano executável:

- `docs/superpowers/plans/2026-08-20-leitura-operacional-escola.md`

Limites:

- frontend apenas;
- nenhum endpoint, schema, migration, fonte ou regra de conciliação;
- nenhum cálculo de regularidade;
- detalhes existentes permanecem.

## 5. Diagnóstico que orienta o desenho

O prontuário atual já contém toda a informação necessária. O defeito de produto é a ordem:

- as quatro métricas aparecem sem uma conclusão operacional explícita;
- o acompanhamento está numa barra lateral;
- em telas abaixo de 960 px, a barra lateral é empilhada após todos os detalhes;
- no celular, um ponto crítico pode aparecer somente depois de programas, contas, séries e movimentações;
- a mesma informação pode precisar ser reconstruída mentalmente a partir de métricas, parcelas e mensagens.

A correção promove o acompanhamento para o resumo, cria destinos úteis e elimina a barra lateral duplicada.

## 6. Verificação final do segundo marco

Verificação local executada após a última correção de produto:

- `./node_modules/.bin/vitest run`: 134 arquivos aprovados, 4 ignorados; 444 testes aprovados, 6 ignorados;
- `./node_modules/.bin/tsc -p tsconfig.test.json --noEmit`: aprovado;
- `./node_modules/.bin/vite build`: aprovado;
- `./node_modules/.bin/vite build --config vite.live.config.ts`: aprovado;
- `git diff --check`: aprovado.

Verificação do head remoto `7e4a4492c691874b3580a5b358677e4e50de852d`:

- `Verificação contínua`: run `32429811537`, aprovado;
- `Frontend Product Smoke 2026`: run `32429811398`, execução nº 366, aprovado;
- smoke determinístico aprovado em 1440×1000 e 390×844;
- smoke do retrato publicado aprovado em desktop e mobile;
- artefato `frontend-product-smoke-2026`, ID `9428694273`;
- digest do artefato conferido: `sha256:1358f51ab9850faa2befc6a0043cecbaf5a3391cf067c786376b2bc519fb2290`;
- `school-desktop.png` e `school-mobile.png` inspecionados em resolução original;
- auditoria registrada em `docs/audits/2026-08-20-leitura-operacional-escola.md`.

O navegador continua ausente no ambiente Work local. Isso não foi ocultado: o gate visual foi executado pelo workflow autorizado, e o ZIP baixado foi comparado ao digest publicado antes da inspeção.

## 7. Ponto exato de retomada

### Estado funcional

- `SchoolOperationalSummary` apresenta a cadeia probatória de três estágios, o saldo datado e os pontos acionáveis antes dos detalhes;
- `SchoolPage` preserva programas, parcelas, contas, posições, movimentos e prestação de contas em fluxo vertical;
- a antiga lateral duplicada de acompanhamento foi removida;
- o derivador distingue pagamento suspenso, conta ausente, crédito não localizado, crédito a conferir, consulta inconclusiva, posição de saldo ausente, fonte indisponível e apontamento residual;
- mensagens cobertas por fatos estruturados não são repetidas;
- uma mensagem conhecida continua visível quando o fato estruturado correspondente está ausente;
- ausência de apontamentos não é apresentada como certificação de regularidade;
- o extrato financeiro voltou a carregar sua folha de estilos e possui teste de integração para impedir nova perda silenciosa.

### Cronologia das falhas encontradas e eliminadas

1. o workflow visual executava somente o smoke do retrato publicado e não exercitava o novo prontuário determinístico;
2. ao ligar o roteiro correto ao workflow, ele revelou que o fixture ainda simulava endpoints antigos;
3. o fixture foi migrado para o snapshot `gzip-base64-parts` consumido pela aplicação atual;
4. a execução seguinte revelou uma expectativa antiga de ordenação automática; o roteiro passou a validar SME por padrão e `Atenção primeiro` quando selecionado;
5. um seletor acessível ambíguo foi tornado específico ao controle de ordenação;
6. com o smoke verde, a inspeção humana revelou o extrato visualmente sem estrutura;
7. a causa era `movement-ledger.css` existente, mas não importado; um teste vermelho comprovou a lacuna, o import foi restaurado e um novo artefato verde foi inspecionado.

Essa sequência não representa mudanças repetidas de objetivo. Foram camadas de regressão no gate e uma regressão visual preexistente, cada uma comprovada antes da correção.

### Estado Git e publicação

- head final do PR nº 38: `286e89bce7d45bffcbb3a4e349f9c8936cc9cfa1`;
- árvore final do PR nº 38: `c3497ea07ce754497254991e29a50368ce92c4f2`;
- merge commit na `main`: `f256442bf85b2879d7a9b3ffca7be30246ae4d43`;
- o PR nº 38 foi mesclado em 21/08/2026, após o PR nº 37;
- a árvore da `main` após o merge é idêntica à árvore final do PR nº 38;
- o deployment automático de produção ficou `READY` e recebeu os aliases públicos canônicos.

### Riscos restantes, sem bloquear este marco

- a indicação da continuidade da navegação horizontal mobile foi corrigida e validada no terceiro marco, descrito na seção 8;
- a página móvel é longa porque todos os detalhes foram preservados; qualquer recolhimento adicional deve ser validado com usuários;
- contraste numérico, leitor de tela e reflow em 200%/400% ainda exigem auditoria de acessibilidade própria.

### Primeiros passos da próxima sessão

```bash
git status --short --branch
```

Depois:

1. atualizar a referência local de `origin/main` e confirmar que ela contém `f256442bf85b2879d7a9b3ffca7be30246ae4d43` ou um descendente documental explícito;
2. ler as seções 8, 9 e 11 deste documento, a auditoria de 21/08 e a especificação do quarto marco;
3. não reabrir os PRs nº 37 e nº 38: ambos estão concluídos e mesclados;
4. manter a densidade do prontuário como trabalho posterior e não reabrir decisões financeiras já consolidadas;
5. retomar o quarto marco no gate de revisão da especificação, sem implementar antes da aprovação explícita.

## 8. Terceiro marco — continuidade visível da navegação mobile

**Nome de trabalho:** navegação local acessível do prontuário.

**Estado:** implementação validada, integrada pelo PR nº 38 e publicada em produção.

### Decisão aprovada

- manter a navegação das seções horizontal, fixa e com a mesma altura;
- exibir controles sobrepostos `Voltar` e `Mais` somente quando houver conteúdo oculto na direção correspondente;
- associar os controles à faixa rolável com nomes acessíveis e `aria-controls`;
- marcar a seção indicada pelo fragmento da URL com `aria-current="location"`; sem fragmento, `Resumo` é a seção atual;
- preservar todos os destinos, detalhes, contratos, fontes e regras financeiras existentes;
- não alterar backend, persistência ou Supabase.

### Implementação

- `src/product/components/SchoolSectionNav.tsx`: calcula os limites da rolagem, observa scroll e redimensionamento, oferece os controles e anuncia a seção atual;
- `src/product/design/findability.css`: separa o invólucro fixo da faixa rolável, apresenta estado atual com pista não baseada apenas em cor e ativa controles de 44 px somente até 700 px;
- `tests/unit/frontend-school-section-navigation.test.ts`: cobre seção padrão, fragmento atual, contrato acessível e início/meio/fim da rolagem;
- `scripts/frontend-product-smoke.mjs`: no viewport mobile, exige o controle seguinte, comprova avanço horizontal, exige o controle anterior e comprova retorno.

### TDD e verificações realmente executadas

O ciclo RED foi observado com quatro falhas esperadas: ausência de `aria-current`, ausência dos controles/associação e ausência do derivador dos limites. Depois da implementação mínima:

- teste focado: 7 testes aprovados;
- suíte completa: 134 arquivos aprovados e 4 ignorados; 448 testes aprovados e 6 ignorados;
- `./node_modules/.bin/tsc -p tsconfig.test.json --noEmit`: aprovado;
- `node --check scripts/frontend-product-smoke.mjs`: aprovado;
- `./node_modules/.bin/vite build`: aprovado, com aviso de chunk principal acima de 500 kB;
- `./node_modules/.bin/vite build --config vite.live.config.ts`: aprovado;
- `git diff --check`: aprovado.

O Chromium não está instalado neste ambiente. O gate de navegador foi executado pelo GitHub Actions no head remoto de código `3cd7251558cc39fa7844d9da3f9f160d824e8801`:

- `Verificação contínua`, execução nº 1241, run `32441075718`: aprovado;
- `Frontend Product Smoke 2026`, execução nº 369, run `32441075727`: aprovado;
- os passos determinísticos de navegação do prontuário e o smoke do retrato publicado foram aprovados;
- artefato `frontend-product-smoke-2026`, ID `9432452445`;
- digest oficial e local do ZIP: `sha256:943556111d0814d7e5d92ad7a39d488ec3a8e6dc70815c6b9db65a00d31339d2`;
- captura mobile: 390×5915, SHA-256 `8759c9b4d6c8d5e2e7f39b3e232156d9aa317f913d0b46f7f32aa6ca9e25417c`;
- captura desktop: 1440×4455, SHA-256 `ed51b129fb8366e91e0b18baa3838f9f002979d1bc7f91bd5a29e65d72b3abf7`;
- dossiê local: `/workspace/scratch/487865c30622/PDDE_WORK_ARTIFACTS/2026-08-20-mobile-section-navigation-run-369/`.

Na inspeção original, o mobile apresentou `Resumo` como seção atual e o controle `Mais` claramente visível sobre a extremidade da faixa, sem elevar o cabeçalho nem gerar overflow global. O desktop manteve todos os destinos visíveis, sem controles desnecessários. O smoke comprovou também a aparição de `Voltar` após o avanço e o retorno efetivo da rolagem.

### Estado Git deste checkpoint

- branch local e remota: `codex/school-operational-reading`;
- base local antes do terceiro marco: `8957ac3c94ff974f71d7c7d72a8f20f72d43738c`;
- commit local de código: `a15a2a74cb369c3c43093add9476ab31b3dee4c2`;
- commit remoto equivalente de código: `3cd7251558cc39fa7844d9da3f9f160d824e8801`;
- árvore de código local/remota idêntica: `d34bc233b955602a3d4de362cc5eb24f62535aae`;
- a reconstrução remota foi descendente direta de `74934979f8343ea815d37c5cada46cb07ed0d2ed`, sem force push;
- head remoto final do PR nº 38: `286e89bce7d45bffcbb3a4e349f9c8936cc9cfa1`;
- árvore final local/remota: `c3497ea07ce754497254991e29a50368ce92c4f2`;
- `Verificação contínua`, execução nº 1243, run `32441433903`: aprovada;
- `Frontend Product Smoke 2026`, execução nº 370, run `32441433755`: aprovada;
- artefato final `frontend-product-smoke-2026`, ID `9432576990`, digest `sha256:8e1c59333dc4a9605fa9f576a0260ae788324a8c3f073b70fc47cf99900b0951`;
- PR nº 38 mesclado na `main` pelo commit `f256442bf85b2879d7a9b3ffca7be30246ae4d43`;
- deployment de produção `dpl_D3YrRVGXVbX1adpYoj2fatRn8GVi`, estado `READY`.

### Próximo gate seguro

1. não recolher mais conteúdo do prontuário sem validação com usuários;
2. planejar separadamente a auditoria de contraste, leitor de tela e reflow a 200%/400%;
3. retomar o board incompleto do Figma somente quando a cota da ferramenta voltar;
4. iniciar novo marco apenas com objetivo e limite explícitos, usando esta seção como ponto de partida.

## 9. Checkpoint de produção de 21/08/2026

### Promoção executada

1. a árvore consolidada foi reinstalada com `npm ci` usando cache temporário gravável;
2. `vitest run`: 134 arquivos aprovados e 4 ignorados; 448 testes aprovados e 6 ignorados;
3. `tsc -p tsconfig.test.json --noEmit`: aprovado;
4. build Vite cliente: 791 módulos transformados, aprovado;
5. build Vite SSR: 30 módulos transformados, aprovado;
6. PR nº 37 marcado como pronto e mesclado por merge commit;
7. PR nº 38 redirecionado para `main`, recalculado como mesclável, marcado como pronto e mesclado por merge commit;
8. `main` confirmada em `f256442bf85b2879d7a9b3ffca7be30246ae4d43`, árvore `c3497ea07ce754497254991e29a50368ce92c4f2`;
9. Vercel confirmou o deployment `dpl_D3YrRVGXVbX1adpYoj2fatRn8GVi` como `READY`, alvo `production`, pronto em 21/08/2026 às 00:23:06 BRT.

### Verificação pós-deploy

- `/` respondeu `HTTP 200` com o título `Inteligência Financeira PDDE | 4ª CRE`;
- `/unidades/33069093` respondeu `HTTP 200`, comprovando o rewrite de rota interna;
- ambas as rotas serviram o bundle `assets/index-BJ1Zu8eA.js`, o mesmo nome de conteúdo produzido no build local validado;
- o bundle público contém `Leitura rápida desta escola`, `Acompanhamento necessário`, `Seções do prontuário financeiro` e `Ver seções anteriores`;
- a consulta agregada de erros da Vercel não encontrou erro de runtime na hora posterior ao deploy;
- a consulta de logs do deployment não encontrou evento `warning`, `error` ou `fatal` no mesmo intervalo;
- o Chromium local não pôde ser baixado porque o CDN devolveu arquivo vazio/truncado; esse bloqueio ambiental não substitui nem invalida o smoke desktop/mobile já aprovado no GitHub Actions sobre a mesma árvore Git.

### Próximo trabalho funcional recomendado

O próximo marco não é corrigir novamente a planilha ou a leitura operacional já publicadas. A opção nº 1 abaixo foi selecionada e detalhada na seção 11; as demais continuam posteriores:

1. auditoria própria de acessibilidade: contraste, leitor de tela e reflow em 200%/400%;
2. validação orientada com usuários comuns antes de recolher ou redistribuir novos blocos do prontuário;
3. evolução do backend/persistência somente após definição explícita do contrato e da fonte de verdade.

## 10. Disciplina de checkpoint

Após cada ciclo relevante:

1. atualizar a seção `Ponto exato de retomada`;
2. registrar testes executados e seus números reais;
3. registrar arquivos modificados e decisões novas;
4. indicar qualquer bloqueio ou resultado ainda não verificado;
5. manter o handoff persistente externo sincronizado;
6. antes de publicação, obter autorizações separadas exigidas pelo fluxo GitHub.

## 11. Quarto marco — acessibilidade estrutural e legibilidade

**Nome de trabalho:** acessibilidade estrutural e legibilidade WCAG 2.2 AA.

**Estado:** auditoria e especificação aprovadas; plano executável escrito; implementação ainda não iniciada e aguardando escolha do modo de execução. Nenhum código funcional foi alterado, nenhum PR foi aberto e produção continua no estado descrito na seção 9.

**Branch de documentação e futuro trabalho:** `codex/accessibility-legibility-aa`.

### Documentos canônicos

- auditoria: `docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md`;
- especificação: `docs/superpowers/specs/2026-08-21-acessibilidade-legibilidade-design.md`;
- plano executável: `docs/superpowers/plans/2026-08-21-acessibilidade-legibilidade.md`.

### Barreiras confirmadas

1. `--ink-500: #718797` fica entre 3,4376:1 e 3,7402:1 nos fundos principais, abaixo de 4,5:1 para texto normal;
2. o foco global clareado por mistura com branco fica entre 2,7425:1 e 2,9839:1, abaixo de 3:1;
3. resultados da busca e linhas de repasses/saldos aplicam `role="listitem"` diretamente ao `Link`, substituindo o papel de link;
4. cabeçalhos financeiros estão ocultos da árvore acessível e os rótulos por valor usam `display: none` no desktop;
5. todas as rotas mantêm o mesmo título de documento;
6. bordas funcionais de campos usam um divisor com contraste entre 1,2354:1 e 1,3442:1, uma pista visual fraca.

### Direção decidida

- corrigir os tokens na origem, sem redesenho amplo;
- usar `--ink-500: #5c7385`, foco direto `#1878a4` e borda funcional `#788e9c`;
- preservar links nativos dentro de itens de lista;
- manter rótulos financeiros no conteúdo acessível em todas as larguras;
- definir título específico para cada rota e nomear o prontuário pela escola quando os dados estiverem prontos;
- ampliar o smoke para semântica, teclado, foco e larguras de 640, 390 e 320 CSS px;
- preservar conteúdo, regras financeiras, fontes, backend, planilha, persistência e produção.

### Evidência e limites

Seis capturas aceitas, seus hashes, os passos auditados e os cálculos estão no documento de auditoria. Não houve teste real com leitor de tela nem zoom válido a 200%/400%; essas lacunas devem continuar explícitas e impedem qualquer alegação de conformidade integral.

### Próximo gate seguro

1. escolher execução orientada por subagentes ou execução inline nesta sessão;
2. executar as seis tarefas do plano por TDD em commits próprios;
3. verificar suíte, typecheck, builds, smoke e evidência visual;
4. registrar resultados reais e qualquer bloqueio no checkpoint;
5. solicitar autorização separada antes de PR pronto, merge ou deploy.

## 12. Checkpoint documental integral e acesso entre ferramentas

**Objetivo:** eliminar a dependência de perguntas arquivo por arquivo e impedir que documentação relevante permaneça apenas no workspace ou na Biblioteca.

### Auditoria integral recuperada

- caminho canônico: `docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`;
- origem: Biblioteca `/EXTRAÇÃO PDDE INFO/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`;
- extensão: 1.260 linhas e 59.761 bytes;
- SHA-256 preservado: `4686dc461c658f0204834b97b37cdf105c202a202a5bd9eec594edd657f78b43`;
- escopo: código, documentação, 414 commits, PRs nº 1–36, produção, snapshot, Excel, planilhas históricas, cronologia, loops, regressões e plano de reorganização;
- limite explícito: a auditoria não afirma ter obtido a íntegra dos chats posteriores a 13/08; reconstrói esse trecho por evidências materiais.

### Outros textos recuperados

- `docs/history/HANDOFF_CONTINUIDADE_PDDE_WORK.md`;
- `docs/history/HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.md`;
- `docs/history/PROMPT_NOVO_CHAT_WORK_PDDE.txt`;
- quatro fontes brutas em `docs/history/source-material/`, claramente marcadas como históricas e não canônicas.

### Inventário e regra de publicação

- `docs/INDICE_DOCUMENTAL.md` inventaria os 66 arquivos encontrados na pasta `/EXTRAÇÃO PDDE INFO` da Biblioteca e todos os documentos do repositório;
- documentos textuais únicos e relevantes foram versionados; duplicatas exatas foram identificadas sem multiplicar cópias;
- binários históricos permanecem na Biblioteca ou no CI e estão inventariados por nome, tipo, tamanho, finalidade, vigência e localização;
- o GitHub remoto passa a ser a fonte textual canônica;
- nenhum novo documento pode ser chamado de salvo antes de commit, push e verificação remota;
- esta consolidação é exclusivamente documental: nenhum código funcional, PR, merge, deploy ou dado de produção foi alterado.
