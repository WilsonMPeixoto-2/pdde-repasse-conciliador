# Arquitetura atual e direção de evolução

## Estado corrente — 30/08/2026

A arquitetura canônica já une o **motor financeiro**, o **read model humano** e o **produto web publicado**. A infraestrutura institucional persistente também existe em código, mas ainda não está conectada a um Supabase dedicado.

O estado factual resumido está em [`ESTADO_ATUAL_2026-08-30.md`](ESTADO_ATUAL_2026-08-30.md).

## Princípio arquitetural

O sistema é deliberadamente determinístico nas conclusões financeiras. IA, navegador automatizado ou agentes podem ajudar a coletar, diagnosticar mudanças e melhorar a experiência, mas não decidem o resultado da conciliação.

A aplicação também separa **fato observado**, **conclusão derivada** e **apresentação humana**.

```text
fontes públicas
   │
   ▼
evidência bruta / observações
   │
   ▼
normalização específica da fonte
   │
   ▼
conciliação e classificação determinística
   │
   ├──────────────► visão técnica / auditoria
   │
   ▼
read model financeiro humano
   │
   ▼
produto web / Excel humano
```

## Fluxo financeiro materializado

```text
Lista-mestre · 163 escolas · 2026
        │
        ├── PDDEInfo por INEP
        │     ├── escola / UEx / CNPJ
        │     ├── contas exibidas
        │     └── repasses / ações / parcelas
        │
        ├── Relatórios públicos PDDEInfo/FNDE
        │     ├── atendimento / ordem de pagamento
        │     ├── prestação de contas
        │     └── saldos / aplicações por referência
        │
        └── SIGEF
              ├── liberação/conta quando aplicável
              └── extrato / movimentações
        │
        ▼
runFinancialIntelligenceMonitoring
        │
        ├── visão operacional/fiscal
        ├── snapshots financeiros
        ├── evidências e artefatos
        └── visão humana
        │
        ▼
contrato humano compartilhado
        │
        ├── portfólio resumido
        └── prontuário por escola
        │
        ▼
React/Vite no Vercel
```

## Fronteiras de responsabilidade

### `backend/core/`

Contém contratos e invariantes independentes de UI/fonte: dinheiro em centavos, escopo temporal, identidade, evidência e regras determinísticas.

### `backend/adapters/`

Acessa PDDEInfo, SIGEF, persistência e demais integrações. Cada fonte mantém sua própria semântica e nunca reescreve silenciosamente outra.

### `backend/application/`

Orquestra coleta, monitoramento, conciliação, snapshots e read models. O fluxo institucional completo está representado por `run-financial-intelligence-monitoring.ts` e pelo job `MONITORING`.

### `shared/human-financial-contract.ts`

É a fronteira comum entre backend e frontend. Antes de uma projeção humana ser publicada/consumida, valida estrutura financeira profunda e impede que metadados técnicos sejam tratados como conteúdo de produto.

### `src/product/`

Implementa a experiência fiscal. Não reconcilia fontes e não tenta reinterpretar o bruto. Organiza a informação humana por escola, repasse, conta, saldo, movimentação e acompanhamento.

### `supabase/migrations/`

Define a persistência institucional planejada/testada para fila, evidência, snapshots e read models. As migrations foram exercitadas em PostgreSQL/PGlite, mas ainda não foram aplicadas em um projeto Supabase dedicado desta plataforma.

## Produto web atual

Rotas principais:

- `/` — Início / posição consolidada;
- `/unidades` — carteira e filtros;
- `/repasses` — visão consolidada de repasses;
- `/pdde-basico` — leitura operacional da 1ª/2ª parcela do PDDE Básico e localização do saldo em conta/aplicações;
- `/saldos` — visão consolidada de saldos e contas;
- `/unidades/:inep` — prontuário financeiro;
- `/indicadores/:slug` — relação nominal de um indicador.

O prontuário possui navegação local por âncoras e mantém os detalhes técnicos fora da leitura comum.

## Consulta ao vivo

A consulta web não tenta executar toda a carteira dentro de uma única função longa. O cliente consulta `/api/live` por escola com concorrência e retentativas limitadas.

Propriedades obrigatórias:

- o retrato publicado permanece na tela durante a atualização;
- o progresso é exibido por unidade;
- qualquer falha não resolvida impede promoção da carteira incompleta;
- qualquer resultado `PARTIAL` impede promoção;
- somente uma rodada integral válida passa a ser o retrato da sessão;
- um prontuário já aberto acompanha a versão da consulta ao vivo da mesma sessão.

A atualização ainda é **volátil no navegador**. Persistência durável depende da infraestrutura dedicada.

## Publicação corrente versus persistência futura

### Publicado agora

- frontend Vercel;
- snapshot financeiro estável distribuído com o produto;
- endpoint `/api/live`;
- consulta e atualização integral em sessão;
- rotas profundas da SPA;
- CI e smoke desktop/mobile.

### Implementado em código, ainda não conectado definitivamente

- Supabase dedicado;
- fila/worker institucional persistente;
- armazenamento institucional de artefatos das consultas web;
- publicação durável do novo retrato completo;
- histórico persistente consultável pelo frontend.

Essa distinção evita o erro antigo de tratar “existe uma migration/adaptador” como sinônimo de “está implantado”.

## Regras que a arquitetura não pode violar

1. exercício operacional corrente = 2026;
2. ausência não vira zero;
3. dado antigo não completa dado corrente;
4. pagamento informado não equivale a crédito bancário;
5. ordem/liberação e crédito no extrato são fatos distintos;
6. saldo é uma posição datada;
7. aplicação não é rendimento;
8. cobertura incompleta permanece inconclusiva;
9. fontes preservam independência;
10. conciliação usa a chave mais forte disponível e não escolhe arbitrariamente entre candidatos;
11. resultado parcial não substitui retrato corrente válido;
12. interfaces humanas não expõem hashes, parsers, retries, payloads ou IDs técnicos como conteúdo comum.

## Próxima fronteira arquitetural

A principal lacuna deixou de ser coleta ou frontend. É **durabilidade institucional**:

1. criar Supabase dedicado;
2. aplicar migrations canônicas;
3. conectar stores/publisher/worker;
4. persistir consultas web e evidências;
5. fazer o frontend consumir o retrato corrente persistido sem perder o comportamento conservador já validado.

Mudanças futuras de UX ou novas fontes devem ser feitas sobre essa arquitetura, não substituindo-a por outra pilha sem ganho comprovado.


## Gates técnicos incorporados — 30/08/2026

A arquitetura de validação passa a incluir quatro camadas complementares:

1. Vitest para regras e contratos determinísticos;
2. MSW para simular integrações HTTP de forma controlada;
3. Playwright Test para jornadas reais em Chromium desktop/mobile;
4. Axe sobre Playwright para regressões de acessibilidade de impacto sério ou crítico, preservando dívida conhecida explicitamente registrada.

O workflow de frontend continua executando o smoke determinístico existente e acrescenta a jornada E2E e o gate de acessibilidade. Isso mantém testes de unidade e experiência real separados, sem converter o frontend em autoridade sobre regras financeiras.

A remoção da dependência opcional explícita de Rollup Linux é aceita somente porque instalação e build continuam sendo exercitados em runner Linux. A política de dependências permanece conservadora para bibliotecas com impacto semântico: Zod 4.5 não entra no ciclo corrente antes de maturação e benchmark.
