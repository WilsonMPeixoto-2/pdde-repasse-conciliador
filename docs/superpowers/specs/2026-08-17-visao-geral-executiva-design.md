# Visão Geral Executiva 2026 — Design

## Objetivo
Transformar a home da Inteligência Financeira PDDE em uma superfície executiva que responda rapidamente onde estão os valores, onde a cobertura de dados está incompleta e quais unidades merecem investigação, sem repetir a carteira completa.

## Princípios
- Manter separados `programmedCents`, `paymentInformedCents` e `creditLocatedCents`.
- Não chamar diferenças entre esses estágios de execução, economia, receita ou gasto.
- Não somar saldo de contas sem posição na referência global.
- Expor cobertura e atenção como fatos explicáveis, não como score opaco.
- Reutilizar `derivePortfolioSchoolTriage` como única regra de triagem escolar do frontend.
- A home deve resumir; `/unidades` continua sendo a superfície de comparação e investigação da carteira inteira.

## Componentes
1. **Fluxo de evidência financeira**: previsto → pagamento informado → crédito localizado, por comprimentos comparáveis e rótulos diretos. Sem percentual quando o denominador puder incluir parcelas futuras.
2. **Distribuição de cobertura e atenção**: contagens de unidades por estados derivados (`suspended`, `attention`, `no_accounts`, `partial`, `ready`), com acesso à carteira para investigação.
3. **Prioridades do momento**: no máximo 5 unidades ordenadas pela prioridade da triagem e SME, mostrando motivo principal e cobertura, sem reproduzir todas as colunas financeiras de `/unidades`.
4. **Indicadores existentes**: permanecem como seção detalhada de acompanhamento; o novo resumo não os substitui.

## Responsividade e acessibilidade
- Desktop: fluxo financeiro e distribuição em composição lado a lado quando houver espaço.
- Mobile: empilhamento natural, sem rolagem horizontal.
- Rótulos e valores devem existir em texto; cor nunca será a única codificação.
- Links devem ter destino e texto descritivos.

## Dados
Nenhum novo endpoint. Tudo deriva de `portfolio.metrics`, `portfolio.schools` e `derivePortfolioSchoolTriage`, portanto funciona em modo persistente e temporário com o mesmo contrato.

## Testes
- Modelo puro da visão executiva: contagens, ordenação, preservação de zero e ausência de falsa classificação.
- Smoke Playwright em desktop e 390 px, nos modos persistente e temporário.
- Verificação de ausência de overflow horizontal.
