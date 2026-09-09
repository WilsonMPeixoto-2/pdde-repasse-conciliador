# Contrato de múltiplas contas por programa

## Decisão

A identidade de uma conta bancária no conciliador não é apenas o programa. O identificador operacional é composto pelo programa e pela conta bancária completa, normalizada por banco, agência e número.

Consequentemente, **mais de uma conta distinta dentro do mesmo programa é um estado válido** e não deve interromper a normalização do PDDEInfo.

## Regra de atribuição ao repasse

Uma linha financeira do PDDEInfo informa a ação/parcela e o programa, mas essa informação, isoladamente, não prova qual conta recebeu o repasse quando a unidade possui duas ou mais contas distintas no mesmo programa.

Nessa situação:

- todas as contas observadas continuam preservadas na coleta da unidade;
- o pagamento continua normalizado;
- `payment.account` permanece ausente até existir evidência independente que identifique a conta correta;
- nenhuma conta é escolhida por ordem, posição, primeira ocorrência ou conveniência;
- `missingProgramAccounts` não é incrementado, porque o programa possui conta. O problema é de não unicidade, não de ausência;
- é emitido aviso explícito de que nenhuma conta foi presumida.

Quando existe exatamente uma conta distinta no programa, a associação direta continua permitida.

## Conciliação posterior

O restante do pipeline já preserva a identidade completa da conta:

- `run-monitoring` cria uma tarefa para cada combinação distinta `INEP + programa + conta canônica`;
- `recover-sigef-release-accounts` mantém contas recuperadas distintas pela conta canônica;
- uma liberação pública do SIGEF pode fornecer evidência independente da conta de destino;
- a visão operacional concilia repasse e movimento apenas quando programa e conta canônica coincidem.

Assim, o normalizador deixa de transformar uma situação legítima de múltiplas contas em erro e, ao mesmo tempo, evita o risco oposto de inventar um vínculo financeiro que a fonte não comprovou.

## Invariante

> Existência de múltiplas contas não autoriza escolher uma conta; ausência de escolha não significa ausência de conta.

Essa distinção deve ser mantida em futuras exportações, contratos de integração e interfaces consumidoras.
