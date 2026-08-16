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

**Questão de produto:** quantos indicadores aparecem de imediato e quais ficam em segundo nível.

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

**Questão de produto:** quais blocos ficam expandidos por padrão e quais ficam sob demanda.

### C. Série histórica

Definir a visualização principal:

- linha temporal de saldo total;
- composição empilhada entre conta, fundos, poupança e RDB/CDB;
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

**Questão de produto:** limites, prioridade, prazo e redação de cada alerta.

### E. Excel executivo

A fundação já define seis recortes humanos, todos com no máximo dez colunas:

1. Visão Geral;
2. Unidades;
3. Repasses;
4. Contas e Saldos;
5. Movimentações;
6. Prestação de Contas.

**Questão de produto:** quais abas são essenciais para a primeira versão distribuída aos usuários e se a planilha deve incluir uma folha específica de acompanhamento preventivo.

### F. PDF

Definir se o PDF será:

- relatório consolidado da 4ª CRE;
- ficha financeira por unidade;
- ambos;
- ou gerado apenas sob demanda.

O PDF deve privilegiar síntese, não reproduzir tabelas massivas do Excel.

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