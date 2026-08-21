ok, você deve analisar individualmente e profundamente cada possibilidade e verificar se podemos adaptar nossa ferramenta para extrair dados de alguma outra fonte citada

Pensou por 8m 48s

Sim. Fiz a análise individual das fontes com uma pergunta bastante mais rigorosa do que “o site tem dados interessantes?”:

> **Nossa ferramenta consegue obter esses dados de modo confiável, repetível e permitido, e eles melhoram de fato o trabalho de acompanhamento das 163 UEs?**

A resposta é bastante animadora. **Há outras fontes que vale integrar.** Algumas podem ser incorporadas com pouco esforço ao backend que acabamos de consolidar; outras dependem de descobrir credenciais ou autorização institucional; e algumas devem permanecer apenas como fontes auxiliares, porque automatizá-las daria muito trabalho para pouco benefício.

A principal conclusão é esta:

> **Não precisamos reconstruir nossa ferramenta. A arquitetura v0.5 já está muito bem posicionada para ganhar novos “adaptadores de fonte”.**

Hoje o armazenamento institucional já aceita arquivos brutos, HTML, JSON normalizado, manifestos e relatórios de forma genérica.  E nosso modelo de evidências já prevê inclusive `DADOS_ABERTOS_FNDE`, embora ainda não tenhamos desenvolvido esse coletor. 

---

# Resultado geral da investigação

| FonteValor para nósAutomaçãoAdaptaçãoPrioridade |                       |                                              |                            |         |
| ----------------------------------------------- | --------------------- | -------------------------------------------- | -------------------------- | ------- |
| **PDDEInfo, relatórios em lote**                | Muito alto            | Pública e viável                             | Fácil                      | **1**   |
| **BB Gestão Ágil**                              | Altíssimo             | API existe, acesso precisa ser resolvido     | Fácil/média após acesso    | **1**   |
| **Plataforma Antonieta de Barros**              | Muito alto            | Arquivos estruturados públicos               | Fácil após mapear produtos | **1**   |
| **PDDEREx**                                     | Alto                  | Pública e simples                            | Fácil                      | **1**   |
| **Portal da Transparência / CGU**               | Alto                  | API oficial                                  | Fácil                      | **1–2** |
| **SIGEF direto**                                | Muito alto            | Parcialmente automatizável                   | Já temos grande parte      | **1–2** |
| **Dados Abertos FNDE**                          | Médio/alto            | Arquivos/API                                 | Muito fácil                | **2**   |
| **SiGPC Acesso Público**                        | Alto para PC          | Público, mas tecnicamente protegido          | Média/difícil              | **2–3** |
| **SiGPC Contas Online**                         | Altíssimo em riqueza  | Autenticado                                  | Importação assistida       | **3**   |
| **Painéis Power BI PDDE**                       | Alto para conferência | Ruim para coleta direta                      | Evitar scraping            | **3**   |
| **PDDEWeb**                                     | Médio                 | Autenticado                                  | Pouco benefício            | **4**   |
| **SIMEC / PDDE Interativo**                     | Específico            | Autenticado                                  | Específico                 | **4**   |
| **Transferegov**                                | Baixo para PDDE hoje  | APIs boas, dados errados para nosso problema | Desnecessária agora        | **4**   |

Agora, fonte por fonte.

---

# 1. PDDEInfo: descobrimos que ainda não exploramos nem metade do potencial dele

Essa foi talvez a descoberta de melhor relação custo-benefício.

Nós construímos um excelente coletor para:

> **Consulta por Escola → 163 INEPs → detalhes financeiros de cada escola**

Só que o próprio PDDEInfo possui uma área inteira de **relatórios em lote**, pública e sem autenticação, que ainda não transformamos em coletor.

O FNDE afirma que o PDDEInfo disponibiliza informações atualizadas sobre cadastro, recursos, ações integradas, saldos bancários, escola, UEx, prestação de contas e pendências impeditivas de pagamento. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/monitore-o-pdde-1?utm_source=chatgpt.com)

E encontrei hoje os relatórios públicos individualmente.

### Situação de Prestação de Contas

Permite filtrar por:

- exercício;
- programa;
- CNPJ;
- INEP;
- rede;
- município;
- adimplente/inadimplente;
- relatório detalhado por escola ou consolidado;
- **geração de Excel**. [FNDE](https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta?utm_source=chatgpt.com)

### Relatório de Suspensão

Esse é **muito interessante para seu trabalho**.

Ele diferencia causas como:

- inadimplência da UEx;
- omissão na prestação de contas;
- UEx sem dirigente ativo;
- entidade não habilitada;
- UEx sem conta corrente ativa;
- escola sem UEx;
- CNPJ irregular;
- regularização fora do prazo;
- bloqueio solicitado pela entidade ou pelo FNDE. [FNDE](https://www.fnde.gov.br/pddeinfo/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao?utm_source=chatgpt.com)

Isso significa que nossa ferramenta poderia responder:

> “Por que esta escola não recebeu?”

em vez de mostrar simplesmente:

> “Não recebeu.”

É uma diferença enorme operacionalmente.

### Situação de Atendimento

Há relatório específico para **pagos e não pagos**, por programa e destinação, com opção de Excel. [FNDE](https://www.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade/ano/2024/programa/0B/destinacao/08/cnpj//co_escola//stPg/1/tpRelatorio/1/sg_uf/co_municipio_fnde/consultar/Consultar/page/9743?utm_source=chatgpt.com)

### Consulta de Saldo

O PDDEInfo também possui consulta coletiva de saldos.

### Situação de abertura de contas

Também localizei relatório de situação de abertura de contas, separado por exercício/programa.

## Adaptação recomendada

Criar algo conceitualmente como:

```
backend/adapters/pddeinfo-reports.ts
```

Ele poderia realizar uma consulta municipal:

```
Rio de Janeiro
        ↓
Rede Municipal
        ↓
2026
        ↓
relatório completo
        ↓
filtrar nossos 163 INEPs
```

Isso pode ser **mais eficiente do que fazer 163 consultas individuais** para determinados tipos de informação.

Não substituiria o coletor atual. Seriam complementares:

```
PDDEInfo por escola
→ detalhes financeiros

PDDEInfo relatórios
→ visão em lote, saldo, PC, suspensão, atendimento, contas
```

### Decisão

**IMPLEMENTAR.**

É provavelmente a primeira fonte nova que eu acrescentaria porque:

- é pública;
- é oficial;
- não depende de nova credencial;
- utiliza a mesma origem que já sabemos tratar;
- adiciona informações de enorme utilidade.

---

# 2. PDDEREx: outra fonte pública do próprio FNDE que vale integrar

O PDDEREx continua ativo.

A página oficial diz explicitamente que fornece:

> valores **transferidos/previstos** do PDDE e respectivas ações/destinações, separados em custeio e capital, além de **Banco, Agência e Conta Corrente**. [FNDE](https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_1_pc?utm_source=chatgpt.com)

E permite consulta por:

- programa;
- exercício;
- CNPJ;
- UF;
- município. [FNDE](https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_3_pc?utm_source=chatgpt.com)

Isso é quase uma segunda fonte independente para:

```
Previsto
Custeio
Capital
Banco
Agência
Conta
```

## Qual seria o valor real?

Imagine:

```
PDDEInfo
Custeio: R$ X
Capital: R$ Y
Conta: 12345
```

e:

```
PDDEREx
Custeio: R$ X
Capital: R$ Y
Conta: 12345
```

Excelente.

Mas se aparecer:

```
PDDEREx ≠ PDDEInfo
```

nossa ferramenta sinaliza:

> **DIVERGÊNCIA ENTRE FONTES FNDE**

Isso tem bastante valor.

## Limitação

O próprio PDDEREx informa que consultas antigas são restritas aos últimos exercícios e históricos anteriores precisam ser solicitados ao FNDE. [FNDE](https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_3_pc?utm_source=chatgpt.com)

Mas nosso foco é principalmente **estado atual**, então isso praticamente não incomoda.

## Adaptação

Muito simples:

```
pdderex-http.ts
pdderex-html.ts
pdderex-normalizer.ts
```

Nossa infraestrutura de arquivos e evidências já suporta isso.

### Decisão

**IMPLEMENTAR COMO FONTE DE CONFIRMAÇÃO E FALLBACK.**

Não substituir PDDEInfo, mas provavelmente custa pouco obter uma excelente segunda opinião oficial.

---

# 3. BB Gestão Ágil: potencialmente a maior evolução de todo o projeto

Aqui a pesquisa trouxe a informação mais importante.

O BB Gestão Ágil não é apenas um site de prestação de contas.

O FNDE informa que a integração já avançou para o **PDDE** e permite acompanhar **em tempo real os repasses e os gastos registrados**, além de usar esses dados para automatizar partes da análise da prestação de contas. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/transparencia-e-prestacao-de-contas/relatorio-de-gestao-1/relatorio-de-gestao-2024/desempenho-da-gestao/areas-de-suporte/tecnologia-da-informacao?utm_source=chatgpt.com)

A solução reúne:

```
Receitas
+
gastos
+
documentos de despesas
+
categorias/subcategorias
+
movimentações bancárias
```

O FNDE descreve expressamente essa atualização contínua e o uso para PDDE e Ações Integradas. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/assuntos/noticias/fnde-e-centro-colaborador-sudeste-promovem-webinar-sobre-o-bb-gestao-agil/?utm_source=chatgpt.com)

Isso está muito mais próximo da pergunta:

> **“Como a escola está utilizando os recursos?”**

do que PDDEInfo ou mesmo SIGEF Liberações.

---

## E existe API

Essa parte está confirmada.

Uma página oficial federal sobre o Banco do Brasil informa que o **BB Gestão Ágil pode ser integrado a sistemas próprios dos municípios** e que os dados podem ser consumidos pelos intervenientes **por API**. A mesma fonte diz que o extrato possui origem e destino dos recursos e consegue desdobrar pagamentos realizados em lote. [Serviços e Informações do Brasil](https://www.gov.br/sri/pt-br/backup-secretaria-de-governo/portalfederativo/agenda-do-prefeito-brasil/guiainicio/prefeito/recursos-e-oportunidades/banco-do-brasil?utm_source=chatgpt.com)

Além disso, há evidência documental de órgãos de controle utilizando essa interface. O TCE-SP, por exemplo, registra formalmente um termo de adesão para utilização da **API Accountability** do Banco do Brasil. [TCE SP](https://www.tce.sp.gov.br/transparencia-tcesp/convenios_acordo_parcerias?utm_source=chatgpt.com)

O TCU também já analisou tecnicamente os dados de saída dessa API. [Pesquisa TCU](https://pesquisa.apps.tcu.gov.br/documento/acordao-completo/%2A/COLEGIADO%253A%2522Plen%25C3%25A1rio%2522%2520NUMACORDAO%253A458%2520ANOACORDAO%253A2022/DTRELEVANCIA%2520desc%252C%2520NUMACORDAOINT%2520desc/0?utm_source=chatgpt.com)

### Portanto:

**A API é real.**

O que **não sabemos ainda** é:

> quais credenciais e qual instrumento permitem que a SME-Rio, ou um sistema institucional da SME, acesse os dados do PDDE das UEx da rede.

Isso é um problema de **habilitação**, não de programação.

---

# 4. Há uma limitação importante do BB Gestão Ágil

Não devemos assumir:

> “Todas as 163 escolas estão no Banco do Brasil.”

O FNDE mantém relação de bancos parceiros atualizada em março de 2026 e ela inclui, para beneficiários pessoa jurídica:

- Banco do Brasil;
- Banco do Brasil para abertura de contas e Gestão Ágil;
- Caixa Econômica Federal. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/consultas-online/bancos-parceiros?utm_source=chatgpt.com)

A regulamentação do PDDE historicamente prevê contas em bancos oficiais parceiros. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2012/resolucao-cd-fnde-no-7-de-12-de-abril-de-2012?utm_source=chatgpt.com)

Portanto, antes de escolher o BB Ágil como nossa fonte universal de movimentações, precisamos fazer algo muito simples:

> **contar nos dados das nossas 163 escolas quantas contas atuais são BB e quantas são de outros bancos.**

Já possuímos o campo `Banco` no PDDEInfo.

Se descobrirmos:

```
163 UEs
↓
160 Banco do Brasil
3 Caixa
```

BB Ágil quase resolve toda a segunda camada.

Se descobrirmos:

```
90 BB
73 Caixa
```

a arquitetura terá que continuar multibanco.

Essa análise deve ser feita com **dados reais das 163 UEs**, não por presunção normativa.

---

# 5. Como o BB Gestão Ágil entraria na nossa ferramenta

A arquitetura atual se adapta muito bem.

Hoje nossas fontes de evidência são explicitamente registradas e incluem PDDEInfo e diversos tipos de SIGEF. 

Acrescentaríamos:

```
BB_GESTAO_AGIL
```

E um adaptador:

```
bb-gestao-agil-api.ts
```

O resultado normalizado poderia ser algo parecido com:

```
Escola
Programa
Conta
Data
Tipo
Crédito/Débito
Valor
Favorecido
CNPJ/CPF favorecido
Documento
Categoria
Subcategoria
Descrição
Documento fiscal associado
```

Nossa infraestrutura atual já consegue guardar o JSON/arquivo original, calcular SHA e preservar os dados normalizados. 

### Decisão

**PRIORIDADE MÁXIMA, MAS DEPENDE DE ACESSO INSTITUCIONAL.**

Não escreveria um scraper de tela.

Eu tentaria primeiro conseguir a **API oficial**.

---

# 6. Plataforma Antonieta de Barros: provavelmente nosso melhor caminho para datasets prontos

A Plataforma Antonieta de Barros é oficialmente a plataforma de governança de dados do FNDE e foi construída justamente para integrar bases e disponibilizar produtos estruturados. [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/?utm_source=chatgpt.com)

E confirmei novamente:

> **PDDE possui atualmente 19 produtos de dados relacionados na plataforma.** [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/programas-e-acoes/programas/visualizar)

O problema é quase engraçado:

> a página diz que existem 19, mas a interface dinâmica não está entregando a lista completa para indexação pública.

Ainda não consegui enumerar com segurança os 19.

Portanto não vou inventá-los.

---

# 7. Mas a Plataforma já provou que pode distribuir dados bancários do BB Ágil

Esse é o aspecto mais interessante.

Existe nela o produto:

**Extrato de Transações ETI**

com arquivo:

```
ETI_BBAGIL_DadosAbertos.zip
```

A fonte declarada é:

> **Transparência Pública BB Ágil**

e o conteúdo possui **transações, créditos e gastos das contas vinculadas ao programa**. [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/8?utm_source=chatgpt.com)

Isso prova que tecnicamente existe:

```
BB Gestão Ágil
      ↓
dados estruturados
      ↓
FNDE
      ↓
Plataforma Antonieta
      ↓
ZIP público
```

Se um dos 19 produtos PDDE for equivalente, ganhamos uma mina de ouro.

Em vez de:

```
163 escolas
× várias páginas
× várias contas
× vários cliques
```

poderíamos ter:

```
baixar ZIP
↓
filtrar os 163 CNPJs/INEPs
↓
pronto
```

---

# 8. A Plataforma também oferece dados de repasses atualizados diariamente

A tabela oficial de repasses da Antonieta informa que os dados são coletados **diariamente de uma base interna de repasses do FNDE**. [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/tabela-de-repasses?utm_source=chatgpt.com)

Isso cria outra possibilidade fascinante:

```
Base interna de repasses FNDE
        ↓
Antonieta
        ↓
todos os repasses
```

versus:

```
PDDEInfo
↓
163 consultas
```

Ainda não sabemos se o detalhamento da tabela chega à UEx/INEP para o PDDE.

Precisamos verificar.

### Adaptação

Criaria um componente bem genérico:

```
pab-artifact-downloader.ts
```

Ele faria:

```
descobrir produto
↓
baixar artefato
↓
guardar original
↓
identificar formato
↓
normalizar
```

Uma sutileza importante:

Se a Antonieta estiver apenas distribuindo dados do BB Gestão Ágil, eu registraria:

```
fonte original = BB_GESTAO_AGIL
distribuidor = PLATAFORMA_ANTONIETA
```

e não fingiria que os dados nasceram na Antonieta.

### Decisão

**INVESTIGAÇÃO TÉCNICA IMEDIATA E INTEGRAÇÃO SE OS PRODUTOS PDDE FOREM ÚTEIS.**

---

# 9. Dados Abertos FNDE: podemos integrar quase imediatamente

O próprio FNDE declara que seus dados abertos do PDDE contemplam:

- execução financeira;
- escolas atendidas;
- saldos de contas;
- regularidade da prestação de contas. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos?utm_source=chatgpt.com)

E aqui temos uma coincidência arquitetural agradável.

Nosso código **já possui**:

```
DADOS_ABERTOS_FNDE
```

como fonte reconhecida de evidência. 

Portanto a infraestrutura já estava preparada antes mesmo dessa pesquisa.

## Problema

Parte do catálogo antigo de dados abertos está desatualizada ou possui cobertura histórica limitada.

Isso significa que eu não confiaria nele para:

> “qual é o saldo de hoje?”

Mas é excelente para:

```
histórico
repasses anteriores
prestação de contas histórica
validação
backfill
```

### Decisão

**IMPLEMENTAR, MAS COMO FONTE HISTÓRICA/AUXILIAR.**

E sempre registrar:

```
período coberto
data de atualização
```

para nunca confundirmos “não existe nesse arquivo de 2022” com “não existe hoje”.

---

# 10. Portal da Transparência: integração tecnicamente muito boa

Aqui temos uma API pública oficial de verdade.

O Swagger atual possui endpoints para:

- recursos recebidos;
- documentos de despesas;
- pagamentos;
- favorecidos finais por documento;
- documentos relacionados;
- despesas por favorecido. [Portal da Transparência](https://api.portaldatransparencia.gov.br/?utm_source=chatgpt.com)

Além da API, o portal oferece arquivos completos de:

- empenhos;
- liquidações;
- pagamentos;
- favorecidos finais;
- listas bancárias;

atualizados diariamente. [Portal da Transparência](https://portaldatransparencia.gov.br/download-de-dados/despesas/?utm_source=chatgpt.com)

---

## Como ele nos ajuda no PDDE

Ele não mostra:

> o que a escola gastou depois que o dinheiro entrou na conta.

Portanto **não substitui SIGEF Movimentação nem BB Gestão Ágil**.

Mas consegue ser uma ótima fonte para confirmar:

```
FNDE
↓
pagamento
↓
OB/documento
↓
ação orçamentária
↓
valor
↓
favorecido/intermediário
```

Isso significa:

```
PDDEInfo informa pagamento
        ↓
SIGEF Liberações encontra OB
        ↓
Portal Transparência confirma documento federal
```

É uma terceira fonte institucional totalmente independente.

---

# 11. E tecnicamente é fácil integrar

A API usa REST/JSON e é oficialmente destinada justamente a evitar scraping automatizado do site. [Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados/?utm_source=chatgpt.com)

Atualmente o cadastro da chave exige autenticação Gov.br, e a chave fica associada ao usuário. Os limites atuais são até 400 consultas/minuto durante o dia e 700/minuto na madrugada, salvo endpoints restritos. [Portal da Transparência](https://portaldatransparencia.gov.br/api-de-dados/cadastrar-email?utm_source=chatgpt.com)

Para 163 escolas isso é mais do que suficiente.

O segredo ficaria apenas no backend:

```
PORTAL_TRANSPARENCIA_API_KEY
```

Nunca no navegador.

### Adaptação

```
portal-transparencia-api.ts
```

e acrescentaríamos:

```
PORTAL_TRANSPARENCIA
```

às fontes.

### Decisão

**IMPLEMENTAR.**

Não como fonte principal, mas como **contraprova federal de repasses/OB**.

É uma integração de baixo risco e alto valor de auditoria.

---

# 12. SIGEF: permanece extremamente importante

A pesquisa sobre as alternativas **não rebaixou o SIGEF**.

Na verdade, encontrei mais sinais de que podemos melhorar nossa automação.

O portal público do FNDE continua oferecendo explicitamente:

- Conta Corrente;
- Liberação de Recursos;
- Movimentação Bancária/Extratos. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/consultas-online?utm_source=chatgpt.com)

E algumas URLs de resultados detalhados são diretamente acessíveis e indexáveis.

Por exemplo, resultados de Liberações apresentam:

```
data
ordem bancária
valor
programa
banco
agência
conta
```

sem depender da interpretação de tela. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/liberacoes/resultado-entidade/ano/2016/programa/Z9/cnpj/04047483000130?utm_source=chatgpt.com)

Isso sugere uma abordagem que vale testar:

```
PDDEInfo
↓
obtemos CNPJ + banco + agência + conta + programa

        ↓

construímos/descobrimos a consulta direta correspondente no SIGEF

        ↓

consultamos o resultado
```

Isso pode diminuir nossa dependência da interface de pesquisa que nos trouxe problemas com CAPTCHA.

**Não estou afirmando ainda que essa rota está resolvida.**

Precisamos provar, em algumas escolas reais, que:

- os parâmetros são estáveis;
- não estamos dependendo de sessão anterior;
- não ocorre CAPTCHA na rota direta;
- a utilização é compatível com o acesso público.

### Decisão

**CONTINUAR INVESTIGANDO.**

O SIGEF continua sendo excelente fonte independente.

---

# 13. SiGPC Acesso Público: útil, mas não é nossa próxima grande automação

O SiGPC Acesso Público não exige cadastro.

O FNDE diz expressamente que permite localizar prestações por:

- tipo;
- exercício;
- programa;
- UF;
- município;

e consultar diretamente a situação das UEx. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-acesso-publico?utm_source=chatgpt.com)

Isso poderia alimentar:

```
Escola
Programa
Exercício
Situação da prestação
Data
Ato/resultado
```

## Problema técnico

Ao acessar diretamente a aplicação durante a pesquisa, encontrei proteção no servidor que rejeitou algumas solicitações automatizadas.

Isso torna um scraper de SiGPC mais frágil do que nosso PDDEInfo.

E agora existe uma segunda questão:

> o PDDEInfo já fornece boa parte da situação de prestação de contas.

Portanto só faz sentido desenvolver SiGPC se descobrirmos **campos adicionais realmente úteis**, como:

- atos;
- resultado detalhado;
- situação da análise;
- processos;
- diligências.

### Decisão

**MAPEAR OS CAMPOS PRIMEIRO. NÃO CONSTRUIR SCRAPER AGORA.**

Para o status simples, PDDEInfo é provavelmente melhor.

---

# 14. SiGPC Contas Online: muito rico, mas não para scraping

Aqui a riqueza é enorme.

O próprio FNDE lista funcionalidades envolvendo:

- transferências;
- contas correntes;
- aplicações;
- fornecedores;
- autorização de despesas;
- documentos de despesas;
- pagamentos;
- extratos;
- restituições;
- saldo reprogramado;
- prestação de contas. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-contas-online?utm_source=chatgpt.com)

E há inclusive curso oficial específico ensinando lançamento de **prestação de contas do PDDE** no SiGPC. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/acoes/educacao-corporativa/formacao-pela-escola/cursos/sigpc-curso?utm_source=chatgpt.com)

Isso seria extremamente valioso.

Só que:

> exige login Gov.br e perfil autorizado da entidade. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-contas-online?utm_source=chatgpt.com)

Então não devemos desenvolver um robô tentando imitar autenticação.

## Melhor estratégia

Se o sistema permitir exportação:

```
usuário autorizado baixa arquivo
↓
envia à nossa plataforma
↓
nosso backend importa
↓
normaliza
↓
analisa
```

Nosso v0.5 já possui exatamente a infraestrutura para isso.

O SiGPC inclusive já possui precedente de integração de sistemas próprios por troca de arquivos para o PNAE, mas não encontrei especificação equivalente publicada para o PDDE. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/acoes/prestacao-de-contas/materiais-de-apoio-sigpc?utm_source=chatgpt.com)

Não devemos extrapolar PNAE para PDDE.

### Decisão

**IMPORTAÇÃO ASSISTIDA SE HOUVER EXPORTAÇÃO ÚTIL.**

Não scraping autenticado.

---

# 15. Power BI do PDDE: não vale construir nosso coletor em cima dele

Os painéis são ricos.

O FNDE afirma que os três conjuntos, PDDE Total, PDDE Básico e Ações Integradas, permitem consultas sobre:

- cadastro;
- atendimento;
- repasses previstos;
- realizados;
- execução;
- prestação de contas;
- filtros por município, rede etc. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/monitore-o-pdde-1?utm_source=chatgpt.com)

Isso parece tentador.

Mas a publicação pública desses painéis é via Power BI.

E raspar internamente um Power BI publicado na web é:

```
possível
```

mas também:

```
frágil
chato
dependente da implementação interna da Microsoft
propenso a quebrar
```

Seria exatamente o tipo de engenharia que nos faz passar 12 horas recuperando uma tabela porque alguém mudou o nome de um visual.

### Melhor uso

Usar os painéis para:

```
comparar resultados
descobrir novas variáveis
validar totais
investigar exceções
```

Se identificarmos o dataset original atrás deles, aí buscamos **o dataset**, não o Power BI.

### Decisão

**NÃO CRIAR SCRAPER DO POWER BI.**

---

# 16. PDDEWeb: pouca vantagem como fonte de extração

O PDDEWeb é fundamental para cadastro/atualização das UEx.

Mas as informações úteis para nosso acompanhamento, como cadastro, dirigente, conta e habilitação, já estão aparecendo em formas públicas melhores no PDDEInfo.

Além disso, o sistema operacional exige login Gov.br. [FNDE](https://www.fnde.gov.br/pdde/brasilcidadao.do?operation=login\&utm_source=chatgpt.com)

Portanto ele serve mais para:

> **corrigir a informação**

do que para:

> **consultar e monitorar a informação em lote.**

### Decisão

**NÃO INTEGRAR AGORA.**

---

# 17. SIMEC / PDDE Interativo

Esses sistemas são mais interessantes para outra pergunta:

> a escola foi selecionada para determinada ação?

> apresentou plano?

> foi indicada?

> qual ação estava planejada antes do repasse?

Isso pode ser útil futuramente para detectar:

```
escola prevista para receber
↓
mas ainda sem repasse
```

Mas não é o que precisamos para:

```
conta
crédito
gasto
saldo
prestação
```

E são ambientes autenticados.

### Decisão

**FUTURO, PARA PLANEJAMENTO/ADESÃO.**

Não para nossa camada financeira principal.

---

# 18. Transferegov

É uma excelente plataforma e está expandindo APIs públicas.

Mas o problema é de escopo.

A maior parte do PDDE escolar não é gerida como uma parceria/convênio comum dentro do Transferegov.

Assim, ter uma API maravilhosa que não contém os 163 repasses que procuramos não nos adianta muito. A humanidade chama isso de solução em busca de um problema.

### Decisão

**NÃO INTEGRAR PARA O PDDE AGORA.**

Pode ser útil se futuramente ampliarmos a plataforma para outras transferências educacionais.

---

# O que essa investigação muda na ferramenta

Hoje parte do modelo ainda está conceitualmente escrita como:

```
PDDEInfo
versus
SIGEF
```

Por exemplo, `Difference` possui campos chamados explicitamente `pddeInfo` e `sigef`. 

Isso foi correto para o projeto inicial.

Agora sabemos que podemos ter:

```
PDDEInfo
PDDEREx
SIGEF
BB Gestão Ágil
Portal Transparência
Dados Abertos FNDE
PAB
SiGPC
```

Portanto, em algum momento próximo, o núcleo deve evoluir de:

```
fonte A versus fonte B
```

para:

```
FATO FINANCEIRO
↓
observado por uma ou mais fontes
```

Por exemplo:

```
REPASSE
R$ 12.345,67

PDDEInfo             ✓
PDDEREx              ✓
SIGEF Liberação      ✓
Portal Transparência ✓
BB Gestão Ágil       ✓
```

Isso é muito mais poderoso.

Mas essa alteração é **moderada**, não uma reconstrução.

---

# Arquitetura que recomendo daqui para frente

```
                    PLATAFORMA PDDE 4ª CRE
                            │
              ┌─────────────┴─────────────┐
              │                           │
        REPASSES/CONTAS            MOVIMENTAÇÕES/USO
              │                           │
    ┌─────────┼──────────┐        ┌───────┼─────────┐
    │         │          │        │       │         │
PDDEInfo   PDDEREx     SIGEF    BB Ágil SIGEF    Extrato
                       Lib.              Mov.     autorizado
    │         │          │        │       │
    └─────────┴────┬─────┘        └───────┴────┐
                   │                            │
            Portal Transparência               │
                   │                            │
                   └────────────┬───────────────┘
                                │
                           CONCILIAÇÃO
                                │
                         DIVERGÊNCIAS
```

E paralelamente:

```
PRESTAÇÃO / REGULARIDADE
        │
PDDEInfo Relatórios
SiGPC Público
Dados Abertos FNDE
```

---

# O que eu faria de verdade, na ordem

A pesquisa já permite sair da teoria. Minha sequência técnica recomendada é:

1. **Adicionar coleta dos relatórios em lote do PDDEInfo**, porque é o ganho mais fácil e imediato: saldo, suspensão, atendimento, PC, cadastro e contas.
2. **Criar adaptador do PDDEREx** e comparar seus dados com nosso snapshot atual das 163 UEs.
3. **Auditar a distribuição bancária das 163 escolas** para sabermos qual porcentagem está realmente coberta pelo Banco do Brasil.
4. **Investigar formalmente o acesso à API do BB Gestão Ágil**, porque ela pode se tornar a principal fonte de Movimentações/Utilização.
5. **Mapear os 19 produtos PDDE da Plataforma Antonieta de Barros**, incluindo os artefatos de download e qualquer produto derivado de BB Ágil.
6. **Criar adaptador da API do Portal da Transparência**, principalmente para confirmação externa das OBs/repasses.
7. **Ativar a integração de Dados Abertos FNDE**, que o nosso modelo já prevê, com controle rigoroso do período de cobertura.
8. **Testar rotas diretas do SIGEF** usando os dados bancários/CNPJ que já conhecemos, para verificar se conseguimos reduzir a dependência da navegação e do CAPTCHA.
9. Somente depois avaliar se SiGPC Público contém informação exclusiva suficiente para justificar um coletor próprio.

---

# Minha avaliação mais importante

Depois desta investigação, eu **não investiria agora energia em tentar “vencer o SIGEF” a qualquer custo**.

Há uma possibilidade concreta de chegarmos a uma solução melhor:

### Para repasses e contas

**PDDEInfo + relatórios PDDEInfo + PDDEREx + Portal da Transparência + SIGEF Liberações**

### Para utilização dos recursos

**BB Gestão Ágil + SIGEF Movimentações + extratos autorizados**

### Para prestação de contas

**PDDEInfo + SiGPC**

### Para datasets em lote

**Plataforma Antonieta de Barros + Dados Abertos FNDE**

Isso transforma nosso projeto de um scraper de dois sistemas em algo muito mais interessante:

> **uma camada de inteligência sobre as fontes oficiais do PDDE.**

E, o mais importante, sem jogar fora o que fizemos. O backend v0.5 já possui quase toda a infraestrutura transversal necessária. A próxima evolução é principalmente **adicionar conectores de fontes**, não voltar à prancheta.

A primeira implementação que faz sentido é uma v0.6 focada em **Fontes Oficiais**, começando pelos relatórios públicos do próprio PDDEInfo e pelo PDDEREx, enquanto em paralelo investigamos o acesso institucional ao BB Gestão Ágil e os 19 produtos PDDE da Plataforma Antonieta.

Fontes

ok, agora precisamos sair da teoria e você precisa investigar e analisar profundamente e individualmente o que precisa ser feito para obter os resultados e integrações e coletas de dados que você indica na resposta. A pesquisa não pode ser mais apenas teórica, mas sim uma análise profunda nas possibilidades de conexão e extração de dados

Pensou por 26m 10s

Agora conseguimos sair da fase de “essas fontes parecem interessantes”. Fiz a investigação pensando **como um desenvolvedor que precisa realmente conectar o sistema**, tentando chegar a rota, parâmetros, formato, autenticação e teste necessário.

A conclusão principal é bastante melhor do que a anterior:

> **Há duas novas aquisições que já têm base técnica suficiente para começarmos a programar agora: os relatórios públicos do PDDEInfo e, principalmente, a consulta direta ao extrato público do SIGEF.**

E a investigação do SIGEF trouxe uma descoberta particularmente importante: **conseguimos chegar diretamente à página de resultado do extrato bancário sem passar pela tela de pesquisa com CAPTCHA**, desde que já tenhamos banco, agência, conta, CNPJ e código do programa. Esses são justamente dados que nosso PDDEInfo já consegue obter.

Isso pode resolver boa parte do problema que estávamos tratando como “automação difícil do SIGEF”.

## Situação técnica real após a investigação

| FonteConexão comprovada?Pode entrar agora?Bloqueio real |                                  |                     |                                                                 |
| ------------------------------------------------------- | -------------------------------- | ------------------- | --------------------------------------------------------------- |
| Relatórios PDDEInfo                                     | **Sim**                          | **Sim**             | Capturar/parsing dos resultados                                 |
| SIGEF Extrato direto                                    | **Sim**                          | **Sim**             | Mapear todos os códigos de programas e provar nas UEs da 4ª CRE |
| SIGEF Liberações                                        | **Sim**                          | **Sim**             | Mesma validação nas UEs reais                                   |
| Webservice oficial SIGEF                                | **Existe e está ativo**          | Ainda não           | Credenciais + documentação                                      |
| BB Gestão Ágil API                                      | **Integração/API comprovada**    | Ainda não           | Habilitação institucional                                       |
| Portal Transparência/CGU                                | **API completamente disponível** | Quase               | Chave gratuita + teste de utilidade para UEx                    |
| Antonieta de Barros                                     | Produtos/arquivos comprovados    | Parcialmente        | Descobrir endpoints XHR dinâmicos                               |
| PDDEREx                                                 | Interface pública comprovada     | Depois de piloto    | Confirmar saída detalhada atual 2026                            |
| Dados Abertos FNDE                                      | Catálogo comprovado              | Histórico           | Endpoints/frescor atuais duvidosos                              |
| SiGPC Público                                           | Público para humanos             | Não automaticamente | Proteção contra cliente automatizado                            |
| SiGPC Contas Online                                     | Muito rico                       | Só assistido        | Gov.br/perfil autorizado                                        |
| Power BI PDDE                                           | Dados ricos                      | Não como coletor    | Camada Microsoft inadequada para integração pública             |

Agora, individualmente.

---

# 1. PDDEInfo: há vários coletores novos praticamente prontos para nascer

Nosso coletor atual trabalha fundamentalmente com **Consulta por Escola**. Mas o mesmo PDDEInfo possui uma área pública de relatórios que oferece informações diferentes e, em vários casos, já permite consulta por INEP ou CNPJ.

Confirmei hoje as interfaces atuais de 2026.

### Situação de Atendimento

A página recebe:

```
ano
programa
destinação
CNPJ
INEP
rede
UF
município
pagos / não pagos
tipo de relatório
```

e possui inclusive geração de Excel. [Fundeb](https://webservice.fnde.gov.br/pddeinfo/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade?utm_source=chatgpt.com)

Mais importante: encontrei uma consulta real codificada diretamente pela URL, demonstrando que os parâmetros podem viajar em GET, por exemplo:

```
?ano=2021
&cnpj=...
&co_escola=...
&co_esfera_adm[]=2
&co_municipio_fnde=...
&destinacao=...
&programa=...
&siglaUf[]=...
&tpRelatorio=1
```

A resposta foi processada normalmente pelo servidor, naquele exemplo retornando “Nenhum registro encontrado”. Isso prova que **não precisamos necessariamente automatizar cliques para consultar o relatório**. [FNDE](https://www.fnde.gov.br/pddeinfo/index.php/situacaoatendimentoentidade/situacaoatendimentoentidade/situacaoatendimentoentidade?ano=2021\&cnpj=01.969.775%2F0001-32\&co_escola=21021287\&co_esfera_adm%5B%5D=2\&co_municipio_fnde=211130\&consultar=Consultar\&destinacao=13\&programa=0B\&sg_uf=MA\&siglaUf%5B%5D=MA\&tpRelatorio=1\&utm_source=chatgpt.com)

### Prestação de contas

Também é pública e aceita ano, programa, CNPJ, INEP, rede, situação e município. [FNDE](https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta?utm_source=chatgpt.com)

### Situação cadastral

Tem INEP/CNPJ e ainda acrescenta:

- cadastro atualizado/desatualizado;
- mandato do dirigente vigente, próximo do vencimento ou vencido;
- localização;
- rede. [FNDE](https://www.fnde.gov.br/pddeinfo/situacaocadastroentidade/situacaocadastroentidade/situacaocadastroentidade?utm_source=chatgpt.com)

### Suspensão

Este é provavelmente o acréscimo mais útil para a rotina da CRE.

O relatório distingue explicitamente situações como **inadimplência por prestação de contas, omissão de PC, UEx sem dirigente ativo, entidade não habilitada, UEx sem conta ativa, escola sem UEx, CNPJ irregular, regularização fora do prazo e bloqueio solicitado**. [FNDE](https://www.fnde.gov.br/pddeinfo/index.php/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao?utm_source=chatgpt.com)

Inclusive uma consulta parametrizada retornou a explicação operacional da causa “UEx sem dirigente ativo”. [FNDE](https://www.fnde.gov.br/pddeinfo/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao?ano=2025\&cnpj=\&co_escola=\&co_esfera_adm%5B%5D=2\&co_municipio_fnde=354330\&consultar=Consultar\&programa=02\&siglaUf%5B%5D=SP\&tp_suspensao%5B%5D=0\&utm_source=chatgpt.com)

Portanto nosso sistema pode evoluir de:

> “Escola X não recebeu.”

para:

> **“Escola X não recebeu. O PDDEInfo aponta suspensão por mandato do dirigente vencido.”**

Isso é muito mais útil.

### Saldo

Existe também consulta pública por mês, CNPJ, programa, UF, rede e município, com geração de Excel. [Fundeb](https://webservice.fnde.gov.br/pddeinfo/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade?utm_source=chatgpt.com)

### Abertura de conta

Existe consulta específica por ano, CNPJ, INEP e categoria PDDE, incluindo PDDE, Estrutura, Qualidade e Educação Especial. A página inclusive informa pendências de conta/agência. [FNDE](https://www.fnde.gov.br/pddeinfo/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade?utm_source=chatgpt.com)

## Como integrar

Não precisamos mexer no coletor atual que já foi validado nas 163 escolas.

Eu criaria uma família paralela:

```
backend/adapters/pddeinfo-reports-http.ts
backend/adapters/pddeinfo-reports-html.ts
```

e registros normalizados conceitualmente assim:

```
PddeServiceStatus
PddeAccountStatus
PddeRegistrationStatus
PddeSuspension
PddeAccountBalance
PddeAccountOpeningStatus
```

Cada consulta preservaria:

```
URL + parâmetros
HTML original
data/hora da consulta
resultado normalizado
INEP/CNPJ consultado
ano
programa
```

### Regra importante

“Não encontrado” só poderá ser gravado como ausência quando a página:

1. responder corretamente;
2. devolver os mesmos filtros que enviamos;
3. não apresentar erro de formulário;
4. declarar efetivamente ausência.

Isso é necessário porque já encontrei um exemplo em que parâmetros inválidos fizeram o PDDEInfo responder “formulário incompleto ou inválido”. [FNDE](https://www.fnde.gov.br/pddeinfo/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao/ano/2025/programa/02/co_esfera_adm/2/siglaUf/SP/co_municipio_fnde/354330/cnpj//co_escola//tp_suspensao/0/consultar/Consultar/page/4?utm_source=chatgpt.com)

Sem essa proteção, um parâmetro errado poderia magicamente transformar 163 escolas em “sem pendências”. Governos adorariam esse recurso, auditores um pouco menos.

### Situação

**PRONTO PARA PROVA DE CONCEITO NO NOSSO CÓDIGO.**

---

# 2. SIGEF: a descoberta mais importante desta pesquisa

Aqui houve avanço concreto.

A tela geral de Liberações continua exigindo CAPTCHA. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/liberacoes?utm_source=chatgpt.com)

Mas a **página de resultado do extrato não exige essa tela quando já conhecemos os identificadores bancários**.

A estrutura real da URL é:

```
https://www.fnde.gov.br/sigefweb/index.php/
conta-corrente/extrato-conta-corrente-detalhamento/
banco/{BANCO}/
agencia/{AGENCIA}/
contacorrente/{CONTA}/
cnpj/{CNPJ}/
programa/{PROGRAMA}/
data/{MMYYYY}
```

E isso não é uma dedução de documentação. **Existem páginas reais funcionando hoje nesse formato.**

Por exemplo, uma consulta pública do programa `02` retorna:

```
Programa:
02 - PROGRAMA DINHEIRO DIRETO NA ESCOLA

Data
Crédito
Débito
Documento
Histórico
CNPJ Beneficiário
Razão Social
Banco Beneficiário
Agência Beneficiário
Conta Beneficiário
```

e contém em maio de 2026 um crédito de **R$ 2.340,00 por ORDEM BANCÁRIA do FNDE**, seguido da aplicação automática. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0112/contacorrente/0000543462/cnpj/04217786000154/programa/02/data/052014?utm_source=chatgpt.com)

Outra conta mostra em 2026 crédito de **R$ 24.720,00 por OB**, além dos créditos de 2025. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/3563/contacorrente/0000077860/cnpj/04312419000130/programa/02/data/092018?utm_source=chatgpt.com)

E encontrei páginas de UEx/associações escolares com **débitos efetivamente realizados**, inclusive transferências para beneficiários, CNPJ do recebedor, banco, agência e conta. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Isso muda bastante o problema.

---

# 3. Por que isso combina tão bem com o que já construímos

Nosso esquema atual de movimentação já tem:

```
schoolCnpj
programCode
operation = credit | debit
amountCents
movementDate
account
document
history
```

A página pública do SIGEF fornece **todos esses campos**.

Na verdade, ela fornece **mais**:

```
CNPJ do beneficiário
Razão social
Banco do beneficiário
Agência do beneficiário
Conta do beneficiário
```

Portanto o novo extrator não exige redesenhar a conciliação.

Precisamos apenas enriquecer a visão de Movimentações.

---

# 4. O fluxo automatizado pode ficar muito mais simples

Hoje nosso PDDEInfo já nos dá, para os programas disponíveis:

```
INEP
↓
UEx
↓
CNPJ
↓
Banco
↓
Agência
↓
Conta
```

A partir daí:

```
PDDEInfo
   │
   ├── CNPJ
   ├── Banco
   ├── Agência
   └── Conta
         │
         ▼
monta URL pública SIGEF
         │
         ▼
GET direto
         │
         ▼
HTML do extrato
         │
         ▼
parser
         │
         ▼
movimentações
```

Não existe CAPTCHA nesse fluxo porque **não estamos resolvendo nem contornando o CAPTCHA**.

Estamos consultando uma página pública de resultado diretamente com os identificadores necessários.

Isso é conceitualmente semelhante a abrir um link já conhecido em vez de preencher o formulário que gera esse link.

---

# 5. O que ainda precisa ser provado no SIGEF antes de escalar para 163

Aqui não vou cometer o pecado de transformar “funcionou em páginas reais” em “problema definitivamente resolvido”.

As rotas estão comprovadas em produção, inclusive para PDDE e para UEx escolares. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Mas ainda precisamos fazer o teste **com nossas escolas da 4ª CRE**.

A próxima prova concreta deve ser:

```
3 escolas reais da nossa lista
↓
PDDEInfo atual
↓
capturar CNPJ + conta(s)
↓
gerar URLs SIGEF
↓
consultar
↓
comparar
```

Escolheria casos diferentes:

```
uma escola com PDDE Básico pago
uma com várias Ações Integradas
uma com movimentação/conta problemática
```

Nosso catálogo oficial já contém exatamente as 163 escolas e impede uma lista diferente de ser usada como universo oficial. 

---

# 6. O outro problema no SIGEF são os códigos dos programas

Já está comprovado que:

```
02 = PROGRAMA DINHEIRO DIRETO NA ESCOLA
```

nas páginas atuais. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0112/contacorrente/0000543462/cnpj/04217786000154/programa/02/data/052014?utm_source=chatgpt.com)

Mas não podemos supor que:

```
PDDE Qualidade
PDDE Equidade
Educação Conectada
SRM
etc.
```

usem códigos óbvios.

Temos que montar a tabela com dados reais.

O procedimento correto será:

```
Programa PDDEInfo
→ conta
→ SIGEF conhecido
→ código retornado pelo SIGEF
→ associação comprovada
```

Nada de:

> “Acho que Qualidade deve ser QL.”

Foi assim que a civilização inventou os bancos de dados que ninguém ousa atualizar.

---

# 7. O parser do extrato pode reaproveitar quase tudo que já temos

Eu criaria:

```
backend/adapters/sigef-public-extract-url.ts
backend/adapters/sigef-extract-html.ts
```

A segunda camada normalizada teria algo como:

```
{
  schoolCnpj,
  programCode,
  operation,
  amountCents,
  movementDate,
  account,
  document,
  history,

  beneficiaryCnpj,
  beneficiaryName,
  beneficiaryBank,
  beneficiaryAgency,
  beneficiaryAccount
}
```

Os cinco últimos campos podem pertencer a uma visão enriquecida sem alterar imediatamente o núcleo da conciliação.

Isso é importante porque nosso `SigefMovement` atual já funciona e não merece ser desmontado apenas porque descobrimos informação adicional. 

---

# 8. E o SIGEF possui outra rota oficial ainda melhor: Webservice

Descobri também uma infraestrutura distinta do `sigefweb`.

O próprio Portal de Sistemas do FNDE lista atualmente **“NOVO WEBSERVICE DO SIGEF”** como sistema oficial. [FNDE](https://www.fnde.gov.br/portal-sistemas/?utm_source=chatgpt.com)

E o serviço está atualmente em produção.

Existe uma operação chamada:

> **Consultar Extrato**

e a própria tela de teste pede:

````
Usuário
Senha
Número do Processo
Ano de Exercício
``` citeturn345846search0


Portanto:

> **existe uma interface institucional para consultar extratos do SIGEF sem scraping.**

Isso é uma descoberta muito importante.

## Por que ainda não posso implementá-la

Não encontrei publicamente:

```text
WSDL/OpenAPI completo
método de autenticação
procedimento de cadastro
escopo das credenciais
rate limit
ambiente de homologação
relação entre processo e UEx
````

Então não vou fingir que “a API está pronta”.

Ela existe, mas estamos na situação:

```
API comprovada
+
credencial/documentação ausentes
```

### O que precisamos solicitar ao FNDE

A solicitação técnica precisa mencionar explicitamente:

> **NOVO WEBSERVICE DO SIGEF, operação Consultar Extrato, integração somente leitura para acompanhamento do PDDE.**

E pedir documentação técnica, mecanismo de autenticação, homologação, escopo, paginação e definição do `Número do Processo`.

Se o FNDE conceder acesso, **esse webservice provavelmente deve substituir a consulta HTML para os dados que oferecer**.

Até lá, a rota pública direta já nos permite avançar.

---

# 9. BB Gestão Ágil: agora sabemos exatamente qual é o bloqueio

A existência de integração não é mais hipótese.

O FNDE afirma que a integração do BB Gestão Ágil já avançou para o **PDDE** e que permite monitorar em tempo real tanto repasses quanto gastos registrados. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/transparencia-e-prestacao-de-contas/relatorio-de-gestao-1/relatorio-de-gestao-2024/desempenho-da-gestao/areas-de-suporte/tecnologia-da-informacao?utm_source=chatgpt.com)

Em 2026 o próprio FNDE continua tratando o BB Gestão Ágil como ferramenta do PDDE. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/transparencia-e-prestacao-de-contas/relatorio-de-gestao-1/relatorio-de-gestao-2026/programas-educacionais/pdde?utm_source=chatgpt.com)

Ele centraliza receitas, gastos e documentos de despesas. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/assuntos/noticias/fnde-e-centro-colaborador-sudeste-promovem-webinar-sobre-o-bb-gestao-agil/?utm_source=chatgpt.com)

E há categorização específica das despesas do PDDE e suas Ações Integradas no sistema. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/portarias/2024?utm_source=chatgpt.com)

Isso significa que ele pode dar uma informação que o SIGEF sozinho não necessariamente dará:

```
Débito de R$ 2.300
        +
fornecedor
        +
classificação da despesa
        +
documento fiscal
        +
vínculo com prestação de contas
```

---

# 10. A API do BB Gestão Ágil também é real

Uma fonte oficial federal descreve expressamente que o BB Gestão Ágil permite integração ao sistema próprio do município e que os dados podem ser consumidos pelos intervenientes **por API**. [Serviços e Informações do Brasil](https://www.gov.br/sri/pt-br/backup-secretaria-de-governo/portalfederativo/agenda-do-prefeito-brasil/guiainicio/prefeito/recursos-e-oportunidades/banco-do-brasil?utm_source=chatgpt.com)

Temos ainda prova de integração funcionando em produção em outro órgão federal.

A ANCINE informa que seu sistema se conecta ao BB Gestão Ágil para **buscar automaticamente as movimentações financeiras** e produzir o extrato e a relação de pagamentos. [Serviços e Informações do Brasil](https://www.gov.br/ancine/pt-br/acesso-a-informacao/perguntas-frequentes1/superintendencia-de-prestacao-de-contas-spr/18-3-como-funciona-a-integracao-entre-o-bb-gestao-agil-e-o-str?utm_source=chatgpt.com)

Essa integração é atualizada diariamente. [Serviços e Informações do Brasil](https://www.gov.br/ancine/pt-br/acesso-a-informacao/perguntas-frequentes1/superintendencia-de-prestacao-de-contas-spr/18-4-o-demonstrativo-de-extrato-que-extrai-veio-incompleto-o-que-devo-fazer?utm_source=chatgpt.com)

Portanto não há mais razão para cogitar scraping da interface do Banco do Brasil.

**O caminho certo é API.**

---

# 11. Mas não encontrei uma API pública de autoatendimento

Esta é a diferença crucial.

Não encontrei publicamente algo como:

```
developers.bb.com.br
→ clique
→ gere sua chave BB Gestão Ágil
→ GET /movements
```

O modelo encontrado é institucional.

A própria documentação sobre outras implantações aponta para acordo/integração entre órgão e Banco do Brasil, não um token anônimo disponível para qualquer usuário. [Serviços e Informações do Brasil](https://www.gov.br/ancine/pt-br/assuntos/atribuicoes-ancine/fomento/prestacao-de-contas/manuais?utm_source=chatgpt.com)

Portanto o bloqueio do BB é **administrativo/institucional**, e não de programação.

## O que precisamos obter

A pergunta ao Banco do Brasil/FNDE precisa ser específica:

> “A SME-Rio, como órgão responsável pelo acompanhamento do PDDE das UEx da rede, pode obter acesso somente leitura à API do BB Gestão Ágil/API Accountability das contas vinculadas ao PDDE?”

Precisamos receber:

```
base URL
documentação
autenticação
credencial de homologação
escopo das contas
campos de transação
campos de categoria/subcategoria
documentos fiscais
paginação
limites
frequência de atualização
```

Só depois disso escrever `bb-gestao-agil-client.ts`.

---

# 12. Antes disso, temos uma análise que podemos fazer sozinhos

Precisamos saber **quantas das contas atuais das 163 UEs são Banco do Brasil**.

Se ocorrer:

```
BB: 158
Caixa: 5
```

a API do BB Gestão Ágil praticamente resolve nossa segunda camada.

Se ocorrer:

```
BB: 85
Caixa: 78
```

ela continua muito útil, mas não pode ser nossa única fonte.

Essa contagem deve ser feita diretamente sobre nosso snapshot atual do PDDEInfo, não por inferência normativa.

---

# 13. Plataforma Antonieta de Barros: potencial altíssimo, conexão ainda não certificada

A plataforma já disponibiliza produtos como arquivos estruturados.

Por exemplo, o produto **Extrato de Transações ETI** publica um ZIP derivado da **Transparência Pública BB Ágil** contendo créditos e gastos. [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/8?utm_source=chatgpt.com)

Outro produto atualmente publicado, SIOPE, expõe artefato `.txt.gz`, mostrando que o padrão de distribuição de arquivos estruturados está ativo. [FNDE](https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/20?utm_source=chatgpt.com)

Portanto a cadeia:

```
produto de dados
→ artefato
→ download estruturado
```

é real.

O problema é outro.

As relações dinâmicas da plataforma não aparecem integralmente no HTML estático, e eu ainda não consegui identificar com segurança o endpoint interno que retorna:

```
produtos relacionados ao PDDE
resultado da tabela de repasses
URL efetiva do download
```

### Isso não é uma dúvida conceitual. É um experimento técnico preciso.

Precisamos capturar as requisições `Fetch/XHR` que o navegador faz ao:

```
abrir a página do PDDE
abrir a tabela de repasses
clicar em Exportar artefato
```

e registrar:

```
método HTTP
URL
query/body
headers necessários
cookie ou não
JSON retornado
URL de download
```

Se a chamada funcionar em cliente HTTP limpo, sem login, temos o nosso conector.

Nesse caso o código será bem simples:

```
pab-catalog-client.ts
pab-repasses-client.ts
pab-artifact-client.ts
```

### Situação

**Potencial muito alto, mas endpoint dinâmico ainda não certificado.**

É uma das poucas áreas em que uma inspeção de rede do navegador realmente é necessária.

---

# 14. PDDEREx: não vou mais tratá-lo como prioridade automática

Confirmei que o PDDEREx continua ativo e se apresenta explicitamente como consulta de UEx atendidas pelo PDDE, contendo **valor transferido/previsto, custeio, capital e dados bancários**. [FNDE](https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_1_pc?utm_source=chatgpt.com)

Isso é promissor.

Mas ainda não consegui provar uma consulta **detalhada atual de 2026 de uma UEx nossa** produzindo esses campos em formato que valha um novo coletor.

Portanto o status correto é:

> **fonte interessante, mas ainda não aprovada para desenvolvimento.**

O teste é barato:

```
uma UEx conhecida
+ exercício 2026
+ CNPJ
↓
consulta real PDDEREx
```

Se devolver dados adicionais aos do PDDEInfo, integramos.

Se apenas redirecionar ou reproduzir o mesmo dado, não vamos criar outro parser só porque existe outra página com logotipo do FNDE.

---

# 15. Portal da Transparência: integração técnica está quase resolvida

A CGU oferece API REST oficial justamente para consumo automatizado, em vez de scraping. Ela inclui consultas de recursos recebidos e documentos de despesas. [Portal da Transparência](https://api.portaldatransparencia.gov.br/)

A autenticação usa uma chave enviada em cabeçalho:

````
chave-api-dados: SUA_CHAVE
``` citeturn746169search5


E os limites são muito maiores do que precisamos para 163 escolas. citeturn746169search4

### O que falta?

Só uma coisa antes de desenvolver:

> provar que as transferências PDDE para UEx aparecem com granularidade útil para nós.

O teste deve usar três CNPJs cujos pagamentos e OB já conhecemos.

Se obtivermos:

```text
CNPJ
documento
OB
data
valor
ação/programa
````

e isso casar com SIGEF, ótimo.

Nesse caso a implementação é trivial:

```
portal-transparencia-client.ts
```

com segredo somente no servidor.

Se a API mostrar apenas agregados sem utilidade para UEx, descartamos.

### Situação

**API tecnicamente pronta, utilidade PDDE ainda precisa de piloto.**

---

# 16. Dados Abertos FNDE: não é a fonte atual que eu esperava

O catálogo de Dados Abertos realmente contém recursos de PDDE, inclusive execução financeira até escola, prestação de contas e saldos. Alguns são classificados como API. Mas os metadados encontrados apresentam várias atualizações antigas ou indisponíveis por timeout. [Dados Abertos](https://dados.gov.br/dados/conjuntos-dados/programa-dinheiro-direto-na-escola-pdde?utm_source=chatgpt.com)

Isso significa:

> usar essa base para 2019, 2020, 2021 etc. pode ser excelente.

Mas:

> usar como resposta para “o que aconteceu hoje em 2026?” seria perigoso.

Além disso, ainda não consegui localizar nesta investigação um endpoint Olinda atual que responda de forma comprovada para o conjunto que queremos.

### Portanto

Nosso código já prevê `DADOS_ABERTOS_FNDE` como origem válida. 

Mas ele continuará reservado para:

```
histórico
backfill
auditoria
comparação
```

até que exista prova de endpoint e atualização atuais.

---

# 17. SiGPC Público: informação útil, automação ruim

O Acesso Público não exige cadastro e permite consultar situação de prestação de contas.

Porém, ao tentar acessar diretamente o sistema com cliente automatizado, a aplicação rejeitou a solicitação.

Isso significa que há proteção de acesso que torna um scraper mais frágil.

Como o PDDEInfo já possui seu próprio relatório público de prestação de contas em 2026, [FNDE](https://www.fnde.gov.br/pddeinfo/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta?utm_source=chatgpt.com) eu só investiria no SiGPC público se ele nos entregar algo **exclusivo**.

Por exemplo:

```
resultado da análise
diligência
ato
processo
data da decisão
```

Se for apenas:

> “Adimplente / Inadimplente”

já temos solução melhor.

### Situação

**Não desenvolver coletor ainda.**

---

# 18. SiGPC Contas Online: riqueza enorme, mas integração assistida

O sistema autenticado contém uma quantidade enorme de informações de prestação de contas.

Mas exige Gov.br e perfil autorizado.

Portanto nossa ferramenta não deve guardar senha, reproduzir login ou tentar automatizar sessão autenticada sem uma integração oficial.

O caminho adequado é:

```
usuário autorizado
↓
exporta arquivo/documento
↓
envia para nossa plataforma
↓
nosso backend valida
↓
normaliza
↓
analisa
```

E a infraestrutura que acabamos de consolidar já foi construída exatamente para ingestão segura de artefatos.

Não precisamos inventar outra camada.

---

# 19. Power BI: confirmado como ferramenta de conferência, não de aquisição

Os painéis oficiais continuam extremamente úteis para descobrir campos e confrontar resultados.

Mas não quero construir o sistema dependendo das chamadas internas de um Power BI público.

A interface mudaria e quebraria nossa integração por razões completamente alheias ao PDDE.

Portanto:

```
Power BI = QA / comparação / descoberta
```

não:

```
Power BI = fonte de produção
```

Se encontrarmos o **dataset que alimenta o Power BI**, integramos o dataset.

---

# 20. O código atual está preparado, mas há uma pequena evolução conceitual futura

Hoje nosso núcleo ainda pensa em:

```
PDDEInfo
versus
SIGEF
```

Por exemplo, `sourceSnapshotSchema` aceita explicitamente apenas PDDEInfo, SIGEF Liberações e SIGEF Movimentações. 

E o tipo `Difference` ainda guarda campos denominados `pddeInfo` e `sigef`. 

Isso não precisa ser alterado para começarmos os novos coletores.

Mas quando tivermos três ou quatro fontes reais, fará sentido evoluir gradualmente para:

```
FATO FINANCEIRO
      │
      ├── observado no PDDEInfo
      ├── observado no SIGEF
      ├── observado no BB Gestão Ágil
      └── observado na CGU
```

em vez de:

```
PDDEInfo vs SIGEF
```

Isso é uma evolução moderada de domínio, não outra reconstrução de backend.

---

# Plano de execução que agora considero tecnicamente fundamentado

A pesquisa permite estabelecer uma sequência concreta:

| FaseTrabalhoGate para considerar concluído |                                |                                                                                  |
| ------------------------------------------ | ------------------------------ | -------------------------------------------------------------------------------- |
| **A1**                                     | Coletor de relatórios PDDEInfo | 3 UEs reais → depois 163; atendimento, suspensão, PC, saldo e conta coerentes    |
| **A2**                                     | Extrato SIGEF por URL direta   | PDDEInfo → conta → URL SIGEF → movimentos reais em 3 UEs da 4ª CRE               |
| **A3**                                     | Expandir SIGEF para 163        | códigos de programas comprovados + cobertura medida + zero falso “sem movimento” |
| **A4**                                     | Visão Movimentações/Utilização | créditos/débitos/beneficiário/documento disponíveis por escola                   |
| **B1**                                     | Webservice SIGEF institucional | documentação + credencial + 1 consulta equivalente à rota pública                |
| **B2**                                     | BB Gestão Ágil                 | acesso/API + 1 conta PDDE → transações/documentos → comparação SIGEF             |
| **B3**                                     | Portal CGU                     | chave + 3 CNPJs → verificar se OB/repasses PDDE aparecem                         |
| **C1**                                     | Antonieta                      | capturar XHR real + download automatizado de 1 produto                           |
| **C2**                                     | PDDEREx                        | consulta 2026 real de 1 UEx demonstrando dado complementar                       |
| **C3**                                     | Dados Abertos                  | endpoint atual + metadata de atualização + 1 registro conhecido                  |
| **D**                                      | SiGPC/Power BI                 | somente se demonstrarem informação exclusiva que justifique integração           |

## A mudança mais importante de toda esta investigação

Antes estávamos diante de:

> **“Como automatizar o SIGEF apesar do CAPTCHA?”**

Agora temos uma hipótese muito mais concreta:

> **“O PDDEInfo já nos entrega os identificadores bancários necessários para consultar diretamente o extrato público do SIGEF.”**

E a URL direta não entrega apenas confirmação de crédito. Ela entrega **débitos, documentos, histórico e dados do beneficiário**. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Isso significa que pode existir um caminho real para:

```
Usuário abre Escola X

RECURSOS
PDDE Básico
Conta 123...
Recebido R$ ...

MOVIMENTAÇÕES
10/05  + R$ 15.000  FNDE / Ordem bancária
21/05  - R$ 2.300   Fornecedor A
28/05  - R$ 1.450   Fornecedor B
...

Saldo / movimentação
Prestação
Pendências
```

usando **fontes públicas oficiais e consultas determinísticas**, sem precisar que alguém navegue manualmente pelo SIGEF a cada escola.

Essa agora é a frente que eu considero mais importante para prova prática: **PDDEInfo → conta real de uma das 163 UEs → URL direta do SIGEF → extrato e movimentos reais da mesma escola**. Se esse ciclo fechar em algumas escolas da 4ª CRE, deixamos definitivamente a fase de pesquisa e passamos a ter a aquisição multifuente funcionando de verdade.

Fontes

antes de continuar vamos analisar o repositório do Manus e verificar se a evoluçãoe  achados de lá podem nos ajudar em algo. Pode ser especialmente relevante os documentos abaixo, mas analise os códigos fonte também:

[https://github.com/WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS](https://github.com/WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS)

As análises de viabilidade, testes práticos e decisões técnicas foram registradas no repositório, principalmente em INVESTIGACAO\_PRATICA\_FONTES\_PDDE\_2026\_08\_14.md, PROPOSTA\_INTEGRACOES\_FONTES\_OFICIAIS\_PDDE\_2026\_08\_14.md, CONTRATO\_AUTONOMIA\_FONTES.md, GUIA\_CONTINUIDADE\_PROJETO.md e no novo CONFRONTO\_RELATORIO\_TECNICO\_ADICIONAL\_2026\_08\_14.md. Este último documenta inclusive o piloto de três UEx no extrato SIGEF, os resultados, limites e critérios para o adaptador do programa 02.

Pensou por 6m 1s

Sim. **O repositório do Manus nos ajuda bastante e muda algumas prioridades da próxima etapa.** O mais importante é que ele não ficou apenas na pesquisa teórica. Há testes práticos que nós ainda não tínhamos reproduzido no repositório canônico e, em um caso, há código de aquisição já funcional que podemos adaptar.

Também encontrei uma coisa importante para não fazermos besteira: **não devemos simplesmente fundir os dois projetos nem copiar a arquitetura do Manus**. O nosso `pdde-repasse-conciliador` está mais sólido no núcleo financeiro, nos valores em centavos, na conciliação e na infraestrutura que acabamos de simplificar. O Manus, por outro lado, avançou mais em **descoberta experimental de novas fontes e alguns fluxos de interface/auditoria**.

Ou seja, os dois trabalhos ficaram surpreendentemente complementares. Milagre estatístico depois de tantas horas de código.

# O que o Manus efetivamente provou

## 1. Extrato público do SIGEF: esta é a descoberta mais valiosa

O documento mais recente, `CONFRONTO_RELATORIO_TECNICO_ADICIONAL_2026_08_14.md`, registra um **piloto real em três UEx da própria 4ª CRE**.

Não são exemplos aleatórios encontrados na internet.

Foram utilizadas contas de **PDDE Básico explicitamente informadas pelo PDDEInfo**, e então consultado o detalhamento público do SIGEF.

Os três resultados foram:

| INEPConta PDDEPDDEInfoExtrato SIGEF |                          |             |                 |
| ----------------------------------- | ------------------------ | ----------- | --------------- |
| 33068747                            | ag. 0249 / cc 0000549665 | R$ 5.305,00 | **R$ 5.305,00** |
| 33068755                            | ag. 1254 / cc 0000044563 | R$ 9.905,00 | **R$ 9.905,00** |
| 33068763                            | ag. 0249 / cc 000054969X | R$ 4.295,00 | **R$ 4.295,00** |

Nos três casos o SIGEF devolveu:

- mesmo CNPJ;
- mesma conta;
- mesmo programa `02`;
- crédito por ordem bancária do FNDE;
- mesmo valor do pagamento informado no PDDEInfo.

Isso é **muito mais forte** do que a hipótese que estávamos investigando.

### E houve uma descoberta financeira importantíssima

O PDDEInfo informava:

**data da ordem: 30/04/2026**

O extrato SIGEF mostrava:

**data do crédito: 03/05/2026**

Portanto está empiricamente comprovado que:

> **data da ordem ≠ necessariamente data em que o dinheiro aparece como crédito na movimentação.**

Isso precisa entrar no nosso modelo explicitamente.

Não podemos tratar:

```
Data Ordem PDDEInfo
```

como se fosse:

```
Data Crédito SIGEF
```

O Manus acertou muito nesse ponto. 

---

# 2. O extrato SIGEF retorna muito mais que o crédito

O piloto confirma que a página de detalhamento contém:

- crédito;
- débito;
- documento;
- histórico;
- identificação do beneficiário;
- banco/agência/conta;
- identidade da conta consultada.

Isso é exatamente aquilo que queremos para a segunda grande visão do produto:

## **Movimentações e Utilização**

E há uma coincidência arquitetural excelente.

Nosso repositório canônico **já possui** o tipo `SigefMovement` com:

- CNPJ;
- programa;
- crédito/débito;
- valor em centavos;
- data da movimentação;
- conta;
- documento;
- histórico.

Portanto não precisamos inventar uma nova arquitetura financeira para aproveitar essa descoberta.

Precisamos essencialmente construir:

```
SIGEF HTML público
        ↓
novo adaptador
        ↓
SigefMovement[]
        ↓
motor que já possuímos
```

Esse encaixe é excepcionalmente bom.

---

# 3. Mas o piloto revelou duas limitações que precisamos respeitar

## Apenas o programa 02 está comprovado

O Manus conseguiu demonstrar:

> **PDDE Básico → programa SIGEF** **`02`**

Não demonstrou ainda equivalência segura para:

- PDDE Qualidade;
- Educação Conectada;
- Escola e Comunidade;
- Escola das Adolescências;
- Cantinho da Leitura;
- PDDE Equidade;
- SRM;
- demais ações.

O documento determina corretamente que nenhum código adicional deve ser inferido. 

Isso é ainda mais importante porque nosso parser canônico de **Liberações** já conhece vários códigos, como `02`, `0B`, `0A` e `Z9`, mas isso não significa automaticamente que a página de extratos se comporte da mesma forma para todas essas ações. 

Vamos provar uma ação de cada vez.

---

## O parâmetro de mês não funciona como imaginávamos

Esta é outra descoberta ótima.

Mesmo consultando algo como:

```
data/042026
```

a resposta trouxe:

- crédito de maio de 2026;
- lançamentos de 2025;
- entre 101 e 201 registros em alguns casos.

Ou seja:

> **não podemos assumir que** **`data/MMYYYY`** **significa “retorne somente este mês”.**

O Manus recomenda corretamente preservar:

- parâmetro usado;
- total de registros;
- paginação;
- janela efetivamente retornada.

E só depois descobrir a semântica real. 

Isso precisa ser investigado **antes de disparar 163 consultas**.

---

# 4. Uma distinção importante: o Manus ainda NÃO implementou esse novo extrator

Aqui precisamos ser rigorosos.

O teste das três UEx está documentado e o commit mais recente registra essa prova. Mas o código atual do Manus ainda **não possui um adaptador para** **`extrato-conta-corrente-detalhamento`**.

A busca no código não encontrou essa rota. 

Portanto:

### Manus já nos deu

**protocolo + evidência + três casos reais + regras de segurança**

### Ainda precisamos construir

**cliente HTTP + parser + testes + integração com nosso** **`SigefMovement`**

Isso é perfeitamente aceitável. Na verdade é melhor descobrir isso antes de copiar algum arquivo imaginando que o serviço já estava pronto.

---

# 5. SIGEF Liberações: aqui o Manus realmente tem código funcional novo

Esta é outra contribuição concreta.

O Manus descobriu e implementou uma **rota pública legada de Liberações**, diferente da interface moderna protegida por CAPTCHA.

Endpoint utilizado:

```
https://www.fnde.gov.br/pls/simad/internet_fnde.liberacoes_result_pc
```

Parâmetros usados:

```
p_ano
p_programa=02
p_uf=RJ
p_municipio=330455
p_tp_entidade
p_cgc=<CNPJ>
```

O código está implementado em `server/pdde/sigefLiberation.ts`. 

Ele faz:

- requisição HTTP;
- timeout de 25 segundos;
- resposta Latin-1;
- detecção explícita de CAPTCHA;
- duas tentativas;
- hash SHA-256;
- parsing de:
  - data;
  - OB;
  - valor;
  - programa;
  - banco;
  - agência;
  - conta.

E existem testes automatizados verificando:

- construção da URL;
- preservação dos zeros de conta/agência;
- conciliação da OB;
- divergência de valor;
- duplicidade conflitante;
- interrupção caso apareça CAPTCHA.

---

# 6. E essa rota não foi testada só uma vez

O Manus fez um piloto de até **cinco UEx**.

O fluxo preserva:

- HTML;
- JSON;
- hash;
- OB;
- banco;
- agência;
- conta;
- observações de evidência.

E deliberadamente **não modifica a conta original do PDDEInfo**. 

Há também testes específicos mostrando que uma divergência permanece divergência e que os artefatos são preservados. 

### Isso podemos aproveitar quase imediatamente.

Mas não copiar o arquivo literalmente.

Nosso canônico já possui um parser de Liberações mais rigoroso, que:

- trabalha em **centavos inteiros**;
- usa `BigInt` na conversão;
- valida cabeçalhos;
- valida CNPJ;
- valida datas;
- já reconhece diversas ações;
- produz diretamente `SigefRelease`.

O Manus usa `number` decimal simples para moeda nesse adaptador.

Portanto:

> **vamos portar a descoberta da rota, os parâmetros HTTP, os controles de CAPTCHA/timeout e o protocolo do piloto.**

Não vamos substituir nosso parser financeiro pelo dele.

Essa é uma diferença importante.

---

# 7. Relatórios em lote do PDDEInfo: o Manus já fez os testes que iríamos fazer

Aqui economizamos bastante trabalho experimental.

## Atendimento

Consulta municipal 2026:

**1.682 registros**

Exportação oficial:

**1.718.207 bytes**

Depois de filtrar pela nossa lista:

> **163/163 escolas encontradas**, em 169 linhas.

Os campos incluem:

- CNPJ executora;
- INEP;
- programa;
- destinação;
- custeio;
- capital;
- total;
- data da ordem.

---

## Prestação de Contas

Consulta municipal:

**9.555 registros**

Exportação:

**7.033.308 bytes**

Filtro 4ª CRE:

> **163/163 escolas**, em 311 registros.

Além dos identificadores, aparecem:

- situação da prestação;
- suspensão de EEx;
- suspensão de UEx;
- CNPJ da executora;
- valor previsto.

Isso é muito relevante para a rotina da CRE.

---

## Suspensão

Consulta municipal:

**41 registros**

13 INEPs distintos.

Nenhum dos 163 da nossa lista apareceu naquele recorte testado.

E o Manus tomou a decisão correta:

> isso **não significa “163 escolas adimplentes”**.

Significa apenas:

> “nenhuma das nossas 163 apareceu nesse resultado com esses filtros”.

Essa diferença epistemológica parece banal até alguém montar um dashboard que declara 163 escolas regulares por causa de um filtro quebrado. 

---

# 8. Consulta de Saldo: esta informação é ainda mais útil do que eu imaginava

O teste coletivo de junho de 2026 retornou:

**4.573 registros**

Exportação oficial:

**3.135.371 bytes**

Com:

- CNPJ;
- razão social;
- banco;
- agência;
- conta;
- mês/ano;
- componentes do saldo;
- programa.

Ela não contém INEP.

Mas nós já temos a relação:

```
INEP
↓
UEx
↓
CNPJ
```

pelo PDDEInfo.

Então podemos fazer junção estrita:

```
CNPJ UEx confirmado
        +
CNPJ no relatório de saldo
```

Nunca por nome.

### E há uma regra importante

Esse saldo é:

> **saldo mensal declarado pela fonte**

Não:

> saldo bancário em tempo real.

E não:

> comprovação do crédito de uma parcela.

Isso deve aparecer exatamente assim na interface.

---

# 9. Plataforma Antonieta de Barros: o Manus resolveu uma dúvida nossa

Na nossa investigação anterior eu ainda estava considerando capturar as chamadas XHR do site para descobrir o catálogo.

**Não é necessário.**

O Manus já identificou a API pública da própria plataforma:

```
/products/data-products
```

Ela respondeu sem autenticação e retornou os **19 produtos relacionados ao PDDE**. 

Além disso, foi comprovado o padrão:

```
GET /products/data-products/{id}
```

para metadados e:

```
GET /products/data-products/{id}/artifact
```

para o artefato. 

Isso muda PAB de:

**“investigar como extrair”**

para:

**“implementar um cliente simples da API pública”.**

---

# 10. Produto PAB 66: temos uma segunda base real das 163 escolas

Produto:

**Execução Financeira PDDE Básico Público**

Artefato:

- gzip de aproximadamente **9,35 MB**;
- **338.709 registros**.

Campos:

- exercício;
- UF;
- município;
- INEP;
- escola;
- alunos;
- esfera;
- CNPJ/nome UEx;
- programa;
- destinação;
- custeio pago;
- capital pago;
- total pago.

E novamente:

> **163/163 escolas da nossa lista apareceram.**

Foram **354 linhas** relativas às nossas escolas:

- 116 de 1ª parcela;
- 116 de 2ª parcela;
- 122 de Primeira Infância.

### Limitação

A versão testada é de **2025**.

Portanto ela é excelente como:

- histórico;
- conferência;
- baseline;
- comparação anual.

Mas não como fonte corrente de 2026.

---

# 11. Produto PAB 70: uma descoberta muito interessante sobre contas

Produto:

**Saldos das Contas das UEx Públicas**

Artefato:

- gzip \~**10,43 MB**;
- **260.926 registros**.

Nas nossas escolas:

> **163/163 INEPs presentes**

em:

> **326 linhas**

E todas essas 326 linhas possuíam:

```
Banco = 001
```

ou seja:

**Banco do Brasil**. 

Isso é um excelente indício para a relevância futura do BB Gestão Ágil.

Mas atenção:

> é evidência de **2025**, não da distribuição bancária atual de 2026.

Portanto não podemos concluir:

> “as 163 UEs hoje estão no Banco do Brasil”.

Precisamos medir isso usando o PDDEInfo atual.

---

# 12. Produto PAB 59: menos útil do que o nome sugere

O produto é chamado algo como Consulta de Prestação de Contas do PDDE.

Mas o arquivo testado continha principalmente:

- INEP;
- CNPJ UEx;
- CNPJ EEx;
- esfera;
- atualização.

E **não apresentou, no cabeçalho analisado, situação de prestação, repasse, conta ou saldo**. 

Então ele pode ser útil para:

```
INEP ↔ CNPJ UEx ↔ CNPJ EEx
```

mas não devemos colocá-lo como nossa fonte de situação da prestação.

O relatório do próprio PDDEInfo é muito mais útil para isso.

---

# 13. O histórico gigante da PAB deve ser evitado no fluxo normal

O Manus tentou também um produto histórico geral.

A transferência passou dos **31 MB** antes de atingir timeout, e o gzip indicava algo próximo de:

**2,45 GB descompactados.**

Conclusão correta:

> **não baixar isso a cada atualização.**

Se algum dia precisarmos de backfill histórico, fazemos streaming específico.

Não colocamos 2,45 GB numa atualização das 163 escolas só porque alguém publicou um botão “Download”. 

---

# 14. BB Gestão Ágil: o Manus confirma nossa conclusão, mas não encontrou atalho mágico

Ele também comprovou documentalmente a existência da API e da modalidade `API Accountability`.

Mas:

- não encontrou token público;
- não encontrou autoatendimento;
- não encontrou documentação que conceda acesso à SME-Rio;
- não encontrou produto PDDE público equivalente no catálogo pesquisado.

Portanto:

> **API real, integração institucional pendente.**

Não há código a portar nesse ponto.

E concordo completamente com a decisão:

**não criar scraper do BB Gestão Ágil.** 

---

# 15. PDDEREx perdeu prioridade

O Manus testou concretamente.

A rota pública funciona e os parâmetros foram identificados, mas:

- Rio/2026 → `DADOS INEXISTENTES`;
- Rio/2025 → `DADOS INEXISTENTES`;
- uma consulta antiga indexada de outro município funcionou;
- o detalhe testado retornou 404.

Portanto não vale gastar tempo agora construindo um adaptador.

Status correto:

> **monitorar / piloto futuro por CNPJ.**

---

# 16. Portal da Transparência também pode esperar

O Manus confirmou a API e o token obrigatório.

Mas ainda não provou que a granularidade seja suficiente para responder:

```
UEx X
OB Y
PDDE Básico
R$ Z
```

Portanto continua sendo uma excelente contraprova potencial, mas não nossa próxima tarefa. 

---

# O que NÃO devemos importar do Manus

Esta parte é tão importante quanto descobrir o que devemos aproveitar.

## 1. Não importar o backend inteiro

O Manus usa outra arquitetura:

- Express;
- tRPC;
- Drizzle;
- MySQL;
- armazenamento próprio;
- muitas estruturas de histórico;
- execução em memória + persistência;
- grande quantidade de eventos por campo.

O `package.json` sozinho traz uma floresta considerável de dependências. 

Nós acabamos de gastar horas justamente **simplificando a arquitetura canônica**.

Não vamos reintroduzir complexidade lateral porque outro projeto possui uma implementação interessante.

---

# 17. Não substituir nosso motor de conciliação

O motor do Manus é elegante, mas simples:

```
estorno
→ divergência
→ extrato BB
→ crédito SIGEF
→ OB SIGEF
→ PDDEInfo
```

O nosso motor canônico é mais rigoroso.

Ele trabalha com:

- CNPJ;
- exercício;
- programa;
- ação;
- parcela;
- valor;
- conta;
- OB;
- movimentação;
- documento;
- estornos;
- cobertura temporal.

Portanto:

> **Manus fornece novas evidências. Nosso motor continua decidindo como reconciliá-las.**

Esse é o arranjo correto.

---

# 18. Não importar os tipos monetários do Manus

Há um detalhe técnico que demonstra por que copiar código cegamente seria ruim.

No Manus:

```
amount: number
```

e a conversão monetária resulta em decimal JavaScript. 

No canônico, os valores financeiros são convertidos rigorosamente em **centavos inteiros**, inclusive protegendo contra estouro de precisão. 

Nosso modelo é melhor para dinheiro.

Fica.

---

# 19. Não portar automaticamente o piloto SIGEF em todas as atualizações

No Manus, depois da coleta PDDEInfo, o fluxo chama automaticamente o piloto SIGEF para algumas escolas. 

Eu **não faria isso igual no canônico**.

Por quê?

Porque queremos:

> atualizar as 163 escolas

sem transformar cada atualização numa peregrinação por todas as fontes federais conhecidas pela espécie humana.

Melhor:

```
Atualizar PDDEInfo
```

e:

```
Atualizar Movimentações
```

serem operações relacionadas, mas controláveis.

Ou permitir uma atualização geral explicitamente solicitada.

Isso mantém o produto previsível.

---

# 20. Há ideias de interface do Manus que valem reaproveitar

Aqui também encontrei material bom.

## Tela Home

Ela já trabalha com conceitos interessantes:

- 163 escolas;
- andamento;
- última execução;
- recuperação de resultado aprovado;
- status das fontes;
- download do Excel;
- eventos resumidos.

Isso combina bem com nossa futura Home.

---

## Dossiê da escola

A tela de auditoria consegue abrir uma unidade e mostrar:

- valores;
- fonte;
- data da consulta;
- estado da evidência;
- trecho original;
- HTML bruto;
- JSON normalizado;
- hash.

Isso é excelente como **camada secundária**.

O usuário normal vê:

> R$ 9.905,00 recebido

e, se quiser conferir:

> Ver evidência

Então chega ao detalhe técnico.

Isso é muito melhor do que colocar hashes e seletores DOM na cara de todo mundo e chamar aquilo de experiência de usuário.

---

# 21. Auditoria por campo: ideia boa, mas em dose humana

O documento `AUDITORIA_POR_CAMPO.md` traz um princípio muito bom:

> todo valor financeiro deve poder responder de onde veio, quando foi consultado, como foi interpretado e qual o nível de confirmação. 

Eu manteria esse princípio.

Mas não adotaria integralmente a proposta de transformar a interface numa:

> “Central de Execuções + Matriz de Confiabilidade + Comparador Histórico + Fila de Exceções + Cadeia de Eventos”.

Isso poderia novamente colocar a engenharia na frente do produto.

A versão canônica deveria oferecer isso principalmente **sob demanda**.

---

# Há também documentos do Manus que ficaram desatualizados

Isso é importante.

`CONTRATO_AUTONOMIA_FONTES.md`, `GUIA_CONTINUIDADE_PROJETO.md` e `sources.ts` ainda dizem que o **SIGEF Extrato** está pendente ou sujeito ao fluxo com CAPTCHA.   

Mas o documento mais recente, `CONFRONTO...`, posteriormente comprovou o detalhamento público em **3/3 UEx**. 

Portanto a hierarquia correta dentro do próprio Manus é:

**piloto mais recente > documentos anteriores.**

Não devemos copiar o catálogo `sources.ts` tal como está.

---

# O que eu importaria para o projeto canônico

Minha classificação final ficou esta:

| Achado ManusLevar para canônico?Como |                            |                                                     |
| ------------------------------------ | -------------------------- | --------------------------------------------------- |
| Extrato SIGEF direto 3/3             | **SIM, prioridade máxima** | Novo adaptador nosso                                |
| Rota legada SIGEF Liberações         | **SIM**                    | Portar aquisição HTTP, manter parser/motor canônico |
| Relatórios PDDEInfo em lote          | **SIM**                    | Novo coletor municipal                              |
| Atendimento 163/163                  | **SIM**                    | Fonte atual complementar                            |
| Prestação de Contas 163/163          | **SIM**                    | Nova visão operacional                              |
| Suspensão                            | **SIM**                    | Exceções                                            |
| Saldo mensal                         | **SIM**                    | Nova informação, com semântica mensal               |
| PAB API pública                      | **SIM**                    | Cliente novo                                        |
| PAB produto 66                       | **SIM**                    | Histórico de execução                               |
| PAB produto 70                       | **SIM**                    | Histórico de contas/saldos                          |
| PAB produto 59                       | Talvez                     | Só vínculo cadastral                                |
| PAB histórico 2,45 GB                | **NÃO no fluxo normal**    | Backfill eventual                                   |
| BB Gestão Ágil API                   | Futuro                     | Solicitação institucional                           |
| PDDEREx                              | Não agora                  | Monitorar                                           |
| Portal Transparência                 | Depois                     | Piloto com token                                    |
| SiGPC scraping                       | Não agora                  | Só dado exclusivo/importação                        |
| Arquitetura MySQL/tRPC/Drizzle Manus | **NÃO**                    | Manter canônico                                     |
| Motor de conciliação Manus           | **NÃO**                    | Manter nosso motor                                  |
| Tipos monetários Manus               | **NÃO**                    | Manter centavos                                     |
| Auditoria por campo                  | **PARCIAL**                | Evidência acessível sob demanda                     |
| Home/Audit visual                    | **SIM como referência**    | Adaptar UX                                          |

---

# Nova ordem de execução

Depois dessa análise, eu mudaria a sequência que estávamos montando.

## **Fase 1: SIGEF Extrato público**

Agora é a prioridade número 1 porque **já existe prova com três UEx da própria 4ª CRE**.

Implementar no canônico:

```
sigef-public-extract-url.ts
sigef-extract-html.ts
```

Fluxo:

```
PDDEInfo
↓
conta explicitamente PDDE
↓
CNPJ + banco + agência + conta
↓
programa SIGEF 02
↓
extrato público
↓
créditos e débitos
↓
SigefMovement
```

Primeiro repetir as três UEx do Manus.

Depois **mais três diferentes**.

Só depois medir cobertura.

---

# Fase 2: provar paginação e período

Antes de escalar:

- quantas páginas existem;
- como mudar página;
- qual é o total declarado;
- o que `data/MMYYYY` realmente significa;
- até que data a consulta está atualizada;
- se todos os lançamentos retornam documento;
- como aparecem estornos;
- como aparecem aplicações automáticas.

Isso evita a pior espécie de erro: sistema funcionando perfeitamente e trazendo apenas a primeira página.

---

# Fase 3: Relatórios PDDEInfo em lote

Em paralelo, implementar:

### Atendimento

```
163/163 já provados
```

### Prestação de contas

```
163/163 já provados
```

### Suspensão

```
fonte de exceções
```

### Saldo

```
CNPJ + conta + mês + programa
```

Isso adiciona bastante valor imediatamente sem nova credencial.

---

# Fase 4: SIGEF Liberações por HTTP

Aqui aproveitamos a descoberta do Manus:

```
internet_fnde.liberacoes_result_pc
```

Mas convertemos a resposta diretamente para os tipos canônicos e continuamos usando nosso `SigefRelease` e nossa conciliação.

Não criamos um segundo motor paralelo.

---

# Fase 5: Plataforma Antonieta

Implementar cliente enxuto:

```
PAB catálogo
↓
produto permitido
↓
artefato
↓
hash
↓
gzip
↓
stream/CSV
↓
filtrar 163 INEPs
```

Inicialmente:

- produto **66**;
- produto **70**.

Como histórico/controle, não como fonte atual de 2026.

---

# Consequência para nosso projeto

Antes da análise do Manus, nosso próximo passo era basicamente:

> descobrir se aquelas possibilidades que encontramos na pesquisa realmente funcionavam.

Depois dessa revisão, boa parte dessa pergunta já está respondida.

Agora temos:

### **Comprovado em dados reais da 4ª CRE**

- PDDEInfo individual: **163/163**;
- PDDEInfo Atendimento em lote: **163/163**;
- PDDEInfo Prestação de Contas: **163/163**;
- PDDEInfo Saldo: exportação real;
- PAB produto 66: **163/163**;
- PAB produto 70: **163/163**;
- SIGEF Liberações legado: piloto real;
- SIGEF Extrato: **3/3 UEx reais com crédito correspondente**.

Isso é um salto substancial.

## Minha conclusão

**O trabalho do Manus é muito útil e deve ser incorporado seletivamente ao projeto canônico.**

Não através de merge entre repositórios.

A estratégia correta é:

> **trazer as descobertas comprovadas e os algoritmos úteis para dentro da arquitetura canônica que acabamos de estabilizar.**

O repositório Manus passa a funcionar muito bem como uma espécie de **laboratório experimental somente leitura**.

O `pdde-repasse-conciliador` continua sendo o produto.

E, depois desta análise, eu considero que a próxima implementação mais importante já não é uma pesquisa genérica de fontes. É **construir no canônico o adaptador do extrato SIGEF público para programa 02, reproduzir os três casos comprovados pelo Manus e avançar a partir deles**, em paralelo ao coletor dos relatórios em lote do PDDEInfo.

olha essa descoberta: outra ferramenta conseguiu detalhes da movimentação das verbas deste ano!! exatamente como eu precisava:

Created test-2026-sigef-sync.mjs
Ran command: `node "C:\Users\Wilson\.gemini\antigravity-ide\brain\a98ea4b9-dbb9-4118-af65-bb9c8ade762f\scratch\test-2026-sigef-sync.mjs"`
Used tool: manage\_task
Viewed task-283.log:1-200
Viewed task-283.log:201-311
Created test-batch-2026.mjs
Ran command: `node "C:\Users\Wilson\.gemini\antigravity-ide\brain\a98ea4b9-dbb9-4118-af65-bb9c8ade762f\scratch\test-batch-2026.mjs"`
Used tool: manage\_task
Used tool: manage\_task
Viewed task-293.log:1-3
Used tool: manage\_task
Viewed task-293.log:1-3
Used tool: manage\_task
Viewed task-293.log:1-3
Used tool: manage\_task
Viewed task-293.log:1-3
Used tool: manage\_task
Used tool: manage\_task

**Sim, é perfeitamente possível acessar os dados de 2026.**

A constatação de que a maioria dos lançamentos exibidos na amostragem inicial pertencia a 2025 decorre de **duas razões técnicas e contábeis concretas**, comprovadas nos testes que acabamos de executar em campo:

---

### 1. Descoberta Técnica: O Dígito Verificador (`X`) do Banco do Brasil

No Banco do Brasil, diversas contas de Conselhos Escolares possuem o dígito verificador `X` (por exemplo, a conta da *E.M. João Barbalho*, `000056267X`).

- **O que ocorreu:** Quando limpamos a conta deixando apenas dígitos numéricos (`0000056267`), o SIGEF não encontrou a conta de 2026 e retornou tabela vazia.
- **O ajuste:** Ao mantermos o caractere `X` na URL (`contacorrente/000056267X`), o SIGEF retornou **imediatamente o extrato de 2026** com todas as movimentações.

---

### 2. A Dinâmica Financeira Real do Exercício de 2026

Os repasses da 1ª Parcela de 2026 do PDDE foram creditados pelo FNDE entre **maio e agosto de 2026**.

Pela legislação federal (Lei nº 11.947/2009 e Resoluções do FNDE), **100% dos recursos do PDDE creditados na conta corrente são transferidos automaticamente no mesmo dia para um fundo de investimento de curto prazo (****`BB-APLIC C.PRZ-APL.AUT`** **/ BB FIX)** para render juros e proteger o dinheiro público da desvalorização inflacionária.

As escolas recebem a verba em maio/agosto e passam os meses seguintes realizando assembleias com o Conselho Escola-Comunidade (CEC), elaborando o plano de aplicação e coletando cotações de preços de fornecedores. Os gastos (débitos) concentram-se no **segundo semestre** (a partir de agosto/setembro/outubro).

---

### 3. Movimentações Reais de 2026 Extraídas nos Testes

Ao ajustar o coletor para capturar as contas ativas de 2026, extraímos as seguintes transações deste exercício:

| Unidade EscolarPrograma / ContaData em 2026Valor (R$)Operação / DocumentoHistórico BancárioDiagnóstico para a 4ª CRE |                                          |                |                 |                                      |                          |                                                           |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------- | --------------- | ------------------------------------ | ------------------------ | --------------------------------------------------------- |
| **E.M. Pedro Lessa**                                                                                                 | PDDE Básico (`02`)<br>`0000549819`       | **03/05/2026** | **R$ 8.895,00** | Crédito<br>OB `00000001974995000867` | `ORDEM BANCARIA` (FNDE)  | Repasse da 1ª Parcela de 2026 confirmado.                 |
| **E.M. Pedro Lessa**                                                                                                 | PDDE Básico (`02`)<br>`0000549819`       | **03/05/2026** | **R$ 8.895,00** | Débito<br>Doc `00000000000000001972` | `BB-APLIC C.PRZ-APL.AUT` | Aplicação automática imediata para render juros.          |
| **E.M. João Barbalho**                                                                                               | PDDE Básico (`02`)<br>`000056267X`       | **03/05/2026** | **R$ 8.575,00** | Crédito<br>OB `00000001974995000787` | `ORDEM BANCARIA` (FNDE)  | Repasse da 1ª Parcela de 2026 confirmado.                 |
| **E.M. João Barbalho**                                                                                               | PDDE Básico (`02`)<br>`000056267X`       | **03/05/2026** | **R$ 8.575,00** | Débito<br>Doc `00000000000000001972` | `BB-APLIC C.PRZ-APL.AUT` | Recursos aplicados aguardando execução pelo Conselho.     |
| **E.M. Professor Josué de Castro**                                                                                   | Educação Integral (`0B`)<br>`0000540323` | **26/03/2026** | **R$ 13,44**    | Crédito<br>PIX recebido              | `PIX RECEBIDO`           | Ressarcimento/ajuste via PIX em conta escolar.            |
| **E.M. Ruy Barbosa**                                                                                                 | Educação Integral (`0B`)<br>`0000540331` | **06/01/2026** | **R$ 4,20**     | Débito<br>Doc `00000840071100041143` | `TARIFA DE EXTRATO` (BB) | **Tarifa indevida cobrada pelo Banco do Brasil em 2026.** |

---

### 4. O que isso muda na Prática da Fiscalização da 4ª CRE

1. **Os dados de 2026 estão acessíveis em tempo real:** Não há defasagem impeditiva no SIGEF Extrato.
2. **Monitoramento do Ciclo Completo de 2026:**
   - **Fase Atual (Maio a Agosto/2026):** O extrator comprova a entrada dos repasses e o valor total aplicado em fundo de investimento (`BB-APLIC C.PRZ-APL.AUT`).
   - **Fase de Execução (Segundo Semestre de 2026):** Assim que as diretorias resgatarem os recursos da aplicação para emitir pagamentos a fornecedores (boletos, PIX e cheques), o extrator capturará o débito, a nota de empenho/documento e o CNPJ do fornecedor contratado em cada escola.

Mostrar mais

Avaliou a descoberta

Essa descoberta é **muito maior do que apenas “achamos dados de 2026”**: ela praticamente fecha a lacuna entre **repasse informado**, **crédito efetivo** e **movimentação posterior da conta**. Mas há dois pontos no texto da outra ferramenta que eu quero separar antes de incorporarmos qualquer coisa: a regra da aplicação automática foi afirmada de forma forte demais, e o rótulo **“Educação Integral (****`0B`****)" entra em conflito com o mapeamento que já temos no código canônico**. Vou conferir essas duas coisas para não transformar uma descoberta excelente em uma regra errada.

import { readFile } from 'node\:fs/promises';

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      signal: controller.signal
    });
    const bytes = await res.arrayBuffer();
    const buf = Buffer.from(bytes);
    const latin1 = buf.toString('latin1');
    const utf8 = buf.toString('utf-8');
    const text = latin1.includes('Ã') ? utf8 : latin1;
    return { status: res.status, text };
  } catch (err) {
    return { error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseHtmlTable(html) {
  const tables = [];
  const tableRegex = /\<table\b[^>]*>([\s\S]*?)\</table>/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(html)) !== null) {
    const tContent = tMatch[1];
    const rows = [];
    const trRegex = /\<tr\b[^>]*>([\s\S]*?)\</tr>/gi;
    let rMatch;
    while ((rMatch = trRegex.exec(tContent)) !== null) {
      const cells = Array.from(rMatch[1].matchAll(/\<t[dh]\b[^>]*>([\s\S]*?)\</t[dh]>/gi))
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

async function testSchool2026(inep, name) {
  console.log(`\n================================================================================`);
  console.log(`Testando Escola: ${name} (${inep})`);
  const pddeUrl = `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=${inep}&consultar=Consultar`;
  const pddeRes = await fetchText(pddeUrl);
  if (!pddeRes.text) return;

  const cnpjMatch = pddeRes.text.match(/CNPJ:\s\*\</t[dh]>\s\*\<t[dh][^>]*>\s*([0-9./-]+)/i) ||
                    pddeRes.text.match(/([0-9]{2}.[0-9]{3}.[0-9]{3}/[0-9]{4}-[0-9]{2})/);
  const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, '') : '';
  console.log(`CNPJ: ${cnpj}`);

  const tables = parseHtmlTable(pddeRes.text);
  const accounts = [];
  const payments2026 = [];

  for (const t of tables) {
    for (const row of t) {
      if (row\.length >= 5 && /^\d{3}$/.test(row[1]) && /^\d+/.test(row[2])) {
        accounts.push({
          program: row[0],
          bank: row[1],
          agency: row[2],
          account: row[3],
          cleanAccount: row[3].replace(/\D/g, ''),
          balance: row[4]
        });
      }
      if (row\.length >= 10 && row[11] && row[11].includes('/2026')) {
        payments2026.push({
          dest: row[0],
          due: row[3],
          paid: row[10],
          date: row[11]
        });
      }
    }
  }

  console.log(`Contas no PDDEInfo:`, accounts);
  console.log(`Pagamentos registrados em 2026 no PDDEInfo:`, payments2026);

  // For each account, test different account number formats (with X, without X, padded) and program codes
  for (const acc of accounts) {
    const bankP = acc.bank.padStart(3, '0');
    const agencyP = acc.agency.padStart(4, '0');

```
// Test variations of account number
const accountVariations = [
  acc.cleanAccount.padStart(10, '0'),
  acc.cleanAccount,
  acc.account.replace(/[^0-9X]/gi, '').padStart(10, '0')
];
const uniqueAccs = [...new Set(accountVariations)];

const progCodes = ['02', '0A', '0B', 'Z9'];

for (const accStr of uniqueAccs) {
  for (const pCode of progCodes) {
    // Query month 08/2026, 05/2026, 01/2026, 12/2025
    for (const m of ['082026', '052026', '042026']) {
      const sigefUrl = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/${bankP}/agencia/${agencyP}/contacorrente/${accStr}/cnpj/${cnpj}/programa/${pCode}/data/${m}`;
      const sigefRes = await fetchText(sigefUrl);
      
      if (sigefRes.text && !sigefRes.text.includes('Nenhum registro encontrado')) {
        const sigefTables = parseHtmlTable(sigefRes.text);
        console.log(`\n  [MATCH] SIGEF URL: ${sigefUrl}`);
        console.log(`  Conta: ${accStr} | Prog: ${pCode} | Mês: ${m}`);
        
        // Look for transactions in 2026
        let count2026 = 0;
        let count2025 = 0;
        let countTotal = 0;
        const sample2026 = [];

        for (const st of sigefTables) {
          for (const r of st) {
            if (r.length >= 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(r[0])) {
              countTotal++;
              if (r[0].endsWith('/2026')) {
                count2026++;
                sample2026.push(r);
              } else if (r[0].endsWith('/2025')) {
                count2025++;
              }
            }
          }
        }

        console.log(`  Estatísticas do Extrato: Total=${countTotal} | Em 2026=${count2026} | Em 2025=${count2025}`);
        if (sample2026.length > 0) {
          console.log(`  >>> TRANSAÇÕES DE 2026 ENCONTRADAS:`);
          sample2026.forEach(tr => console.log(`      `, JSON.stringify(tr)));
        } else {
          console.log(`  (Nenhuma linha de 2026 retornada nesta consulta específica)`);
        }
        break;
      }
    }
  }
}
```

  }
}

async function run() {
  const rawSchools = await readFile('C:/Users/Wilson/.gemini/antigravity-ide/scratch/pdde-repasse-conciliador/backend/schools4cre.json', 'utf8');
  const allSchools = JSON.parse(rawSchools).schools;

  // Let's test 10 schools across the 4th CRE
  const sample = [
    allSchools[0],  // EM EMA NEGRAO DE LIMA
    allSchools[1],  // EM ALBINO SOUZA CRUZ
    allSchools[2],  // EM RUY BARBOSA
    allSchools[3],  // EM PEDRO LESSA
    allSchools[4],  // EM JOAO BARBALHO
    allSchools[10], // EM CARLOS CHAGAS
    allSchools[20], // CIEP MAESTRO VILLA-LOBOS
    allSchools[30], // EM GUATEMALA
    allSchools[50], // EM DEBRET
    allSchools[80]  // EM BOLIVIA
  ];

  for (const s of sample) {
    await testSchool2026(s.inep, s.nome);
  }
}

run().catch(console.error);

import { readFile } from 'node\:fs/promises';

async function fetchText(url) {

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      signal: controller.signal
    });
    const bytes = await res.arrayBuffer();
    const buf = Buffer.from(bytes);
    const latin1 = buf.toString('latin1');
    const utf8 = buf.toString('utf-8');
    const text = latin1.includes('Ã') ? utf8 : latin1;
    return { status: res.status, text };
  } catch (err) {
    return { error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseHtmlTable(html) {
  const tables = [];
  const tableRegex = /\<table\b[^>]*>([\s\S]*?)\</table>/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(html)) !== null) {
    const tContent = tMatch[1];
    const rows = [];
    const trRegex = /\<tr\b[^>]*>([\s\S]*?)\</tr>/gi;
    let rMatch;
    while ((rMatch = trRegex.exec(tContent)) !== null) {
      const cells = Array.from(rMatch[1].matchAll(/\<t[dh]\b[^>]*>([\s\S]*?)\</t[dh]>/gi))
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

async function main() {
  const rawSchools = await readFile('C:/Users/Wilson/.gemini/antigravity-ide/scratch/pdde-repasse-conciliador/backend/schools4cre.json', 'utf8');
  const allSchools = JSON.parse(rawSchools).schools;

  console.log(`=== AUDITORIA DE TRANSAÇÕES DE 2026 EM 25 ESCOLAS DA 4ª CRE ===\n`);

  const results2026 = [];

  for (let i = 0; i < 25; i++) {
    const s = allSchools[i];
    const pddeUrl = `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=${s.inep}&consultar=Consultar`;
    const pddeRes = await fetchText(pddeUrl);
    if (!pddeRes.text) continue;

```
const cnpjMatch = pddeRes.text.match(/CNPJ:\s*<\/t[dh]>\s*<t[dh][^>]*>\s*([0-9.\/-]+)/i) || 
                  pddeRes.text.match(/([0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2})/);
const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, '') : '';
if (!cnpj) continue;

const tables = parseHtmlTable(pddeRes.text);
const accounts = [];
for (const t of tables) {
  for (const row of t) {
    if (row.length >= 5 && /^\d{3}$/.test(row[1]) && /^\d+/.test(row[2])) {
      accounts.push({
        program: row[0],
        bank: row[1],
        agency: row[2],
        account: row[3],
        balance: row[4]
      });
    }
  }
}

for (const acc of accounts) {
  const bankP = acc.bank.padStart(3, '0');
  const agencyP = acc.agency.padStart(4, '0');
  const accClean = acc.account.replace(/[^0-9X]/gi, '').padStart(10, '0');

  for (const pCode of ['02', '0A', '0B', 'Z9']) {
    const sigefUrl = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/${bankP}/agencia/${agencyP}/contacorrente/${accClean}/cnpj/${cnpj}/programa/${pCode}/data/082026`;
    const sigefRes = await fetchText(sigefUrl);
    if (sigefRes.text && !sigefRes.text.includes('Nenhum registro encontrado')) {
      const sigefTables = parseHtmlTable(sigefRes.text);
      for (const st of sigefTables) {
        for (const r of st) {
          if (r.length >= 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(r[0]) && r[0].endsWith('/2026')) {
            results2026.push({
              inep: s.inep,
              school: s.nome,
              account: acc.account,
              programCode: pCode,
              date: r[0],
              credit: r[1],
              debit: r[2],
              doc: r[3],
              history: r[4],
              beneficiaryDoc: r[5],
              beneficiaryName: r[6]
            });
          }
        }
      }
    }
  }
}
```

  }

  console.log(`TOTAL DE TRANSAÇÕES DE 2026 ENCONTRADAS: ${results2026.length}\n`);
  console.log(JSON.stringify(results2026, null, 2));
}

main().catch(console.error);

import { readFile } from 'node\:fs/promises';

async function fetchText(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9'
      },
      signal: controller.signal
    });
    const bytes = await res.arrayBuffer();
    const buf = Buffer.from(bytes);
    const latin1 = buf.toString('latin1');
    const utf8 = buf.toString('utf-8');
    const text = latin1.includes('Ã') ? utf8 : latin1;
    return { status: res.status, text };
  } catch (err) {
    return { error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

function parseHtmlTable(html, titleFilter) {
  const tables = [];
  const tableRegex = /\<table\b[^>]*>([\s\S]*?)\</table>/gi;
  let tMatch;
  while ((tMatch = tableRegex.exec(html)) !== null) {
    const tContent = tMatch[1];
    const rows = [];
    const trRegex = /\<tr\b[^>]*>([\s\S]*?)\</tr>/gi;
    let rMatch;
    while ((rMatch = trRegex.exec(tContent)) !== null) {
      const cells = Array.from(rMatch[1].matchAll(/\<t[dh]\b[^>]*>([\s\S]*?)\</t[dh]>/gi))
        .map(m => m[1].replace(/<[^>]+>/g, '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim());
      if (cells.length > 0) rows.push(cells);
    }
    if (rows.length > 0) tables.push(rows);
  }
  return tables;
}

async function main() {
  // Read schools from schools4cre.json
  const rawSchools = await readFile('C:/Users/Wilson/.gemini/antigravity-ide/scratch/pdde-repasse-conciliador/backend/schools4cre.json', 'utf8');
  const schools = JSON.parse(rawSchools).schools.slice(0, 5); // first 5 schools

  console.log(`=== TESTANDO 5 ESCOLAS DA 4ª CRE NO PDDEINFO E SIGEF EXTRATO ===\n`);

  for (const s of schools) {
    console.log(`--------------------------------------------------------------------------------`);
    console.log(`Escola: ${s.nome} | INEP: ${s.inep} | SME: ${s.sme}`);
    const pddeUrl = `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=${s.inep}&consultar=Consultar`;
    const pddeRes = await fetchText(pddeUrl);

```
if (!pddeRes.text) {
  console.log(`Erro ao consultar PDDEInfo: ${pddeRes.error}`);
  continue;
}

// Extract CNPJ & UEx
const cnpjMatch = pddeRes.text.match(/CNPJ:\s*<\/t[dh]>\s*<t[dh][^>]*>\s*([0-9.\/-]+)/i) || 
                  pddeRes.text.match(/([0-9]{2}\.[0-9]{3}\.[0-9]{3}\/[0-9]{4}-[0-9]{2})/);
const cnpj = cnpjMatch ? cnpjMatch[1].replace(/\D/g, '') : '';
console.log(`CNPJ: ${cnpj}`);

// Extract accounts
const tables = parseHtmlTable(pddeRes.text);
const accounts = [];
const finances = [];

for (const t of tables) {
  for (const row of t) {
    if (row.length >= 5 && /^\d{3}$/.test(row[1]) && /^\d+/.test(row[2])) {
      accounts.push({
        program: row[0],
        bank: row[1],
        agency: row[2],
        account: row[3].replace(/\D/g, ''),
        rawAccount: row[3],
        balance: row[4]
      });
    }
    if (row.length >= 10 && (row[0].includes('Parcela') || row[0].includes('2026') || row[0].includes('PDDE'))) {
      finances.push({
        dest: row[0],
        due: row[3],
        paid: row[10],
        date: row[11]
      });
    }
  }
}

console.log(`Contas bancárias encontradas (${accounts.length}):`, accounts);
console.log(`Lançamentos financeiros encontrados (${finances.length}):`, finances);

// If we have accounts, let's query SIGEF Extrato for each account across program codes (02, 0A, 0B, Z9)
for (const acc of accounts) {
  const bankP = acc.bank.padStart(3, '0');
  const agencyP = acc.agency.padStart(4, '0');
  const accP = acc.account.padStart(10, '0');
  
  // Determine probable program code
  let progCode = '02';
  if (acc.program.includes('QUALIDADE')) progCode = '0A';
  else if (acc.program.includes('INTEGRAL')) progCode = '0B';
  else if (acc.program.includes('EQUIDADE')) progCode = 'Z9';

  const programCodesToTest = [progCode, '02', '0A', '0B', 'Z9'];
  const uniqueCodes = [...new Set(programCodesToTest)];

  for (const pCode of uniqueCodes) {
    // Test months in 2026 (01 to 08)
    for (const month of ['082026', '072026', '062026', '052026']) {
      const sigefUrl = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/${bankP}/agencia/${agencyP}/contacorrente/${accP}/cnpj/${cnpj}/programa/${pCode}/data/${month}`;
      const sigefRes = await fetchText(sigefUrl);
      
      if (sigefRes.text && !sigefRes.text.includes('Nenhum registro encontrado')) {
        const sigefTables = parseHtmlTable(sigefRes.text);
        console.log(`\n  >>> SIGEF EXTRATO ENCONTRADO! Conta: ${acc.account} | Prog: ${pCode} | Mês: ${month}`);
        console.log(`  URL: ${sigefUrl}`);
        for (const st of sigefTables) {
          for (const srow of st) {
            console.log(`    Linha Extrato:`, JSON.stringify(srow));
          }
        }
        break; // found transactions for this program, move to next
      }
    }
  }
}

// Now test PDDEInfo Relatório de Suspensão and Abertura de Conta for this school
console.log(`\n  --- Relatório de Suspensão PDDEInfo ---`);
const suspUrl = `https://www.fnde.gov.br/pddeinfo/index.php/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao?ano=2026&co_escola=${s.inep}&consultar=Consultar`;
const suspRes = await fetchText(suspUrl);
if (suspRes.text) {
  const sTables = parseHtmlTable(suspRes.text);
  for (const t of sTables) {
    if (t.some(r => r.join(' ').includes('Suspensão') || r.join(' ').includes('Motivo') || r.join(' ').includes('Entidade') || r.join(' ').includes('Situação'))) {
      console.log(`  Tabela de Suspensão:`, JSON.stringify(t.slice(0, 5)));
    }
  }
}

console.log(`\n  --- Relatório de Abertura de Conta PDDEInfo ---`);
const contaUrl = `https://www.fnde.gov.br/pddeinfo/index.php/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade?ano=2026&co_escola=${s.inep}&consultar=Consultar`;
const contaRes = await fetchText(contaUrl);
if (contaRes.text) {
  const cTables = parseHtmlTable(contaRes.text);
  for (const t of cTables) {
    if (t.some(r => r.join(' ').includes('Banco') || r.join(' ').includes('Agência') || r.join(' ').includes('Conta') || r.join(' ').includes('Situação'))) {
      console.log(`  Tabela de Abertura de Conta:`, JSON.stringify(t.slice(0, 5)));
    }
  }
}
```

  }
}

main().catch(console.error);

import https from 'node\:https';
import http from 'node\:http';

// Helper to make fetch with custom timeout and user-agent
async function fetchText(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 15000);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        ...(options.headers || {})
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    const bytes = await res.arrayBuffer();
    const buf = Buffer.from(bytes);

```
// Try utf-8 then windows-1252/latin1
const textUtf8 = buf.toString('utf-8');
const textLatin1 = buf.toString('latin1');

// Score based on accented Portuguese words
const scoreUtf8 = (textUtf8.match(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g) || []).length;
const scoreLatin1 = (textLatin1.match(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g) || []).length;

const text = scoreLatin1 > scoreUtf8 ? textLatin1 : textUtf8;
return {
  status: res.status,
  url: res.url,
  headers: Object.fromEntries(res.headers.entries()),
  text,
  byteLength: buf.byteLength
};
```

  } catch (err) {
    return {
      error: err.message,
      name: err.name
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function runTests() {
  console.log('=== TESTE 1: Consulta PDDEInfo para escola da 4ª CRE ===');
  const inep = '33069247'; // EM EMA NEGRAO DE LIMA
  const pddeInfoUrl = `https://www.fnde.gov.br/pddeinfo/pddeinfo/escola/consultar?ano=2026&co_escola=${inep}&consultar=Consultar`;
  console.log('Buscando:', pddeInfoUrl);
  const pddeRes = await fetchText(pddeInfoUrl);
  console.log('PDDEInfo Status:', pddeRes.status, 'Bytes:', pddeRes.byteLength);

  let schoolCnpj = '';
  let bankAccounts = [];

  if (pddeRes.text) {
    // Extract CNPJ
    const cnpjMatch = pddeRes.text.match(/CNPJ:\s\*\</t[dh]>\s\*\<t[dh][^>]*>\s*([0-9./-]+)/i) ||
                      pddeRes.text.match(/([0-9]{2}.[0-9]{3}.[0-9]{3}/[0-9]{4}-[0-9]{2})/);
    if (cnpjMatch) {
      schoolCnpj = cnpjMatch[1].replace(/\D/g, '');
      console.log('CNPJ extraído:', schoolCnpj, 'Formatado:', cnpjMatch[1]);
    }

```
// Extract bank accounts
// Look for rows with bank, agency, account
const trRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
let match;
while ((match = trRegex.exec(pddeRes.text)) !== null) {
  const row = match[1];
  const cells = Array.from(row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)).map(m => m[1].replace(/<[^>]+>/g, '').trim());
  if (cells.length >= 5 && /^\d{3}$/.test(cells[1]) && /^\d+/.test(cells[2])) {
    bankAccounts.push({
      program: cells[0],
      bank: cells[1],
      agency: cells[2],
      account: cells[3].replace(/\D/g, ''),
      rawAccount: cells[3],
      balance: cells[4]
    });
  }
}
console.log('Contas encontradas no PDDEInfo:', JSON.stringify(bankAccounts, null, 2));
```

  }

  console.log('\n=== TESTE 2: Teste de Consulta Direta ao Extrato SIGEF ===');
  if (bankAccounts.length > 0 && schoolCnpj) {
    const acc = bankAccounts[0];
    const bankPadded = acc.bank.padStart(3, '0');
    const agencyPadded = acc.agency.padStart(4, '0');
    const accountPadded = acc.account.padStart(10, '0');
    const programCode = '02'; // PDDE Basico

```
// Test current year and previous periods
const datesToTest = ['052026', '062026', '072026', '082026', '012026', '122025', '052025'];

for (const d of datesToTest) {
  const sigefUrl = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/${bankPadded}/agencia/${agencyPadded}/contacorrente/${accountPadded}/cnpj/${schoolCnpj}/programa/${programCode}/data/${d}`;
  console.log(`\nTestando SIGEF URL (${d}):`, sigefUrl);
  const sigefRes = await fetchText(sigefUrl);
  console.log('SIGEF Status:', sigefRes.status, 'Bytes:', sigefRes.byteLength);
  if (sigefRes.text) {
    const hasCaptcha = /captcha/i.test(sigefRes.text);
    const hasExtratoTable = /Extrato|Conta Corrente|Saldo|Crédito|Débito|Movimentação/i.test(sigefRes.text);
    const hasNotFound = /Nenhum registro encontrado|Não há dados|inválido/i.test(sigefRes.text);
    console.log(`Flags: Captcha=${hasCaptcha}, HasExtratoTable=${hasExtratoTable}, NotFound=${hasNotFound}`);
    
    // Let's preview snippets of text
    const cleanSnippet = sigefRes.text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
                                     .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
                                     .replace(/<[^>]+>/g, ' ')
                                     .replace(/\s+/g, ' ')
                                     .trim();
    console.log('Snippet:', cleanSnippet.slice(0, 300));
    
    // If there are tables with debits/credits, show them
    if (sigefRes.text.includes('<table')) {
      console.log('Tabelas encontradas no HTML!');
    }
  }
}
```

  } else {
    console.log('Não foi possível testar SIGEF com dados desta escola.');
  }

  console.log('\n=== TESTE 3: Teste dos Relatórios Públicos do PDDEInfo ===');
  const reports = [
    {
      name: 'Suspensão',
      url: `https://www.fnde.gov.br/pddeinfo/index.php/relatoriosuspensao/relatoriosuspensao/relatoriosuspensao?ano=2026&co_escola=${inep}&consultar=Consultar`
    },
    {
      name: 'Situação Cadastral',
      url: `https://www.fnde.gov.br/pddeinfo/index.php/situacaocadastroentidade/situacaocadastroentidade/situacaocadastroentidade?ano=2026&co_escola=${inep}&consultar=Consultar`
    },
    {
      name: 'Abertura de Conta',
      url: `https://www.fnde.gov.br/pddeinfo/index.php/staberturacontaentidade/staberturacontaentidade/staberturacontaentidade?ano=2026&co_escola=${inep}&consultar=Consultar`
    },
    {
      name: 'Prestação de Contas',
      url: `https://www.fnde.gov.br/pddeinfo/index.php/situacaoprestacaoconta/situacaoprestacaoconta/situacaoprestacaoconta?ano=2026&co_escola=${inep}&consultar=Consultar`
    },
    {
      name: 'Saldo',
      url: `https://www.fnde.gov.br/pddeinfo/index.php/consultasaldoentidade/consultasaldoentidade/consultasaldoentidade?ano=2026&co_escola=${inep}&consultar=Consultar`
    }
  ];

  for (const rep of reports) {
    console.log(`\nTestando relatório: ${rep.name}`);
    console.log('URL:', rep.url);
    const res = await fetchText(rep.url);
    console.log('Status:', res.status, 'Bytes:', res.byteLength);
    if (res.text) {
      const cleanSnippet = res.text.replace(/\<script\b[^>]*>[\s\S]*?\</script>/gi, '')
                                   .replace(/\<style\b[^>]*>[\s\S]*?\</style>/gi, '')
                                   .replace(/<[^>]+>/g, ' ')
                                   .replace(/\s+/g, ' ')
                                   .trim();
      console.log('Trecho retornado:', cleanSnippet.slice(0, 250));
    }
  }

  console.log('\n=== TESTE 4: Teste de Conexão com Portal da Transparência / CGU ===');
  const cguUrl = `https://api.portaldatransparencia.gov.br/api-de-dados/despesas/recursos-recebidos?ano=2026&pagina=1`;
  console.log('Testando CGU endpoint público/status:', cguUrl);
  const cguRes = await fetchText(cguUrl);
  console.log('CGU Status:', cguRes.status, 'Response headers:', JSON.stringify(cguRes.headers));
  if (cguRes.text) {
    console.log('CGU Response snippet:', cguRes.text.slice(0, 200));
  }

  console.log('\n=== TESTE 5: Teste PDDEREx e Antonieta de Barros ===');
  const pdderexUrl = `https://www.fnde.gov.br/pls/simad/internet_fnde.pdderex_1_pc`;
  console.log('Testando PDDEREx:', pdderexUrl);
  const pdderexRes = await fetchText(pdderexUrl);
  console.log('PDDEREx Status:', pdderexRes.status, 'Bytes:', pdderexRes.byteLength);

  const antonietaUrl = `https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/8`;
  console.log('Testando Antonieta de Barros:', antonietaUrl);
  const antRes = await fetchText(antonietaUrl);
  console.log('Antonieta Status:', antRes.status, 'Bytes:', antRes.byteLength);
}

runTests().catch(console.error);

Mostrar mais

Pensou por 2m 3s

Sim. **Essa descoberta é real e é provavelmente a peça que faltava para a parte mais valiosa da ferramenta.** Eu conferi independentemente o comportamento público do SIGEF e comparei os scripts com o código atual do nosso repositório canônico.

O resultado é melhor do que parecia: **podemos obter movimentações financeiras de 2026 diretamente do SIGEF, inclusive créditos do FNDE e débitos posteriores da conta.** Porém os scripts ainda são exploratórios. Há alguns erros e lacunas importantes que precisam ser corrigidos antes de escalarmos para as 163 escolas.

## O que está efetivamente comprovado

O SIGEF público está apresentando movimentos de 2026 contendo campos como **Crédito, Débito, Documento, Histórico, CNPJ do beneficiário, Razão Social, banco, agência e conta do beneficiário**. Encontrei, por exemplo, uma conta PDDE com crédito de R$ 24.720,00 por `ORDEM BANCARIA` do FNDE em maio de 2026 e, no mesmo dia, débito de R$ 24.720,00 identificado como `BB-APLIC C.PRZ-APL.AUT`. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/3563/contacorrente/0000077860/cnpj/04312419000130/programa/02/data/092018?utm_source=chatgpt.com)

Outros extratos públicos mostram em 2026 movimentos como `TRANSFERENCIA ENVIADA`, `RESGATE AUTOMATICO` e pagamentos para CNPJs identificados. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Portanto, agora temos de fato este caminho:

```
PDDEInfo
   ↓
INEP → UEx → CNPJ
   ↓
Banco + Agência + Conta + Programa
   ↓
URL determinística SIGEF
   ↓
Extrato da conta
   ↓
CRÉDITOS + DÉBITOS + DOCUMENTO + HISTÓRICO + BENEFICIÁRIO
```

Isso é exatamente a base necessária para a visão **Movimentações e Utilização** que planejamos.

---

# E a descoberta do `X` é importantíssima

O problema identificado pela outra ferramenta faz todo sentido.

Em alguns dos scripts há trechos como:

```
acc.account.replace(/\D/g, '')
```

Isso elimina qualquer caractere que não seja número.

Logo:

```
000056267X
```

vira algo como:

```
000056267
```

e deixa de ser a conta correta.

O próprio SIGEF possui contas públicas com dígito `X`, inclusive em resultados atuais. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0566/contacorrente/000055992X/cnpj/02528197000161/programa/0B/data/042021?utm_source=chatgpt.com)

### A boa notícia

**Nosso código canônico já está preparado para isso.**

A função `canonicalAccount()` remove pontuação, mas deliberadamente preserva `0-9A-Z`. Portanto o `X` é mantido na identidade da conta. 

E o normalizador do PDDEInfo também preserva a conta como texto, em vez de transformá-la em número. 

Então não temos um defeito estrutural no projeto atual.

O novo construtor de URL do SIGEF só precisará obedecer à mesma regra:

```
remover pontuação
preservar letras
uppercase
preservar zeros necessários
```

Nunca `digitsOnly`.

---

# Há um erro concreto em um dos scripts recebidos

Este trecho:

```
if (acc.program.includes('QUALIDADE')) progCode = '0A';
else if (acc.program.includes('INTEGRAL')) progCode = '0B';
else if (acc.program.includes('EQUIDADE')) progCode = 'Z9';
```

**não corresponde ao mapeamento que já validamos no canônico.**

Hoje nosso normalizador possui:

| ProgramaCódigo         |          |
| ---------------------- | -------- |
| PDDE Básico            | `02`     |
| PDDE Qualidade         | **`0B`** |
| PDDE Equidade          | **`0A`** |
| PDDE Educação Integral | **`Z9`** |

Inclusive o próprio SIGEF identifica publicamente `0A` como a família do antigo PDDE Estrutura e `0B` como outra família de ações agregadas. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/2662/contacorrente/0000205311/cnpj/01914960000120/programa/0A/data/052021?utm_source=chatgpt.com)

O script não deixou de descobrir registros por causa disso porque depois testa **todos os códigos**:

```
['02', '0A', '0B', 'Z9']
```

Mas a descrição:

> “Educação Integral (`0B`)”

**não deve ser incorporada ao nosso sistema sem revalidação.**

Esse é exatamente o tipo de detalhe que um script exploratório pode tolerar e um sistema financeiro não pode.

---

# O maior problema técnico encontrado: paginação

Este é o ponto mais importante antes de escalar.

Os scripts simplesmente fazem:

```
parseHtmlTable(sigefRes.text)
```

e interpretam todas as linhas encontradas naquela resposta.

Só que há extratos do próprio SIGEF que indicam:

> **Exibindo de 1 até 10 de 254** [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0248/contacorrente/0000492175/cnpj/03239044000167/programa/02/data/052018?utm_source=chatgpt.com)

Portanto:

> **o script prova que conseguimos obter movimentos, mas não prova que obteve TODOS os movimentos daquela conta.**

Se uma escola possui 254 lançamentos e só capturamos os primeiros 10, nosso dashboard poderia parecer impecável enquanto omite 244 operações.

Uma maravilha estética. Um desastre para auditoria.

Antes de 163 escolas precisamos descobrir exatamente:

```
como o SIGEF pagina
qual parâmetro controla a página
qual o tamanho da página
qual é o total declarado
quando chegamos à última página
```

E o coletor deve rejeitar a execução se:

```
linhas coletadas ≠ total declarado
```

quando o portal informar um total.

---

# Também confirmamos que `data/MMYYYY` não é um simples filtro mensal

Essa descoberta do Manus agora fica ainda mais forte.

Existem URLs públicas cujo cabeçalho diz, por exemplo:

```
Mês/Ano Início: 05/2018
```

e que atualmente retornam movimentos de **2026**. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Portanto o parâmetro:

```
/data/052018
```

não significa:

> “me dê apenas maio de 2018”.

Parece representar algum tipo de **início da janela histórica**, ou ao menos esse é o comportamento observado.

Consequentemente, aqueles loops:

```
052026
062026
072026
082026
```

podem estar pedindo conjuntos sobrepostos e recebendo novamente os mesmos movimentos.

Isso introduz outro risco:

> **duplicação de lançamentos.**

O adaptador produtivo deverá coletar uma janela de maneira controlada e deduplicar por uma identidade estável.

---

# Felizmente o canônico já possui uma boa identidade de movimentação

Nosso parser atual de SIGEF gera IDs utilizando:

```
programa
CNPJ
conta
data
operação
documento
valor
```

Essa é uma base muito melhor do que simplesmente:

```
linha 17 da página HTML
```

O novo parser público deve usar a mesma filosofia.

---

# A aplicação automática também está correta, com uma correção na explicação jurídica

A outra ferramenta escreveu que isso decorre genericamente da Lei nº 11.947/2009.

A conclusão prática está correta, mas a fundamentação é mais específica.

A **Resolução CD/FNDE/MEC nº 15/2021**, que continua sendo a norma geral vigente do PDDE Básico, prevê que, enquanto não utilizados, os recursos sejam automaticamente aplicados em fundo de renda fixa de curto prazo, podendo o gestor optar por outra modalidade admitida nos termos da norma. [Serviços e Informações do Brasil](https://www.gov.br/fnde/pt-br/acesso-a-informacao/legislacao/resolucoes/2021/resolucao-no-15-de-16-de-setembro-de-2021/view?utm_source=chatgpt.com)

O texto do art. 18 reproduzido da resolução estabelece expressamente essa aplicação automática. [Scribd](https://pt.scribd.com/document/599845579/RESOLUCAO-N%C2%BA-15-DE-16-DE-SETEMBRO-DE-2021?utm_source=chatgpt.com)

E os extratos do SIGEF mostram empiricamente exatamente essa sequência:

````
Crédito
ORDEM BANCARIA
R$ 24.720,00

↓ mesmo dia

Débito
BB-APLIC C.PRZ-APL.AUT
R$ 24.720,00
``` citeturn220137search0


Portanto podemos classificar esse movimento com bastante segurança como **aplicação financeira**, e não como gasto da escola.

---

# Isso nos obriga a classificar os movimentos

Não podemos simplesmente mostrar:

```text
Débito = gasto
Crédito = receita
````

porque isso produziria resultados absurdos.

Precisamos distinguir pelo menos conceitualmente:

| HistóricoInterpretação operacional |                                                                      |
| ---------------------------------- | -------------------------------------------------------------------- |
| `ORDEM BANCARIA` + FNDE            | **Repasse FNDE**                                                     |
| `BB-APLIC C.PRZ-APL.AUT`           | **Aplicação financeira**                                             |
| `APLICACAO EM BB FIX`              | **Aplicação financeira**                                             |
| `RESGATE AUTOMATICO`               | **Resgate de aplicação**                                             |
| `RESGATE BB FIX`                   | **Resgate de aplicação**                                             |
| `TRANSFERENCIA ENVIADA`            | **Pagamento/transferência**                                          |
| `PIX ENVIADO`                      | **Pagamento/transferência**                                          |
| `PIX RECEBIDO`                     | **Entrada de terceiro**, revisar origem                              |
| `PAGTO CARTAO CREDITO`             | **Pagamento via cartão**, beneficiário final pode exigir outra fonte |
| `TARIFA DE EXTRATO`                | **Tarifa bancária, abrir alerta**                                    |
| `ESTORNO...`                       | **Estorno/reversão**                                                 |
| desconhecido                       | **Não classificado / revisão**                                       |

A classificação precisa ser determinística e testada.

---

# O caso da tarifa é realmente muito interessante

Eu **não colocaria automaticamente “TARIFA INDEVIDA”** no banco.

Colocaria:

> **Tarifa bancária detectada. Verificar possível cobrança indevida.**

A Resolução nº 15/2021 prevê isenção de taxas e tarifas bancárias das EEx, UEx e EM nas condições dos acordos entre FNDE e instituições financeiras. [Jusbrasil](https://www.jusbrasil.com.br/diarios/documentos/1282083047/resolucao-n-15-17-09-2021-ato-publicado-no-dou?utm_source=chatgpt.com)

Então encontrar:

```
TARIFA DE EXTRATO
R$ 4,20
```

numa conta PDDE é um achado operacional relevante.

Mas antes de afirmar irregularidade automaticamente precisamos confirmar:

- programa/conta correta;
- vigência do acordo aplicável;
- natureza exata da tarifa;
- eventual estorno posterior.

Isso vira um **alerta automático**, não uma sentença.

---

# Outra correção muito importante: “Documento” não é Nota Fiscal nem Nota de Empenho

A descrição da outra ferramenta foi longe demais ao dizer que capturaremos:

> “nota de empenho/documento”.

O SIGEF apresenta uma coluna chamada **Documento**.

Mas o que aparece ali são identificadores bancários como:

```
00000000000000052701
```

ou números relacionados a OB/transferência.

Isso **não prova que seja nota fiscal ou nota de empenho**.

Portanto nossa interface deve chamar:

> **Documento bancário**

ou:

> **Documento da movimentação**

até que outra fonte forneça efetivamente nota fiscal, recibo ou documento da prestação.

Essa é justamente uma das áreas em que o **BB Gestão Ágil** ainda pode acrescentar valor futuramente.

---

# O beneficiário também exige cuidado

Uma `TRANSFERENCIA ENVIADA` pode trazer:

```
CNPJ do beneficiário
Razão Social
Banco
Agência
Conta
```

e isso é extraordinariamente útil para acompanhar pagamentos. Os extratos públicos atuais comprovam esse tipo de informação. [FNDE](https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/0167/contacorrente/0000510998/cnpj/49619679000190/programa/02/data/052018?utm_source=chatgpt.com)

Mas em operações como:

```
PAGTO CARTAO CREDITO
```

o beneficiário bancário pode aparecer como **Banco do Brasil**, e não necessariamente como o estabelecimento onde a escola comprou.

Portanto:

> beneficiário SIGEF ≠ sempre fornecedor final da despesa.

Mais uma razão para separar **movimentação bancária** de **prestação de contas/documento fiscal**.

---

# E há uma excelente surpresa no nosso motor atual

A diferença que o Manus encontrou:

```
PDDEInfo / Liberação:
30/04/2026

SIGEF crédito:
03/05/2026
```

**não exige desmontar a conciliação que já fizemos.**

Nosso motor atual procura primeiro o crédito pela identidade da conta e pela **OB/documento**. Quando encontra documento correspondente, ele não exige que a data da movimentação seja idêntica à data da liberação. A data só entra como fallback quando falta documento. 

Isso significa que nossa modelagem anterior foi, felizmente, boa o suficiente para lidar justamente com a situação que agora encontramos na realidade.

Eu acrescentaria apenas um teste explícito:

```
Data da OB: 30/04/2026
Data do crédito: 03/05/2026
Mesmo documento/OB
Mesmo valor
Mesma conta

→ REPASSE_CONFIRMADO
```

para congelar esse comportamento.

---

# O schema de movimentação precisa apenas de enriquecimento

Hoje nosso `SigefMovement` contém:

```
CNPJ da escola
programa
crédito/débito
valor
data
conta
documento
histórico
```

Isso já cobre a parte fundamental.

O extrato público acrescenta:

```
documento beneficiário
nome/razão social beneficiário
banco beneficiário
agência beneficiário
conta beneficiário
```

Portanto eu faria uma extensão pequena, por exemplo:

```
counterparty?: {
  document: string | null;
  name: string | null;
  bank: string | null;
  agency: string | null;
  account: string | null;
}
```

Sem reconstruir o domínio.

---

# Como eu transformaria esses scripts em código de produção

Não copiaria nenhum deles literalmente.

Eles são excelentes **scripts de exploração**.

A implementação canônica deveria ser:

```
backend/adapters/
    sigef-public-statement-http.ts
    sigef-public-statement-html.ts
```

O primeiro seria responsável por:

```
montar URL
preservar X
timeout
retry moderado
User-Agent
HTTP status
bytes originais
hash
CAPTCHA/bloqueio
paginação
```

O segundo:

```
validar cabeçalhos
validar identidade da página
CNPJ esperado
banco esperado
agência esperada
conta esperada
programa esperado
parsear todas as linhas
BRL → centavos
datas → ISO
beneficiário
classificar movimento
```

E o resultado seria convertido diretamente para o `SigefMovement` que já existe.

---

# Não usaria regex para analisar HTML em produção

Os scripts usam coisas como:

```
/<table\b[^>]*>([\s\S]*?)<\/table>/gi
```

Serviu muito bem para descobrir a fonte.

Mas nosso projeto já usa **Cheerio + validação explícita de cabeçalhos** no parser de Liberações. 

Faria o mesmo aqui.

Assim, se o FNDE mudar:

```
<td>
```

para alguma estrutura diferente, teremos:

> `SCHEMA_CHANGED / CONSULTA_INCONCLUSIVA`

e não um extrato vazio fingindo que a escola não gastou nada.

---

# Também descartaria a heurística atual de encoding

Este código:

```
const text = latin1.includes('Ã') ? utf8 : latin1;
```

é criativo, mas não é apropriado para produção.

E a outra variante que “conta acentos” também é heurística.

O procedimento canônico deverá:

```
preservar bytes originais
ler Content-Type/charset quando disponível
usar charset conhecido da fonte
validar cabeçalhos/textos esperados
```

O parser atual de Liberações já trabalha explicitamente com Windows-1252. 

---

# E eu eliminaria a força bruta de programas

Os scripts fazem algo do tipo:

```
cada conta
× 02
× 0A
× 0B
× Z9
× vários meses
```

Isso foi ótimo para **descoberta**.

Não é como devemos operar em produção.

Nós já sabemos pelo PDDEInfo a que programa determinada conta pertence.

Nosso normalizador possui justamente:

```
PDDE → 02
PDDE Qualidade → 0B
PDDE Equidade → 0A
PDDE Educação Integral → Z9
```

Então uma atualização normal fará:

```
Conta PDDE
→ consulta 02

Conta PDDE Qualidade
→ consulta 0B
```

e assim por diante.

Só um **modo de descoberta controlada** experimentaria códigos alternativos quando houver programa ainda não mapeado.

Isso reduzirá brutalmente o número de requisições.

---

# O próximo piloto agora está muito bem definido

Eu não iria diretamente de 25 para 163.

Primeiro faria um adaptador real e validaria estes casos:

| CasoO que deve provar      |                                       |
| -------------------------- | ------------------------------------- |
| Conta normal numérica      | URL e identidade corretas             |
| Conta terminada em `X`     | `X` preservado ponta a ponta          |
| OB + aplicação automática  | aplicação não classificada como gasto |
| OB com crédito dias depois | conciliação pela OB                   |
| Resgate + transferência    | não contar resgate como receita       |
| Transferência para CNPJ    | beneficiário preservado               |
| PIX recebido               | entrada não confundida com FNDE       |
| Pagamento cartão           | não presumir fornecedor final         |
| Tarifa                     | gerar alerta                          |
| Extrato >10 linhas         | paginação integral                    |
| Estorno                    | manter fato reversor                  |
| página vazia/erro          | `CONSULTA_INCONCLUSIVA`               |

Depois disso:

```
3 UEx antigas do Manus
+
5 UEx desta nova descoberta
+
algumas com X
+
algumas com Qualidade/Equidade
```

Só então:

> **163 UEs.**

---

# O que isso muda no produto

Muda bastante.

Antes tínhamos condições de mostrar:

```
E.M. X

PDDE Básico
Previsto: R$ 8.895
Pago: R$ 8.895
Conta: ...
```

Agora podemos caminhar para:

```
E.M. X
PDDE Básico

REPASSE
30/04/2026  Ordem registrada FNDE   R$ 8.895
03/05/2026  Crédito localizado      R$ 8.895
03/05/2026  Aplicação automática    R$ 8.895

MOVIMENTAÇÕES
18/08/2026  Resgate aplicação       + R$ 2.500
18/08/2026  Transferência enviada   - R$ 2.500
            Favorecido: Empresa X
            CNPJ: XX.XXX.XXX/0001-XX

ALERTAS
Tarifa bancária detectada           R$ 4,20
```

E isso finalmente aproxima a ferramenta da pergunta que realmente importa na análise da prestação:

> **A escola recebeu? Em que conta? Quando o crédito apareceu? O recurso ficou aplicado? Quando começou a ser utilizado? Quanto saiu? Para quem? Há movimentações que merecem revisão?**

A única coisa que eu **não** permitiria que a ferramenta dissesse ainda é:

> “Esta despesa está regular e comprovada.”

Para isso precisamos confrontar a movimentação com **documento fiscal, finalidade, processo de aquisição e prestação de contas**.

---

## Veredito

**Essa descoberta deve alterar nossa prioridade imediatamente.**

O SIGEF Extrato deixou de ser:

> “uma fonte que talvez consigamos automatizar”.

e passou para:

> **“uma fonte pública de movimentação bancária que já respondeu com dados reais de 2026 e precisa agora de um adaptador robusto, paginação e validação.”**

O trabalho da outra ferramenta foi extremamente útil para chegar até aqui. Mas os scripts que você colou devem ser tratados como **código de investigação**, não incorporados diretamente.

A melhor parte é que **não precisamos reescrever o que fizemos**. O canônico já preserva contas alfanuméricas, usa centavos inteiros, possui `SigefMovement`, tem conciliação por OB/documento e diferencia liberação de movimentação.   

O que faltava era exatamente isto:

**uma forma prática de alimentar esse motor com as movimentações reais das contas.**

Agora temos.

Fontes

A navegação e extração de dados em **sistemas legados governamentais** (sistemas do FNDE, MEC, Banco do Brasil, Receita Federal, tribunais e secretarias) possuem desafios muito específicos: arquiteturas antigas (Zend 1.x, Java/JSP, Oracle Forms/mod\_plsql, ASP.NET WebForms), instabilidade de conexão, codificação de caracteres mista (Windows-1252/Latin1) e barreiras anti-bot.

Abaixo estão as **melhores recomendações técnicas, ferramentas, pacotes e padrões de engenharia** divididos por objetivo.

---

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                   ESTRATÉGIA EM 4 NÍVEIS PARA SISTEMAS LEGADOS GOVERNAMENTAIS                    │
├────────────────────────────────┬─────────────────────────────────────────────────────────────────┤
│ Nível 1: Headless HTTP Direto  │ Undici / Cheerio (Node) ou Httpx / Selectolax (Python)          │
│ (Padrão de Ouro: 90% dos casos)│ Máxima velocidade, zero consumo de browser, imune a render JS   │
├────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Nível 2: Engenharia Reversa    │ MitMProxy / Chrome Network DevTools                             │
│ (Descoberta de Rotas Ocultas)  │ Descobre endpoints REST/XHR diretos para ignorar CAPTCHAs       │
├────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Nível 3: Browser Automação     │ Playwright + Route Interception (Bloqueio de CSS/Imagens)       │
│ (Para ASP.NET, IFrames, Login) │ Auto-wait nativo, emulação de IFrame e bypass de fingerprints   │
├────────────────────────────────┼─────────────────────────────────────────────────────────────────┤
│ Nível 4: Resiliência & Queue   │ Cockatiel (Circuit Breaker) + P-Queue (Taxa Adaptativa)         │
│ (Proteção contra WAF e Quedas) │ Retry exponencial, jitter e detecção automática de instabilidade│
└────────────────────────────────┴─────────────────────────────────────────────────────────────────┘
```

---

## 1. Motores de Extração e Parsing (A Escolha Certa da Ferramenta)

### A. Para Páginas HTML Estruturadas no Servidor (SSR Legado)

Em 90% dos sistemas legados (como PDDEInfo e SIGEF), o HTML já vem renderizado pelo servidor. **Nunca use Selenium ou Puppeteer nesses casos**, pois eles consomem centenas de megabytes de RAM desnecessariamente e são lentos.

- **No ecossistema Node.js / TypeScript (Recomendado):**
  - **`cheerio`** **(v1.0.0):** É o padrão absoluto. Faz o parsing do HTML usando a engine C++ `htmlparser2`. É **15x a 20x mais rápido** que JSDOM.
  - **`undici`** **/** **`native fetch`****:** Motor HTTP de alta performance com pool de conexões persistentes (*keep-alive*).
- **No ecossistema Python (Se optar por pipelines em Python):**
  - **`selectolax`** **(com parser Modest em C):** É o parser HTML mais rápido do mundo (supera o `BeautifulSoup` com `lxml` em mais de 5x).
  - **`httpx`** **(com HTTP/2 e Async):** Muito superior ao `requests` tradicional para concorrência assíncrona.

---

### B. Para Sistemas Legados Complexos (com IFrames, `__VIEWSTATE` ou JavaScript Obrigatório)

Quando o sistema legado exigir renderização de JavaScript, cliques sequenciais ou navegação por IFrames:

- **Ferramenta Recomendada:** **`Playwright`** (Microsoft).
  - *Por que supera o Selenium e Puppeteer:*
    1. **Auto-Waiting Nativo:** O Playwright espera automaticamente o elemento estar visível, estável e clicável antes de interagir, eliminando os frágeis `time.sleep()` ou `setTimeout()`.
    2. **Suporte Superior a IFrames:** Sistemas dos anos 2000 usam `<frame>` e `<iframe>` aninhados. O Playwright permite selecionar qualquer frame diretamente: `page.frameLocator('#frameConteudo').locator('#btnConsultar')`.
    3. **Interceptação de Rede (*****Route Abort*****):** Permite bloquear o download de imagens, vídeos, fontes e arquivos CSS durante a navegação, acelerando a extração em **mais de 400%**:
       ```
       await page.route('**/*.{png,jpg,jpeg,svg,css,woff,woff2}', route => route.abort());
       ```
    4. **Emulação Stealth:** O plugin `playwright-extra` com `puppeteer-extra-plugin-stealth` remove os rastros de automação (`navigator.webdriver`), evitando bloqueios em WAFs como Cloudflare ou ModSecurity.

---

## 2. Engenharia Reversa de APIs Ocultas (O "Segredo" do SIGEF)

A descoberta que fizemos no SIGEF (consultar o extrato diretamente via URL sem passar pelo CAPTCHA) é um clássico exemplo de **Engenharia Reversa de Rotas**.

### Ferramentas Essenciais para Descobrir Rotas em Sistemas Legados:

1. **`mitmproxy`** **(Proxy Interceptador Interativo):**
   - Ferramenta de linha de comando em Python que captura todo o tráfego HTTP/HTTPS do seu computador.
   - Permite inspecionar parâmetros ocultos enviados por formulários legados, tokens de sessão e endpoints internos de exportação para Excel/CSV.
2. **DevTools Network Tab (Chrome/Edge):**
   - Filtrar por `Fetch/XHR` e `Doc`.
   - Clicar com o botão direito na requisição ➔ *Copy as cURL*.
3. **`curlconverter`****:**
   - Converte instantaneamente qualquer comando `cURL` capturado no navegador para código limpo em TypeScript (Fetch/Undici) ou Python (Httpx/Requests).

---

## 3. Tratamento de Peculiaridades e Armadilhas de Sistemas Legados

### A. O Problema do Charset (Windows-1252 / ISO-8859-1 vs. UTF-8)

Sistemas governamentais brasileiros antigos frequentemente enviam páginas em `Windows-1252` sem declarar o cabeçalho correto, corrompendo caracteres (`Ã§`, `Ã£`, \`\`).

- **Solução:** **Algoritmo Heurístico de Decodificação por Pontuação (Score de Acentuação):**
  ```
  export function decodeGovernmentHtml(buffer: Buffer): string {
    const textLatin1 = buffer.toString('latin1');
    const textUtf8 = buffer.toString('utf-8');

    // Conta acentos corretos em português
    const scoreLatin1 = (textLatin1.match(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g) || []).length;
    const scoreUtf8 = (textUtf8.match(/[áéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g) || []).length;

    // Penaliza caracteres corrompidos
    const corruptUtf8 = (textUtf8.match(/Ã.|Â.|/g) || []).length * 3;

    return (scoreLatin1 > (scoreUtf8 - corruptUtf8)) ? textLatin1 : textUtf8;
  }
  ```

---

### B. Gestão de Contas Bancárias com Dígito Verificador (`X`)

Como comprovamos no teste prático, sistemas do Banco do Brasil e FNDE exigem que o caractere `X` seja preservado no final da conta (ex: `000056267X`).

- **Padrão de Sanitização de Contas Governamentais:**
  ```
  export function formatGovernmentAccount(rawAccount: string, length = 10): string {
    // Remove traços e espaços, mas MANTÉM dígitos e a letra X maiúscula
    const clean = rawAccount.replace(/[^0-9Xx]/g, '').toUpperCase();
    return clean.padStart(length, '0');
  }
  ```

---

### C. Normalização de Tabelas HTML Complexas com `Colspan` / `Rowspan`

Tabelas legadas de prestação de contas frequentemente mesclam células horizontais e verticais, quebrando parsers ingênuos.

- **Solução:** Usar o pacote **`html-table-parser-ts`** ou implementar um extrator que expanda o grid em memória antes da leitura por índices de coluna.

---

## 4. Resiliência, Controle de Taxa e Prevenção de Bloqueios

Para que o robô extraia as 163 escolas com 100% de confiabilidade sem cair por instabilidade dos servidores do FNDE:

| DesafioPacote RecomendadoComo Implementar |                                                   |                                                                                                                                                                 |
| ----------------------------------------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Rate Limit / WAF**                      | **`p-queue`** ou **`p-limit`**                    | Limitar a **2 ou 3 requisições simultâneas**, com delay de **1.200 a 1.500 ms** e *jitter* aleatório de 200 ms (evita padrão rítmico de robô).                  |
| **Instabilidade / Timeouts**              | **`cockatiel`** (Node) ou **`tenacity`** (Python) | Implementar política de **Exponential Backoff com Retry** (se der HTTP 500/503 ou Timeout, aguarda 1s, 2s, 4s antes de tentar novamente, até 3 tentativas).     |
| **Circuit Breaker**                       | **`cockatiel`**                                   | Se o servidor federal cair completamente (ex: 5 falhas seguidas), o robô pausa as consultas por 60 segundos em vez de metralhar o servidor e ser banido por IP. |
| **Rotação de Headers**                    | **`user-agents`**                                 | Enviar cabeçalhos HTTP idênticos aos dos navegadores Google Chrome e Microsoft Edge atualizados em ambiente Windows.                                            |

---

## 5. Exemplo de Código do Extrator Resiliente Completo

Abaixo está o padrão arquitetural profissional que combina todas essas recomendações em um único módulo TypeScript:

```
import { fetch } from 'undici';
import * as cheerio from 'cheerio';
import pLimit from 'p-limit';
import { retry, handleWhenResult, handleAll, exponentialBackoff } from 'cockatiel';

// 1. Controle de concorrência (2 workers com fila)
const limit = pLimit(2);

// 2. Política de Retry inteligente para servidores do Governo
const retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new exponentialBackoff({ initialDelay: 1000, maxDelay: 5000 }),
});

export interface ExtractionTask {
  inep: string;
  cnpj: string;
  account: string;
  agency: string;
  program: string;
}

export async function extractLegacyWithResilience(task: ExtractionTask) {
  return limit(async () => {
    return retryPolicy.execute(async () => {
      const url = `https://www.fnde.gov.br/sigefweb/index.php/conta-corrente/extrato-conta-corrente-detalhamento/banco/001/agencia/${task.agency}/contacorrente/${task.account}/cnpj/${task.cnpj}/programa/${task.program}/data/082026`;

      // Delay com Jitter aleatório para não disparar WAF
      const jitter = Math.floor(Math.random() * 300) + 1200;
      await new Promise((r) => setTimeout(r, jitter));

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      });

      if (!response.ok && response.status !== 404) {
        throw new Error(`Instabilidade no SIGEF: HTTP ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const html = buffer.toString('latin1'); // Decodificação Latin1 comprovada

      if (html.includes('Nenhum registro encontrado')) {
        return { inep: task.inep, transactions: [] };
      }

      // Parsing ultrarrápido com Cheerio
      const $ = cheerio.load(html);
      const rows: Array<Record<string, string>> = [];

      $('table tr').each((_, el) => {
        const cells = $(el).find('td, th').map((_, td) => $(td).text().trim()).get();
        if (cells.length >= 10 && /^\d{2}\/\d{2}\/\d{4}$/.test(cells[0])) {
          rows.push({
            data: cells[0],
            credito: cells[1],
            debito: cells[2],
            documento: cells[3],
            historico: cells[4],
            favorecidoDoc: cells[5],
            favorecidoNome: cells[6],
          });
        }
      });

      return { inep: task.inep, transactions: rows };
    });
  });
}
```

---

## Síntese das Recomendações

1. **Para FNDE/PDDEInfo/SIGEF:** Use **`Undici + Cheerio + P-Limit + Latin1 Decoder`**. É imbatível em velocidade, consome menos de 50MB de RAM e roda as 163 escolas em menos de 2 minutos.
2. **Para Descoberta:** Use o **DevTools Network** e **`mitmproxy`** para mapear URLs REST ocultas antes de qualquer tentativa de automação de cliques.
3. **Para Portais com Login/Gov.br ou Formulários ASP.NET:** Use **`Playwright`** **com Route Abort** para bloquear mídia e rastreadores.
4. **Para Resiliência:** Aplique **`Cockatiel`** com retry exponencial e delay aleatório (*jitter*) para garantir taxa de 100% de sucesso sem bloqueios por WAF.

Mostrar mais

Você chegou à duração máxima desta conversa, mas pode continuar conversando em um novo chat.
