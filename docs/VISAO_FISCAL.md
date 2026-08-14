# Visão fiscal dos dados PDDE

A camada de apresentação para fiscalização deve favorecer a leitura humana sem substituir a linguagem das fontes por conclusões automáticas.

## Repasses

- preservar a ação/programa como informada pelo PDDEInfo;
- preservar a parcela como informada pela fonte (`1ª Parcela`, `2ª Parcela`, `P1`, `P2` ou ausência de divisão);
- exibir separadamente valor programado, pagamento informado e data apresentada pelo PDDEInfo;
- apresentar o crédito localizado no SIGEF em campos próprios, sem tratá-lo como sinônimo automático do pagamento informado;
- quando uma parcela estiver programada e ainda não houver pagamento informado, usar linguagem temporal neutra: `Pagamento ainda não informado no PDDEInfo`;
- não apresentar essa situação ao fiscal como `repasse ausente`, `não repassado` ou equivalente.

## Movimentações

- agrupar por unidade escolar e, dentro dela, por conta/programa;
- ordenar o extrato cronologicamente;
- preservar literalmente o histórico e o documento bancário retornados pelo SIGEF;
- separar visualmente crédito e débito;
- categorias auxiliares servem apenas para leitura (`Tarifa bancária`, `Aplicação financeira`, `Rendimento financeiro`, etc.) e não substituem o histórico original;
- não emitir, nesta camada, juízo de regularidade, finalidade, correção ou irregularidade da despesa.

## Arquivos destinados ao usuário

O gerador `monitor:fiscal:xlsx` produz um caderno com quatro visões:

1. índice das unidades escolares;
2. repasses por escola e parcela;
3. extratos de 2026 por escola e conta;
4. legenda de leitura.

A base operacional plana continua existindo para processamento, filtros e integrações. Ela não é a visualização principal destinada ao trabalho do fiscal.
