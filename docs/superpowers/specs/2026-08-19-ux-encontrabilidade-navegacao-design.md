# Especificação de design — Encontrabilidade e navegação financeira

**Data:** 2026-08-19  
**Produto:** Inteligência Financeira PDDE | 4ª CRE  
**Escopo:** frontend React/Vite já publicado  
**Objetivo:** reduzir o número de decisões e cliques necessários para localizar informações básicas de repasses, contas e saldos, sem alterar regras financeiras, fontes de dados ou semântica de evidência.

## 1. Problema observado

A aplicação atual é organizada principalmente pela lógica de auditoria e acompanhamento. A navegação principal expõe apenas `Visão geral` e `Unidades`; a busca de escola aparece somente dentro da carteira; a home prioriza leitura executiva e triagem; e, no prontuário de uma escola, repasses, contas, saldos e movimentos ficam distribuídos ao longo de uma página extensa.

Isso funciona para quem já conhece o modelo do sistema, mas cria atrito para perguntas operacionais comuns:

- Quanto esta escola recebeu?
- Quanto estava previsto?
- O crédito foi localizado?
- Qual é o saldo conhecido?
- Em qual conta o recurso está associado?
- Quais repasses estão registrados para a unidade?

O desenho deve fazer com que essas perguntas tenham caminhos diretos e previsíveis.

## 2. Princípio de arquitetura da informação

A navegação será orientada por **tarefas financeiras**, não por componentes internos de auditoria.

A ordem de prioridade passa a ser:

1. localizar uma escola;
2. localizar repasses;
3. localizar saldos e contas;
4. aprofundar em movimentos, cobertura, pendências e indicadores.

A inteligência analítica atual permanece disponível, mas deixa de competir com a consulta básica na primeira camada de navegação.

## 3. Navegação principal

O cabeçalho passará a oferecer:

- **Início** → `/`
- **Escolas** → `/unidades`
- **Repasses** → `/repasses`
- **Saldos e contas** → `/saldos`

O selo de exercício `2026` permanece.

`Indicadores` continua acessível por links contextuais existentes e por cards da home, sem necessidade de item próprio no menu principal nesta etapa.

### Critério de sucesso

A partir de qualquer tela principal, o usuário deve conseguir alcançar uma escola, uma visão de repasses ou uma visão de saldos em no máximo um clique de navegação global, seguido da seleção da unidade quando aplicável.

## 4. Busca global de escola

A busca por nome, código SME ou INEP será promovida para a home como ação primária.

### Comportamento

- campo visível logo após o bloco inicial da home;
- busca sobre o mesmo conjunto `portfolio.schools` já carregado;
- resultados aparecem imediatamente sob o campo;
- cada resultado exibe nome da escola, SME e INEP;
- clique abre `/unidades/:inep`;
- nenhum novo endpoint é necessário;
- a busca existente em `/unidades` continua existindo.

A busca da home deve ser leve e focada em localização. Não deve carregar filtros de auditoria, ordenações ou triagem avançada.

## 5. Página inicial

A home será reorganizada em duas camadas.

### 5.1 Camada operacional, primeiro

Logo após o título do produto:

- **Encontrar uma escola** — busca direta;
- atalhos de tarefa:
  - **Ver repasses**;
  - **Ver saldos e contas**;
  - **Ver todas as escolas**.

O controle **Fazer nova consulta** e sua barra de progresso permanecem visíveis no topo, sem perder prioridade operacional.

### 5.2 Camada analítica, depois

Continuam abaixo:

- posição financeira consolidada de 2026;
- leitura executiva;
- cobertura;
- prioridades;
- indicadores de acompanhamento;
- fontes.

Não haverá remoção de métricas ou evidências existentes nesta fase. A mudança é de hierarquia visual e navegação.

## 6. Página Escolas

A página `/unidades` continua sendo a carteira completa, mas passa a servir primeiro para **localizar e comparar unidades**, não para destacar exceções.

### Mudanças

- título e texto introdutório mais neutros e orientados à consulta financeira;
- busca permanece no topo;
- tabela/lista continua exibindo:
  - previsto;
  - pagamento informado;
  - crédito localizado;
  - saldo conhecido;
  - cobertura;
  - situação;
- `Todas` é o filtro ativo por padrão;
- filtros `Com atenção`, `Cobertura incompleta` e `Pagamento suspenso` permanecem disponíveis, porém visualmente agrupados como filtros de acompanhamento secundários;
- ordenação padrão será **Código SME**, com desempate por nome da unidade;
- `Atenção primeiro` permanece como opção explícita de ordenação.

## 7. Nova página Repasses

Nova rota: `/repasses`.

### Finalidade

Responder rapidamente: **quanto foi previsto, quanto teve pagamento informado e quanto teve crédito localizado por escola**.

### Conteúdo

- título `Repasses 2026`;
- busca por nome, SME ou INEP;
- lista/tabela com uma linha por escola;
- colunas/campos principais:
  - escola;
  - previsto em 2026;
  - pagamento informado;
  - crédito localizado;
  - situação resumida;
- clique na escola abre o prontuário diretamente em `#repasses`;
- textos devem manter a distinção entre `pagamento informado` e `crédito localizado`.

### Dados

Usar exclusivamente `HumanPortfolioSchool` já disponível em `portfolio.schools`.

Não criar novo endpoint nem duplicar lógica financeira.

## 8. Nova página Saldos e contas

Nova rota: `/saldos`.

### Finalidade

Responder rapidamente: **qual é o saldo conhecido da escola e qual a cobertura da posição financeira**.

### Conteúdo

- título `Saldos e contas 2026`;
- busca por nome, SME ou INEP;
- lista/tabela com:
  - escola;
  - saldo conhecido;
  - data de referência;
  - contas com posição / contas totais;
  - indicação de cobertura;
- clique abre o prontuário em `#contas-saldos`.

### Limite de dados

A visão consolidada usará apenas os campos atualmente presentes na carteira. Agência, número de conta, aplicações e composição do saldo permanecem no prontuário da escola, onde os dados completos de `HumanSchool.accounts` já existem.

## 9. Prontuário financeiro da escola

A rota `/unidades/:inep` ganha navegação local explícita e previsível.

### Navegação local

- **Resumo** → `#resumo`
- **Repasses** → `#repasses`
- **Contas e saldos** → `#contas-saldos`
- **Movimentações** → `#movimentacoes`
- **Prestação de contas** → `#prestacao-contas`

Os itens que não possuírem conteúdo real serão omitidos. Não criar seções vazias nem controles desabilitados apenas para preencher o menu.

### Resumo

No topo permanecem visíveis, sem disclosure:

- previsto em 2026;
- pagamento informado;
- crédito compatível localizado;
- saldo informado/conhecido e data de referência.

### Repasses

A seção `Repasses` deve manter programas e parcelas, com as evidências já existentes. A mudança principal é encontrabilidade, não semântica financeira.

### Contas e saldos

A seção passa a ter título inequívoco `Contas e saldos`, preservando:

- banco/agência/conta;
- composição do saldo;
- evolução temporal;
- aplicações quando disponíveis.

### Movimentações

Quando houver pelo menos um movimento, o item `Movimentações` será exibido na navegação local. Haverá um único alvo `id="movimentacoes"` imediatamente antes do primeiro ledger de movimentos disponível. Os demais ledgers continuam agrupados dentro de suas respectivas contas, evitando IDs duplicados e sem criar uma segunda cópia dos movimentos.

## 10. URLs e navegação contextual

Os links entre visões devem usar âncoras semânticas:

- `/unidades/:inep#repasses`
- `/unidades/:inep#contas-saldos`
- `/unidades/:inep#movimentacoes`
- `/unidades/:inep#prestacao-contas`

Ao navegar para uma URL com hash, a aplicação deve deslocar o viewport para a seção correspondente e mover o foco programaticamente para o título/landmark da seção, preservando navegação por teclado.

## 11. Componentes propostos

Componentes novos ou extraídos devem permanecer pequenos e reutilizáveis:

- `GlobalSchoolFinder` — busca simplificada da home;
- `FinancialTaskLinks` — atalhos principais da home;
- `SchoolSectionNav` — navegação local do prontuário;
- `RepasseOverviewPage` — página `/repasses`;
- `BalancesOverviewPage` — página `/saldos`.

`SchoolSearch` pode ser reutilizado ou generalizado se isso evitar duplicação sem torná-lo excessivamente configurável.

`PortfolioSchoolList` não deve ser forçado a servir todas as páginas se isso tornar a API do componente confusa. É aceitável criar linhas especializadas para repasses e saldos usando o mesmo domínio de dados.

## 12. Fluxo de dados

Nenhuma mudança de backend é necessária.

Fluxo permanece:

`PortfolioContext` → `HumanPortfolio` → páginas de visão consolidada → `loadSchool(inep)` somente ao abrir prontuário.

As novas páginas `/repasses` e `/saldos` devem operar sobre `portfolio.schools`, evitando 163 carregamentos individuais de prontuário.

A consulta ao vivo existente continua substituindo somente o estado da carteira quando a cobertura é completa. As novas páginas devem refletir automaticamente o mesmo estado `published` ou `live` do `PortfolioContext`.

## 13. Acessibilidade e responsividade

- navegação principal deve continuar navegável por teclado;
- estado ativo dos links deve ser perceptível sem depender apenas de cor;
- busca deve manter `<label>` acessível;
- resultados de busca devem ser anunciáveis e clicáveis por teclado;
- navegação local da escola deve funcionar em telas estreitas com rolagem horizontal controlada ou quebra previsível;
- links com hash devem levar foco lógico para a seção;
- tabelas/listas devem continuar utilizáveis no mobile, preferindo cards/linhas responsivas já adotadas no produto.

## 14. Testes e verificação

A implementação deverá incluir TDD/regressão para, no mínimo:

1. menu principal contém `Início`, `Escolas`, `Repasses`, `Saldos e contas`;
2. home possui busca de escola e atalhos financeiros;
3. busca da home encontra escola por nome, SME e INEP;
4. `/repasses` mostra previsto, pagamento informado e crédito localizado sem fundir evidências;
5. `/saldos` mostra saldo conhecido, referência e cobertura;
6. links de repasse e saldo apontam para as âncoras corretas do prontuário;
7. prontuário expõe navegação local e IDs de seção correspondentes;
8. rotas novas não provocam carregamentos individuais de todas as escolas;
9. fluxos já existentes de consulta ao vivo e proteção contra cobertura parcial continuam passando;
10. smoke visual desktop/mobile deve ser executado quando a infraestrutura do Playwright estiver operacional.

Também permanecem obrigatórios:

- suíte unitária/integrada existente;
- TypeScript;
- build Vite cliente;
- bundle SSR/live;
- Preview Vercel antes de merge.

## 15. Fora do escopo desta etapa

- alterar regras de conciliação;
- mudar conceitos de `Previsto`, `Pagamento informado`, `Crédito localizado` ou `Saldo informado`;
- criar novos dados financeiros;
- criar novo backend ou endpoint;
- implementar persistência Supabase;
- criar autenticação;
- redesenhar toda a identidade visual;
- substituir a leitura executiva ou os indicadores existentes;
- criar dashboard de BI novo.

## 16. Critérios de aceite do produto

A mudança será considerada concluída quando:

- um usuário que abre a home consegue localizar uma escola diretamente;
- `Repasses` e `Saldos e contas` são destinos explícitos do menu principal;
- um usuário consegue chegar aos repasses ou saldos de uma escola sem precisar interpretar filtros de auditoria;
- a escola possui navegação local clara entre resumo, repasses, contas/saldos, movimentos e prestação de contas;
- nenhuma informação financeira básica existente é removida;
- nenhuma evidência distinta é fundida ou renomeada de forma enganosa;
- a consulta ao vivo e sua proteção contra resultados parciais permanecem intactas;
- desktop e mobile continuam funcionais e acessíveis.
