# Decisões consolidadas

## 2026-09-02 — Site e Excel compartilham uma arquitetura operacional ampliada

**Decisão:** o produto deixa de organizar apenas o núcleo financeiro e passa a incorporar, no mesmo read model humano, cadastro/mandato, composição custeio-capital, abertura e ocorrência de conta, suspensões/motivos, prestação de contas e cobertura das fontes.

A navegação global passa a refletir as dez dimensões operacionais também usadas no Excel: **Visão geral, Escolas, Repasses, Contas e saldos, Evolução mensal, Movimentações, Cadastro e habilitação, Pendências e suspensões, Prestação de contas e Cobertura das fontes**. O prontuário continua oferecendo a leitura integrada por escola. Site e Excel compartilham os mesmos domínios; diferem na densidade e na forma de interação, não no universo de informação acessível.

**Decisão:** fato estruturado não é duplicado como mensagem genérica de acompanhamento. Ausência de registro permanece distinta de fonte indisponível.

**Motivo:** o PDDEInfo e relatórios FNDE já publicam um universo maior de informações do que a interface antiga aproveitava. A ampliação deve aumentar capacidade explicativa sem transformar a experiência em navegação por fonte nem contar a mesma ocorrência duas vezes.


## 2026-08-30 — Manutenção de dependências é isolada de mudanças financeiras

**Decisão:** atualizações de toolchain, CI e infraestrutura de testes são promovidas em PR próprio sobre a `main`, sem transportar mudanças de completude financeira ou segurança semântica.

O ciclo incorpora Playwright Test, Axe e MSW como gates de experiência e integração. Motion 13.1.1 é aceito após smoke visual. PGlite sobe para 0.5.8. A dependência opcional explícita de Rollup Linux é removida após validação Linux.

**Zod 4.5 permanece adiado** até cumprir a condição já definida de maturação e benchmark. Um CI verde não substitui esse critério.

**Motivo:** reduzir risco de regressão e tornar rastreável se uma falha decorre de regra financeira, frontend, dependência ou infraestrutura de teste.

Este arquivo registra decisões caras de rediscutir ou reconstruir. **Não é um changelog nem uma descrição automática do estado atual.** O estado operacional corrente está em [`ESTADO_ATUAL_2026-08-30.md`](ESTADO_ATUAL_2026-08-30.md).

## 2026-08-19 — Encontrabilidade é parte do produto financeiro

**Decisão:** a navegação principal é orientada às perguntas de trabalho e não apenas à estrutura de auditoria. A experiência oferece entradas diretas para **Início, Escolas, Repasses e Saldos e contas**, busca global de escola e navegação local no prontuário.

Indicadores agregados devem permitir chegar aos casos que os compõem. Códigos SME devem ser localizáveis tanto na forma canônica de 7 dígitos quanto na forma institucional pontuada.

**Motivo:** uma plataforma capaz de extrair corretamente os dados ainda falha como ferramenta de trabalho se o usuário precisa “caçar” escola, repasse, conta ou saldo.

## 2026-08-19 — A consulta ao vivo não cria duas verdades na mesma sessão

**Decisão:** quando uma consulta integral válida é promovida para a sessão, um prontuário já aberto deve acompanhar a nova versão do retrato. Resultado parcial/falho continua impedido de substituir o retrato anterior.

**Motivo:** carteira atualizada e escola antiga na mesma sessão gerariam inconsistência de apresentação, mesmo sem corrupção do dado.

## 2026-08-19 — Documentos datados são fotografias, não status corrente

**Decisão:** baseline, auditoria e plano datados preservam o estado daquele momento. Para saber o que existe hoje, prevalecem `main`, verificações do commit corrente, README e `ESTADO_ATUAL_2026-08-30.md`.

**Motivo:** o projeto evoluiu rapidamente entre 14 e 19/08; manter frases antigas como “frontend não publicado” sem hierarquia documental pode induzir retrabalho.

## 2026-08-16 — Relatórios públicos complementares passam a integrar a visão financeira

**Decisão:** atendimento/ordem, prestação de contas e posições mensais de saldo/aplicações do PDDEInfo/FNDE são fontes oficiais integradas do canônico após o piloto integral de 2026.

**Motivo:** a rodada de 16/08 comprovou cobertura e integridade suficientes para incorporar esses fatos mantendo sua data de referência e independência das demais fontes.

## 2026-08-16 — Frontend humano é publicado sem expor o pipeline técnico

**Decisão:** o produto web consome o read model humano e organiza a experiência por escola, programa, conta, saldo e movimentação. Hashes, parser, retries, URLs técnicas e payloads não pertencem à leitura comum.

**Motivo:** rastreabilidade técnica continua disponível no backend sem impor ao fiscal a arquitetura do coletor.

## 2026-08-14 — A visão operacional corrente é 2026

**Decisão:** para as 163 UEs, a visão operacional trabalha exclusivamente com **2026**. Dados anteriores podem ser preservados ou investigados separadamente, mas não completam lacunas nem entram silenciosamente em saldos, aplicações, repasses ou conferências correntes.

**Motivo:** fontes como o SIGEF devolvem histórico de vários exercícios; uma narrativa verdadeira sobre o passado pode ser errada para a pergunta operacional atual.

## 2026-08-14 — Código existente não significa sistema implantado

**Decisão:** comunicação e documentação distinguem **implementado**, **validado**, **conectado/implantado** e **publicado**.

**Estado posterior:** desde 16–19/08 o frontend, o job `MONITORING` e os relatórios públicos complementares avançaram de estágio. A regra permanece válida, especialmente para o Supabase dedicado, que ainda não foi implantado.

## 2026-08-14 — A escola é a unidade principal do produto

**Decisão:** a hierarquia humana prioritária é:

```text
4ª CRE → Escola → Programa/Ação → Conta → Parcela → Movimentações → Evidência
```

Execuções e metadados técnicos permanecem numa camada de rastreabilidade.

## 2026-08-14 — A visão fiscal humana é o contrato de apresentação

**Decisão:** a camada por escola/programa/parcela/conta é a referência semântica para frontend e relatórios destinados ao usuário. A base operacional plana pode continuar existindo para processamento, filtros e integrações.

## 2026-08-14 — Site e Excel são produtos complementares

**Decisão:** o site prioriza compreensão, navegação e investigação; Excel prioriza análise livre, filtros e cruzamentos. Um não precisa reproduzir integralmente o outro.

## 2026-08-14 — Aplicação/resgate não prova posição ou rendimento atual

**Decisão:** movimentos SIGEF de aplicação e resgate podem ser exibidos como fatos do extrato. Eles não autorizam calcular automaticamente saldo aplicado corrente ou rendimento acumulado.

**Estado posterior:** os relatórios públicos FNDE passaram a fornecer posições aplicadas datadas, que continuam distintas de rendimento.

## 2026-08-13 — Evidência operacional é append-only

**Decisão:** coletas, artefatos, observações e achados relevantes entram em trilha de eventos append-only. Eventos persistidos não são reescritos para representar “estado atual”; projeções de leitura são reconstruídas a partir da sequência registrada.

Fatos observados por fonte e conclusões do conciliador permanecem distinguíveis.

## 2026-08-12 — Um único repositório de implementação

**Decisão:** `WilsonMPeixoto-2/pdde-repasse-conciliador` é o repositório canônico do fluxo ChatGPT/OpenAI. `extrator-pdde-4cre` é referência histórica/técnica. `EXTRATOR-PDDE-MANUS` é projeto paralelo exclusivo do Manus e somente leitura neste fluxo.

## 2026-08-12 — Documentação mínima e não bloqueante

**Decisão:** documentação preserva decisões, regras e conhecimento caro de reconstruir. Não deve virar atividade principal nem gate burocrático de cada commit visual.

## 2026-08-12 — PDDEInfo por INEP é a estratégia primária

**Decisão:** a carteira fixa da 4ª CRE prioriza consulta direta e determinística por INEP, em vez de depender das exportações legadas do portal.

## 2026-08-12 — Não inferir dado corrente ausente

**Decisão:** ausência na fonte corrente não é zero e não autoriza preencher automaticamente conta, valor ou estado com referência histórica ou dado de outro programa.

## 2026-08-12 — Fontes permanecem independentes

**Decisão:** PDDEInfo, SIGEF e demais fontes não sobrescrevem silenciosamente umas às outras. Divergências e coberturas distintas permanecem visíveis.

## 2026-08-12 — Pagamento, ordem e crédito são fatos distintos

**Decisão:** `Valor Pago/Pagamento informado` no PDDEInfo não significa automaticamente crédito bancário. Ordem/liberação e crédito compatível localizado são níveis distintos de evidência.

## 2026-08-12 — Cobertura insuficiente produz estado inconclusivo

**Decisão:** indisponibilidade, CAPTCHA, arquivo ausente ou cobertura temporal insuficiente nunca são convertidos em “não pago” nem “confirmado”.

## 2026-08-12 — CAPTCHA não será contornado

**Decisão:** CAPTCHA, autenticação ou restrição externa são estados operacionais explícitos; o projeto não implementa bypass.

## 2026-08-12 — Regra financeira final é determinística

**Decisão:** IA, agentes e navegadores podem auxiliar coleta, pesquisa, diagnóstico e UX. Conciliação e conclusão financeira permanecem baseadas em regras testáveis.

## 2026-08-12 — Dinheiro usa centavos inteiros

**Decisão:** cálculos monetários críticos usam inteiros em centavos para evitar ambiguidades de ponto flutuante.

## 2026-08-12 — Evidência forte exige chave forte

**Decisão:** valor semelhante isoladamente não liga pagamento, ordem e crédito. A associação considera a combinação mais forte disponível de CNPJ/INEP, exercício, programa, ação, parcela, valor, data, documento e conta.

## 2026-08-12 — Preservar evidência bruta quando agrega valor

**Decisão:** artefatos relevantes podem ser preservados com data/hora, origem e SHA-256 quando sustentam uma conclusão ou permitem reproduzir o parsing.

## 2026-08-12 — Interface prioriza operação, não arqueologia técnica

**Decisão:** a experiência mostra primeiro escola, resumo financeiro, exceções e ações úteis. Metadados técnicos ficam disponíveis em camada secundária apropriada.

## 2026-08-12 — Reaproveitar por componente, não por repositório

**Decisão:** soluções de protótipos paralelos podem ser incorporadas seletivamente. Não haverá migração cega de runtime, banco ou pilha inteira de outro projeto.
