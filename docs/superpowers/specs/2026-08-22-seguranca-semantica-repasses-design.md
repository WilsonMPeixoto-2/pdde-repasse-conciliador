# Segurança semântica dos repasses — desenho de produto e engenharia

**Data:** 22/08/2026

**Estado:** aprovado por direção explícita do produto em 22/08/2026

## Problema

O sistema transforma `PAGO_CREDITO_NAO_LOCALIZADO` em acompanhamento da escola. A regra atual de correlação exige programa, conta, valor exato e janela de até 30 dias. Além disso, ela não verifica se a cobertura temporal do extrato alcança a data do pagamento antes de concluir que o crédito não foi localizado.

Isso permite converter limitação de cobertura ou de matching em aparente problema financeiro da unidade.

## Princípios

1. O PDDEInfo permanece a fonte declarativa de programação e pagamento informado.
2. SIGEF e demais fontes complementam o fato com ordem, conta, crédito observado, movimentações e saldo.
3. Ausência de correspondência automática não é irregularidade e não torna a escola prioritária por si só.
4. Se a cobertura do extrato termina antes da data relevante do pagamento, o sistema deve declarar explicitamente que a cobertura ainda não alcança o evento.
5. Uma correlação não localizada com cobertura suficiente continua sendo informação técnica de correlação, não alerta gerencial.
6. Alertas gerenciais exigem fato operacional claro, como pagamento suspenso informado, falha de fonte relevante ou cobertura efetivamente incompleta.
7. O algoritmo deve produzir diagnóstico auditável das razões de não correlação.

## Estados de correlação

A camada operacional passa a distinguir:

- `PROGRAMADO_NAO_PAGO`
- `CREDITO_CONFIRMADO`
- `PAGO_SEM_CONTA_ATUAL`
- `PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO`
- `PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE`
- `CREDITO_AMBIGUO`
- `CONSULTA_INCONCLUSIVA`

`PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE` substitui o uso humano de "crédito não localizado" como suposto problema. O estado técnico registra apenas que o algoritmo atual não encontrou correspondência única.

## Regra temporal

Para parcela com pagamento informado e conta conhecida:

- conta inexistente ou coleta não completa → `CONSULTA_INCONCLUSIVA`;
- `coverageThrough` ausente → `CONSULTA_INCONCLUSIVA`;
- data de pagamento/ordem conhecida e `coverageThrough < data relevante` → `PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO`;
- uma correspondência válida → `CREDITO_CONFIRMADO`;
- mais de uma → `CREDITO_AMBIGUO`;
- zero, com cobertura suficiente → `PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE`.

## Camada humana

Rótulos:

- `CREDITO_CONFIRMADO` → **Crédito compatível localizado**
- `PAGO_COBERTURA_ANTERIOR_AO_PAGAMENTO` → **Extrato ainda não cobre a data do pagamento**
- `PAGO_CREDITO_NAO_CORRELACIONADO_AUTOMATICAMENTE` → **Crédito ainda não correlacionado automaticamente**
- `CONSULTA_INCONCLUSIVA` → **Consulta inconclusiva**

Os dois estados de correlação não criam `followUp` nem `Acompanhamento necessário` automaticamente.

## Diagnóstico da carteira

Será criado relatório determinístico por parcela com:

- escola/INEP;
- programa e parcela;
- valor pago informado;
- data do pagamento/ordem;
- conta;
- cobertura do extrato;
- estado de correlação;
- número de candidatos de crédito;
- razão diagnóstica.

O relatório servirá para explicar nominalmente as ocorrências anteriormente agrupadas nas 73 unidades.

## Robustez de coleta

O relatório público de saldos do FNDE apresentou `ORA-02391` em execução real. A correção deve:

- detectar erro de fonte retornado em HTTP 200 dentro da própria estratégia HTTP;
- permitir fallback real quando a estratégia HTTP não é válida;
- aplicar retentativa limitada para erro transitório de sessões;
- evitar disparar a validação das 163 unidades em cada push de PR;
- manter a validação integral como gate manual/final.

## Aceite

1. pagamento cuja data está depois da cobertura do extrato nunca vira `não correlacionado`;
2. ausência de correlação automática não muda sozinha o status da escola para atenção;
3. os indicadores da Home não tratam não correlação como risco;
4. o relatório diagnóstico explica cada caso de não correlação;
5. ORA-02391 é retentado/fallbackado de forma controlada;
6. CI, typecheck, build e smoke permanecem verdes;
7. piloto de 10 escolas conclui `COMPLETE` antes da validação 163;
8. nenhuma promoção para `main` ou produção ocorre antes desses gates.
