# Handoff persistente — Plataforma de Inteligência Financeira PDDE

**Atualizado em:** 20/08/2026  
**Finalidade:** permitir a retomada do projeto se a sessão ou a cota do modo Work for interrompida.

## Fonte de verdade e limites

- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- Repositório `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`: somente leitura; nunca alterar.
- Não executar merge nem deploy sem autorização específica do usuário.
- Antes de qualquer edição, ler `docs/CONTINUIDADE_WORK.md` no repositório e conferir `git status --short --branch`.

## Primeiro marco

O primeiro marco está no PR em rascunho nº 37:

`https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/37`

Branch remoto: `codex/stabilize-human-workbook`  
Head remoto: `995fb8300a76a7c6485c812d8587bdd6c4c265ba`  
Árvore verificada: `72f0bf8b0d1260f4ae6006fe52de2e7adf70ebc5`

Resultados verificados:

- planilha humana com cadeia previsto, pagamento informado, crédito compatível localizado e saldo;
- acompanhamento consolidado por escola;
- 433 testes aprovados;
- typecheck, builds e smoke aprovados;
- coleta real de 163 escolas aprovada;
- 73 casos específicos de pagamento informado sem crédito localizado;
- 0 em `Outra informação parcial`;
- 0 erros de fórmula no XLSX real.

O PR nº 37 continua em rascunho e não foi mesclado.

## Segundo marco implementado e validado

Nome: **leitura operacional da escola**.  
Branch local: `codex/school-operational-reading`.  
Base: árvore do PR nº 37.

PR em rascunho: `https://github.com/WilsonMPeixoto-2/pdde-repasse-conciliador/pull/38`

Objetivo:

> reorganizar o topo do prontuário `/unidades/:inep` para que o usuário compreenda primeiro o valor previsto, o pagamento informado, o crédito compatível localizado, o saldo datado e os pontos que pedem conferência.

Não haverá alteração de backend, contrato, migration, fonte ou regra de conciliação.

## Diagnóstico preservado

O prontuário atual já contém os dados. A deficiência é de hierarquia:

- as métricas não formam, sozinhas, uma conclusão operacional;
- o acompanhamento fica numa barra lateral;
- abaixo de 960 px, essa barra é deslocada para depois de todos os detalhes;
- no celular, o alerta pode aparecer somente após programas, contas, séries e movimentações;
- a correção deve promover o acompanhamento para o resumo e remover a repetição lateral.

## Desenho aprovado

O topo da escola terá:

1. sequência `Previsto → Pagamento informado → Crédito compatível localizado`;
2. saldo informado em bloco separado, com data de referência;
3. estado `Acompanhamento necessário` ou `Sem apontamento no retrato atual`;
4. pontos estruturados com links para repasses, contas/saldos ou prestação de contas;
5. nenhuma declaração de regularidade;
6. todos os detalhes atuais preservados abaixo.

Documentos locais do repositório:

- `docs/superpowers/specs/2026-08-20-leitura-operacional-escola-design.md`;
- `docs/superpowers/plans/2026-08-20-leitura-operacional-escola.md`;
- `docs/audits/2026-08-20-leitura-operacional-escola.md`;
- `docs/CONTINUIDADE_WORK.md`.

## Ponto exato de retomada

No momento deste checkpoint:

- branch local: `codex/school-operational-reading`;
- commit local antes do checkpoint documental final: `0a8c1166ae0be5f039c396ae8d38161916da9f8d`;
- commit remoto equivalente antes do checkpoint documental final: `7e4a4492c691874b3580a5b358677e4e50de852d`;
- árvore de código idêntica local/remota: `5714e75c5f8fc96b03979f330c595d58e7e1c66f`;
- commit local do checkpoint documental final: `8957ac3c94ff974f71d7c7d72a8f20f72d43738c`;
- head remoto equivalente após o checkpoint documental: `74934979f8343ea815d37c5cada46cb07ed0d2ed`;
- árvore final idêntica local/remota: `a2cfeac455b5cb22dcab6231f9a3b1046701aca2`;
- PR nº 38 aberto, mesclável e ainda em rascunho contra `codex/stabilize-human-workbook`;
- todos os passos do plano do marco foram concluídos;
- `src/product/visual/school-operational-reading.ts` deriva ações humanas sem alterar o contrato financeiro;
- `src/product/components/SchoolOperationalSummary.tsx` apresenta cadeia probatória, saldo datado e ações antes dos detalhes;
- `src/product/pages/SchoolPage.tsx` usa a nova síntese e remove a lateral duplicada, preservando as seções detalhadas;
- `src/product/design/school-operational.css` oferece três estágios no desktop e uma coluna até 700 px;
- `src/product/design/movement-ledger.css` voltou a ser importado pela aplicação depois que a inspeção visual encontrou o extrato sem estrutura;
- mensagens conhecidas só são deduplicadas quando o item estruturado correspondente realmente existe; caso contrário permanecem como apontamento residual;
- o workflow visual executa primeiro o smoke determinístico do prontuário e depois o smoke do retrato publicado;
- o fixture determinístico serve o snapshot `gzip-base64-parts` consumido pela aplicação atual;
- a regressão final passou: 134 arquivos aprovados, 4 ignorados, 444 testes aprovados e 6 ignorados;
- typecheck, build do frontend e build do servidor live passaram;
- `Verificação contínua`, run `32429811537`: aprovado;
- `Frontend Product Smoke 2026`, run `32429811398`, execução nº 366: aprovado;
- artefato visual ID `9428694273`, digest `sha256:1358f51ab9850faa2befc6a0043cecbaf5a3391cf067c786376b2bc519fb2290`;
- as capturas finais desktop e mobile foram inspecionadas em resolução original e aceitas;
- no head documental final `74934979f8343ea815d37c5cada46cb07ed0d2ed`, `Verificação contínua` run `32430344223` e smoke nº 367 run `32430344254` também foram aprovados;
- o artefato do head final é o ID `9428867228`, digest `sha256:f5591ddfec6e628bc9b0b21449fb6905de49e6758b43f96624fd7140ca054fdc`, e as duas telas da escola foram novamente inspecionadas sem mudança nas conclusões da auditoria;
- relatório: `docs/audits/2026-08-20-leitura-operacional-escola.md`;
- cópias das capturas: `/workspace/scratch/487865c30622/PDDE_WORK_ARTIFACTS/2026-08-20-school-operational-reading/`;
- o Chromium continua ausente localmente, mas o CI executou o gate e o ZIP baixado foi verificado contra o digest oficial;
- o commit remoto foi reconstruído pelo conector autenticado porque o Git CLI local não possui credencial HTTPS interativa; blobs e árvore foram comparados antes de cada avanço normal da branch;
- stage, commits, publicação da branch, abertura e atualização do PR rascunho foram autorizados;
- merge e deploy continuam proibidos sem nova autorização.

## Falhas e loops já resolvidos

1. O workflow visual não chamava o smoke determinístico novo; a chamada foi adicionada antes do smoke publicado.
2. O roteiro ainda simulava endpoints antigos; passou a entregar o snapshot compactado atual.
3. O roteiro exigia ordenação automática por atenção; passou a testar SME como padrão e a seleção explícita `Atenção primeiro`.
4. Um seletor de ordenação ambíguo foi tornado específico.
5. A auditoria visual revelou `movement-ledger.css` sem importação; teste de regressão, correção, novo CI e novas capturas foram concluídos.

Esses ciclos foram depuração progressiva do gate e de uma regressão visual real; não representam reversão das regras financeiras ou do objetivo do marco.

## Riscos preservados para um próximo marco

- no mobile, a navegação interna horizontal deixa o item seguinte parcialmente visível e pode ganhar uma indicação mais clara de continuidade;
- a página móvel é longa porque os detalhes foram preservados; não recolher mais informação sem validação com usuários;
- contraste numérico, leitor de tela e reflow a 200%/400% ainda precisam de auditoria de acessibilidade dedicada.

Sequência segura:

```bash
git status --short --branch
```

Ler `docs/CONTINUIDADE_WORK.md` e `docs/audits/2026-08-20-leitura-operacional-escola.md`. Abrir o PR nº 38 e confirmar que continua rascunho. Não marcar como pronto, mesclar ou executar deploy sem autorização específica.

## Board de auditoria no Figma — checkpoint interrompido por cota

Em 20/08/2026, o usuário autorizou expressamente o envio ao Figma das duas capturas aceitas da auditoria.

- arquivo criado: `PDDE — Auditoria da leitura operacional da escola — 20 ago 2026`;
- URL: `https://www.figma.com/design/T5hqlwHz2jIjQ9mtoUbFNx`;
- arquivo Figma: `T5hqlwHz2jIjQ9mtoUbFNx`;
- seção: `2:2` — `Auditoria visual — leitura operacional da escola`;
- wrapper editorial: `2:3`;
- linha de evidências: `3:2`, com intervalo horizontal confirmado de 200 px;
- coluna desktop: `3:3`;
- coluna mobile: `3:4`;
- evidência desktop e notas concluídas: imagem `4:6`, legenda `4:7`, nota `4:8`;
- a evidência mobile ainda não foi colocada;
- os blocos temporários da primeira tentativa mobile (`4:9` a `4:12`) foram removidos após o Figma rejeitar a imagem original por exceder o limite dimensional;
- as tentativas que excederam o tamanho máximo da chamada foram atômicas e não alteraram o arquivo;
- os PNGs originais continuam preservados no dossiê local;
- foram criadas cópias JPEG de apresentação, inspecionadas visualmente, para contornar apenas os limites técnicos de transporte e dimensão;
- o processo parou porque o plano Figma Starter atingiu a cota de chamadas MCP;
- o board NÃO está concluído e NÃO foi validado visualmente como conjunto final.

Retomada exata quando a cota do Figma voltar:

1. abrir o arquivo e inspecionar a seção `2:2`;
2. transferir `/workspace/scratch/487865c30622/PDDE_WORK_ARTIFACTS/2026-08-20-school-operational-reading/02-school-mobile-figma-thumb.jpg` em blocos temporários menores que 40.000 caracteres;
3. remontar a imagem na coluna `3:4`, criar legenda e nota mobile e apagar os blocos temporários;
4. adicionar os cinco cartões de passos, o achado corrigido, os riscos restantes e os limites de evidência;
5. redimensionar explicitamente a seção para conter todo o board, remover o estado de placeholder e verificar estrutura, fontes e ausência de blocos temporários;
6. renderizar a seção final e inspecionar visualmente as duas capturas e todas as notas antes da entrega.

## Protocolo para cada novo checkpoint

Registrar:

- branch, commit e árvore;
- arquivos modificados;
- decisão nova, se houver;
- testes realmente executados e seus resultados;
- falhas ou verificações pendentes;
- próximo arquivo e próximo comando exato;
- situação de stage, commit, push, PR, merge e deploy.
