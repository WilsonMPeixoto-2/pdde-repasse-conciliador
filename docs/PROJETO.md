# Projeto PDDE — visão e evolução

## Missão

Construir uma plataforma interna para a 4ª CRE capaz de **coletar, validar, conciliar, monitorar e rastrear dados financeiros do PDDE**, preservando a distinção entre o que cada fonte realmente comprova e entregando uma experiência operacional simples, além de relatórios Excel profissionais e auditáveis.

O caso concreto e prioritário é a carteira de **163 escolas da 4ª CRE no exercício de 2026**. Expansão para outros exercícios, CREs ou fontes só deve ocorrer quando melhorar o produto real, não como pretexto para ampliar escopo indefinidamente.

## Estado de referência

O baseline factual de 14/08/2026 está em [`BASELINE_TECNICO_2026-08-14.md`](BASELINE_TECNICO_2026-08-14.md).

Ideias, pesquisas e descobertas ainda não materializadas estão em [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).

Esses documentos existem para permitir continuidade por novos chats sem depender da memória da conversa.

## Como o projeto evoluiu

### 1. Planilha e extração do PDDEInfo

O problema inicial era obter dados financeiros confiáveis apesar das rotinas legadas de exportação do PDDEInfo. A primeira solução relevante passou a ler diretamente o HTML público do portal.

O experimento municipal comprovou escala:

- 156 páginas processadas;
- 1.559 unidades únicas;
- 3.027 registros de contas bancárias;
- 4.987 registros financeiros;
- paginação completa validada e 4.987 registros conciliados internamente sem divergência.

A primeira grande conclusão arquitetural foi que não era necessário depender do botão de exportação quebrado do sistema oficial para obter os dados públicos que a própria página apresentava.

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

### 4. Conciliação com SIGEF por arquivos/exportações

Foram desenvolvidos leitores e regras para combinar PDDEInfo, SIGEF Liberações e SIGEF Movimentações com chaves fortes de correspondência. Similaridade de valor, sozinha, não confirma uma parcela.

A primeira execução real parcial do núcleo processou 520 repasses e os manteve inconclusivos quando a cobertura externa necessária não estava disponível. Esse comportamento conservador virou uma regra permanente.

### 5. Assistente de Liberações

A coleta manual das exportações do SIGEF recebeu uma camada operacional que:

- aceita `.xls` com qualquer nome;
- identifica CNPJ, exercício e programa;
- preserva originais por SHA-256;
- produz arquivos canônicos `CNPJ__PROGRAMA.xls`;
- detecta duplicidade equivalente, atualização monotônica, conflito, pasta incorreta e arquivo fora da carteira;
- gera planilha de cobertura e pendências;
- pode ser executada repetidamente sem destruir estado válido.

O Assistente permanece útil para evidências de Liberações, mas deixou de ser o único caminho para observar movimentações bancárias.

### 6. Descoberta e incorporação do extrato SIGEF público direto

A pesquisa técnica mostrou que, quando banco, agência, conta, CNPJ e programa já são conhecidos, o SIGEF possui uma rota pública de detalhamento do extrato acessível diretamente.

O repositório canônico incorporou essa capacidade em `backend/adapters/sigef-public-statement.ts`.

O adaptador:

- monta a rota a partir da identidade bancária;
- valida a identidade retornada;
- preserva conta com dígito `X`;
- trata encoding e instabilidade;
- preserva histórico e documento;
- extrai contraparte quando disponível;
- mantém estados `COMPLETE`, `PARTIAL` e `ERROR`;
- nunca interpreta CAPTCHA/erro como ausência de movimentos.

### 7. Validação integral PDDEInfo + SIGEF nas 163 UEs

Em 14/08/2026, o fluxo canônico completou uma rodada integral:

- 163/163 escolas no PDDEInfo;
- 284/284 contas SIGEF completas;
- 0 consultas parciais ou falhas de conta;
- 520 registros de repasse/parcela;
- 394 movimentos do exercício de 2026;
- 51.547 movimentos históricos recebidos das fontes brutas e mantidos fora da visão corrente;
- R$ 827.615,00 com pagamento informado no PDDEInfo;
- R$ 409.010,00 em créditos compatíveis localizados no SIGEF.

Essa etapa encerrou a dúvida sobre a viabilidade técnica de monitorar a carteira completa usando PDDEInfo + SIGEF público.

### 8. Visão operacional

O projeto passou a organizar os fatos em duas famílias principais:

- **repasses**, com programa/ação/parcela, valor programado, pagamento informado e associação bancária;
- **movimentações**, com conta, data, crédito/débito, histórico, documento, contraparte e categoria auxiliar.

As categorias de movimento ajudam a leitura, mas não substituem o histórico original do banco nem produzem julgamento automático de regularidade.

### 9. Visão fiscal humana

A experiência deixou de ser pensada como uma tabela técnica única e passou a seguir a lógica de trabalho do fiscal:

```text
Unidade Escolar
├── Programa / Ação
│   └── Parcela
└── Conta / Programa
    └── Movimentações
        └── Evidência
```

A escola é a unidade principal de navegação. A interface deve permitir leitura rápida, aprofundamento financeiro e investigação de evidências sem obrigar o usuário a compreender o pipeline de coleta.

### 10. Excel Fiscal v3

O Excel foi promovido de “saída do extrator” a produto de análise complementar ao futuro site.

A versão atual possui nove abas:

1. Visão Geral;
2. Unidades;
3. Repasses por Escola;
4. Extratos por Escola;
5. Registros para Conferência;
6. BASE - Repasses;
7. BASE - Movimentos;
8. BASE - Contas;
9. Legenda e Fontes.

A planilha preserva bases técnicas para cruzamentos adicionais sem obrigar a interface web a reproduzir todas as possibilidades analíticas do Excel.

### 11. Backend institucional em código

O repositório também evoluiu para uma base institucional com:

- API;
- fila de execuções;
- worker;
- idempotência;
- estados operacionais;
- Storage privado;
- eventos append-only;
- SHA-256;
- read models de execuções/achados/artefatos;
- migrations Supabase/Postgres.

Essa infraestrutura **ainda não está implantada**. Não existe Supabase dedicado conectado nem site publicado no Vercel.

O backend institucional conhece hoje principalmente `PDDEINFO` e `RECONCILIATION`. O monitoramento completo PDDEInfo + SIGEF ainda precisa ser promovido de scripts/workflows para um job institucional `MONITORING`.

## Experimentos paralelos e aprendizado

Durante a fase exploratória foram usados três ambientes de implementação em paralelo. A experiência foi útil para comparar abordagens, mas a continuidade agora tem uma única regra.

### Repositório canônico

`WilsonMPeixoto-2/pdde-repasse-conciliador`

É a **única fonte de verdade de implementação do fluxo ChatGPT/OpenAI**. Toda funcionalidade nova consolidada deve existir aqui.

### Referência histórica ChatGPT

`WilsonMPeixoto-2/extrator-pdde-4cre`

Contém implementações anteriores, incluindo auditoria web, histórico por observação, comparadores, E2E, AppDeploy e outras soluções candidatas a reaproveitamento seletivo. Não recebe novo desenvolvimento deste fluxo.

### Projeto paralelo Manus

`WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`

É de **uso exclusivo do Manus**. Para este projeto ele é somente leitura. Pode ser analisado como fonte de ideias, código, testes, layout e arquitetura, mas nenhuma alteração deve ser feita nele por este fluxo.

## O que vale aproveitar das referências

A consolidação é feita por capacidade, não copiando um repositório inteiro.

Ideias úteis já observadas:

- dossiê financeiro por escola;
- filtros avançados por execução/escola/programa/campo;
- comparador histórico;
- cobertura de fonte explicitamente comunicada;
- referência primária completa não substituída por execução parcial;
- evidência técnica recolhida em camada secundária;
- navegação institucional compacta;
- alto contraste, foco visível e responsividade;
- métricas operacionais sem aparência de dashboard decorativo.

A inspiração visual ou funcional não implica copiar runtime, banco, arquitetura ou dependências das referências.

## Conhecimento ainda não materializado

As pesquisas já identificaram possibilidades que não devem ser esquecidas, mas que **não são capacidades atuais do canônico**. Entre elas:

- relatórios públicos complementares do PDDEInfo, inclusive saldo e situação de contas/prestação de contas;
- Novo Webservice do SIGEF, condicionado a documentação/credenciais institucionais;
- API do BB Gestão Ágil, condicionada a acesso institucional;
- produtos estruturados da Plataforma Antonieta de Barros;
- PDDEREx, condicionado a piloto de utilidade em 2026;
- API do Portal da Transparência, condicionada a prova de granularidade útil por UEx;
- Dados Abertos FNDE como controle secundário;
- SiGPC como possível camada futura de prestação de contas.

O registro completo, com grau de maturidade e experimentos necessários, está em [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).

## Próxima direção de desenvolvimento

A sequência aprovada em 14/08/2026 é:

1. **consolidar documentação e baseline técnico**;
2. **transformar o monitoramento atual em job institucional `MONITORING`**;
3. **criar/conectar Supabase dedicado e persistir um read model financeiro corrente**;
4. **expor API orientada à carteira e ao prontuário fiscal**;
5. **construir o frontend novo e publicar a plataforma**;
6. **ampliar fontes e fechar lacunas**, especialmente posição de aplicações/rendimentos, e então remover/arquivar legado desnecessário.

Essa ordem é orientação de produto e arquitetura, não uma burocracia de fases. O objetivo é transformar o motor financeiro já comprovado numa plataforma institucional utilizável antes de voltar a expandir o número de fontes.