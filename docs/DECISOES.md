# Decisões consolidadas

Este arquivo registra somente decisões que seriam caras de rediscutir ou reconstruir. Ele não é um changelog e não precisa ser atualizado a cada alteração de código.

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

**Decisão:** a aplicação web deve mostrar primeiro execução, escola, resumo financeiro, exceções e ações úteis. Hashes, URLs, parser, evidências e metadados ficam disponíveis em camada secundária sob demanda.

**Motivo:** experimentos paralelos mostraram melhor usabilidade quando a complexidade técnica permaneceu acessível sem dominar a tela.

## 2026-08-12 — Reaproveitar por componente, não por repositório

**Decisão:** soluções dos protótipos paralelos serão incorporadas seletivamente ao canônico. Não haverá migração cega de uma pilha inteira.

**Motivo:** cada linha possui pontos fortes distintos e também dependências/runtime que não queremos herdar automaticamente.
