# Fontes e regras de evidência

Este documento registra o estado operacional das fontes e as regras que afetam conclusões financeiras. Ele deve mudar quando a fonte ou a regra mudar de forma material, não a cada ajuste de implementação.

## Estado das fontes — 12/08/2026

| Fonte | Finalidade | Estado para o repositório canônico | Observação |
|---|---|---|---|
| **PDDEInfo — consulta por escola** | valores previstos/pagos, datas e contas apresentadas pelo sistema | **comprovada** | Coleta direta por INEP já demonstrada em escala e é a estratégia primária a incorporar ao fluxo consolidado. |
| **SIGEF Liberações** | ordem bancária, data, valor e conta destinatária | **uso por exportação comprovado; coleta autônoma bloqueada por CAPTCHA** | O Assistente de Liberações v0.2.0 organiza e valida os `.xls` obtidos pelo fluxo permitido. |
| **SIGEF Movimentações** | localizar créditos e demais lançamentos bancários | **leitor comprovado** | O núcleo atual processa CSV nacional em streaming. A cobertura do arquivo deve ser registrada porque pode estar defasada. |
| **SIGEF Extrato/Conta Corrente via portal** | evidência bancária complementar | **CAPTCHA_REQUIRED / não automatizado** | Protótipos paralelos confirmaram restrição por CAPTCHA. Arquivo/PDF autorizado pode ser estudado separadamente. |
| **PDDEInfo — saldo das entidades** | saldo/composição por CNPJ, mês e programa | **evidência promissora em referência paralela; ainda não integrada** | Foi comprovada tecnicamente no projeto paralelo Manus, mas só passa a ser capacidade oficial quando incorporada e validada neste repositório. |
| **Dados Abertos FNDE / Olinda** | controle secundário e cruzamentos | **candidato secundário; ainda não integrado ao canônico** | Pode complementar validações, sem substituir silenciosamente a fonte primária. |

## Regra de autonomia

A ordem preferencial de coleta é:

1. HTTP direto + parser determinístico quando a fonte permitir;
2. navegador controlado quando a interação real for necessária;
3. IA/agente como auxílio para diagnóstico ou adaptação de estrutura;
4. interromper e registrar estado quando houver CAPTCHA, login, autorização ou bloqueio externo.

CAPTCHA não será contornado.

## Níveis de evidência financeira

Os seguintes conceitos não são sinônimos:

### Pagamento informado

O PDDEInfo informa que determinado pagamento/ordem foi registrado pelo FNDE. Isso não comprova, sozinho, crédito bancário.

### Ordem bancária corroborada

A Liberação do SIGEF pode confirmar documento/OB, data, valor e conta destinatária. A existência da OB ainda não garante que o crédito correspondente esteja disponível na cobertura atual da movimentação.

### Crédito localizado

Uma movimentação bancária compatível pode demonstrar crédito correspondente, desde que a associação seja sustentada por chave documental suficiente.

### Crédito confirmado por evidência bancária direta

Quando houver extrato bancário direto ou outra evidência autorizada adequada, esse nível deve permanecer distinguível dos anteriores.

### Estorno ou devolução

Crédito inicialmente identificado não deve permanecer apresentado como situação final positiva se existir evidência correspondente de estorno/devolução.

### Consulta inconclusiva

Usada quando falta cobertura, fonte, chave suficiente ou informação necessária para concluir com segurança.

## Estados atuais do conciliador

- `REPASSE_CONFIRMADO`
- `ORDEM_BANCARIA_CONFIRMADA_CREDITO_NAO_LOCALIZADO`
- `PAGAMENTO_INFORMADO_SOMENTE_NO_PDDEINFO`
- `DIVERGENCIA_REVISAO_NECESSARIA`
- `SEM_PAGAMENTO_REGISTRADO_ATE_A_CONSULTA`
- `CONSULTA_INCONCLUSIVA`

Os nomes podem evoluir na camada de UX, mas a distinção semântica não deve ser perdida.

## Regras de correspondência

Uma conciliação deve usar a combinação mais forte disponível de:

- CNPJ;
- exercício;
- programa;
- ação;
- parcela;
- valor;
- data;
- documento/ordem bancária;
- banco, agência e conta.

### Proibições

- não confirmar por valor semelhante isoladamente;
- não escolher arbitrariamente entre múltiplas contas;
- não promover referência histórica a dado corrente sem confirmação;
- não considerar cobertura incompleta como prova de ausência;
- não usar um programa para preencher silenciosamente conta de outro;
- não esconder divergência entre fontes através de uma “fonte preferida”.

## Contas bancárias

A conta original apresentada pelo PDDEInfo deve ser preservada como informação da própria fonte.

Uma conta ausente pode receber informação complementar de outra fonte somente quando a origem ficar explícita e a correspondência documental for confiável. Complementar não significa reescrever a observação original.

## Tempo e cobertura

Toda conclusão é limitada à cobertura temporal efetivamente consultada.

Exemplo: se um CSV de Movimentações termina em 29/05/2026, a ausência de um crédito posterior a essa data não pode ser interpretada como ausência bancária até agosto.

Consultas e arquivos relevantes devem registrar, quando possível:

- data/hora de coleta ou exportação;
- período coberto;
- fonte/URL ou identificação do artefato;
- hash quando a preservação do artefato for importante.

## Excel

Relatórios financeiros devem:

- materializar valores, sem depender de fórmulas voláteis ou ocultas para provar o resultado;
- preservar identificadores bancários e cadastrais como texto quando necessário;
- neutralizar formula injection proveniente de conteúdo externo;
- ser relidos e validados antes de serem considerados concluídos.

## Regra de incorporação de novas fontes

Uma fonte observada em outro protótipo não vira automaticamente fonte oficial deste projeto. Para ser promovida, deve possuir:

1. estratégia de acesso permitida;
2. chave de consulta conhecida;
3. parser ou contrato de dados testável;
4. cobertura e limitações explicitadas;
5. integração sem sobrescrita silenciosa de outras fontes;
6. testes ou execução controlada que demonstrem o comportamento.
