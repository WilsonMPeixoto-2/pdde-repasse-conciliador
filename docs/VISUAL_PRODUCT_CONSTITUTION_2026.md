# Constituição Visual do Produto — Inteligência Financeira PDDE | 4ª CRE

## 1. Propósito

Este documento estabelece os princípios permanentes de design da **Plataforma de Inteligência Financeira das Verbas do PDDE/2026 — 4ª Coordenadoria Regional de Educação**.

Ele não é um catálogo de componentes, um template de dashboard nem uma especificação rígida de telas. Sua função é servir como critério de decisão para qualquer interface, visualização, Excel, PDF ou experiência futura do produto.

A pergunta central não é apenas “está bonito?” nem apenas “funciona?”. O padrão exigido é mais alto:

> **a estética deve ajudar a compreender, orientar a atenção, revelar relações e tornar a operação agradável; a funcionalidade deve ser apresentada com refinamento, clareza e personalidade visual.**

O objetivo é construir um sistema sofisticado por trás e natural de usar por quem trabalha com ele.

---

## 2. Norte do produto

### 2.1 Sofisticação invisível

A plataforma pode consolidar dezenas de fontes, regras, evidências, séries históricas, estados e relações. O usuário não precisa carregar essa complexidade visualmente.

A interface deve transformar complexidade técnica em leitura simples sem empobrecer o conteúdo.

**Não simplificar os dados até perder significado. Simplificar o esforço necessário para compreendê-los.**

### 2.2 Beleza é parte da função

Refinamento gráfico não é acabamento decorativo aplicado depois do produto estar pronto. Tipografia, composição, cor, espaçamento, ritmo, movimento e proporção influenciam diretamente a compreensão.

Uma tela bonita, organizada e coerente:

- reduz esforço cognitivo;
- aumenta confiança no sistema;
- favorece adoção;
- torna relações mais perceptíveis;
- ajuda a criar memória visual;
- faz o usuário querer voltar à ferramenta.

Portanto, “funcional” e “bonito” não são objetivos concorrentes.

### 2.3 O sofisticado deve parecer simples de usar

O produto não deve parecer pobre, simplório ou infantil. Deve parecer **preciso, elegante, contemporâneo e seguro**, com densidade informacional adequada à atividade fiscal e gerencial.

A ambição é:

> **alta densidade informacional + alta legibilidade + alta qualidade estética.**

---

## 3. Princípios fundamentais

### 3.1 Conteúdo antes da forma

Antes de desenhar qualquer bloco, perguntar:

1. o que o usuário precisa entender aqui?
2. qual decisão ou ação pode decorrer dessa informação?
3. qual relação entre os dados precisa ficar evidente?
4. qual é o nível de detalhe necessário neste momento?

Só então escolher card, linha, gráfico, tabela, timeline, lista, acordeão, drawer ou outra composição.

Não começar pelo componente disponível no framework.

### 3.2 Hierarquia visual proporcional à função

Informações diferentes não devem receber o mesmo peso visual só porque existem no mesmo objeto de dados.

A ordem desejada é:

1. **informação que define o contexto**;
2. **informação que responde à pergunta principal**;
3. **informação que permite comparar ou agir**;
4. **contexto complementar**;
5. **explicação**;
6. **rastreabilidade técnica**, fora da experiência comum.

Regra, metadado e número financeiro nunca devem competir no mesmo nível de atenção.

### 3.3 Hierarquia por composição antes de caixas

Antes de criar novos retângulos, tentar resolver a hierarquia com:

- posição;
- escala;
- peso tipográfico;
- alinhamento;
- espaçamento;
- agrupamento;
- divisórias discretas;
- cor semântica.

Cards, bordas e fundos existem quando delimitam uma unidade real de significado ou interação.

> **Quando tudo está dentro de uma caixa, a caixa deixa de significar qualquer coisa.**

### 3.4 O usuário vê entidades e relações, não campos de banco

A experiência deve falar em:

- unidade escolar;
- UEx;
- programa;
- parcela;
- conta;
- saldo;
- aplicação;
- pagamento;
- crédito;
- movimentação;
- prestação de contas;
- acompanhamento.

Estruturas como `paymentOrderDate`, `programCode`, `coverageThrough`, IDs, flags internas e classificações técnicas são detalhes de implementação.

A estrutura do backend não determina a estrutura da interface.

### 3.5 Continuidade semântica

Dados que formam uma leitura financeira devem permanecer juntos.

Exemplo:

`Programa → Banco → Agência → Conta → Previsto → Pagamento informado → Data → Crédito`

Textos explicativos, regras de associação e comentários metodológicos não podem interromper essa sequência.

### 3.6 Texto é recurso escasso

Texto na interface compete com os dados.

Preferir:

- rótulos curtos;
- termos familiares;
- frases objetivas;
- informação contextual sob demanda;
- microcopy que ajude a agir.

Evitar transformar cada estado em um parágrafo explicativo.

Exemplo:

**Preferir:** `Conta não informada`

**Evitar como conteúdo principal:** `Agência/conta mantidas em branco; histórico não utilizado como dado vigente; transcrição direta da consulta corrente de 2026.`

Quando a explicação for necessária, ela pode estar em `ⓘ`, tooltip, drawer, rodapé contextual ou área de detalhe.

---

## 4. Gramática visual da informação

### 4.1 Tipografia editorial

Tipografia estabelece hierarquia antes que cores ou caixas sejam necessárias.

O sistema deve distinguir claramente:

- título da página ou entidade;
- contexto de identificação;
- número principal;
- subtítulo de seção;
- rótulo;
- dado secundário;
- anotação contextual.

Números financeiros relevantes devem poder “respirar”. Valores importantes podem assumir escala protagonista quando isso ajuda a leitura.

A tipografia deve favorecer leitura numérica, alinhamento e comparação.

### 4.2 Cor semântica

Cor nunca é maquiagem de template.

Cada família cromática precisa ter função estável e conhecida. A definição exata das tonalidades pertence ao futuro design system, mas os papéis semânticos devem permanecer coerentes.

Exemplos de papéis:

- **estrutural/institucional:** navegação, títulos, moldura da experiência;
- **pagamento informado:** destaque consistente para valor pago informado;
- **crédito localizado/confirmado pela evidência disponível:** estado distinto do simples pagamento informado;
- **atenção/acompanhamento:** situações que pedem verificação, sem sugerir irregularidade;
- **erro técnico real:** reservado para falha efetiva do sistema;
- **neutro/contextual:** informação complementar.

Não usar cor de atenção para decorar. Não usar vermelho para “assustar”. Não depender exclusivamente da cor para comunicar estado.

### 4.3 Espaço em branco tem função

Espaço não ocupado também comunica.

Ele deve:

- separar conceitos;
- criar ritmo;
- aumentar legibilidade;
- permitir protagonismo aos dados importantes;
- evitar bordas desnecessárias.

“Clean” não significa esconder informação. Significa dar peso correto a cada informação.

### 4.4 Densidade controlada

A plataforma terá muitos dados. A solução não é mostrar tudo ao mesmo tempo nem esconder tudo em menus.

O objetivo é **densidade informacional previsível**:

- blocos curtos;
- padrões repetíveis;
- alinhamento consistente;
- expansão sob demanda;
- comparação visual facilitada.

A sensação de complexidade deve ser menor que a complexidade real do dado.

---

## 5. Profundidade sob demanda

### 5.1 Divulgação progressiva

A experiência deve oferecer níveis de profundidade.

Exemplo conceitual:

`Resumo → lista filtrada → unidade → programa → conta → período/movimentações → detalhe de evidência`

Cada usuário pode parar no nível suficiente para sua tarefa.

### 5.2 Três tipos de profundidade

**Expansão inline**

Para conteúdo complementar pequeno e diretamente relacionado ao bloco atual.

Exemplo: expandir as parcelas de um programa.

**Drill-down / navegação**

Para abrir uma entidade que possui contexto próprio.

Exemplo: conta → posição, histórico e movimentações.

**Detalhe contextual**

Para explicação, origem ou definição.

Exemplo: `ⓘ` explicando “saldo informado até 30/06/2026”.

Não transformar toda a aplicação em uma coleção de acordeões.

### 5.3 Interatividade deve ser descobrível

O usuário precisa perceber que existe mais profundidade.

A gramática deve ser consistente, por exemplo:

- `›` ou seta para navegação/drill-down;
- `⌄ / ⌃` para expandir/recolher;
- `ⓘ` para informação contextual;
- “Ver movimentações” quando a ação merece linguagem explícita;
- hover/foco para reforçar interação real;
- área de toque adequada no mobile.

Os símbolos finais podem mudar no design system, mas **um símbolo não deve mudar de significado entre telas**.

### 5.4 Aparência interativa implica ação real

Se algo parece clicável, deve ser clicável.

Proibido:

- card com hover sem ação;
- número sublinhado sem destino;
- seta decorativa;
- chip com aparência de filtro que não filtra;
- linha com affordance de navegação que não abre nada.

---

## 6. Indicadores acionáveis

Indicadores agregados devem levar às pessoas, escolas, contas ou casos que os compõem.

Se a interface mostra:

`47 unidades com conta PDDE Básico a confirmar →`

ela deve permitir imediatamente:

1. abrir as 47 unidades;
2. pesquisar dentro do conjunto;
3. selecionar uma unidade;
4. continuar a investigação no contexto correspondente.

O indicador não é um troféu estatístico. É um **ponto de entrada operacional**.

Regra técnica associada:

`quantidade = número de itens identificáveis que compõem o indicador`.

---

## 7. Visualizações como narrativa

### 7.1 Sempre considerar uma representação visual alternativa

Ao desenhar qualquer conjunto de dados, perguntar:

> **há uma forma visual mais inteligente, bonita e intuitiva de mostrar esta relação do que apenas texto ou tabela?**

Possibilidades incluem, sem limitar a criatividade:

- linha temporal;
- linha de evolução;
- composição de saldo;
- barras de progresso quando a proporção for relevante;
- marcadores de eventos;
- comparação lado a lado;
- pequenos múltiplos;
- sparklines;
- fluxos;
- agrupamentos programáticos;
- calendários ou períodos;
- mapas conceituais quando houver relação apropriada.

Nenhuma dessas formas é obrigatória por si só.

### 7.2 Linha do tempo não é decoração

Uma timeline de 2026 pode representar:

- posição mensal de saldo;
- recebimentos;
- ordens;
- créditos;
- aplicações;
- saídas relevantes;
- fechamento mensal disponível.

Pontos e eventos devem poder ganhar detalhe por hover, foco ou clique, quando interativos.

A visualização nunca deve sugerir causalidade que as fontes não comprovem.

### 7.3 Visão + investigação

Uma boa visualização pode funcionar em duas camadas:

1. **leitura instantânea** de padrão, trajetória ou estado;
2. **investigação** ao interagir com pontos, períodos ou segmentos.

Exemplo:

`JAN — FEV — MAR — ABR — MAI — JUN`

Ao selecionar JUN:

- saldo informado;
- composição entre conta e aplicações;
- movimentações relevantes;
- recebimentos do período;
- data de cobertura.

### 7.4 Inovação visual com disciplina

Toda visualização deve passar por três testes:

1. aumenta compreensão?
2. preserva o significado do dado?
3. pode ser entendida sem legenda excessiva?

Se não, é exibicionismo visual, não inteligência visual.

---

## 8. Estados financeiros e linguagem probatória

A interface deve preservar as diferenças entre evidências.

Exemplos:

- **Pagamento informado** não significa crédito bancário confirmado.
- **Ordem FNDE** é um evento distinto da data do pagamento informado.
- **Crédito compatível localizado** deve ser apresentado como evidência própria.
- **Saldo informado até DD/MM/AAAA** sempre carrega data de cobertura.
- **Saldo aplicado** não é sinônimo de rendimento.
- ausência de dado não é zero.

A estética não pode apagar essas distinções.

### 8.1 Atenção não significa acusação

Estados de acompanhamento devem usar linguagem neutra:

- `Requer conferência`;
- `Informação parcial`;
- `Conta a confirmar`;
- `Sem posição recente`.

Evitar sugerir irregularidade sem evidência suficiente.

---

## 9. Transparência da fonte sem transparência da implementação

O usuário pode e deve saber de onde a informação veio.

Mas a explicação deve responder **o que a fonte informa**, e não como o software a processou.

Exemplo:

- **PDDEInfo:** repasses informados, contas, saldos/aplicações publicados e prestação de contas;
- **SIGEF:** movimentações e créditos compatíveis localizados;
- **Portal da Transparência:** documentos e transferências federais quando integrado.

Não exibir para o usuário comum:

- hash;
- parser;
- retry;
- HTTP;
- payload;
- SHA;
- versão de parser;
- IDs internos;
- URL bruta;
- paginação da coleta.

---

## 10. Fronteira entre experiência humana e auditoria técnica

Existem duas experiências diferentes e ambas são legítimas:

### Experiência fiscal/gerencial

Deve privilegiar:

- compreensão;
- ação;
- comparação;
- acompanhamento;
- navegação;
- síntese;
- detalhe financeiro sob demanda.

### Experiência técnica/auditoria

Pode conter:

- evidências brutas;
- logs;
- IDs;
- hashes;
- integridade;
- tentativas;
- diagnóstico de coleta;
- classificação técnica.

Essas duas experiências não devem ser misturadas na mesma hierarquia visual.

---

## 11. Web, desktop e mobile são composições diferentes

### 11.1 Responsividade não é encolhimento

A versão mobile não deve ser o desktop comprimido.

Os mesmos dados podem ser reagrupados conforme o espaço.

Exemplo:

Desktop:

`Previsto | Pago | Saldo | Aplicado`

Mobile:

- grade 2 × 2;
- sequência vertical;
- blocos resumidos expansíveis.

O significado permanece. A composição muda.

### 11.2 Scroll horizontal não é solução padrão

Tabelas largas podem ser adequadas em contextos específicos, mas não devem ser a resposta automática para dados complexos no mobile.

### 11.3 Interação touch

Elementos interativos devem possuir área de toque confortável, foco visível e feedback claro.

Hover nunca pode ser o único meio de descobrir informação essencial.

---

## 12. Tabelas: usar quando uma tabela é realmente a melhor forma

Tabelas são excelentes para:

- comparação sistemática;
- ordenação;
- filtragem;
- grande quantidade de itens homogêneos;
- exportação;
- leitura tabular operacional.

Não são ideais para tudo.

Evitar transformar uma unidade escolar em uma linha com 40 colunas quando o usuário precisa compreender relações entre programas, contas, parcelas, saldos e eventos.

Quando uma tabela for necessária:

- limitar colunas ao objetivo da visão;
- permitir filtros úteis;
- preservar continuidade semântica;
- oferecer detalhe sob demanda;
- evitar colunas de frases longas;
- usar formatação numérica consistente.

---

## 13. Excel e PDF também são produtos

### 13.1 Excel

O Excel destinado ao gestor não é um dump do banco.

Deve possuir:

- abas com perguntas claras;
- quantidade controlada de colunas;
- navegação interna quando útil;
- cores semânticas consistentes;
- filtros coerentes;
- valores numéricos formatados;
- nenhum metadado técnico visível por padrão.

Exportação técnica pode existir separadamente.

### 13.2 PDF

O PDF deve ser pensado como leitura, não como captura de tela da aplicação nem cópia de planilha.

Pode usar:

- narrativa editorial;
- síntese;
- rankings quando adequados;
- pequenos gráficos;
- timelines;
- fichas por unidade;
- seções claras;
- paginação consciente.

Evitar tabelas massivas apenas porque cabem em orientação paisagem.

---

## 14. Movimento e microinterações

Animação pode ajudar a:

- revelar expansão;
- confirmar seleção;
- mostrar mudança de estado;
- conectar visualmente origem e destino;
- tornar exploração agradável.

Deve ser:

- curta;
- discreta;
- previsível;
- opcional para usuários com preferência por movimento reduzido.

Nunca usar movimento para competir com o dado.

---

## 15. Acessibilidade é parte do refinamento

A experiência deve considerar:

- contraste suficiente;
- foco visível;
- navegação por teclado;
- textos alternativos quando necessário;
- estados não dependentes apenas de cor;
- alvos de toque adequados;
- leitura por tecnologias assistivas;
- suporte a redução de movimento;
- escalabilidade de texto.

Acessibilidade não é um modo visual separado. É qualidade do produto principal.

---

## 16. Padrões proibidos

Evitar deliberadamente:

### 16.1 Dashboard de template

- quatro cards porque “dashboard tem quatro cards”;
- gráfico sem pergunta definida;
- ícone decorativo sem função;
- gradiente sem significado;
- card que só replica um campo do banco.

### 16.2 Densidade textual

- parágrafos de regra entre valores;
- explicação metodológica no fluxo financeiro;
- rótulos técnicos;
- redundância de status.

### 16.3 Métricas mortas

- “47 unidades” sem saber quais;
- “111 pagamentos” sem drill-down;
- percentuais sem denominador ou ação possível.

### 16.4 Interação falsa

- hover decorativo;
- seta sem destino;
- chip que não filtra;
- linha aparentemente clicável sem ação.

### 16.5 Semântica financeira achatada

- tratar pago informado como crédito confirmado;
- tratar ausência como zero;
- tratar saldo aplicado como rendimento;
- esconder data de cobertura;
- misturar 2025 aos totais de 2026.

---

## 17. Camadas de informação

Para orientar qualquer tela, usar quatro níveis conceituais.

### Nível 1 — orientação e decisão

O que o usuário precisa perceber em segundos.

Exemplos:

- posição financeira;
- valor pago informado;
- saldo mais recente;
- situação que exige atenção.

### Nível 2 — contexto operacional

O que explica o Nível 1.

Exemplos:

- programas;
- parcelas;
- contas;
- composição de saldos;
- status de prestação.

### Nível 3 — investigação

O que permite analisar o caso.

Exemplos:

- série mensal;
- movimentações;
- eventos;
- comparação entre fontes;
- histórico de posições.

### Nível 4 — evidência e diagnóstico técnico

O que sustenta a auditabilidade, normalmente fora da experiência comum.

Exemplos:

- artefatos brutos;
- hashes;
- IDs;
- logs;
- integridade;
- diagnóstico de coleta.

A existência de Nível 4 nunca justifica poluir os Níveis 1 e 2.

---

## 18. Critério de escolha de visualização

Antes de implementar uma visualização, responder:

1. **qual pergunta ela responde?**
2. **qual relação ela torna mais perceptível?**
3. **qual é a ação seguinte possível?**
4. **há outra representação mais simples ou mais expressiva?**
5. **o usuário percebe que pode interagir?**
6. **o comportamento continua compreensível no mobile?**
7. **a estética reforça ou compete com o dado?**
8. **a visualização preserva a semântica financeira?**

Se essas perguntas não tiverem resposta clara, o componente ainda não está pronto para implementação.

---

## 19. Checklist de revisão de tela

Toda tela, bloco ou relatório deve passar pelo seguinte teste:

### Hierarquia

- O que o usuário percebe primeiro é realmente o mais importante?
- O segundo nível de atenção faz sentido?
- Há elementos secundários competindo com os principais?

### Clareza

- O usuário entende os termos sem conhecer o backend?
- Existe texto que poderia virar detalhe contextual?
- Algum número está sem contexto temporal ou semântico?

### Ação

- Indicadores levam aos casos que representam?
- Elementos que parecem interativos funcionam?
- O próximo passo natural está disponível?

### Estética

- Tipografia, cor, espaço e proporção estão ajudando a leitura?
- O layout tem personalidade sem depender de ornamento gratuito?
- O refinamento visual é consistente com a importância do conteúdo?

### Densidade

- Há dados demais ao mesmo tempo?
- Há dados importantes escondidos demais?
- A profundidade sob demanda está clara?

### Semântica

- Pago informado foi distinguido de crédito?
- Ausência foi distinguida de zero?
- Data de cobertura está visível quando necessária?
- 2025 está fora dos totais correntes de 2026?

### Responsividade e acessibilidade

- A composição funciona no mobile sem simplesmente comprimir o desktop?
- Estados funcionam sem cor?
- Interações funcionam com teclado e toque?

---

## 20. Decisões deliberadamente abertas

Esta constituição **não define ainda**:

- paleta final e códigos de cor;
- família tipográfica final;
- raios, sombras e elevação;
- grid definitivo;
- biblioteca de componentes;
- layout final da Home;
- composição final da página da unidade;
- modelo definitivo de timeline;
- thresholds de alertas;
- quantidade final de KPIs;
- formato final do PDF;
- quais abas compõem o Excel distribuído;
- motion design final.

Essas decisões devem ser tomadas na criação do design system e nas especificações de cada experiência, usando esta constituição como filtro crítico.

---

## 21. Frase-síntese

> **Mostrar primeiro o que importa, tornar perceptíveis as relações, sinalizar claramente a profundidade disponível e permitir que cada usuário investigue até o nível necessário, com beleza, precisão e significado em cada escolha visual.**

Ou, em versão ainda mais curta:

> **sofisticação que parece simples de usar.**
