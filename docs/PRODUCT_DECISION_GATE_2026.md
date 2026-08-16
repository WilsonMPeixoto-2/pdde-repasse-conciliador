# Gate de decisões de produto — Inteligência Financeira PDDE | 4ª CRE

## Por que este gate existe

A fundação de dados pode evoluir sem decidir prematuramente a interface final. Este documento marca o ponto em que decisões de arquitetura deixam de ser suficientes e passam a exigir escolhas de produto orientadas ao trabalho real de gestores e fiscais.

A construção do dashboard fiscal final **não deve começar antes deste gate ser revisto**.

## Decisões já fixadas

### 1. Exercício operacional

- A experiência corrente é exclusivamente **2026**.
- 2025 pode existir apenas como contexto histórico excepcional, fora dos totais e da navegação padrão.
- Dados anteriores não preenchem lacunas de 2026.

### 2. Metadados técnicos

- Metadados de rastreabilidade continuam preservados no backend.
- Eles **não aparecem** em telas, Excel ou PDF destinados ao usuário comum.
- São exemplos de conteúdo proibido na apresentação: hash, SHA-256, parser, versão de parser, URL bruta, número de páginas, tentativas, retry, payload, IDs internos, classificação técnica e logs de execução.
- Regras internas de associação também não são apresentadas como conteúdo principal. Quando uma regra afetar a interpretação humana, a interface apresenta apenas sua consequência em linguagem simples.

### 3. Transparência das fontes

A origem dos dados deve ser explicada, mas em linguagem humana e orientada ao uso:

- **PDDEInfo:** repasses informados, contas vinculadas, saldos/aplicações publicados e situação da prestação de contas.
- **SIGEF:** movimentações de conta e créditos compatíveis localizados no extrato.
- **Portal da Transparência:** documentos e transferências federais, quando a integração oficial estiver configurada.

Termos de implementação como HTTP, parser, hash, retentativa ou API não pertencem à explicação destinada ao fiscal.

### 4. Hierarquia conceitual

A experiência deve seguir uma progressão familiar:

```text
Carteira da 4ª CRE
        ↓
Unidade escolar
        ↓
Programa / ação
        ↓
Conta
        ↓
Período / movimentações
```

A estrutura do banco não determina a estrutura visual.

### 5. Linguagem probatória

- “Pagamento informado no PDDEInfo” não significa crédito bancário confirmado.
- “Crédito compatível localizado no extrato SIGEF” descreve a evidência disponível.
- “Saldo informado até DD/MM/AAAA” explicita a data de cobertura.
- “Requer conferência” é preferível a conclusões automáticas de irregularidade.

### 6. Continuidade semântica dos dados

Uma sequência financeira deve permanecer visualmente contínua.

Exemplo de ordem aceitável:

```text
Programa → Banco → Agência → Conta → Previsto → Pagamento informado → Data → Crédito
```

Textos explicativos, regras internas, observações sobre método de coleta ou histórico **não podem ser inseridos entre esses campos**.

Frases como:

- “histórico não utilizado como dado vigente”;
- “transcrição direta da consulta corrente”;
- “exibida no PDDEInfo 2026”;
- explicações de vínculo ou regra técnica;

pertencem, quando realmente necessárias, a ajuda contextual, tooltip, detalhe sob demanda, rodapé ou área administrativa. Elas não são colunas financeiras.

### 7. Indicadores quantitativos devem ser acionáveis

Nenhum número agregado deve ser exibido como peça decorativa.

Se a interface informa:

- “47 unidades com conta não exibida”;
- “111 unidades com 1ª parcela paga”;
- “12 unidades com informação parcial”;

ela deve disponibilizar imediatamente **quais são essas unidades**.

Contrato obrigatório:

1. todo indicador contém o conjunto nominal de unidades que o compõe;
2. `quantidade = número de unidades da lista`;
3. no site, o indicador funciona como filtro ou drill-down para essa lista;
4. no Excel, o indicador aponta para uma aba/lista nominal correspondente;
5. no PDF, o número só aparece se houver lista, seção ou referência que permita identificar seus componentes.

Um indicador que apenas diz “47” e obriga o usuário a procurar 47 casos manualmente não cumpre função operacional e deve ser removido.

### 8. Aparência deve prometer apenas interações reais

- Cartão, botão, chip, linha ou número com aparência clicável deve executar uma ação útil.
- Elementos não interativos não devem imitar controles.
- Contagem que parece filtro deve efetivamente filtrar.
- Link para uma unidade deve abrir a unidade, não ser apenas texto azul sublinhado.
- Estados de hover/foco devem reforçar interatividade real, nunca decoração.

### 9. Cor tem função semântica estável

Cor deve reduzir esforço de leitura, não servir como maquiagem de template.

Exemplos já aceitos:

- diferenciar visualmente **Previsto** de **Pagamento informado**;
- usar verde de forma consistente para a dimensão de pagamento informado;
- reservar cores de atenção para situações que realmente pedem acompanhamento;
- nunca depender exclusivamente de cor para transmitir estado.

A mesma cor deve conservar o mesmo significado ao longo da aplicação e dos relatórios.

### 10. Resumo e detalhe são duas camadas do mesmo dado

Toda síntese deve ter caminho de expansão:

```text
Resumo → lista filtrada → unidade → programa/conta → detalhe financeiro
```

A síntese não substitui o detalhe e o detalhe não deve ser despejado inteiro na síntese.

## Decisões de produto que ainda precisam ser tomadas

### A. Página inicial da carteira

Definir quais indicadores justificam ocupar a primeira tela. Candidatos:

- recursos previstos em 2026;
- pagamentos informados em 2026;
- créditos compatíveis localizados;
- saldo informado mais recente;
- recursos aplicados;
- unidades com informação parcial;
- unidades que merecem acompanhamento por baixa execução;
- prestações de contas com situação que requer atenção.

**Regra já decidida:** qualquer indicador por unidade deve abrir a lista nominal correspondente.

**Questão de produto restante:** quantos indicadores aparecem de imediato e quais ficam em segundo nível.

### B. Página da unidade escolar

Princípio proposto: adotar linguagem visual próxima de um aplicativo bancário moderno.

Blocos candidatos:

1. resumo da unidade;
2. posição financeira mais recente;
3. programas e parcelas;
4. contas vinculadas;
5. evolução mensal de saldo;
6. extrato de movimentações;
7. aplicações;
8. prestação de contas;
9. acompanhamento/recomendações descritivas.

**Regra já decidida:** explicações e regras não interrompem os blocos de dados; ficam em ajuda contextual ou detalhe sob demanda.

**Questão de produto restante:** quais blocos ficam expandidos por padrão e quais ficam sob demanda.

### C. Série histórica

Definir a visualização principal:

- linha temporal de saldo total;
- composição entre conta, fundos, poupança e RDB/CDB;
- marcadores de recebimentos relevantes;
- marcadores de saídas relevantes;
- comparação entre saldo inicial, entradas, saídas e saldo remanescente.

A visualização não deve sugerir causalidade que a fonte não comprove.

### D. Alertas de acompanhamento

Antes de programar thresholds definitivos, definir quais situações são realmente úteis ao trabalho fiscal. Exemplos a discutir:

- recurso recebido há X dias com percentual elevado ainda disponível;
- redução relevante de saldo entre posições mensais;
- pagamento informado sem crédito compatível localizado na cobertura consultada;
- conta sem posição recente de saldo;
- prestação de contas em situação que merece contato;
- divergência entre fontes.

**Regra já decidida:** todo alerta agregado precisa abrir a relação de unidades/casos que o originou.

**Questão de produto restante:** limites, prioridade, prazo e redação de cada alerta.

### E. Excel executivo

A fundação passa a definir sete recortes humanos, todos curtos:

1. Visão Geral;
2. Acompanhamento;
3. Unidades;
4. Repasses;
5. Contas e Saldos;
6. Movimentações;
7. Prestação de Contas.

A Visão Geral contém apenas síntese e navegação; a aba Acompanhamento contém as listas nominais dos indicadores.

**Questão de produto restante:** quais abas serão distribuídas na primeira versão e quais poderão ficar sob demanda.

### F. PDF

Definir se o PDF será:

- relatório consolidado da 4ª CRE;
- ficha financeira por unidade;
- ambos;
- ou gerado apenas sob demanda.

O PDF deve privilegiar síntese e listas úteis, não reproduzir tabelas massivas do Excel.

### G. Nível de detalhe das fontes

Definir o lugar visual da transparência das fontes. Opções adequadas incluem:

- pequeno bloco “Origem das informações” na página;
- ícone/tooltip junto ao dado;
- painel simples “Sobre estes dados”.

Não usar painel técnico de logs/regras como parte da navegação comum.

### H. Área administrativa / auditoria técnica

É possível manter uma área restrita para diagnóstico, evidências e integridade da coleta. Essa área deve ser claramente separada da experiência fiscal cotidiana.

**Questão de produto:** quem pode acessá-la e quais recursos técnicos realmente precisam de interface, em vez de permanecerem apenas no backend.

## Decisões externas de infraestrutura já identificadas

### Supabase dedicado

A aplicação ainda precisa de um projeto Supabase dedicado para persistência institucional. Bancos de outros sistemas não devem ser reutilizados por conveniência.

Antes da criação é necessário escolher explicitamente a organização Supabase e confirmar o custo informado pela plataforma.

### Portal da Transparência

O cliente oficial está implementado, mas a consulta real depende de uma chave oficial configurada como segredo de backend. A chave não deve ser inserida em código, planilha, frontend ou documentação pública.

## Critério para liberar o frontend final

O frontend final só deve ser iniciado quando:

1. o piloto público FNDE estiver validado;
2. a coleta das 163 UEs estiver comprovada no novo fluxo;
3. a série histórica de 2026 tiver cobertura conhecida;
4. as divergências relevantes entre fontes estiverem caracterizadas;
5. este gate tiver as decisões A–H definidas.

Até lá, a prioridade continua sendo tornar os dados de 2026 confiáveis, persistentes, comparáveis e fáceis de projetar em diferentes experiências humanas.