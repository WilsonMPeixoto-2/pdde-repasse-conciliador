# Investigação prática de novas fontes — checkpoint 06/09/2026

**Projeto canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Branch de trabalho:** `feat/temporal-coverage-sigef-export-2026-09-05`  
**PR relacionado:** #58 — `feat: cobertura temporal e escalada pública SIGEF`  
**Escopo:** 163 UEs da 4ª CRE, exercício 2026

> Este documento é um checkpoint operacional para impedir perda de contexto entre chats. Ele registra **somente o que foi efetivamente testado**, separando existência teórica de acesso e extração reais.

## 1. Critério adotado a partir deste checkpoint

Uma plataforma **não deve ser chamada de nova fonte útil** apenas porque existe, possui documentação, painel, API ou botão de exportação.

Classificação prática obrigatória:

- `EXTRAIU_DADO_REAL`: foi possível obter registro real e útil para a carteira/tema;
- `ACESSA_SEM_DADO_UTIL_EXTRAIDO`: página/serviço abre, mas ainda não entregou linha útil;
- `BLOQUEADA_CREDENCIAL`: integração depende de chave/login/credencial oficial;
- `BLOQUEADA_WAF`: acesso automatizado rejeitado pela proteção da fonte;
- `SEM_GRANULARIDADE_UEX`: dado existe, mas não alcança escola/UEx/conta de forma útil;
- `FONTE_INTERNA_MESMA_ORIGEM`: novo canal/mecanismo, mas não fonte independente.

A métrica relevante é: **quantas lacunas reais das 163 escolas a nova fonte conseguiu preencher ou reforçar?**

## 2. Situação do PR #58 antes da ampliação externa

O PR #58 deve ser entendido como infraestrutura de suporte, não como a ampliação de fontes em si.

Já implementado/testado na branch:

- separação entre sucesso operacional da coleta e suficiência temporal da evidência;
- `paymentTemporalCoverage` com estados `SUFFICIENT`, `OUT_OF_COVERAGE`, `UNKNOWN`;
- `requiredThrough` por conta/pagamento;
- segunda rota pública do **mesmo SIGEF**, `conta-corrente/visualizaexcel`, como fallback quando o extrato paginado não cobre a data necessária;
- preservação da fonte original e deduplicação de movimentos;
- política `no-cache` no fallback;
- testes, TypeScript e build verdes no último ciclo observado;
- Live Monitor de 10 escolas passou no teste observado.

Regra: `visualizaexcel` é **novo mecanismo de extração do SIGEF**, não nova fonte independente.

## 3. Dados Abertos FNDE — PDDE

### 3.1. Página real carregada

URL testada:

`https://dados.gov.br/dados/conjuntos-dados/programa-dinheiro-direto-na-escola-pdde`

A página foi carregada integralmente com renderização JavaScript e expôs **19 recursos**.

Metadados observados em 06/09/2026:

- última alteração dos metadados: `13/05/2026`;
- formato declarado: `GZ`;
- atualização do conjunto: `Sob_demanda` na página do catálogo;
- área técnica: `CODDE/CGAME`;
- o portal informa `Atualização não verificável` porque não encontra `Last-Modified` válido nos arquivos.

### 3.2. Recursos 2025+ confirmados na interface

Recursos materialmente relevantes que aparecem na página:

- **Relação de escolas passíveis de atendimento do PDDE** — dados a partir de 2025;
- **Estimativa das Escolas Passíveis de Atendimento do PDDE Básico - Público** — dados a partir de 2025;
- **Execução Financeira PDDE Básico - Público** — dados a partir de 2025;
- **Execução Financeira PDDE Básico - Privado** — dados a partir de 2025;
- **Saldos das Contas das UEx - PDDE Básico - Públicas** — dados a partir de 2025;
- **Saldos das Contas das UEx - PDDE Básico - Privadas** — dados a partir de 2025;
- **Consulta Prestação de Contas do PDDE** — a partir de 2011.

A descrição da execução 2025+ declara:

- granularidade até escola atendida;
- periodicidade mensal;
- valores acumulativos no ano.

A descrição de saldos 2025+ declara:

- posição no último dia útil de cada mês.

### 3.3. Estado real da extração

Classificação atual: `ACESSA_SEM_DADO_UTIL_EXTRAIDO`.

Foi possível renderizar a lista completa de recursos e identificar os recursos corretos. O botão **“Acessar o recurso”** é controlado por JavaScript e o HTML renderizado não contém diretamente a URL final do GZ.

O próximo ponto de retomada é **inspecionar a API/JavaScript do portal para descobrir o objeto de recurso e a URL efetiva do arquivo**, baixar os GZ de:

1. `Saldos das Contas das UEx - PDDE Básico - Públicas`;
2. `Execução Financeira PDDE Básico - Público`;
3. `Consulta Prestação de Contas do PDDE`;

então descompactar e procurar os CNPJs/INEPs das 163 UEx, medindo a competência máxima 2026.

### 3.4. Falha institucional já documentada pelo próprio portal

A página possui discussão pública de 08/03/2026 relatando erro no serviço `DADOS_ABERTOS_PDDE_SIGPC`:

`ORA-00942: table or view does not exist`

A discussão também relata erro semelhante no PDDEInfo naquele período. Isso é evidência de falha da infraestrutura da fonte, não de ausência dos dados.

## 4. Plataforma Antonieta de Barros

### 4.1. Produto PDDE real identificado

Produto de dados:

- ID `59`;
- nome: **Consulta Prestação de Contas do PDDE**;
- página: `https://www.fnde.gov.br/plataforma-antonieta-de-barros/dados/produtos-de-dados/visualizar/59`;
- ativo declarado: `exports/PDDE/PDDE_Prestacao_conta_SIGPC.txt.gz`.

A página foi carregada e o botão **“Exportar artefato”** foi identificado.

Duas ferramentas distintas de scraping/renderização confirmaram o mesmo caminho lógico do ativo, mas as URLs óbvias testadas para o arquivo retornaram página não encontrada. O botão usa uma chamada interna não exposta no HTML estático.

Classificação atual: `ACESSA_SEM_DADO_UTIL_EXTRAIDO`.

Ponto de retomada: inspecionar bundle/rota/API chamada pelo botão `export-button`, baixar `PDDE_Prestacao_conta_SIGPC.txt.gz` e procurar CNPJs da 4ª CRE.

### 4.2. BB Ágil dentro da Antonieta

URL testada:

`https://www.fnde.gov.br/plataforma-antonieta-de-barros/programas-e-acoes/bb-agil`

Resultado: redirecionamento para login da plataforma.

Classificação: `BLOQUEADA_CREDENCIAL` para coleta pública automática.

Não raspar área autenticada nem contornar autenticação.

## 5. SiGPC Acesso Público

O acesso automatizado testado foi rejeitado pelo WAF com mensagem `Request Rejected`.

Classificação atual: `BLOQUEADA_WAF` no caminho HTTP testado.

Isso **não encerra** a investigação. Antes de descartar, testar por navegador real/renderização permitida, proxies legítimos das ferramentas disponíveis e rotas públicas alternativas de exportação. Não contornar CAPTCHA ou autenticação.

## 6. Portal da Transparência / CGU

Foi testado endpoint real da API com consulta de favorecido/CNPJ. A resposta foi:

`401 - Chave de API não informada`

Classificação: `BLOQUEADA_CREDENCIAL`.

O projeto já possui cliente em código, mas não deve influenciar a conclusão corrente sem token oficial e piloto real.

Regra importante: **não existe uma chave pública genérica a ser “descoberta” por scraping**. A chave deve ser obtida legitimamente pelo serviço oficial do Portal da Transparência e armazenada como segredo, nunca versionada no repositório.

## 7. SIMEC / MEC — relatório financeiro público

Foi encontrada e extraída uma página financeira pública com dados 2026 contendo campos como:

- programa;
- data de pagamento;
- número da OB;
- valor;
- banco;
- agência;
- conta.

O relatório observado possuía dados de agosto/2026 e indicava atualização/fechamento em início de setembro/2026.

Classificação atual: `EXTRAIU_DADO_REAL`, **mas utilidade por UEx da 4ª CRE ainda deve ser provada sistematicamente**.

Cautela: o bloco é rotulado como consulta de liberações do FNDE. Até provar a cadeia de origem, tratar SIMEC como **nova plataforma/mecanismo de acesso** e não automaticamente como fonte independente do SIGEF.

Ponto de retomada: navegar formulários/rotas até granularidade por escola/UEx/CNPJ/conta, usando uma escola real da carteira e comparando pagamentos de agosto com PDDEInfo/SIGEF.

## 8. Power BI — PDDE Básico / PDDE Total

Relatórios públicos oficiais foram localizados e carregados no `app.powerbi.com`.

O scraping simples recupera apenas o shell do Power BI, não o dataset.

Classificação atual: `ACESSA_SEM_DADO_UTIL_EXTRAIDO`.

Ponto de retomada: usar técnicas permitidas para relatórios Power BI públicos:

- capturar configuração do relatório público;
- identificar `datasetId`, `reportId`, `modelsId`/`resolvedCluster` quando expostos;
- inspecionar chamadas `querydata`/metadata públicas;
- testar exportação pública quando disponível;
- filtrar 2026 / RJ / município / escola e procurar uma UEx real.

Não considerar o painel fonte útil até obter linhas/dados reais.

## 9. D.O. Rio / SME-RJ

Foi possível localizar publicações reais com informação individualizada de escola/CEC, programa/exercício, processo e situação/aprovação de prestação de contas.

Classificação: `EXTRAIU_DADO_REAL` para **prestação de contas/atos municipais**, não para saldo bancário.

Potencial de integração:

- segunda evidência externa ao FNDE sobre aprovação/situação da prestação;
- vinculação escola ↔ processo municipal;
- auditoria histórica e temporal de decisões da CRE/SME.

Não usar como fonte de saldo, crédito bancário ou aplicação.

## 10. Prioridade de retomada

Executar **sem novo relatório intermediário** até obter dados ou esgotar tecnicamente as rotas:

1. Dados Abertos FNDE 2025+ — descobrir URL real do GZ, baixar, abrir e medir competência máxima;
2. Antonieta produto 59 — descobrir chamada real de exportação e baixar o artefato;
3. SIMEC — explorar formulários/rotas até UEx real da 4ª CRE;
4. Power BI PDDE — extrair dataset/query pública por UEx/escola;
5. SiGPC — retestar por navegador/renderização avançada permitida;
6. Portal da Transparência — integrar quando houver chave oficial;
7. D.O. Rio — desenhar coletor específico para prestação de contas.

## 11. Regra de encerramento desta investigação

Não encerrar uma rodada apenas com frases como “a fonte parece promissora”, “o painel existe” ou “ainda não consegui baixar”.

Para cada frente, tentar em sequência, quando aplicável:

- HTTP direto;
- HTML renderizado;
- inspeção de JavaScript/bundles;
- descoberta de API/endpoints;
- navegador/renderização avançada;
- exportação oficial;
- download do arquivo;
- descompactação/parsing;
- busca por UEx/CNPJ/INEP real;
- comparação com lacunas atuais.

Só interromper por bloqueio real de credencial, CAPTCHA, WAF persistente após ferramentas permitidas, indisponibilidade do serviço, ausência comprovada de granularidade ou esgotamento das rotas técnicas razoáveis.

## 12. Regra de segurança e proveniência

- nunca contornar login, CAPTCHA ou controles de acesso;
- nunca buscar/usar segredo de terceiro;
- tokens oficiais ficam fora do Git;
- preservar URL, data de consulta, competência e campos originais;
- nova fonte complementa; não sobrescreve silenciosamente outra;
- ausência/erro de fonte não vira zero.
