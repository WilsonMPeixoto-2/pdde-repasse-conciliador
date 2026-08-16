# Auditoria técnica integral — Plataforma de Inteligência Financeira PDDE/2026

**Data:** 16/08/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Base auditada:** `main` em `62539a7570b9e14d02c58927ba5d608d12f45424`  
**Branch de correção:** `audit/revisao-tecnica-integral-2026-08-16`

## 1. Veredito executivo

A arquitetura atual é tecnicamente sólida e, sobretudo, preserva corretamente a separação entre **evidência bruta**, **normalização**, **conciliação**, **visão técnica**, **read model humano** e **apresentação**. O sistema não depende do layout original das fontes para determinar como a informação será mostrada ao usuário: a interface recebe um modelo humano próprio, construído depois das validações e reconciliações.

A auditoria, porém, encontrou defeitos reais que justificavam correção antes de chamar a plataforma de pronta para produção. Eles se concentravam justamente nas fronteiras mais difíceis: identidade bancária entre fontes, coerência temporal de agregações, proteção da API administrativa e validação do contrato humano.

Todos os defeitos confirmados nesta auditoria foram reproduzidos por testes antes da correção. A branch auditada termina com a suíte completa, typecheck e build aprovados; o smoke visual permanente também é executado sobre desktop e mobile.

Não é tecnicamente responsável declarar qualquer sistema dependente de páginas governamentais externas como “perfeito” em sentido absoluto. Mudanças de HTML, indisponibilidade, CAPTCHAs, atraso de cobertura e novas combinações de dados continuarão existindo como riscos externos. O objetivo alcançado é mais útil: **falhar de forma explícita, conservar evidência e impedir que incerteza vire certeza visual**.

## 2. Arquitetura de informação verificada

O caminho relevante do dado é:

```text
fonte pública / extrato
        ↓
evidência bruta preservada
        ↓
parser + normalização específica da fonte
        ↓
observações independentes
        ↓
conciliação e classificação
        ↓
visão fiscal / operacional
        ↓
read model humano validado
        ↓
Home / indicadores / escola / programa / conta / timeline
```

Essa arquitetura permite que o sistema extraia dezenas de milhares de registros sem despejar dezenas de milhares de registros sobre o usuário. O frontend não reconstrói regras de conciliação e não precisa conhecer hashes, parser, retry, páginas, payloads ou classificações técnicas.

### Consequência para a experiência

A escolha do que mostrar é feita sobre entidades humanas:

- unidade escolar;
- programa;
- parcela;
- conta;
- pagamento informado;
- ordem FNDE;
- crédito compatível localizado;
- posição de saldo;
- aplicações;
- movimentações;
- prestação de contas;
- acompanhamentos.

Isso permite reorganizações visuais completamente diferentes do desenho das páginas do PDDEInfo ou SIGEF sem perder a ligação com a evidência original.

## 3. Defeitos confirmados e corrigidos

### 3.1 Identidade bancária divergente na visão humana — corrigido

**Problema:** o núcleo financeiro já tratava contas equivalentes por canonização, por exemplo:

`001 / 0249 / 0000549797` = `1 / 249 / 549797`.

A visão humana possuía uma implementação própria mais simples que removia pontuação, mas não zeros de preenchimento. Assim, a mesma conta poderia ser reconhecida pelo reconciliador e depois aparecer como duas contas na camada humana, ou saldo e movimentos poderiam deixar de se encontrar.

**Correção:** `build-human-financial-view.ts` passou a reutilizar `canonicalAccount()` do núcleo.

**Regressão coberta:** teste com a mesma conta em formatações diferentes exige uma única conta humana com a série de saldos correspondente.

### 3.2 Identidade bancária divergente nos snapshots e séries históricas — corrigido

**Problema:** `financialSnapshotKey()` e o agrupamento de `buildFinancialSeries()` também tinham uma definição própria de identidade bancária. Uma alteração apenas de zeros de preenchimento entre janeiro e junho poderia separar uma única conta física em duas séries.

**Correção:** snapshot e série passaram a usar a mesma `canonicalAccount()` do reconciliador.

**Regressão coberta:** snapshots equivalentes precisam gerar a mesma chave e meses equivalentes precisam permanecer numa única série.

### 3.3 Resumo da unidade misturava saldos de datas diferentes — corrigido

**Problema confirmado por teste:** se uma conta tivesse posição em 30/06 e outra tivesse como última posição 31/05, o resumo da escola somava ambas e rotulava o total com a referência mais recente, junho.

Exemplo reproduzido:

- conta A, junho: R$ 1.000,00;
- conta B, maio: R$ 500,00;
- resultado antigo: R$ 1.500,00 com rótulo de junho.

**Correção:** a referência da escola continua sendo a data mais recente, mas o agregado de saldo/aplicações inclui apenas contas observadas nessa mesma data. Posições antigas continuam disponíveis na profundidade de cada conta.

Se alguma conta alinhada à data corrente tiver valor desconhecido, o agregado não é transformado em total parcial enganoso.

### 3.4 Leituras técnicas da API institucional estavam sem autenticação — bloqueador de produção corrigido

Antes da auditoria, o Bearer administrativo protegia comandos `POST`, mas várias leituras técnicas `GET` ficavam abertas. Entre elas:

- portfólio fiscal corrente;
- prontuário fiscal;
- catálogo técnico de escolas;
- históricos e findings;
- execuções;
- artefatos;
- redirecionamento para relatório por URL assinada.

Isso não era incidente em produção porque o backend institucional ainda não havia sido publicado, mas seria uma exposição inadequada se a API fosse simplesmente colocada em uma URL pública.

**Política aplicada:** permanecem acessíveis sem o segredo administrativo:

- `/api/health`;
- `/api/meta`;
- `/api/current/human/portfolio`;
- `/api/current/human/schools/:inep`.

As superfícies fiscal, operacional, histórica, de evidência e comandos exigem Bearer administrativo.

Rotas inexistentes continuam retornando 404 e não foram ocultadas atrás de um 401 genérico.

### 3.5 Backend aceitava read model humano estruturalmente malformado — corrigido

**Problema:** o frontend possuía schemas estritos para programas, parcelas, contas, posições, movimentos e prestação de contas, mas o backend corrente aceitava `programs`, `accounts` e `accounting` como `unknown[]`.

Um snapshot malformado poderia, portanto, ser aceito para persistência e só falhar quando o navegador o consumisse.

**Correção:** foi criado `shared/human-financial-contract.ts`, utilizado por backend e frontend. A mesma gramática agora define:

- unidade e fonte;
- indicador e métricas;
- programa e parcela;
- referência bancária;
- evidência de crédito;
- posição mensal;
- contraparte e movimento;
- conta;
- prestação de contas;
- conteúdo do prontuário.

O backend continua bloqueando metadados técnicos no read model humano, mas agora também valida a semântica financeira profunda antes da publicação.

Datas humanas precisam ser datas reais de 2026; valores conceitualmente não negativos, como crédito localizado e total esperado de prestação, também são validados como tal. Saldos continuam podendo ser negativos porque a fonte pode apresentar essa situação.

### 3.6 Smoke visual não observava alterações no contrato compartilhado — corrigido

Com a criação do contrato `shared/**`, uma alteração nessa camada poderia afetar o frontend sem disparar o workflow Playwright.

**Correção:** `Frontend Product Smoke 2026` passa a observar `shared/**` em `push` e `pull_request`.

### 3.7 Dependências e configurações residuais — limpas

A auditoria encontrou a pilha Tailwind/PostCSS instalada, mas sem uso pelo frontend aprovado, que utiliza CSS próprio. Também havia `lucide` sem importação.

Foram removidos:

- `lucide`;
- `tailwindcss`;
- `@tailwindcss/postcss`;
- `postcss`;
- `postcss.config.js`;
- `tailwind.config.js`.

`fast-check` foi preservado porque integra o ecossistema de testes por propriedades com `@fast-check/vitest`.

O alias `monitor:fiscal:xlsx`, que apontava para o workbook humano, passou a apontar para `export-fiscal-workbook.ts`. O alias técnico `monitor:audit:xlsx` continua disponível.

## 4. Extração PDDEInfo

### Pontos fortes verificados

- validação de exercício 2026;
- parsing monetário em centavos inteiros com proteção de faixa segura;
- validação de datas;
- mapeamento explícito de programas/ações;
- ação desconhecida com valor financeiro não é silenciosamente descartada;
- múltiplas contas conflitantes no mesmo contexto geram erro;
- invariantes de valores programados, ajustes e pagos são verificadas;
- falha por escola é isolada e registrada;
- HTML bruto é preservado com hash antes dos produtos derivados.

### Portfólio público

A coleta pública limita e valida os 163 INEPs, controla concorrência, descobre os meses de saldo disponíveis de 2026, preserva os artefatos e associa posição bancária à UEx por CNPJ.

O modelo preserva `schoolIneps[]` quando uma mesma UEx puder representar mais de uma escola. Na fotografia real validada da 4ª CRE havia 163 CNPJs únicos para as 163 escolas, portanto não existe duplicação corrente.

**Regra futura deliberadamente não inventada:** se aparecer uma UEx efetivamente compartilhada, a publicação deve sinalizar o caso para tratamento explícito antes de agregar valores no panorama. A fonte não deve ser duplicada silenciosamente por escola.

## 5. Extração SIGEF

### Pontos fortes verificados

- timeout, retries e rate limiting conservadores;
- CAPTCHA é detectado e interrompe a automação, sem bypass;
- limites de tamanho de resposta;
- detecção de encoding;
- paginação vinculada ao mesmo CNPJ, programa e conta;
- total declarado não pode mudar silenciosamente durante a paginação;
- deduplicação por fingerprint;
- classificação de estorno/tarifa com precedência antes de categorias genéricas;
- páginas brutas do extrato são preservadas individualmente;
- coleta de nenhuma movimentação só é aceita quando a página declara explicitamente que não existem registros.

### Completude sem total declarado

A hipótese de bug em `declaredTotal === null` foi investigada e não foi confirmada. O coletor continua seguindo links de paginação válidos mesmo quando o total não é informado. Uma resposta vazia sem marcador explícito não é aceita como “completa”.

Esse comportamento permanece monitorado como dependência de HTML externo, mas não houve fundamento para uma alteração especulativa nesta auditoria.

## 6. Conciliação e interpretação financeira

O reconciliador foi revisado de ponta a ponta, inclusive os chamadores.

### Propriedades importantes preservadas

- CNPJ, exercício, programa/ação/parcela participam da identidade;
- mais de uma liberação candidata leva a estado ambíguo, em vez de escolha arbitrária;
- valor, data, documento e conta fortalecem o vínculo;
- confirmação técnica só ocorre quando o crédito vinculado satisfaz as condições previstas;
- estorno/devolução compatível impede uma narrativa simplista de repasse confirmado;
- conta histórica não substitui silenciosamente conta vigente;
- fontes independentes não sobrescrevem umas às outras.

A classificação operacional de crédito SIGEF continua aparecendo para o usuário como **“Crédito compatível localizado”**, e não como prova absoluta de crédito bancário apenas porque coincidiu com uma ordem.

### Suspeita descartada

Foi investigada a possibilidade de um pagamento não informado no PDDEInfo receber alerta apenas porque qualquer crédito positivo existia no extrato. O fluxo completo mostrou que o reconciliador não recebe indiscriminadamente o extrato inteiro nesse ponto; há pré-filtragem de contexto. Não houve correção porque o bug não existia no caminho real.

### Conservadorismo mantido de propósito

Quando existem múltiplas liberações candidatas para a mesma identidade, o reconciliador prefere `AMBIGUO` a resolver heurísticamente uma candidata. Isso pode reduzir automação em situações raras, mas é atualmente a escolha segura para uma ferramenta fiscal. Uma futura flexibilização deve vir de evidência real e teste, não de desejo de aumentar a taxa de “matches”.

## 7. Consolidação e escolha do que mostrar

Este foi o foco principal da auditoria.

O sistema é capaz de extrair muito mais informação do que expõe. A redução não ocorre por descarte arbitrário no frontend; ela acontece por camadas:

1. o bruto é preservado;
2. a fonte é normalizada;
3. movimentos são classificados;
4. informações independentes são conciliadas;
5. uma visão fiscal retém detalhe técnico;
6. um read model humano seleciona entidades e estados compreensíveis;
7. o frontend escolhe composição visual, hierarquia e profundidade.

### O que não chega à interface comum

Entre outros:

- hashes;
- parser;
- número de páginas;
- URL técnica de coleta;
- payload bruto;
- retry;
- runId;
- classificações técnicas internas.

### O que chega

- valores financeiros;
- datas relevantes;
- conta quando conhecida;
- estados semanticamente distintos;
- posição temporal;
- movimentos compreensíveis;
- prestação de contas;
- acompanhamentos que podem levar à unidade correspondente.

A arquitetura, portanto, suporta legitimamente criar Home, prontuário, timelines, listas acionáveis, Excel e futuros PDFs com desenho totalmente diferente das fontes originais. A única restrição correta é que a nova visualização não pode inventar continuidade, confirmação ou total que as evidências não sustentem.

## 8. Publicação corrente e isolamento de falhas

O executor institucional não substitui o retrato oficial com:

- subconjunto de escolas;
- execução parcial;
- coleta incompleta.

Somente execução `COMPLETE` sobre a carteira institucional completa chega ao publisher corrente.

A publicação fiscal + humana é atômica: ambas são preparadas/validadas antes do RPC e substituídas juntas. Isso impede Home de uma execução e prontuário de outra.

A migration também refaz validações de cobertura, INEPs e métricas no banco.

## 9. Segurança e segredos

### Supabase

O backend:

- rejeita chave `publishable` para uso institucional;
- aceita secret/service role válida;
- exige HTTPS fora de localhost;
- recusa URL com credencial/query/fragmento;
- desativa sessão persistente, refresh e detecção em URL.

A service role não deve ser enviada ao frontend e não existe justificativa para configurar esse segredo no Vite/Vercel client-side.

### Portal da Transparência

O cliente:

- recebe a chave por ambiente;
- envia a credencial apenas no header oficial;
- serializa a si próprio apenas como `configured: true`;
- trata 401/403 como erro de credencial sem retry inútil;
- preserva resposta bruta para auditoria quando a consulta é válida.

A integração autenticada real continua dependente da chave oficial ainda não configurada.

## 10. Pacotes e configuração

Auditoria automatizada executada sobre a árvore:

- `npm audit`: **0 vulnerabilidades conhecidas**;
- ciclos de importação: **nenhum encontrado**;
- marcadores `TODO`, `FIXME`, `HACK`, `@ts-ignore` e `@ts-expect-error`: **nenhum no núcleo auditado**;
- `@types/node` aparece atrás da linha mais recente porque o projeto opera intencionalmente em Node 24, e não deve ser atualizado apenas para “zerar outdated”.

Knip apontou alguns barrels/exports não consumidos internamente. Eles foram classificados como dívida leve de manutenção, não como defeito funcional. A auditoria não removeu APIs/entrypoints só para satisfazer uma ferramenta estática.

## 11. Visualização e frontend

A interface continua respeitando a Constituição Visual:

- hierarquia por tipografia/espaço antes de caixas;
- cor com significado semântico;
- indicador com lista nominal acionável;
- programa/conta com profundidade sob demanda;
- timeline interativa;
- lacuna temporal permanece lacuna;
- zero observado permanece zero;
- mobile é recomposto, não apenas espremido;
- metadados técnicos não aparecem no DOM;
- URLs profundas, teclado, foco e reset de scroll são exercitados pelo smoke.

A correção de consolidação temporal da escola é particularmente importante: apresentação bonita não pode ser usada para mascarar um total formado por períodos incompatíveis.

## 12. Riscos remanescentes e limites explícitos

### Externos

1. **Supabase institucional dedicado ainda não provisionado.**
2. **Portal da Transparência ainda sem chave oficial configurada.**
3. **HTML de PDDEInfo/SIGEF pode mudar.** O sistema possui falhas explícitas, validações e preservação do bruto, mas nenhuma automação elimina o risco de mudança externa.
4. **CAPTCHA pode exigir intervenção humana autorizada.** Não existe nem será implementado bypass.

### De negócio ainda não inventados

1. UEx compartilhada por mais de uma escola, caso apareça na carteira real, exige regra explícita de agregação antes de entrar em totais globais.
2. Thresholds de “baixa execução”, “saldo parado” ou alertas preditivos continuam sem regra automática até haver critério institucional aprovado.
3. Ambiguidade real de múltiplas liberações permanece ambiguidade, em vez de ser resolvida por uma heurística opaca.

## 13. Critério final

Após esta auditoria, o projeto está em condição significativamente mais forte para avançar à implantação institucional. A principal conclusão não é que “todo dado extraído deve aparecer”. É o oposto:

> **Todo dado importante deve permanecer auditável internamente; somente a informação semanticamente necessária deve chegar à experiência humana, reorganizada segundo a tarefa do usuário e nunca segundo a aparência original da fonte.**

Essa separação está presente na arquitetura e foi fortalecida nesta auditoria.

O próximo gate técnico para produção não é uma nova rodada abstrata de revisão. É a implantação em infraestrutura dedicada, aplicação das migrations, publicação de uma execução integral real e comparação da experiência web com os artefatos brutos da mesma execução.