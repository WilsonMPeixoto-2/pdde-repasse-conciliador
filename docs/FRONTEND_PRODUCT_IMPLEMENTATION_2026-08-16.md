# Implementação do Produto Visual — 16/08/2026

## Escopo concluído na branch

A experiência web da **Inteligência Financeira PDDE | 4ª CRE** foi reconstruída sobre o read model humano de 2026, separando apresentação fiscal cotidiana da rastreabilidade técnica.

### Contrato humano e API

- endpoints somente leitura para portfólio e unidade;
- `runId` e demais identificadores técnicos são preservados internamente, mas removidos da API destinada ao frontend;
- métricas executivas persistidas no snapshot humano;
- saldo e aplicações agregados apenas dentro da mesma data de referência;
- ausência de referência produz dado indisponível, nunca zero inventado;
- contas carregam todas as posições mensais observadas, preservando lacunas.

### Produto web

- React + Vite + React Router;
- Home híbrida: posição financeira → acompanhamento acionável → carteira;
- indicadores agregados abrem exatamente a lista nominal correspondente;
- busca de unidades por nome, SME e INEP;
- prontuário financeiro por unidade;
- programas e parcelas em profundidade sob demanda;
- contas, aplicações, movimentações e prestação de contas em blocos semanticamente separados;
- timeline mensal 2026 acessível, clicável e navegável por teclado;
- meses não observados permanecem visualmente como lacunas;
- zero observado permanece distinto de ausência;
- origem das informações fica em contexto humano sob demanda.

### Linguagem visual

- composição editorial com números financeiros protagonistas;
- azul profundo estrutural;
- pagamento informado em papel cromático teal/verde;
- crédito localizado em azul semântico próprio;
- acompanhamento em âmbar neutro, sem linguagem acusatória;
- cards reservados a unidades conceituais/interativas reais;
- tipografia, espaço e divisórias fazem a maior parte da hierarquia;
- mobile recompõe o conteúdo e não comprime tabelas de desktop;
- timeline larga permanece confinada ao próprio bloco sem criar overflow global;
- marca curta deliberada no mobile.

### Navegação e acessibilidade

- aparência clicável implica ação real;
- disclosures têm `aria-expanded` e alvo controlado;
- timeline oferece clique, toque, Enter e Espaço;
- alternativa textual para a série visual;
- foco visível e `prefers-reduced-motion`;
- navegação para nova rota reinicia o scroll e transfere foco ao conteúdo definitivo, não ao placeholder de carregamento;
- URLs profundas de unidade são testadas no smoke SPA.

## Verificações realizadas

No head final da branch:

- suíte de testes: sucesso;
- typecheck: sucesso;
- build Vite: sucesso;
- smoke Playwright desktop 1440×1000: sucesso;
- smoke Playwright mobile 390×844: sucesso;
- Home → indicador → lista nominal → unidade → programa → timeline: sucesso;
- URL profunda `/unidades/:inep`: sucesso no servidor SPA de smoke;
- ausência de overflow horizontal global no mobile: sucesso;
- ausência de `sha256`, `parser`, `sourceUrl`, `payload`, `retry`, `runId` e outros metadados técnicos no DOM: sucesso;
- screenshots desktop/mobile inspecionados visualmente.

## Decisões deliberadamente não simuladas

### Supabase dedicado

O código e as migrations estão preparados, mas o projeto institucional dedicado não foi criado nem escolhido por inferência. A criação continua dependendo de decisão explícita de organização/plano/custo.

### Portal da Transparência

A interface está preparada para consumir informação publicada no read model. A consulta autenticada real continua dependendo da chave oficial em segredo de backend.

### Alertas preditivos

Nenhum threshold de baixa execução ou prazo foi inventado. Acompanhamentos atuais derivam apenas de estados já sustentados pelas fontes.

### PDF executivo final

A Constituição Visual orienta o futuro PDF, mas a composição final permanece uma decisão de produto própria.

### Deploy público/institucional

O build e as URLs profundas foram validados em servidor SPA de smoke. O host real ainda precisa ser configurado para fallback de rotas e conexão com a API/Supabase dedicados antes de se afirmar que a aplicação está publicada em produção.
