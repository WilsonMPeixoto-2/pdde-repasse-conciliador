# Visão fiscal dos dados PDDE

A camada de apresentação para fiscalização deve favorecer a leitura humana sem substituir a linguagem das fontes por conclusões automáticas.

A escola é a unidade principal da experiência. A base técnica plana continua existindo, mas não deve determinar como o fiscal enxerga o produto.

## Hierarquia de apresentação

A referência atual é:

```text
4ª CRE
└── Unidade Escolar
    ├── Programa / Ação
    │   └── Parcela
    └── Conta / Programa
        └── Movimentações
            └── Evidência
```

O frontend futuro deve seguir a mesma lógica que já orienta o Excel Fiscal v3.

## Três profundidades de leitura

### 1. Leitura rápida

Em poucos segundos, permitir entender:

- escola/UEx;
- programas existentes;
- valores programados;
- pagamentos informados;
- créditos SIGEF localizados;
- saldo informado;
- quantidade de registros para conferência.

### 2. Leitura financeira

Permitir navegar por:

- programa/ação;
- parcela;
- conta correspondente;
- data informada pelo PDDEInfo;
- crédito compatível no SIGEF;
- movimentações principais.

### 3. Investigação

Permitir abrir:

- extrato cronológico completo;
- histórico literal;
- documento bancário;
- contraparte/origem;
- URL/artefato/hashes e demais evidências, quando aplicável.

A complexidade técnica permanece disponível, mas não domina a primeira tela.

## Regra temporal

A visão fiscal corrente trabalha com **2026**.

Movimentos históricos recebidos da fonte podem ser preservados em artefatos brutos, mas não entram no extrato corrente nem preenchem lacunas de 2026.

## Repasses

- preservar programa/ação do PDDEInfo;
- preservar a parcela (`1ª Parcela`, `2ª Parcela`, `P1`, `P2` ou ausência de divisão);
- exibir separadamente valor programado, pagamento informado e data apresentada pelo PDDEInfo;
- apresentar crédito SIGEF em campos próprios;
- não tratar pagamento informado como sinônimo de crédito bancário;
- quando uma parcela estiver programada e ainda não houver pagamento informado, usar **`Pagamento ainda não informado no PDDEInfo`**;
- não apresentar essa situação como `repasse ausente`, `não repassado` ou equivalente.

### Linguagem de crédito

Preferir:

**Crédito compatível localizado no extrato SIGEF**

em vez de uma afirmação genérica “crédito confirmado” quando a evidência é uma associação técnica com a linha de extrato.

Outras mensagens aprovadas:

- **Pagamento informado no PDDEInfo; crédito compatível ainda não localizado nesta coleta SIGEF**;
- **Pagamento informado no PDDEInfo; conta correspondente não exibida na coleta atual do PDDEInfo**;
- **Pagamento informado no PDDEInfo; mais de um crédito bancário compatível foi localizado**;
- **Pagamento informado no PDDEInfo; consulta bancária inconclusiva nesta coleta**.

## Movimentações

- agrupar por unidade escolar e, dentro dela, por conta/programa;
- ordenar cronologicamente;
- preservar literalmente histórico e documento bancário retornados pelo SIGEF;
- separar visualmente crédito e débito;
- mostrar contraparte/origem quando disponível;
- categorias auxiliares servem apenas para leitura;
- não emitir juízo automático de regularidade, finalidade, correção ou irregularidade da despesa.

Categorias auxiliares podem incluir:

- Crédito FNDE;
- Aplicação financeira;
- Resgate de aplicação;
- Pagamento / transferência;
- Pagamento por cartão;
- Rendimento financeiro;
- Entrada registrada no extrato;
- Tarifa bancária;
- Estorno/reversão;
- sem categoria segura.

Um movimento não classificado deve permanecer não classificado quando não houver evidência suficiente.

## Aplicações e rendimentos

Aplicação e resgate observados no extrato podem ser exibidos como movimentos.

Não inferir a partir deles:

- posição atual do investimento;
- saldo aplicado atual;
- rendimento acumulado não resgatado.

Esses campos só devem aparecer quando houver fonte específica adequada.

## Registros para Conferência

A interface/Excel pode destacar fatos que merecem revisão humana, como:

- pagamento informado sem crédito compatível localizado;
- conta atual não exibida na fonte;
- múltiplos créditos candidatos;
- consulta inconclusiva;
- tarifa bancária;
- entrada de terceiro;
- movimento ainda não classificado.

O rótulo é deliberadamente **Registros para Conferência**, não “irregularidades”.

## Excel Fiscal v3

O gerador `monitor:fiscal:xlsx` produz nove abas:

1. **Visão Geral** — métricas da carteira e resumo por ação/parcela;
2. **Unidades** — carteira das 163 UEs;
3. **Repasses por Escola** — leitura agrupada de ações e parcelas;
4. **Extratos por Escola** — movimentos de 2026 agrupados por escola/conta;
5. **Registros para Conferência** — seleção factual que merece atenção;
6. **BASE - Repasses** — base plana para filtros/cruzamentos;
7. **BASE - Movimentos** — base plana das movimentações;
8. **BASE - Contas** — contas e saldos informados;
9. **Legenda e Fontes** — linguagem, fontes e limites de interpretação.

A base operacional plana continua existindo para processamento, filtros e integrações. Ela não é a visualização principal destinada ao trabalho do fiscal.

## Frontend futuro

Direção de navegação aprovada:

```text
Visão Geral
→ Unidades Escolares
→ Prontuário da Unidade
→ Registros para Conferência
→ Atualizações
→ Evidências / Rastreabilidade
```

No prontuário:

- exibir somente programas/ações existentes para a escola;
- separar contas por programa;
- manter parcela explícita;
- mostrar o extrato como extrato, não como tabela de “achados”;
- permitir expandir contraparte/evidência;
- evitar obrigar o usuário a compreender IDs de job ou estrutura do scraper.

O site e o Excel são produtos complementares. O frontend não precisa reproduzir toda capacidade de filtros e cruzamentos das bases analíticas do Excel.