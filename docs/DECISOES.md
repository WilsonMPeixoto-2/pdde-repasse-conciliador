# Decisões consolidadas

Este arquivo registra somente decisões que seriam caras de rediscutir ou reconstruir. Ele não é um changelog e não precisa ser atualizado a cada alteração de código.

## 2026-08-14 — A visão operacional corrente é 2026

**Decisão:** para todas as 163 UEs, o produto operacional atual trabalha exclusivamente com o exercício de **2026**.

Dados anteriores podem ser preservados como evidência bruta ou usados numa investigação histórica separada, mas não podem preencher lacunas nem compor saldos, aplicações, resgates, repasses ou registros para conferência da visão corrente.

**Motivo:** uma fonte como o SIGEF pode devolver histórico de vários exercícios. Misturar 2021/2025 numa análise corrente de 2026 produz uma narrativa tecnicamente verdadeira sobre o passado, mas errada para a pergunta operacional atual.

## 2026-08-14 — Código existente não significa sistema implantado

**Decisão:** documentação e comunicação do projeto devem distinguir explicitamente quatro estados: **implementado no código**, **validado**, **conectado/implantado** e **publicado para uso**.

Em 14/08/2026, não há Supabase dedicado conectado, frontend fiscal novo publicado nem site desta plataforma no Vercel.

**Motivo:** evitar que novos chats ou desenvolvedores interpretem arquivos de frontend, migrations ou adaptadores como prova de uma implantação que ainda não ocorreu.

## 2026-08-14 — A escola é a unidade principal do produto

**Decisão:** o produto web futuro será organizado prioritariamente por unidade escolar, e não por execução, transação, arquivo ou job.

A hierarquia desejada é:

```text
4ª CRE → Escola → Programa/Ação → Conta → Parcela → Movimentações → Evidência
```

Execuções e metadados técnicos permanecem acessíveis numa camada de rastreabilidade.

**Motivo:** essa estrutura corresponde ao trabalho real de fiscalização e reduz a necessidade de o usuário reconstruir mentalmente o pipeline técnico.

## 2026-08-14 — A visão fiscal humana é o contrato de apresentação

**Decisão:** a camada fiscal por escola/programa/parcela/conta é a referência semântica para o futuro frontend e para relatórios destinados ao usuário.

A base plana operacional continua existindo para processamento, filtros e integrações, mas não deve ditar a experiência humana.

**Motivo:** a visão fiscal preserva a complexidade necessária sem expor a estrutura interna do coletor como interface de trabalho.

## 2026-08-14 — Site e Excel são produtos complementares

**Decisão:** o futuro site prioriza compreensão, navegação, acompanhamento e investigação. O Excel continua sendo uma ferramenta de análise livre, filtros e cruzamentos.

**Motivo:** não há benefício em reproduzir no navegador toda capacidade exploratória de uma planilha nem em reduzir o Excel a uma cópia da tela.

## 2026-08-14 — Monitoramento completo será uma capacidade institucional

**Decisão:** o fluxo já comprovado `PDDEInfo → contas → SIGEF → visão operacional → visão fiscal → artefatos` será promovido a job institucional `MONITORING` antes da implantação da plataforma.

**Motivo:** hoje a melhor coleta ainda é orquestrada principalmente por scripts/workflows, enquanto a infraestrutura institucional de fila/API/worker conhece `PDDEINFO` e `RECONCILIATION`. A integração elimina essa divisão arquitetural antes do frontend novo.

## 2026-08-14 — Conhecimento de pesquisa terá grau de maturidade explícito

**Decisão:** descobertas de pesquisas, protótipos e repositórios paralelos devem ser preservadas, mas classificadas como incorporadas, validadas fora do canônico, pesquisa confirmada, piloto necessário ou não priorizadas.

**Motivo:** evitar dois erros opostos: perder descobertas caras quando o contexto de chat acabar ou tratar uma ideia promissora como funcionalidade já existente.

## 2026-08-14 — Aplicação/resgate não prova posição atual do investimento

**Decisão:** movimentos SIGEF de aplicação e resgate podem ser apresentados como fatos do extrato. Eles não autorizam calcular automaticamente o saldo atualmente aplicado ou rendimento acumulado.

**Motivo:** posição de investimento é uma informação distinta e exige fonte adequada. A lacuna deverá ser tratada futuramente por relatórios de saldo, BB Gestão Ágil, webservice ou outra evidência oficial que realmente exponha a posição corrente.

## 2026-08-13 — Evidência operacional é append-only

**Decisão:** coletas, artefatos, observações e achados relevantes entram em uma trilha de eventos append-only. Eventos já persistidos não são atualizados nem apagados para representar “estado atual”; projeções de leitura reconstroem execução e histórico escolar a partir da sequência registrada.

Cada evento possui sequência, `previousHash` e SHA-256 próprio. A implementação local usa JSONL com verificação de integridade e o schema Postgres/Supabase adota o mesmo princípio, com escrita serializada e bloqueio de `UPDATE`/`DELETE`.

Observações de fontes externas mantêm a origem da própria fonte. Conclusões derivadas pelo motor são registradas separadamente com origem `CONCILIADOR` e podem apontar para a coleta que as fundamentou.

**Motivo:** preservar a história, evitar sobrescrita silenciosa de evidência e permitir auditoria/reconstrução de resultados sem confundir fato observado com conclusão derivada.

## 2026-08-12 — Um único repositório de implementação

**Decisão:** `WilsonMPeixoto-2/pdde-repasse-conciliador` é o repositório canônico do fluxo ChatGPT/OpenAI.

`extrator-pdde-4cre` passa a ser referência histórica/técnica. `EXTRATOR-PDDE-MANUS` é projeto paralelo exclusivo do Manus e somente leitura para este fluxo.

**Motivo:** impedir desenvolvimento distribuído, sobrescrita entre ferramentas e dúvida futura sobre a fonte de verdade.

## 2026-08-12 — Documentação mínima e não bloqueante

**Decisão:** documentação serve para preservar decisões, regras e conhecimento caro de reconstruir. Não será gate de CI e não precisa acompanhar cada commit, refatoração ou ajuste visual.

**Motivo:** evitar que manutenção documental vire atividade principal ou trava burocrática do desenvolvimento.

## 2026-08-12 — PDDEInfo por INEP como estratégia primária

**Decisão:** priorizar consulta direta e determinística do PDDEInfo por INEP para a carteira fixa da 4ª CRE, em vez de depender das exportações legadas do portal.

**Motivo:** a coleta direta já foi comprovada em escala municipal e no recorte das 163 unidades.

## 2026-08-12 — Não inferir dado corrente ausente

**Decisão:** ausência na fonte corrente não é zero e não autoriza preencher automaticamente conta, valor ou estado com referência histórica ou dado de outro programa.

**Motivo:** as 47 contas PDDE Básico não apresentadas em 2026 demonstraram que referências históricas podem ser múltiplas e ambíguas.

## 2026-08-12 — Fontes permanecem independentes

**Decisão:** PDDEInfo, SIGEF e demais fontes não sobrescrevem silenciosamente umas às outras. Divergências devem permanecer visíveis.

**Motivo:** cada sistema observa fatos diferentes e possui cobertura temporal própria.

## 2026-08-12 — Pagamento, OB e crédito são fatos distintos

**Decisão:** `Valor Pago` no PDDEInfo não significa automaticamente crédito bancário. Ordem bancária, crédito localizado e confirmação bancária são estados de evidência diferentes.

**Motivo:** evitar afirmação financeira mais forte do que a fonte realmente comprova.

## 2026-08-12 — Cobertura insuficiente produz estado inconclusivo

**Decisão:** indisponibilidade, CAPTCHA, arquivo ausente ou cobertura temporal insuficiente nunca são convertidos em “não pago” nem em “confirmado”.

**Motivo:** a primeira execução real parcial do conciliador demonstrou corretamente que 520 linhas deveriam permanecer inconclusivas sem Liberações.

## 2026-08-12 — CAPTCHA não será contornado

**Decisão:** CAPTCHA, autenticação ou restrição externa são estados operacionais explícitos. O projeto não implementará bypass.

**Motivo:** autonomia deve respeitar os limites técnicos e de acesso da fonte.

## 2026-08-12 — Regra financeira final é determinística

**Decisão:** IA, agentes e navegadores podem auxiliar coleta, diagnóstico de mudanças e UX. Conciliação e conclusão financeira permanecem baseadas em regras testáveis.

**Motivo:** previsibilidade, reprodutibilidade e auditabilidade.

## 2026-08-12 — Dinheiro em centavos inteiros

**Decisão:** cálculos monetários críticos usam inteiros em centavos, evitando dependência de ponto flutuante.

**Motivo:** reduzir erros de arredondamento e facilitar comparação exata.

## 2026-08-12 — Evidência forte exige chave forte

**Decisão:** valor parecido não basta para ligar pagamento, OB e crédito. A conciliação considera, conforme disponibilidade, CNPJ, exercício, programa, ação, parcela, valor, data, documento/OB e conta.

**Motivo:** créditos fracionados, múltiplas ordens, aplicações, estornos e outros lançamentos tornam correspondência por valor isolado insegura.

## 2026-08-12 — Preservar evidência bruta quando ela agrega valor

**Decisão:** artefatos relevantes podem ser preservados com data/hora, origem e SHA-256, especialmente quando sustentam uma conclusão financeira ou permitem reproduzir parsing.

**Motivo:** permitir auditoria sem transformar todo arquivo transitório em patrimônio eterno do repositório Git.

## 2026-08-12 — Interface deve priorizar operação, não arqueologia técnica

**Decisão:** a aplicação web deve mostrar primeiro escola, resumo financeiro, exceções e ações úteis. Hashes, URLs, parser, execuções e metadados ficam disponíveis em camada secundária sob demanda.

**Motivo:** experimentos paralelos mostraram melhor usabilidade quando a complexidade técnica permaneceu acessível sem dominar a tela.

## 2026-08-12 — Reaproveitar por componente, não por repositório

**Decisão:** soluções dos protótipos paralelos serão incorporadas seletivamente ao canônico. Não haverá migração cega de uma pilha inteira.

**Motivo:** cada linha possui pontos fortes distintos e também dependências/runtime que não queremos herdar automaticamente.