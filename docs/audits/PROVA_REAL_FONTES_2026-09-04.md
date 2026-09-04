# Prova real de fontes — 04/09/2026

## Achados prévios ao novo ciclo 163/163

A verificação ao vivo, sem reutilização de cache, mostrou duas limitações relevantes nas próprias fontes públicas oficiais:

1. **PDDEInfo · Consulta de Saldo das Entidades**: em 04/09/2026, a lista de competências disponíveis começa em `07-2026`; agosto e setembro ainda não estão publicados nessa consulta. Portanto, uma posição de 31/07/2026 não pode ser apresentada como saldo corrente de repasse informado em agosto.
2. **SIGEF · Extrato Conta Corrente**: em consulta direta de uma conta PDDE da carteira, o endpoint solicitado com início `01/2026` respondeu com movimentos mais recentes de 2025. O robô não deve preencher essa ausência com zero nem afirmar que não houve crédito.
3. **SIGEF · Liberações**: permanece como fonte pública complementar para provar a existência da liberação/OB e a conta de destino, sem equiparar essa evidência a crédito efetivamente encontrado no extrato.
4. **Dados Abertos FNDE**: o catálogo oficial voltou a descrever, em 2026, recursos de execução financeira e saldos do PDDE com dados a partir de 2025, mas a disponibilidade/frescor do recurso precisa ser validada antes de ser promovida de piloto a fonte ativa.

## Decisão de produto

A partir desta prova, “onde está hoje?” só pode receber valor categórico quando houver evidência temporalmente posterior ao pagamento. Caso contrário, o produto deve mostrar a última posição histórica com a data em destaque e declarar que a localização atual ainda não está comprovada pelas fontes públicas disponíveis.

A nova execução integral coletará todas as competências de saldo de 2026 que o PDDEInfo disponibilizar, permitindo análise cronológica em vez de somente a última fotografia.
