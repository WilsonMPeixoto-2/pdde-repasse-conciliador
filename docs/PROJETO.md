# Projeto PDDE — visão e evolução

## Missão

Construir uma plataforma interna para a 4ª CRE capaz de **coletar, validar, conciliar e rastrear dados financeiros do PDDE**, preservando a distinção entre o que cada fonte realmente comprova e entregando uma experiência operacional simples, além de relatórios Excel profissionais e auditáveis.

O caso concreto e prioritário é a carteira de **163 escolas da 4ª CRE no exercício de 2026**. Expansão para outros exercícios, CREs ou fontes é desejável somente depois que melhorar o produto real, não como pretexto para ampliar escopo indefinidamente.

## Como o projeto evoluiu

### 1. Planilha e extração do PDDEInfo

O problema inicial era obter dados financeiros confiáveis apesar das rotinas legadas de exportação do PDDEInfo. A primeira solução relevante passou a ler diretamente o HTML público do portal.

O experimento municipal comprovou escala:

- 156 páginas processadas;
- 1.559 unidades únicas;
- 3.027 registros de contas bancárias;
- 4.987 registros financeiros;
- paginação completa validada e 4.987 registros conciliados internamente sem divergência.

### 2. Carteira fixa da 4ª CRE

O foco passou para os 163 INEPs conhecidos da 4ª CRE, permitindo consulta individual, validação controlada e repetibilidade.

Na visão financeira validada apareceram 116 unidades com conta PDDE Básico informada e 47 sem conta corrente apresentada pelo PDDEInfo. As 47 foram reconsultadas individualmente e a ausência foi preservada, em vez de preenchida por inferência histórica.

Essa etapa consolidou uma regra central: **dado ausente não é zero e não autoriza inventar o dado atual a partir de referência antiga**.

### 3. Da extração para a evidência financeira

O projeto passou a diferenciar:

- pagamento informado pelo PDDEInfo;
- ordem bancária/liberação;
- crédito localizado em movimentação;
- confirmação bancária quando houver evidência adequada;
- estorno/devolução;
- divergência;
- consulta inconclusiva.

A pergunta deixou de ser apenas “qual é o valor?” e passou a incluir “qual fonte comprova este fato e até onde vai essa comprovação?”.

### 4. Conciliação com SIGEF

Foram desenvolvidos leitores e regras para combinar PDDEInfo, SIGEF Liberações e SIGEF Movimentações com chaves fortes de correspondência. Similaridade de valor, sozinha, não confirma uma parcela.

A primeira execução real parcial do núcleo atual processou 520 repasses. Como a evidência de Liberações não estava disponível naquela rodada, todos permaneceram inconclusivos, comportamento considerado correto e obrigatório.

### 5. Assistente de Liberações — v0.2.0

A coleta manual das exportações do SIGEF recebeu uma camada operacional que:

- aceita `.xls` com qualquer nome;
- identifica CNPJ, exercício e programa;
- preserva originais por SHA-256;
- produz arquivos canônicos `CNPJ__PROGRAMA.xls`;
- detecta duplicidade equivalente, atualização monotônica, conflito, pasta incorreta e arquivo fora da carteira;
- gera planilha de cobertura e pendências;
- pode ser executada repetidamente sem destruir estado válido.

## Experimentos paralelos e aprendizado

Durante a fase exploratória foram usados três ambientes de implementação em paralelo. A experiência foi útil para comparar abordagens, mas a continuidade agora tem uma única regra.

### Repositório canônico

`WilsonMPeixoto-2/pdde-repasse-conciliador`

É a **única fonte de verdade de implementação do fluxo ChatGPT/OpenAI**. Toda funcionalidade nova consolidada deve existir aqui.

### Referência histórica ChatGPT

`WilsonMPeixoto-2/extrator-pdde-4cre`

Contém snapshots e implementações anteriores, incluindo fluxo AppDeploy validado, Excel V3, testes E2E e soluções que podem ser portadas seletivamente. Não recebe novo desenvolvimento deste fluxo.

### Projeto paralelo Manus

`WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`

É de **uso exclusivo do Manus**. Para este projeto ele é somente leitura. Pode ser analisado como fonte de ideias, código, testes, layout e arquitetura, mas nenhuma alteração deve ser feita nele por este fluxo.

## O que vale aproveitar das referências

A consolidação será feita por capacidade, não copiando um repositório inteiro.

Do núcleo atual, preservamos principalmente a conciliação determinística, adaptadores, centavos inteiros, estados explícitos, Excel auditável e Assistente de Liberações.

Das implementações anteriores, são candidatas úteis:

- coleta autônoma do PDDEInfo por INEP;
- persistência e recuperação de execuções;
- evidências brutas e SHA-256;
- proveniência por campo;
- histórico append-only;
- dossiê financeiro por escola;
- baselines e achados;
- experiência web operacional;
- validações E2E e comportamento em falhas parciais.

### Direção visual observada no Manus

As atualizações recentes do projeto paralelo reforçaram uma direção de UX que merece servir de inspiração:

- navegação institucional compacta;
- hierarquia clara entre execução, validações e auditoria;
- métricas resumidas sem aparência de dashboard decorativo;
- auditoria centrada primeiro na escola e no resumo financeiro;
- detalhes técnicos recolhidos em “Rastreabilidade e evidências”;
- cores semânticas, foco visível, tooltips explicativos e alto contraste;
- uso responsivo em desktop e celular;
- exclusão de áreas que não ajudam a operação, como notificações sem função clara.

A inspiração visual não implica copiar runtime, banco, arquitetura ou dependências do Manus.

## Próxima direção de desenvolvimento

A evolução do repositório canônico deve seguir aproximadamente esta ordem:

1. preservar e amadurecer o núcleo determinístico já validado;
2. incorporar coleta autônoma e resiliente do PDDEInfo para os 163 INEPs;
3. consolidar um modelo canônico de dados e evidências;
4. incorporar persistência e histórico sem perder o caráter auditável;
5. integrar o motor à aplicação web operacional;
6. transportar seletivamente UX e capacidades comprovadas nos protótipos;
7. ampliar fontes apenas quando houver rota tecnicamente e operacionalmente válida.

Essa ordem é orientação, não uma burocracia de fases. Desenvolvimento útil não deve ficar bloqueado porque este documento ainda não refletiu uma alteração secundária.
