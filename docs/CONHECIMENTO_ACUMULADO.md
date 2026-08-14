# Conhecimento acumulado e oportunidades ainda não materializadas

Este documento preserva **descobertas, pesquisas, comparações, ideias de produto e aprendizados caros de reconstruir** que influenciam a direção do projeto, mas que não necessariamente existem como funcionalidade no repositório canônico.

Ele é especialmente importante para retomadas em novos chats quando o contexto anterior não estiver mais disponível.

## Como interpretar este documento

Cada item deve ser entendido por seu grau de maturidade:

- **INCORPORADO** — já existe no repositório canônico e foi validado na medida indicada pelos documentos técnicos.
- **VALIDADO_FORA_DO_CANONICO** — houve implementação/prova em referência histórica, Manus ou experimento controlado, mas a capacidade ainda não foi incorporada ao canônico.
- **PESQUISA_CONFIRMADA** — fontes/documentação oficiais ou experimentos mostraram que a possibilidade existe, mas ainda falta integração própria.
- **PILOTO_NECESSARIO** — hipótese promissora, porém ainda precisa provar utilidade, cobertura, formato ou acesso com UEx reais de 2026.
- **NAO_PRIORIZADO** — opção analisada e deliberadamente adiada porque agrega pouco valor no estágio atual.

Nenhum item `VALIDADO_FORA_DO_CANONICO`, `PESQUISA_CONFIRMADA` ou `PILOTO_NECESSARIO` deve ser apresentado ao usuário como feature existente.

---

# 1. Princípios de produto que não podem se perder

## 1.1. A escola é a unidade principal de navegação

**Status: direção aprovada, ainda não materializada no frontend novo.**

O usuário fiscal pensa em **unidades escolares**, não em jobs, páginas raspadas, arquivos JSON ou IDs de execução.

A navegação principal desejada é:

```text
4ª CRE
└── Unidade Escolar
    ├── Programa / Ação
    │   └── Parcela
    ├── Conta
    │   └── Movimentações
    └── Evidências
```

Execuções, hashes, parser, artefatos e tentativas de coleta continuam importantes, mas pertencem a uma camada secundária de rastreabilidade.

## 1.2. Três profundidades de leitura

**Status: direção aprovada; parcialmente materializada no Excel v3.**

A interface deve permitir:

1. **10 segundos** — entender a fotografia financeira da escola;
2. **1 minuto** — entender contas, programas, parcelas e fluxo básico do recurso;
3. **investigação** — abrir extrato completo, contraparte, documento e evidência técnica.

A complexidade não deve ser eliminada; deve ser apresentada em camadas.

## 1.3. Site e Excel são produtos irmãos

**Status: Excel materializado; site ainda não.**

O site deve privilegiar compreensão, navegação e acompanhamento. O Excel deve continuar permitindo filtros, cruzamentos e análise livre que não precisam virar tela web.

Não há objetivo de substituir Excel por navegador nem de colocar toda possibilidade analítica do Excel na interface.

## 1.4. “Registros para Conferência” é linguagem melhor que “irregularidades”

**Status: INCORPORADO no Excel v3; ainda não no frontend novo.**

O sistema pode selecionar fatos que merecem atenção, como:

- pagamento informado sem crédito compatível localizado;
- tarifa bancária;
- entrada de terceiro;
- movimento ainda não classificado;
- consulta inconclusiva.

Isso não autoriza concluir automaticamente que houve irregularidade.

## 1.5. Fonte e conclusão são coisas diferentes

**Status: INCORPORADO no núcleo.**

A interface futura deve tornar natural a distinção:

```text
PDDEInfo: pagamento informado
SIGEF: crédito compatível localizado
Conciliador: associação técnica entre os dois
```

Nenhuma dessas linhas deve se passar pela outra.

## 1.6. Mostrar cobertura da fonte

**Status: direção aprovada; ainda não materializada no canônico.**

A comparação com o Manus mostrou valor em exibir explicitamente a cobertura da fonte complementar sem permitir que uma execução parcial substitua a referência principal.

Para o nosso produto, uma evolução útil seria mostrar, por coleta ou escola:

- data/hora da consulta PDDEInfo;
- cobertura SIGEF;
- período coberto;
- consulta completa, parcial ou inconclusiva;
- eventual atraso de fonte.

Isso é mais útil que um selo genérico “atualizado”.

---

# 2. Regra temporal e histórico

## 2.1. A visão corrente é 2026

**Status: regra aprovada e materializada no monitoramento atual; ainda deve subir para invariante do backend institucional.**

Para todas as 163 UEs, o exercício operacional atual é **2026**.

Dados anteriores podem aparecer no HTML bruto do SIGEF ou ser úteis numa investigação histórica, mas não devem contaminar:

- dashboard corrente;
- extrato corrente;
- contagem de aplicações/resgates de 2026;
- registros para conferência;
- conclusão sobre ausência de um fato em 2026.

Uma futura área de histórico pode existir, mas será separada.

## 2.2. Histórico não preenche lacuna corrente

A existência de uma conta, aplicação ou movimento em 2021/2022/2025 não prova sua situação corrente em 2026.

Quando o dado de 2026 não existir, a resposta correta é “não localizado na cobertura de 2026” ou equivalente, e não promover uma evidência histórica para preencher o espaço.

---

# 3. Aplicações financeiras: descoberta e lacuna

## 3.1. O SIGEF permite observar aplicação e resgate como movimentos

**Status: INCORPORADO.**

O extrato SIGEF possui históricos como aplicação automática e resgate. Essas linhas devem ser apresentadas como **fatos de movimentação**, preservando o texto original e uma categoria auxiliar.

## 3.2. Movimento de aplicação não é posição atual do investimento

**Status: lacuna conhecida.**

Hoje o projeto consegue responder que determinada conta teve:

- aplicação;
- resgate;
- valor/data desses movimentos, quando presentes em 2026.

Ainda não existe fonte integrada que permita afirmar com segurança:

- saldo atualmente aplicado;
- posição atual do fundo;
- rendimento acumulado não resgatado;
- eventual identificação interna do investimento.

Não calcular “saldo aplicado atual” somando cegamente aplicações e resgates históricos.

## 3.3. Fontes candidatas para posição/saldo

**Status: PESQUISA_CONFIRMADA / PILOTO_NECESSARIO.**

As pesquisas anteriores apontaram como candidatos:

- relatórios de saldo do próprio PDDEInfo;
- BB Gestão Ágil, mediante acesso institucional;
- produtos estruturados do ecossistema FNDE/Plataforma Antonieta de Barros;
- eventual webservice institucional SIGEF, se o campo estiver disponível.

Essa lacuna é uma prioridade futura depois que a plataforma-base estiver implantada.

---

# 4. Estratégia de aquisição para sistemas legados

## 4.1. Escada de coleta

**Status: regra aprovada.**

Ordem preferencial:

1. HTTP direto + parser determinístico;
2. navegador controlado somente quando a interação for realmente necessária;
3. IA/agente para diagnóstico de mudança de estrutura ou apoio de exploração;
4. interromper e registrar quando houver autenticação, CAPTCHA, autorização ou restrição que não possua rota permitida.

O projeto não adota “browser por padrão” nem IA decidindo a semântica financeira.

## 4.2. Engenharia de parser aprendida na prática

Preservar como conhecimento transversal:

- sistemas FNDE podem responder em Windows-1252/Latin-1, UTF-8 ou mistura problemática;
- identidade da escola/conta retornada deve ser validada contra a consulta solicitada;
- agência, conta, CNPJ, INEP, SME e documentos bancários são identificadores textuais;
- conta com dígito `X` não pode ser convertida para número;
- paginação deve provar cobertura antes de ausência ser concluída;
- estrutura/cabeçalho desconhecido deve falhar de forma explícita;
- o artefato bruto deve ser preservado quando sustenta uma evidência relevante;
- retries devem tratar instabilidade como instabilidade, não como “sem dados”.

## 4.3. CAPTCHA não será contornado

**Status: decisão consolidada.**

Descobrir uma rota pública de resultado que funcione diretamente não é o mesmo que resolver ou burlar CAPTCHA. O canônico só utiliza rotas acessíveis com os identificadores que já possui e valida a resposta devolvida.

---

# 5. PDDEInfo além da consulta individual

## 5.1. Relatórios públicos em lote

**Status: PESQUISA_CONFIRMADA; ainda não incorporado.**

Pesquisas anteriores identificaram famílias de relatórios públicos do PDDEInfo potencialmente úteis para:

- situação de atendimento;
- prestação de contas;
- suspensão;
- consulta de saldo;
- situação de abertura de conta;
- informações cadastrais relacionadas.

O ganho potencial é grande porque são fontes do próprio ecossistema PDDE e podem complementar o prontuário sem exigir outra instituição.

### Experimento necessário

Antes de criar adaptadores:

1. testar cada relatório com parâmetros válidos de 2026;
2. confirmar que a resposta repete/identifica os filtros solicitados;
3. distinguir resultado vazio de formulário inválido/erro;
4. validar granularidade por UEx/CNPJ/INEP;
5. documentar paginação e cobertura;
6. só então promover a fonte ao canônico.

Uma resposta vazia não pode ser tratada como “sem pendência” sem provar que a consulta foi válida.

---

# 6. SIGEF: conhecimentos futuros além do extrato direto já incorporado

## 6.1. Extrato público direto

**Status: INCORPORADO e validado na carteira atual.**

A rota de detalhamento por banco/agência/conta/CNPJ/programa foi incorporada ao canônico e validada nas 284 contas mapeadas da rodada integral de 14/08/2026.

Não rediscutir como hipótese uma capacidade já comprovada.

## 6.2. Códigos de programas

**Status: parcialmente incorporado.**

Códigos atualmente usados/comprovados no fluxo:

- `02` — PDDE Básico;
- `0B` — PDDE Qualidade;
- `0A` — PDDE Equidade.

O normalizador conhece `Z9` para Educação Integral, mas novos códigos nunca devem ser inferidos pelo nome. A associação deve vir de evidência real da fonte.

## 6.3. Novo Webservice do SIGEF

**Status: PESQUISA_CONFIRMADA; não integrado.**

Pesquisa anterior identificou no ecossistema oficial do FNDE o **NOVO WEBSERVICE DO SIGEF**, incluindo uma operação denominada **Consultar Extrato**.

O bloqueio não é uma ideia de implementação, mas a ausência de condições institucionais/documentação suficiente no projeto:

- credencial;
- documentação técnica completa;
- autenticação;
- homologação;
- paginação;
- escopo;
- significado e origem do “Número do Processo”.

### Direção futura

Se houver acesso institucional adequado e o webservice oferecer os dados necessários, preferir a interface institucional ao HTML público para os campos que ela cobrir.

Não substituir a rota pública atual antes de comparar cobertura e qualidade.

---

# 7. BB Gestão Ágil

## 7.1. Valor potencial

**Status: PESQUISA_CONFIRMADA; acesso institucional pendente.**

A pesquisa em fontes oficiais indicou que o BB Gestão Ágil possui integração por API em contextos institucionais e que o ecossistema do PDDE utiliza a ferramenta para acompanhamento de receitas/gastos.

Potencialmente pode acrescentar informações que o extrato SIGEF não entrega de forma suficiente, como:

- movimentação bancária com maior semântica;
- fornecedor/beneficiário;
- categorização da despesa;
- documentos associados;
- vínculo com rotinas de prestação de contas, conforme disponibilidade real da API.

## 7.2. Não fazer scraping da interface do BB

A estratégia correta é buscar acesso institucional à API, não automatizar a interface autenticada.

Perguntas institucionais que devem ser respondidas antes de desenvolver cliente:

- a SME-Rio/4ª CRE pode receber acesso somente leitura?
- quais contas PDDE ficam no escopo?
- qual autenticação/base URL?
- existe homologação?
- quais campos de transação, categoria e documento são expostos?
- paginação, limites e frequência de atualização?

Somente depois disso faz sentido criar um adaptador `bb-gestao-agil`.

---

# 8. Plataforma Antonieta de Barros

**Status: PESQUISA_CONFIRMADA quanto à existência de produtos estruturados; PILOTO_NECESSARIO para conexão.**

A pesquisa encontrou produtos de dados e artefatos estruturados no ecossistema da Plataforma Antonieta de Barros, inclusive produtos derivados de dados financeiros/BB Ágil em outros contextos.

O ponto ainda não certificado é o mecanismo dinâmico usado para:

- listar produtos relacionados ao PDDE;
- consultar tabelas específicas;
- obter a URL real de artefatos/downloads.

### Experimento necessário

Usar inspeção de rede do navegador apenas para descobrir as chamadas XHR/Fetch legítimas da própria página e registrar:

- método;
- endpoint;
- parâmetros/body;
- autenticação/cookies, se houver;
- formato de resposta;
- URL do artefato.

Se a mesma chamada funcionar em cliente HTTP limpo e público, criar adaptador determinístico. Caso exija autenticação não disponível, registrar a limitação.

---

# 9. PDDEREx

**Status: PILOTO_NECESSARIO.**

O PDDEREx foi identificado como fonte pública histórica/relevante do FNDE e pode apresentar valor transferido/previsto, custeio, capital e informações bancárias.

Ainda não há, no canônico, prova suficiente de que uma consulta atual de **2026** para UEx da nossa carteira forneça informação adicional que justifique manter outro parser.

### Experimento mínimo

Testar uma pequena amostra real de UEx de 2026 e responder:

- devolve granularidade por UEx?
- informa dados atuais ou apenas históricos/agregados?
- acrescenta algo que PDDEInfo/SIGEF não oferecem?
- é estável e repetível?

Se não houver ganho material, não integrar apenas porque é outro portal oficial.

---

# 10. Portal da Transparência / CGU

**Status: PESQUISA_CONFIRMADA quanto à API; PILOTO_NECESSARIO para utilidade PDDE/UEx.**

A API oficial do Portal da Transparência é tecnicamente mais atraente que scraping e utiliza chave de acesso.

A questão em aberto não é técnica, mas de **granularidade útil**.

### Piloto recomendado

Consultar alguns CNPJs/OBs já conhecidos e verificar se a API permite recuperar com segurança:

- UEx/CNPJ;
- documento/OB;
- data;
- valor;
- ação/programa ou identificador suficientemente forte.

Se a API retornar apenas agregados sem vínculo útil com as UEx, descartar para o escopo atual.

---

# 11. Dados Abertos FNDE / Olinda

**Status: PESQUISA_CONFIRMADA como fonte secundária; ainda não incorporado.**

O modelo de evidências já prevê `DADOS_ABERTOS_FNDE`.

Uso recomendado:

- controle secundário;
- cruzamentos históricos;
- validação de universo/cadastros quando houver dataset atual.

Limitação conhecida: frescor e cobertura precisam ser avaliados dataset a dataset. Não promover um conjunto histórico a fonte corrente de 2026.

---

# 12. SiGPC

## 12.1. Acesso Público

**Status: PILOTO_NECESSARIO / prioridade posterior.**

Pode ser útil para prestação de contas e regularidade histórica, mas pesquisas anteriores indicaram maior dificuldade técnica/proteção da interface pública.

Só vale um coletor próprio se houver informação exclusiva suficiente para o trabalho da 4ª CRE.

## 12.2. Contas Online

**Status: fonte rica, porém autenticada; não destinada a scraping automatizado.**

Se futuramente houver necessidade e autorização, preferir:

- integração oficial;
- exportação autorizada;
- importação assistida.

Não automatizar sessão gov.br/perfil institucional como atalho.

---

# 13. Fontes analisadas e não priorizadas agora

## Power BI / painéis PDDE

**Status: NAO_PRIORIZADO para coleta.**

Úteis para conferência visual e descoberta, mas ruins como dependência primária de extração quando as fontes subjacentes são melhores.

## PDDEWeb

**Status: NAO_PRIORIZADO.**

Autenticado e com baixo ganho em relação às fontes já disponíveis para o problema financeiro atual.

## SIMEC / PDDE Interativo

**Status: NAO_PRIORIZADO no monitor financeiro atual.**

Pode ter valor em módulos específicos no futuro, mas não deve ampliar o escopo antes da plataforma-base.

## Transferegov

**Status: NAO_PRIORIZADO para PDDE atual.**

Possui boas APIs para outras transferências, porém a maior parte do PDDE escolar não se enquadra no problema que essas APIs resolvem com a granularidade que precisamos.

---

# 14. Evolução conceitual para múltiplas fontes

**Status: direção futura; não implementar prematuramente.**

O projeto nasceu comparando essencialmente PDDEInfo e SIGEF. A pesquisa de novas fontes sugere que, no futuro, pode fazer sentido representar:

```text
Fato financeiro
├── observado no PDDEInfo
├── observado no SIGEF
├── observado no BB Gestão Ágil
└── observado em outra fonte oficial
```

em vez de um modelo rígido “fonte A versus fonte B”.

Essa mudança só deve ocorrer quando houver pelo menos uma terceira fonte realmente integrada e útil. Não redesenhar o domínio agora para acomodar fontes hipotéticas.

---

# 15. Aprendizados do projeto paralelo Manus

**Status: VALIDADO_FORA_DO_CANONICO / referência somente leitura.**

Repositório: `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`.

Regra absoluta: este fluxo pode **ler, analisar e reaproveitar ideias/código seletivamente**, mas não deve escrever no repositório do Manus.

Ideias de produto/UX que merecem permanecer disponíveis:

- referência primária claramente identificada;
- cobertura SIGEF exibida como camada complementar;
- execução parcial nunca substitui automaticamente a referência completa;
- seletor de execução para auditoria avançada;
- dossiê por escola;
- filtros por escola/programa/campo;
- detalhes técnicos recolhidos sob rastreabilidade/evidências;
- alto contraste, foco visível e responsividade;
- métricas operacionais compactas em vez de dashboard decorativo.

### Cuidado ao comparar resultados

O Manus utiliza estratégias e ritmos de coleta próprios e, em seu estado analisado em 14/08/2026, mostrava cobertura SIGEF parcial em seu fluxo. Isso **não reduz** a cobertura já validada no canônico, que consultou 284/284 contas mapeadas na rodada integral.

A inspiração é de produto e engenharia, não de adotar as limitações de outra implementação.

---

# 16. Aprendizados do repositório histórico ChatGPT

**Status: VALIDADO_FORA_DO_CANONICO / referência técnica.**

Repositório: `WilsonMPeixoto-2/extrator-pdde-4cre`.

Capacidades úteis já exploradas ali e candidatas a reaproveitamento seletivo:

- interface de auditoria institucional;
- filtros por execução, data, escola, programa e campo;
- comparador histórico por observação;
- referência direta para HTML/JSON preservado;
- dossiê financeiro escolar;
- experiências E2E e tratamento de falhas parciais;
- soluções de deploy AppDeploy da fase anterior.

Não reativar o repositório como segunda linha de desenvolvimento. Transportar somente o que agregar valor ao canônico atual.

---

# 17. Frontend futuro: desenho já amadurecido

**Status: direção aprovada; não implementada.**

Navegação proposta:

1. **Visão Geral**
2. **Unidades Escolares**
3. **Prontuário da Unidade**
4. **Registros para Conferência**
5. **Atualizações**
6. **Evidências / Rastreabilidade**

O prontuário deve apresentar:

- identidade da escola/UEx;
- CNPJ;
- programas/ações existentes para aquela unidade;
- contas separadas por programa;
- parcelas explícitas;
- valor programado;
- pagamento informado;
- crédito SIGEF em campo próprio;
- extrato cronológico;
- contraparte/origem expansível;
- evidência técnica no terceiro nível.

Não mostrar abas vazias de programas que a escola não possui apenas para manter simetria visual.

---

# 18. Read model financeiro futuro

**Status: não implementado; requisito da próxima fase.**

O frontend não deve reconstruir o domínio a partir de `evidence_events` nem baixar um JSON bruto de todas as escolas para fazer joins no navegador.

O backend deverá fornecer leitura corrente em estruturas próximas ao uso real:

```text
Carteira
└── Escola
    ├── Resumo
    ├── Programas / parcelas
    ├── Contas
    ├── Movimentações 2026
    ├── Registros para conferência
    └── referências de evidência
```

A trilha append-only continua servindo auditoria e histórico, mas não precisa ser a representação usada diretamente na tela.

---

# 19. Sequência técnica atual

A sequência aprovada em 14/08/2026 é:

1. consolidar documentação e baseline;
2. criar `MONITORING` como capacidade institucional;
3. criar/conectar Supabase dedicado e read model financeiro;
4. expor API fiscal;
5. construir/publicar frontend novo;
6. ampliar fontes, inclusive posição de aplicações/rendimentos, e limpar legado.

Não pular para uma fonte nova apenas porque a pesquisa ficou interessante. Primeiro transformar o que já foi comprovado em produto utilizável.

---

# 20. Protocolo de retomada para novos chats/agentes

Quando um novo chat assumir o projeto:

### Leitura mínima obrigatória

1. `README.md`
2. `docs/BASELINE_TECNICO_2026-08-14.md` ou baseline mais recente
3. `docs/CONHECIMENTO_ACUMULADO.md`
4. `docs/DECISOES.md`
5. `docs/FONTES_E_REGRAS.md`
6. `docs/ARCHITECTURE.md`
7. `docs/VISAO_FISCAL.md` quando atuar em dados de apresentação/Excel/site

### Depois da leitura

- consultar a `main` atual do GitHub;
- comparar o SHA atual com o baseline;
- revisar commits posteriores ao baseline;
- ler o código real da área que será alterada;
- verificar CI e execuções recentes;
- só então planejar alterações.

### Governança de repositórios

- **escrever:** `WilsonMPeixoto-2/pdde-repasse-conciliador`;
- **referência histórica:** `WilsonMPeixoto-2/extrator-pdde-4cre`;
- **Manus somente leitura:** `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`.

### Regra contra memória obsoleta

Handoffs, resumos de chat e este próprio documento preservam conhecimento, mas **não substituem a inspeção da `main`**. Se uma capacidade já tiver evoluído, atualizar a documentação em vez de forçar o código atual a caber numa memória antiga.

O objetivo desta memória institucional é impedir repetição de pesquisa e perda de decisões, não congelar o projeto no estado de 14/08/2026.
