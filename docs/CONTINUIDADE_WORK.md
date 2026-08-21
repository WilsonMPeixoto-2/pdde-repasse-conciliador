# Continuidade do projeto no modo Work

**Última atualização:** 20/08/2026, terceiro marco local implementado e ainda não publicado; PR do segundo marco mantido em rascunho

**Repositório canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

**Projeto Manus:** `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS` — somente leitura; nunca alterar

## 1. Como retomar sem depender do chat anterior

Ler, nesta ordem:

1. `docs/CONTINUIDADE_WORK.md`;
2. `docs/ESTADO_ATUAL_2026-08-19.md`;
3. `docs/DECISOES.md`;
4. a especificação e o plano do marco corrente indicados abaixo;
5. `git status --short --branch` e o diff integral antes de editar.

Não reconstruir decisões a partir de documentos antigos isolados. O código e os testes do commit corrente continuam sendo a fonte técnica principal.

## 2. Estado Git na abertura deste marco

- primeiro marco: PR em rascunho [#37](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/37);
- branch do primeiro marco: `codex/stabilize-human-workbook`;
- head remoto do PR nº 37: `995fb8300a76a7c6485c812d8587bdd6c4c265ba`;
- head local equivalente do primeiro marco: `00b66fef0151721ff742c1ee1cdb3c4f6fa50a88`;
- árvore idêntica local/remota: `72f0bf8b0d1260f4ae6006fe52de2e7adf70ebc5`;
- branch local do segundo marco: `codex/school-operational-reading`;
- PR em rascunho do segundo marco: [#38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38);
- head local do segundo marco antes do checkpoint documental final: `0a8c1166ae0be5f039c396ae8d38161916da9f8d`;
- head remoto equivalente antes do checkpoint documental final: `7e4a4492c691874b3580a5b358677e4e50de852d`;
- árvore idêntica local/remota: `5714e75c5f8fc96b03979f330c595d58e7e1c66f`;
- o segundo marco está empilhado sobre a árvore do PR nº 37;
- nenhum merge ou deploy está autorizado.

## 3. Primeiro marco concluído e ainda não mesclado

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

## 4. Segundo marco implementado e validado

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
- detalhes existentes permanecem;
- nenhum merge ou deploy.

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

- branch local e remota: `codex/school-operational-reading`;
- head local antes do checkpoint documental final: `0a8c1166ae0be5f039c396ae8d38161916da9f8d`;
- head remoto equivalente antes do checkpoint documental final: `7e4a4492c691874b3580a5b358677e4e50de852d`;
- árvore idêntica local/remota: `5714e75c5f8fc96b03979f330c595d58e7e1c66f`;
- os SHAs dos commits locais e remotos diferem porque o Git CLI não possui credencial HTTPS interativa; cada commit remoto foi reconstruído pelo conector autenticado e sua árvore foi comparada à árvore local antes do avanço normal da branch;
- PR [#38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38) aberto, mesclável e ainda em rascunho;
- base intencional: `codex/stabilize-human-workbook`, correspondente ao PR nº 37;
- nenhum merge, marcação como pronto ou deploy foi executado.

### Riscos restantes, sem bloquear este marco

- a indicação da continuidade da navegação horizontal mobile recebeu uma correção local no terceiro marco, descrita na seção 8; ainda falta executar o smoke em navegador e inspecionar as novas capturas;
- a página móvel é longa porque todos os detalhes foram preservados; qualquer recolhimento adicional deve ser validado com usuários;
- contraste numérico, leitor de tela e reflow em 200%/400% ainda exigem auditoria de acessibilidade própria.

### Primeiros passos da próxima sessão

```bash
git status --short --branch
```

Depois:

1. preservar e revisar o diff local do terceiro marco antes de qualquer nova edição;
2. ler a seção 8 deste documento e `docs/audits/2026-08-20-leitura-operacional-escola.md`;
3. abrir o [PR nº 38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38) e confirmar que continua rascunho;
4. não criar commit, publicar, mesclar nem executar deploy sem a autorização correspondente;
5. tratar a densidade do prontuário e a auditoria de acessibilidade como trabalhos posteriores, sem reabrir decisões financeiras já consolidadas.

## 8. Terceiro marco local — continuidade visível da navegação mobile

**Nome de trabalho:** navegação local acessível do prontuário.

**Estado:** implementação e verificações não visuais concluídas no checkout local; nenhuma publicação executada.

### Decisão aprovada

- manter a navegação das seções horizontal, fixa e com a mesma altura;
- exibir controles sobrepostos `Voltar` e `Mais` somente quando houver conteúdo oculto na direção correspondente;
- associar os controles à faixa rolável com nomes acessíveis e `aria-controls`;
- marcar a seção indicada pelo fragmento da URL com `aria-current="location"`; sem fragmento, `Resumo` é a seção atual;
- preservar todos os destinos, detalhes, contratos, fontes e regras financeiras existentes;
- não alterar backend, persistência ou Supabase.

### Implementação local

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

O Chromium não está instalado neste ambiente. Portanto, o smoke atualizado e a inspeção das capturas **não foram executados localmente** e permanecem como gate obrigatório antes de considerar este marco visualmente aceito.

### Estado Git deste checkpoint

- branch: `codex/school-operational-reading`;
- base local: `8957ac3c94ff974f71d7c7d72a8f20f72d43738c`;
- arquivos de produto/teste modificados: os quatro listados acima;
- este documento também foi atualizado para preservar a retomada;
- nenhuma mudança foi staged, commitada ou publicada;
- PR nº 38 continua sendo o PR em rascunho do segundo marco; o terceiro marco ainda existe somente no checkout local.

### Próximo gate seguro

1. executar `git diff --check` e revisar o diff integral;
2. quando houver autorização de publicação, publicar sem marcar o PR como pronto e aguardar os workflows;
3. executar/confirmar o smoke em 390×844 e inspecionar a ficha completa em resolução original;
4. verificar que os controles não aumentaram a altura fixa, não ocultam o foco e aparecem somente quando necessários;
5. registrar IDs, digests e resultado visual antes de encerrar o marco.

## 9. Disciplina de checkpoint

Após cada ciclo relevante:

1. atualizar a seção `Ponto exato de retomada`;
2. registrar testes executados e seus números reais;
3. registrar arquivos modificados e decisões novas;
4. indicar qualquer bloqueio ou resultado ainda não verificado;
5. manter o handoff persistente externo sincronizado;
6. antes de publicação, obter autorizações separadas exigidas pelo fluxo GitHub.
