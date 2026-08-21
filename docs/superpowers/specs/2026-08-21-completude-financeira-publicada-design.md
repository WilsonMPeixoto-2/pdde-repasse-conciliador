# Completude financeira publicada de 2026 — desenho de produto e engenharia

**Data:** 21/08/2026

**Marco:** quarto marco, reorientado após a revisão crítica da auditoria

**Estado:** proposta consolidada para revisão humana antes do plano de implementação

## 1. Problema observado

O pipeline já coleta e concilia movimentações de 2026 e o contrato humano já aceita várias posições de saldo por conta. O produto publicado, porém, foi gerado pelo monitoramento que usa implicitamente o modo `LATEST` dos relatórios de saldo. Por isso, cada uma das 335 contas publicadas possui somente a posição de 31/07/2026 e a linha temporal recebe apenas um ponto.

Em contraste, o backfill público validado em 16/08 materializou 2.690 posições de janeiro a junho e 461 séries conta/programa. Essa informação existe como artefato separado, mas não atravessa o fluxo que gera o site e a planilha humana.

O problema deste marco é a junção entre coleta histórica, contrato humano e publicação. Não é falta das movimentações de 2026: a recontagem do artefato publicado encontrou 408 movimentos no modelo financeiro e os mesmos 408 no modelo humano.

## 2. Resultado pretendido

Para cada conta, um usuário comum deve conseguir responder:

1. qual foi a primeira posição de saldo publicada em 2026 e em que data;
2. qual é a última posição publicada e em que data;
3. em quais meses há posição e em quais não há observação;
4. quais créditos, aplicações, resgates, pagamentos e transferências foram observados no extrato de 2026;
5. se a posição atual contém saldo sem entrada correspondente observada em 2026;
6. se há valor aplicado sem evento de aplicação observado em 2026;
7. se a consulta de movimentações foi completa, parcial, falhou ou não estava disponível para aquela conta.

O site e o Excel devem contar a mesma história a partir do mesmo `human-financial.json` validado.

## 3. Abordagens consideradas

### A. Ativar o histórico no monitoramento existente — escolhida

O monitoramento oficial passa a solicitar `ALL_AVAILABLE_2026`, usa o mesmo normalizador já validado e constrói o read model humano com todas as posições retornadas.

Vantagens:

- reutiliza coleta, rate limit, preservação de evidência e schema existentes;
- mantém posições e movimentos na mesma execução;
- evita novo banco ou nova fonte de verdade;
- permite site e Excel derivados do mesmo resultado.

Custo: mais consultas e maior artefato. O piloto e a execução integral devem medir duração e tamanho reais antes da publicação.

### B. Mesclar o backfill antigo com a coleta mais recente — rejeitada

Seria mais rápida, mas uniria datas de coleta, coberturas e proveniências diferentes. Também exigiria regras de precedência e poderia publicar meses antigos ao lado de uma posição atual sem deixar claro que vieram de execuções distintas.

### C. Esperar o Supabase e consultar o histórico persistido — rejeitada para este marco

É uma direção institucional válida, mas bloquearia valor já disponível no pipeline estático. A persistência continua posterior e deverá aceitar o mesmo contrato temporal produzido aqui.

## 4. Contrato temporal e probatório

- todos os totais, movimentos, posições e flags deste marco pertencem exclusivamente a 2026;
- movimentos anteriores não entram em totais ou narrativas correntes;
- contexto anterior a 2026, quando necessário para investigar saldo reprogramado, será apresentado em recorte separado e não faz parte deste marco;
- mês sem posição é ausência de observação, não saldo zero;
- `primeira posição observada` não será chamada de `saldo inicial` salvo se a própria fonte publicar uma posição que represente explicitamente o início do exercício;
- aplicação é posição financeira ou transferência entre disponibilidades, não rendimento;
- a soma de movimentos não será apresentada como reconciliação automática do saldo;
- ausência de evento em 2026 não prova irregularidade nem prova que o evento nunca ocorreu; pode representar fato anterior ao recorte;
- falha ou parcialidade da coleta impede conclusões de ausência naquela conta.

## 5. Arquitetura escolhida

```text
PDDEInfo/SIGEF · execução única de 2026
                │
                ├── todas as posições mensais disponíveis
                ├── movimentos do exercício
                └── estado real da coleta por conta
                │
                ▼
human-financial.json validado
                │
                ├── snapshot web determinístico
                └── workbook humano
```

Não haverá merge silencioso de artefatos nem cálculo diferente por consumidor.

### 5.1 Coleta

`runFinancialIntelligenceMonitoring` receberá e propagará um modo de coleta de saldos. Os fluxos de produto usarão explicitamente `ALL_AVAILABLE_2026`:

- monitoramento integral das 163 unidades;
- piloto padrão de dez unidades;
- sessão temporária;
- consulta ao vivo de uma escola;
- futuro worker institucional.

`LATEST` permanecerá disponível apenas para diagnóstico explícito e testes que não materializam um produto completo. Não poderá ser o padrão implícito de um artefato apresentado como visão financeira de 2026.

Uma falha em mês solicitado permanece registrada em `failures`, torna a execução parcial e impede a promoção como retrato oficial.

### 5.2 Retenção de séries de conta

O read model continuará preservando todas as contas com extrato SIGEF. Para contas encontradas apenas nos relatórios de saldo:

- manter a série quando qualquer posição de 2026 possuir componente não zero, mesmo que a última posição seja zero;
- excluir somente série sem movimento cujo conjunto inteiro de posições observadas seja zero;
- contar e registrar separadamente as séries excluídas por essa regra na auditoria da execução.

Isso evita perder uma conta que começou com recurso e terminou zerada, sem transformar contas sempre zeradas em ruído operacional.

### 5.3 Contrato humano por conta

O contrato compartilhado manterá `positions`, `latestPosition` e `movements` e acrescentará semântica estável para os dois consumidores.

```ts
type HumanMovementKind =
  | 'FNDE_CREDIT'
  | 'APPLICATION'
  | 'REDEMPTION'
  | 'PAYMENT_OR_TRANSFER'
  | 'CARD_PAYMENT'
  | 'FINANCIAL_INCOME'
  | 'THIRD_PARTY_ENTRY'
  | 'BANK_FEE'
  | 'REVERSAL'
  | 'OTHER';

interface HumanAccountCoverage2026 {
  positionCount: number;
  firstPositionDate: string | null;
  latestPositionDate: string | null;
  movementCollectionStatus: 'COMPLETE' | 'PARTIAL' | 'FAILED' | 'NOT_AVAILABLE';
  latestMovementDate: string | null;
}

interface HumanAccountActivity2026 {
  movementCount: number;
  creditsObservedCents: number;
  debitsObservedCents: number;
  fndeCreditsCents: number;
  applicationsCents: number;
  redemptionsCents: number;
  paymentsAndTransfersCents: number;
  financialIncomeCents: number;
  thirdPartyEntriesCents: number;
  bankFeesCents: number;
  otherCreditsCents: number;
  otherDebitsCents: number;
}

type HumanAccountContextFlag =
  | 'NONZERO_POSITION_WITHOUT_2026_INFLOW'
  | 'NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT'
  | 'MOVEMENT_COLLECTION_PARTIAL'
  | 'MOVEMENT_COLLECTION_FAILED';
```

Cada movimento terá `kind` estável e manterá `category` como rótulo humano. O código estável será usado para agregação; o rótulo continuará sendo conteúdo de apresentação. Isso elimina a divergência atual entre consumidores que tratam a categoria ora como código, ora como texto.

As somas serão calculadas uma vez na construção do contrato. Site e planilha não reclassificarão históricos textuais por conta própria.

### 5.4 Regras das flags

`NONZERO_POSITION_WITHOUT_2026_INFLOW` será emitida somente quando:

- a última posição total conhecida for maior que zero;
- a coleta de movimentos estiver completa;
- não houver em 2026 crédito FNDE, entrada de terceiro ou rendimento financeiro observado.

`NONZERO_APPLICATION_WITHOUT_2026_APPLICATION_EVENT` será emitida somente quando:

- a última posição de aplicações for maior que zero;
- a coleta de movimentos estiver completa;
- não houver evento de aplicação financeira em 2026.

Em coleta parcial, falha ou ausência de extrato mapeado, a interface apresentará primeiro a limitação da fonte e não concluirá ausência de evento.

As flags descrevem ausência de evidência no recorte. Elas não atribuem origem, não calculam irregularidade e não afirmam que todo o saldo decorre de exercício anterior.

## 6. Experiência web

Dentro de cada conta, antes da composição e da linha temporal, será exibido um resumo `O que foi observado em 2026` com:

- primeira e última posição publicadas, com datas;
- quantidade de posições mensais;
- créditos e débitos observados;
- aplicações, resgates e pagamentos/transferências, quando houver;
- última movimentação retornada e estado da coleta;
- mensagens contextuais derivadas das flags.

A linha temporal existente passará a receber todas as posições observadas e continuará mostrando lacunas sem ligar meses ausentes.

O extrato detalhado permanece disponível. Valores agregados não substituem os movimentos que os compõem.

### Linguagem dos dois casos-piloto da Professor Carneiro Ribeiro

- conta com crédito de R$ 3.155,00 e posição equivalente em conta: `Crédito observado em 2026; a posição mais recente informa o valor em conta na data indicada.`;
- conta com R$ 3.459,73 aplicado e sem evento de 2026: `Há valor aplicado na posição mais recente, mas nenhum evento de aplicação foi observado no extrato de 2026. A origem pode estar fora do recorte e requer consulta separada.`

Os valores servem como fixture de regressão do retrato atual. Uma nova coleta real será validada contra seus próprios artefatos, porque a fonte pode publicar posição posterior.

## 7. Workbook humano

O Excel continuará sendo uma leitura humana por recortes, não uma mega tabela.

`Contas e Saldos` permanecerá uma linha por conta e passará a incluir:

- primeira e última posição observadas;
- número de posições;
- saldo atual em conta e em aplicações;
- créditos, débitos, aplicações, resgates e pagamentos/transferências observados;
- cobertura de movimentos e mensagem contextual curta.

Será acrescentada a aba `Evolução Mensal`, com uma linha por posição publicada e as colunas de escola, programa, conta, data, saldo em conta, aplicações e saldo total. Essa aba é o detalhe navegável da síntese e altera conscientemente o workbook humano de sete para oito abas.

`Movimentações` continuará contendo uma linha por evento. As três abas serão geradas do mesmo contrato por conta.

## 8. Publicação determinística

Um empacotador versionado substituirá a montagem manual dos trechos em `public/data/`.

Entrada:

- um `human-financial.json` validado;
- identificação da execução e do artefato de origem.

Saída:

- `pdde-2026-snapshot.json`;
- partes gzip/base64 determinísticas;
- manifesto de contagens e checksums;
- workbook gerado da mesma entrada.

Partes antigas que deixarem de constar no manifesto serão identificadas pelo empacotador. Sua remoção ocorrerá somente no commit explícito de promoção do novo retrato.

Nenhum workflow fará push automático. A promoção para `public/data/`, PR, merge e deploy continuam gates separados e auditáveis.

## 9. Validação e invariantes

### 9.1 Testes determinísticos

- `ALL_AVAILABLE_2026` é propagado por todos os fluxos de produto;
- posições são ordenadas e deduplicadas por escola, conta e data;
- conta com posição não zero anterior e posição final zero é preservada;
- série sempre zerada e sem movimento segue excluída e contabilizada;
- códigos de movimento produzem totais sem depender do texto de apresentação;
- flags não são emitidas quando a coleta é parcial ou falha;
- site e workbook consomem os mesmos campos do contrato;
- empacotamento repetido da mesma entrada produz os mesmos bytes.

### 9.2 Paridade

- o conjunto de movimentos de 2026 normalizados deve ser igual no modelo fiscal e no humano;
- todo movimento humano deve aparecer uma vez no snapshot web e uma vez na aba `Movimentações`;
- toda posição de uma conta retida deve aparecer uma vez no snapshot web e uma vez em `Evolução Mensal`;
- qualquer série de saldo não publicada deve estar no conjunto auditável de séries integralmente zeradas e sem movimento;
- `latestPosition` deve ser exatamente a última posição de `positions`;
- contagens e listas nominais devem continuar consistentes.

### 9.3 Execução real

1. piloto com as dez escolas padrão, incluindo a EM Professor Carneiro Ribeiro;
2. inspeção dos JSONs, workbook e telas do piloto;
3. execução das 163 escolas, sem falha de mês ou conta;
4. auditoria de contagens, chaves lógicas, cobertura e paridade;
5. smoke desktop/mobile e inspeção visual;
6. somente depois, pedido separado de autorização para promover o retrato.

## 10. Acessibilidade no marco

Componentes novos devem nascer com semântica nativa, foco visível, rótulos persistentes e reflow sem perda. As correções globais da auditoria de acessibilidade permanecem no marco posterior; não será alegada conformidade WCAG integral nesta entrega.

Se um arquivo tocado contiver uma barreira já documentada e a correção for local, ela será incluída para não ampliar dívida. Isso não transforma este marco na implementação completa do plano de acessibilidade.

## 11. Fora do escopo

- incorporar movimentos de 2025 aos totais de 2026;
- inferir reprogramação, origem exata ou causalidade entre um movimento e um saldo;
- calcular execução orçamentária, regularidade ou suficiência de gasto;
- conectar ou criar Supabase;
- alterar migrations ou persistência institucional, salvo adaptação estritamente necessária do schema humano já versionado;
- adicionar nova fonte externa;
- gerar PDF executivo;
- redesenhar a carteira inteira;
- publicação automática, merge ou deploy.

## 12. Critérios de aceite

1. os fluxos de produto coletam todos os meses de saldo de 2026 disponíveis na execução;
2. o site apresenta mais de uma posição quando a fonte possui série e mantém lacunas explícitas;
3. uma conta que terminou zerada não perde posições não zero anteriores;
4. primeira e última posição, atividade e cobertura são compreensíveis sem ler o extrato completo;
5. posição ou aplicação sem evento de origem em 2026 recebe mensagem limitada ao que a evidência permite;
6. coleta parcial ou falha nunca é apresentada como ausência comprovada;
7. nenhum movimento anterior a 2026 entra no contrato corrente;
8. site, `Evolução Mensal` e `Movimentações` passam nas invariantes de paridade;
9. o workbook possui oito abas curtas e mantém o detalhe navegável separado da síntese;
10. o empacotador reproduz o snapshot sem edição manual de partes;
11. piloto de dez escolas e execução integral de 163 possuem evidência preservada e contagens registradas;
12. testes, typecheck, builds e smoke passam antes de qualquer pedido de promoção;
13. nenhuma alteração chega a PR pronto, merge ou produção sem autorização separada.
