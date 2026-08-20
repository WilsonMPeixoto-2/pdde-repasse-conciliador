# Auditoria visual — leitura operacional da escola

**Data:** 20/08/2026

**Modo:** auditoria combinada de UX e riscos de acessibilidade

**Superfície:** prontuário financeiro em `/unidades/33069093`

**Estado aceito:** PR rascunho nº 38, head remoto `7e4a4492c691874b3580a5b358677e4e50de852d`

## 1. Objetivo do usuário

Permitir que uma pessoa sem domínio técnico compreenda primeiro:

1. quanto foi previsto;
2. quanto aparece como pagamento informado no PDDEInfo;
3. quanto possui crédito compatível localizado no SIGEF;
4. qual saldo foi informado e em que data;
5. quais pontos precisam ser conferidos e onde continuar a leitura.

Os detalhes de programas, parcelas, contas, posições, movimentos e prestação de contas devem continuar disponíveis sem competir com essa primeira leitura.

## 2. Evidência aceita

- workflow: `Frontend Product Smoke 2026`, execução nº 366, run `32429811398`;
- resultado: aprovado em 1440×1000 e 390×844, sem overflow horizontal global e sem metadados técnicos no DOM;
- artefato: `frontend-product-smoke-2026`, ID `9428694273`;
- digest do ZIP conferido: `sha256:1358f51ab9850faa2befc6a0043cecbaf5a3391cf067c786376b2bc519fb2290`;
- captura desktop: 1440×4455, SHA-256 `eae357a572f48d6c17e06dc0edf0a5c7d78d19c3c1b6a681677cfcfe8889a541`;
- captura mobile: 390×5915, SHA-256 `83a3b7582eaa3bc15972cf6423e7fe7301bf310c349fc2f761e6e5958e619093`;
- cópias aceitas no workspace:
  - `/workspace/scratch/487865c30622/PDDE_WORK_ARTIFACTS/2026-08-20-school-operational-reading/01-school-desktop.png`;
  - `/workspace/scratch/487865c30622/PDDE_WORK_ARTIFACTS/2026-08-20-school-operational-reading/02-school-mobile.png`.

## 3. Passos auditados

### Passo 1 — entrada e leitura rápida

**Saúde: boa.** Identidade da escola, ano e códigos aparecem antes da informação financeira. A cadeia `Previsto → Pagamento informado → Crédito compatível localizado` tem rótulos e fontes distintas; o saldo está separado e datado. O estado `Acompanhamento necessário` e os dois pontos a conferir aparecem antes dos detalhes em desktop e mobile.

O apontamento de fonte indisponível aparece uma única vez. A ação `Ver repasses` leva à seção útil em vez de funcionar como aviso sem destino.

### Passo 2 — programas e parcelas

**Saúde: boa.** O primeiro programa aberto permite comparar parcela, data informada, ordem FNDE e estado do crédito. Valores informados e créditos localizados não são tratados como equivalentes. O programa seguinte permanece recolhido e reduz ruído inicial.

### Passo 3 — contas, composição e evolução do saldo

**Saúde: boa, com densidade moderada no celular.** O saldo repete a data de posição, separa conta e aplicações e apresenta o detalhamento das aplicações. A evolução mostra somente as posições publicadas, sem introduzir referência negativa para uma série positiva. O detalhe do mês selecionado permanece legível no mobile.

### Passo 4 — movimentações financeiras

**Saúde: boa após correção durante a auditoria.** Totais de crédito, débito e diferença são visualmente separados. Cada movimento apresenta data, categoria humana, descrição, metadados disponíveis e valor com direção. Aplicações e resgates continuam descritos como transferências entre disponibilidades e investimentos; a diferença não é chamada de saldo.

Na primeira captura do ciclo, o extrato apareceu como texto corrido. A causa era a existência de `src/product/design/movement-ledger.css` sem importação em `src/product/App.tsx`. Foi criado um teste vermelho para a integração da folha, o import foi restaurado e as capturas aceitas acima foram geradas somente depois do novo CI verde.

### Passo 5 — prestação de contas

**Saúde: boa.** A situação informada permanece ao final, separada da leitura financeira e sem inferência de regularidade global.

## 4. Pontos fortes confirmados

- a conclusão operacional está acima dos detalhes;
- a sequência financeira usa texto e estrutura, não apenas cor;
- saldo e sua data têm tratamento próprio;
- o mesmo apontamento não é repetido no resumo e numa lateral;
- detalhes preexistentes foram preservados;
- desktop e mobile não apresentam corte ou overflow global;
- o extrato voltou a ter hierarquia de linha, espaçamento e separadores.

## 5. Riscos e oportunidades restantes

1. **Navegação interna no mobile — prioridade média.** A barra horizontal mostra `Resumo`, `Repasses` e `Contas e saldos`, mas o próximo item fica parcialmente visível. Isso indica que há mais conteúdo, porém o gesto de rolagem horizontal não é evidente para todo usuário. Um próximo marco pode testar indicador de continuidade, estado ativo ou outra organização sem aumentar a altura do cabeçalho.
2. **Extensão da página no mobile — prioridade baixa a média.** A página completa é longa porque preserva todos os detalhes. As âncoras reduzem o custo, mas a encontrabilidade real deve ser observada com usuários antes de recolher mais informação por padrão.
3. **Texto auxiliar do extrato — risco de acessibilidade a verificar.** Metadados usam corpo pequeno e tom secundário. A captura permite avaliar a hierarquia, mas não confirma contraste calculado, legibilidade a 200% de zoom ou preferência de tamanho de fonte.

Esses pontos não anulam o marco aceito; devem entrar na fila de melhoria, não ser misturados com a correção já comprovada.

## 6. Limites da evidência

As capturas não comprovam, sozinhas, conformidade WCAG, leitura por tecnologia assistiva, ordem anunciada por leitor de tela, contraste numérico, reflow a 200%/400% nem ergonomia em dispositivo físico. O smoke verificou navegação por teclado em controles selecionados, foco após mudança de rota, conteúdo esperado e ausência de overflow global; uma auditoria de acessibilidade dedicada continua sendo necessária para afirmações mais amplas.

## 7. Decisão

O prontuário atende ao objetivo deste marco e está apto a permanecer em PR rascunho para revisão humana. Não há autorização para marcar o PR como pronto, mesclar ou fazer deploy.
