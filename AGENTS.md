# AGENTS.md — protocolo soberano de continuidade

Este arquivo existe para impedir retomadas por memória obsoleta, documentos históricos isolados ou inferências feitas a partir de um chat anterior.

## 1. Repositório e escopo

- Repositório canônico e único para escrita: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- Carteira operacional: 163 unidades escolares da 4ª CRE / SME-Rio.
- Exercício corrente: 2026.
- `WilsonMPeixoto-2/extrator-pdde-4cre`: referência histórica/técnica; não é linha paralela de desenvolvimento.
- `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`: somente leitura neste fluxo; nunca escrever nem misturar conteúdo automaticamente.

## 2. Ordem obrigatória antes de qualquer alteração

1. `docs/LEIA_PRIMEIRO.md`.
2. `docs/ESTADO_ATUAL_2026-09-04.md` ou o `ESTADO_ATUAL_YYYY-MM-DD.md` posterior que o índice declarar soberano.
3. `docs/CONTINUIDADE_WORK.md`.
4. `docs/DECISOES.md`.
5. `docs/FONTES_E_REGRAS.md` quando a tarefa tocar coleta, evidência, conciliação, saldo, repasse, fonte ou Excel.
6. `docs/ARCHITECTURE.md` quando a tarefa tocar runtime, workflow, API, publicação, persistência ou frontend.
7. Código, testes, workflows, `main`, CI e produção reais da área afetada.

Somente depois dessa leitura deve ser feito um plano de alteração.

## 3. Hierarquia de autoridade

Em caso de divergência, prevalece esta ordem:

1. código/testes/workflows existentes no commit corrente da `main`;
2. execução real verificada e produção efetivamente servida;
3. `docs/LEIA_PRIMEIRO.md` e o estado atual soberano indicado por ele;
4. `docs/CONTINUIDADE_WORK.md`;
5. `docs/DECISOES.md`, `docs/FONTES_E_REGRAS.md`, `docs/ARCHITECTURE.md` e `docs/PROJETO.md`;
6. auditorias, baselines, checkpoints e planos datados;
7. handoffs, prompts, fontes brutas e resumos de chats.

Documento datado preserva o estado de sua data. Ele nunca deve rebaixar uma solução posterior nem reabrir uma decisão já superada.

## 4. Regra contra regressão documental

Antes de implementar uma tarefa descrita em plano antigo:

- verificar se a tarefa já foi totalmente ou parcialmente resolvida por commits/PRs posteriores;
- verificar se uma solução posterior mais avançada alterou a regra original;
- preservar a solução posterior quando ela for melhor ou mais completa;
- atualizar o plano/documentação em vez de forçar o código atual a caber em uma decisão velha.

## 5. Regras financeiras que não podem ser enfraquecidas

- ausência de dado não é zero;
- zero só é zero quando uma fonte válida realmente publicou zero;
- pagamento informado não equivale automaticamente a crédito bancário;
- ordem/liberação e crédito observado são fatos distintos;
- saldo é posição datada e não saldo bancário em tempo real;
- aplicação/resgate não prova rendimento nem posição atual por si só;
- cobertura parcial, fonte indisponível ou consulta inconclusiva não provam ausência;
- histórico não completa silenciosamente lacuna corrente de 2026;
- fontes independentes não se sobrescrevem;
- divergências devem permanecer visíveis e investigáveis;
- conciliação financeira é determinística e baseada na chave mais forte disponível.

## 6. Qualidade prevalece sobre velocidade

Decisão explícita de 04/09/2026:

- uma coleta integral pode levar muitos minutos e isso é normal;
- não reduzir retries, fallbacks, cruzamentos ou investigação de inconsistências apenas para acelerar a execução;
- tempo longo não é falha enquanto houver progresso real e o processo estiver saudável;
- timeout, cancelamento, fonte quebrada, cobertura incompleta ou estado `PARTIAL` são falhas/limitações diferentes de uma execução longa;
- uma coleta só pode substituir o retrato oficial após completar os critérios de qualidade e cobertura definidos pelo projeto.

## 7. Regra de publicação do snapshot

O fluxo canônico é:

`coleta integral 163 -> validação COMPLETE 163/163 -> artefato da mesma execução -> materialização do snapshot -> commit em main -> deploy Vercel -> verificação do manifesto público`.

Nunca declarar atualização concluída apenas porque a coleta terminou. É obrigatório provar que o dado novo chegou ao snapshot e à produção.

Checkpoint validado em 04/09/2026:

- Full 163 run id: `33906605579` (run #216), `success`;
- artefato: `9950830049`, `sigef-full-163-2026`;
- commit de publicação: `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- deployment Vercel: `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público confirmado com `workflowRunId=33906605579` e `artifactId=9950830049`.

Esses IDs são evidência histórica do checkpoint de 04/09, não constantes permanentes. Uma coleta posterior válida deve substituí-los.

## 8. O que um novo chat não deve fazer

- não reconstruir o estado atual lendo somente um handoff antigo;
- não tratar baseline de agosto como fotografia atual;
- não repetir pesquisas de fontes já documentadas sem primeiro ler `FONTES_E_REGRAS.md` e `CONHECIMENTO_ACUMULADO.md`;
- não promover ausência para zero;
- não enfraquecer o gate `COMPLETE 163/163` para fazer uma execução ficar verde;
- não contornar CAPTCHA, autenticação ou restrições externas;
- não confundir código existente com infraestrutura implantada;
- não declarar produção atualizada sem conferir a produção.

## 9. Obrigação documental após mudança material

Toda alteração que mude arquitetura, regra financeira, fonte, estado de produção, decisão de produto ou caminho de continuidade deve atualizar, conforme aplicável:

- `docs/ESTADO_ATUAL_*.md`;
- `docs/CONTINUIDADE_WORK.md`;
- `docs/DECISOES.md`;
- `docs/FONTES_E_REGRAS.md`;
- `docs/ARCHITECTURE.md`;
- `docs/INDICE_DOCUMENTAL.md`.

O objetivo é impedir que a documentação volte a ficar vários ciclos atrás do código.