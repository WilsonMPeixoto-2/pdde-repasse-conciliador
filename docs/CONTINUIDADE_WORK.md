# Continuidade do projeto no modo Work

**Última atualização:** 20/08/2026, segundo marco publicado em PR rascunho; validação visual no CI pendente

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

## 4. Segundo marco autorizado

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

## 6. Baseline local do segundo marco

Dependências instaladas com cache dentro do workspace. O wrapper `npm test` foi bloqueado pelo ambiente antes de iniciar o runner; o binário local equivalente executou normalmente.

Comando executado:

```bash
./node_modules/.bin/vitest run
```

Resultado:

- 131 arquivos aprovados;
- 4 arquivos ignorados;
- 433 testes aprovados;
- 6 testes ignorados;
- duração: 27,97 s.

## 7. Ponto exato de retomada

No checkpoint atual:

- branch local e remoto: `codex/school-operational-reading`;
- commit local de implementação: `57a48d42688e1b955f8c73d5eb33dc9b19bf2ece`;
- commit remoto equivalente: `0a840bdc09e0f9386abccf056b277e05dad9cfe3`;
- árvore idêntica local/remota da implementação: `204de61da6b7ed1ad5417caaad3b9d544e9887b4`;
- os SHAs dos commits diferem porque o Git CLI não possuía credencial de escrita e o commit remoto foi reconstruído sobre o head remoto do PR nº 37 pelo conector autenticado; os 13 blobs e a árvore integral foram comparados antes da atualização do branch;
- PR em rascunho [#38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38), com base intencional `codex/stabilize-human-workbook`, 1 commit à frente e 0 atrás no momento da abertura;
- Tasks 1 e 2 do plano foram concluídas por ciclos vermelho-verde;
- a implementação da Task 3 foi concluída; apenas o smoke visual permanece bloqueado pelo ambiente;
- `SchoolOperationalSummary` substitui as quatro métricas genéricas por uma cadeia probatória de três estágios, saldo contextual separado e pontos acionáveis;
- `SchoolPage` mantém programas, parcelas, contas, posições, movimentos e prestação de contas em fluxo vertical e não repete a antiga lateral de acompanhamento;
- o derivador distingue pagamento suspenso, conta ausente, crédito não localizado, crédito a conferir, consulta inconclusiva, posição de saldo ausente, fonte indisponível e apontamento residual;
- mensagens já representadas por fatos estruturados não são repetidas;
- uma mensagem conhecida continua visível como apontamento residual se o fato estruturado correspondente estiver ausente, evitando perda silenciosa de evidência;
- a escola sem ocorrências recebe `Sem apontamento no retrato atual` e uma ressalva de acompanhamento, sem declaração de regularidade;
- o CSS próprio usa três estágios no desktop, empilhamento até 700 px, saldo separado, ações textuais, foco herdado e números tabulares;
- o smoke foi ampliado para exigir a nova síntese, as quatro leituras textuais, ação de repasses, ausência de duplicação e ausência de overflow global.

Verificações executadas:

- testes afetados: 7 arquivos e 17 testes aprovados;
- regressão completa final: 134 arquivos aprovados, 4 ignorados, 442 testes aprovados e 6 ignorados;
- uma execução ampla anterior teve timeout simultâneo na inicialização de cinco suítes PGlite; as cinco passaram isoladas em conjunto e a repetição integral passou, sem alteração nesses testes;
- `./node_modules/.bin/tsc -p tsconfig.test.json --noEmit`: aprovado;
- `./node_modules/.bin/vite build`: aprovado;
- `./node_modules/.bin/vite build --config vite.live.config.ts`: aprovado;
- `node scripts/frontend-product-smoke.mjs`: não executou as asserções porque falta `/root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell`;
- a tentativa anterior de instalar o navegador falhou por download truncado; portanto não há aprovação visual local nem capturas novas deste marco;
- stage dos 13 caminhos, commit local, publicação do branch e abertura do PR em rascunho foram autorizados e executados;
- nenhum merge ou deploy foi executado;
- os workflows `Verificação contínua` e `Frontend Product Smoke 2026` foram disparados para o PR nº 38 e devem ser consultados antes de qualquer decisão de integração.

Primeiros passos recomendados:

```bash
git status --short --branch
```

Depois:

1. abrir o [PR nº 38](https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38);
2. confirmar o resultado dos dois workflows;
3. baixar o artefato do smoke e inspecionar `school-desktop.png` e `school-mobile.png`;
4. manter o PR em rascunho até a validação visual;
5. não mesclar nem executar deploy sem nova autorização específica.

## 8. Disciplina de checkpoint

Após cada ciclo relevante:

1. atualizar a seção `Ponto exato de retomada`;
2. registrar testes executados e seus números reais;
3. registrar arquivos modificados e decisões novas;
4. indicar qualquer bloqueio ou resultado ainda não verificado;
5. manter o handoff persistente externo sincronizado;
6. antes de publicação, obter autorizações separadas exigidas pelo fluxo GitHub.
