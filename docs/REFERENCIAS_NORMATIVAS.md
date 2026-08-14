# Referências normativas relevantes ao monitoramento PDDE

> **Natureza deste documento:** memória de pesquisa normativa verificada em **14/08/2026**. Ele registra conhecimento que pode influenciar interpretação, UX e futuras regras do produto, mas **não constitui regra de software já implementada nem substitui nova verificação jurídica antes de automatizar conclusão de conformidade**.

O sistema deve continuar separando:

1. o fato observado na fonte bancária/financeira;
2. a classificação auxiliar do movimento;
3. eventual análise normativa ou conclusão humana de conformidade.

Nenhum lançamento bancário deve ser transformado automaticamente em “regular” ou “irregular” apenas com base neste documento.

---

## 1. Estado normativo geral do PDDE

Na verificação de 14/08/2026, a página institucional do FNDE informa que o PDDE continua regido pela **Resolução CD/FNDE/MEC nº 15, de 16 de setembro de 2021**, considerada a norma-base para execução, movimentação, prestação de contas, monitoramento e fiscalização.

A própria Resolução nº 15/2021, em seu art. 1º, §1º, estabelece que seus dispositivos também alcançam as **Ações Integradas ao PDDE**, observadas as orientações e os normativos específicos de cada ação.

Fontes oficiais:

- PDDE — página institucional: https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde
- Resolução nº 15/2021 — página oficial: https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2021/resolucao-no-15-de-16-de-setembro-de-2021/view
- PDF oficial da Resolução nº 15/2021: https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2021/resolucao-no-15-de-16-de-setembro-de-2021/@@download/file
- Resoluções do FNDE em 2026: https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2026

### Implicação para o projeto

Quando uma futura feature interpretar pagamento, saque, aplicação, resgate ou comprovante de despesa de uma Ação Integrada, ela não pode avaliar apenas a resolução específica da ação e ignorar as regras operacionais gerais do PDDE.

---

## 2. Movimentação dos recursos e meios de pagamento

### 2.1. Regra principal

O **art. 17 da Resolução nº 15/2021** estabelece como regra a movimentação para aplicação financeira ou pagamento de fornecedores/prestadores, priorizando meios que permitam identificar o favorecido.

Entre as modalidades expressamente previstas estão transferências, pagamentos instantâneos, boletos/guias, cartão e outras modalidades eletrônicas autorizadas.

### 2.2. Ordem de Pagamento para pessoa sem conta bancária

O **art. 17, IV** prevê a **Emissão de Ordem de Pagamento em favor de pessoas que não possuem conta bancária**.

Isso é relevante para situações em que o prestador efetivamente não dispõe de conta para receber transferência, sem que o sistema confunda essa circunstância com ausência de mecanismo formal de pagamento.

### 2.3. Cheque nominativo antes da disponibilização do cartão

O **art. 17, §1º** admite, até a disponibilização do cartão magnético, cheque nominativo ao credor quando comprovadamente não houver alternativa de movimentação eletrônica, além das modalidades eletrônicas previstas no próprio artigo.

### 2.4. Pagamento excepcional em espécie

O **art. 17, §2º** prevê, para entidades que disponham de cartão magnético, pagamento **excepcional em espécie**, mediante saque, quando houver inviabilidade de movimentação eletrônica devidamente justificada em ata.

Limites descritos na norma verificada em 14/08/2026:

- R$ 800,00 por dia;
- R$ 2.000,00 por mês;
- R$ 8.000,00 por ano.

A norma exige **justificativa circunstanciada em ata** demonstrando a inviabilidade da movimentação eletrônica.

### Implicação para o produto

Um futuro classificador **não pode tratar todo saque ou pagamento em espécie como irregularidade automática**. O movimento bancário, sozinho, não contém todos os elementos necessários para verificar se a exceção normativa foi corretamente utilizada.

Se futuramente houver módulo de análise de despesas, ele precisará combinar, quando aplicável:

- movimento bancário;
- identificação do favorecido;
- ata/justificativa;
- comprovante da despesa;
- quitação/recibo;
- exercício e ação/programa;
- limites regulamentares aplicáveis;
- demais orientações vigentes da EEx/FNDE.

Até existir esse conjunto, o site deve apresentar o fato e, quando pertinente, **registro para conferência**, não conclusão jurídica automática.

---

## 3. Aplicações financeiras e relação com a conta específica

O **art. 16, §3º da Resolução nº 15/2021** prevê que o FNDE pode obter junto aos bancos saldos e extratos das contas específicas, inclusive os de aplicações financeiras.

O **art. 18** disciplina a aplicação dos recursos enquanto não utilizados. Na versão oficial verificada:

- os recursos permanecem aplicados em fundo de curto prazo, ressalvada a opção prevista na própria norma;
- a aplicação deve preservar liquidez;
- o produto das aplicações deve ser computado a crédito da **conta específica**;
- o rendimento permanece sujeito às mesmas condições de prestação de contas dos recursos transferidos.

### Implicação para o monitoramento SIGEF

Históricos como aplicação e resgate são fatos bancários relevantes e podem aparecer na mesma cadeia de movimentação da conta PDDE.

Porém:

> **movimento de aplicação/resgate não é sinônimo de posição atual do investimento.**

O sistema não deve calcular automaticamente “saldo atualmente aplicado” apenas somando aplicações e resgates históricos. Para isso será necessária fonte adequada de posição/saldo/rendimento.

Esta regra complementa a lacuna já registrada em `CONHECIMENTO_ACUMULADO.md`.

---

## 4. Pesquisa de preços

O **art. 23 da Resolução nº 15/2021** disciplina a Consolidação de Pesquisas de Preços para UEx e EM.

A regra geral prevê indicação dos três melhores orçamentos obtidos para cada item/lote pesquisado.

O **§6º do art. 23** admite, excepcionalmente, preço estimado com base em menos de três orçamentos, desde que a situação seja devidamente justificada nos autos pelo gestor responsável e aprovada pela autoridade competente da UEx/EM.

### Implicação futura

Se o produto evoluir para apoiar análise documental de contratação, “menos de três propostas” não deve virar irregularidade automática sem verificar a existência e suficiência da justificativa correspondente.

---

## 5. Comprovação das despesas

O **art. 26 da Resolução nº 15/2021** exige comprovação das despesas por documentos fiscais originais ou equivalentes conforme a legislação aplicável à entidade.

Entre os elementos relevantes previstos estão:

- documento em nome da EEx/UEx/EM;
- identificação do PDDE/Ação Integrada;
- atesto de recebimento do material, bem ou serviço;
- registro de quitação;
- possibilidade de o extrato bancário da conta específica servir para comprovação de quitação;
- preferência por fornecedores/prestadores que emitam nota fiscal eletrônica.

### Implicação para o sistema

O extrato bancário pode provar movimentação/quitação em determinados contextos, mas **não substitui automaticamente os demais documentos de execução da despesa**.

Uma futura análise de conformidade precisa manter separados:

```text
movimento bancário
comprovante fiscal/equivalente
atesto
quitação
processo de escolha/contratação
conclusão humana/normativa
```

---

## 6. Educação Conectada: cadeia normativa correta

### 6.1. Resolução nº 9/2018

A **Resolução CD/FNDE nº 9, de 13 de abril de 2018** criou a disciplina financeira do Programa de Inovação Educação Conectada nos moldes operacionais do PDDE.

O texto original do art. 6º possuía incisos que mencionavam expressamente:

- contratação de serviço de acesso à internet por via terrestre;
- infraestrutura interna para distribuição do sinal.

### 6.2. Atenção: o art. 6º foi alterado em 2021

A **Resolução CD/FNDE nº 12, de 1º de setembro de 2021** alterou o art. 6º da Resolução nº 9/2018 e **revogou expressamente os incisos I e II do art. 6º**.

O art. 6º passou a remeter aos itens previstos na ação de apoio financeiro relacionada ao Decreto nº 9.204/2017.

Portanto, um documento jurídico atual **não deve citar os antigos incisos I e II do art. 6º como se continuassem vigentes literalmente**.

Fonte oficial da alteração:

- https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2021/resolucao-no-12-de-01-de-setembro-de-2021/view
- PDF: https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2021/resolucao-no-12-de-01-de-setembro-de-2021/@@download/file

### 6.3. Página institucional atual do FNDE

Apesar dessa alteração formal, a página institucional atual do FNDE dedicada ao **Programa de Inovação Educação Conectada** continua descrevendo como emprego dos recursos:

- contratação de serviço de acesso à internet;
- infraestrutura interna para distribuição do sinal;
- necessidade de PAF/Plano de Aplicação Financeira e execução nos moldes do PDDE.

Fonte oficial:

- https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/conta-pdde-qualidade-1/programa-de-inovacao-educacao-conectada

### Regra de documentação

Ao orientar juridicamente uma escola, citar a **cadeia atualizada**:

1. Resolução nº 9/2018 como norma específica do programa;
2. Resolução nº 12/2021 como alteração do art. 6º;
3. página/orientação atual do FNDE e PAF aplicável para os itens financiáveis;
4. Resolução nº 15/2021 para as regras operacionais gerais de execução/movimentação.

Não reproduzir o art. 6º de 2018 sem mencionar a alteração de 2021.

---

## 7. Impacto específico da pesquisa sobre internet e pagamento em espécie

A pesquisa que originou este registro tratava de escolas que, por condições territoriais e operacionais, podem precisar contratar prestador local de internet sem meio eletrônico de recebimento disponível.

O conhecimento normativo preservado é:

- a existência de Ordem de Pagamento para favorecido sem conta bancária;
- a existência de hipótese excepcional de pagamento em espécie, sujeita aos requisitos do art. 17, §2º;
- a Educação Conectada permanece oficialmente destinada a apoiar conectividade, observados o PAF e a disciplina específica vigente;
- documentos da despesa, identificação do prestador, atesto e quitação continuam necessários conforme o regime aplicável;
- a excepcionalidade do meio de pagamento **não elimina** as exigências de comprovação da despesa.

### O que NÃO deve virar regra automática

O software não deve concluir, sem documentação suficiente, que:

- um saque foi regular;
- um saque foi irregular;
- qualquer pagamento em espécie está autorizado;
- qualquer provedor local é elegível;
- uma transferência/pagamento comprova a finalidade do gasto;
- ausência de Pix/conta bancária está comprovada apenas porque houve saque.

A camada do produto deve expor evidências e, se necessário, apontar necessidade de conferência humana.

---

## 8. Regra de manutenção deste documento

Normas podem ser alteradas. Antes de transformar qualquer item deste arquivo em regra automatizada, um novo chat/desenvolvedor deve:

1. consultar a página atual de Resoluções do FNDE;
2. confirmar vigência e alterações posteriores da norma citada;
3. verificar orientação específica da Ação Integrada/programa;
4. verificar eventual orientação vigente da EEx/SME-Rio aplicável;
5. documentar data da verificação;
6. criar teste/regra apenas para fatos normativos suficientemente objetivos.

Este arquivo é **memória normativa versionada**, não parecer jurídico permanente.
