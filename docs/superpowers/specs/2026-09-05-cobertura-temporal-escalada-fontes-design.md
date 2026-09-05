# Cobertura temporal e escalada de fontes — design

**Data:** 05/09/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Escopo:** 163 UEs da 4ª CRE, exercício 2026.

## Problema

O sistema já distingue pagamento informado, liberação, crédito compatível e saldo datado, e o módulo de PDDE Básico já identifica saldo anterior ao pagamento e casos que precisam de `needsSourceEscalation`. Entretanto, o status global `COMPLETE` representa sucesso operacional da coleta e não explicita se as fontes disponíveis possuem cobertura temporal suficiente para verificar os pagamentos mais recentes.

Na fotografia atual, isso permite uma execução `COMPLETE 163/163` mesmo quando o PDDEInfo já informa pagamentos de agosto e a posição mensal de saldo disponível termina em 31/07. Essa situação não é falha de execução, mas precisa aparecer como insuficiência temporal da evidência.

Além disso, o coletor SIGEF usa a rota paginada `conta-corrente/extrato-conta-corrente-detalhamento`. Foi comprovada em 05/09/2026 uma segunda rota pública, `conta-corrente/visualizaexcel`, capaz de devolver o extrato completo em formato HTML para download. Essa rota ainda não está integrada ao repositório.

## Decisões

1. `COMPLETE | PARTIAL | FAILED` continua descrevendo execução/coleta. Não será rebaixado apenas porque uma fonte oficial está temporalmente atrasada.
2. Será adicionada uma dimensão independente de cobertura temporal/probatória para pagamentos conhecidos.
3. Pagamento com data posterior à cobertura bancária da conta será classificado como `OUT_OF_COVERAGE`, não como crédito ausente.
4. Pagamento sem data, sem conta forte ou sem observação suficiente permanecerá `UNKNOWN`, nunca zero/ausente.
5. A rota SIGEF `visualizaexcel` será usada como fallback apenas quando a rota paginada não atingir a data mínima necessária para verificar um pagamento conhecido da mesma escola/programa/conta.
6. A fonte alternativa não sobrescreve a fonte primária: movimentos são deduplicados por identidade determinística e a origem/rota permanece rastreável em `sourceUrl`.
7. Falha do fallback não invalida uma coleta primária tecnicamente completa; ela mantém a cobertura como insuficiente e registra a falha complementar.
8. CAPTCHA, autenticação ou restrição externa não serão contornados.
9. Movimentos de aplicação/resgate continuam sem autorizar reconstrução de saldo aplicado atual ou rendimento.

## Modelo de cobertura temporal

Para cada pagamento positivo com data conhecida:

- `SUFFICIENT`: existe observação SIGEF da mesma conta/programa cuja `coverageThrough >= paymentDate`;
- `OUT_OF_COVERAGE`: a conta foi coletada, mas `coverageThrough < paymentDate`;
- `UNKNOWN`: não existe conta forte, a cobertura é nula, a data do pagamento está ausente ou não há observação associável com segurança.

O agregado do retrato expõe pelo menos:

- total de pagamentos positivos avaliados;
- `sufficientCount`;
- `outOfCoverageCount`;
- `unknownCount`;
- data de pagamento mais recente conhecida;
- data máxima de cobertura SIGEF observada;
- status agregado `SUFFICIENT | OUT_OF_COVERAGE | UNKNOWN`.

A existência de um caso `OUT_OF_COVERAGE` torna o status agregado `OUT_OF_COVERAGE`; na ausência desses casos, qualquer `UNKNOWN` torna o agregado `UNKNOWN`; somente cobertura suficiente para todos os pagamentos avaliáveis resulta em `SUFFICIENT`.

## Escalada SIGEF

Fluxo por conta:

1. coletar a rota paginada atual;
2. comparar `coverageThrough` com `requiredThrough`, quando essa data puder ser determinada por chave forte;
3. se a cobertura já for suficiente, encerrar sem consulta adicional;
4. se insuficiente, consultar `conta-corrente/visualizaexcel` para a mesma conta/CNPJ/programa e mês inicial;
5. validar identidade mínima da exportação (CNPJ e programa) e parsear movimentos com as mesmas regras financeiras;
6. unir movimentos sem duplicação e recalcular `coverageThrough`;
7. preservar `sourceUrl` de cada movimento para indicar qual rota produziu a evidência;
8. se o fallback falhar ou continuar anterior ao pagamento, manter o caso explicitamente fora de cobertura.

## Integração com a coleta

`run-monitoring.ts` calculará `requiredThrough` usando os pagamentos normalizados do PDDEInfo e somente quando houver correspondência forte entre escola, programa e conta. Essa data será passada para `collectSigefPublicAccount`.

O monitor financeiro continuará publicando o retrato quando a execução estiver `COMPLETE`, mas passará a carregar uma seção de qualidade/cobertura temporal. Isso impede que `COMPLETE` seja interpretado como sinônimo de “toda evidência financeira está atualizada”.

## Testes obrigatórios

- cobertura posterior/igual ao pagamento => `SUFFICIENT`;
- cobertura anterior ao pagamento => `OUT_OF_COVERAGE`;
- pagamento sem conta forte/cobertura => `UNKNOWN`;
- agregação de múltiplos pagamentos preserva precedência de `OUT_OF_COVERAGE`;
- URL `visualizaexcel` é construída com banco/agência/conta/CNPJ/programa/data corretos;
- fallback não é chamado quando a rota principal já cobre `requiredThrough`;
- fallback é chamado quando a rota principal fica atrás;
- movimentos das duas rotas são deduplicados;
- fallback falho não transforma ausência em zero nem derruba a coleta primária por si só;
- nenhum caso permite reconstruir saldo atual a partir de aplicação/resgate.

## Fora do escopo deste primeiro PR

- integração autenticada com BB Gestão Ágil;
- contorno de CAPTCHA;
- implantação definitiva de Supabase;
- redesenho completo do frontend/Excel;
- inferência de rendimento ou saldo atual a partir de movimentos.

Esses itens permanecem para ciclos seguintes, com prioridade de expansão de fontes logo após esta primeira integração pública adicional.