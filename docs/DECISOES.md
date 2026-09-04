# Decisões consolidadas

Este arquivo registra decisões caras de rediscutir ou reconstruir. **Não é changelog nem estado operacional.** O estado corrente está em [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md).

## 2026-09-04 — Qualidade e confiança prevalecem sobre velocidade

**Decisão:** uma coleta integral pode levar muitos minutos. O tempo de execução não deve ser reduzido à custa de retries, fallbacks, cruzamento de fontes, descoberta de meses, investigação de divergências ou validação de cobertura.

**Regra:** execução longa saudável não é falha. Falha é timeout, cancelamento, fonte quebrada, cobertura insuficiente ou resultado `PARTIAL`.

**Motivo:** o objetivo do sistema é produzir a melhor informação possível, não terminar rapidamente com lacunas ou falsos zeros.

## 2026-09-04 — Ausência, zero e incoerência são estados diferentes

**Decisão:** ausência de valor não pode ser renderizada nem exportada como zero sem evidência de que a fonte publicou zero. Se uma fonte informa pagamento e outra não localiza crédito/saldo, a divergência permanece explícita e deve acionar investigação/cobertura complementar.

**Regra:** conta corrente igual a zero não significa recurso total zero quando aplicações ou saldo total são positivos. Toda posição de saldo deve carregar data de referência.

**Motivo:** a confiança do produto depende de explicar contradições, não de fazê-las desaparecer visualmente.

## 2026-09-04 — Coleta só é “atualizada em produção” quando o snapshot novo é servido

**Decisão:** terminar uma coleta não basta. A cadeia obrigatória é:

`Full 163 -> COMPLETE 163/163 -> artefato da mesma run -> snapshot -> main -> Vercel -> manifesto público`.

O publisher deve consumir exatamente o artefato da execução validada e registrar `workflowRunId`/`artifactId`. Uma execução mais antiga não pode sobrescrever uma mais nova.

**Motivo:** foi comprovado que o sistema conseguia coletar novamente enquanto produção continuava servindo o snapshot histórico `32164281411 / 9335143477`.

## 2026-09-04 — Gate financeiro não será enfraquecido para compensar falha de ambiente

**Decisão:** se uma execução fica `PARTIAL` por problema de runtime, corrigir o runtime em vez de relaxar a regra financeira.

O incidente da run #213 foi resolvido instalando Chromium no runner para o fallback Playwright. O gate `COMPLETE` + 163/163 permaneceu intacto e a run #216 passou integralmente.

## 2026-09-04 — Falha de fonte complementar não vira prova negativa

**Decisão:** a falha `ACCOUNT_OPENING` causada pelo erro Oracle do relatório FNDE é preservada como indisponibilidade/cobertura da fonte. Ela não significa que a escola não possui conta.

**Motivo:** uma fonte suplementar quebrada não pode apagar evidência de fontes nucleares nem fabricar ausência.

## 2026-09-04 — Documentação possui porta de entrada e hierarquia obrigatórias

**Decisão:** `AGENTS.md`, `docs/LEIA_PRIMEIRO.md`, o `ESTADO_ATUAL_YYYY-MM-DD.md` soberano e `CONTINUIDADE_WORK.md` formam a cadeia obrigatória de retomada.

Planos, auditorias, baselines, handoffs e prompts datados são históricos. Antes de executar uma tarefa antiga, é obrigatório conferir se hotfixes/PRs posteriores já a resolveram ou mudaram a regra.

**Motivo:** impedir que novos chats andem em círculos ou causem regressão por ler documentos corretos para uma data antiga como se fossem instruções atuais.

## 2026-09-02 — Site e Excel compartilham uma arquitetura operacional ampliada

**Decisão:** o produto não se limita ao núcleo de repasse/saldo. O mesmo read model humano preserva cadastro/mandato, composição custeio-capital, abertura/ocorrência de conta, suspensões/motivos, prestação de contas e cobertura das fontes.

A navegação global e o Excel passam a refletir dez dimensões: **Visão geral, Escolas, Repasses, Contas e saldos, Evolução mensal, Movimentações, Cadastro e habilitação, Pendências e suspensões, Prestação de contas e Cobertura das fontes**.

Fato estruturado não deve ser duplicado como mensagem genérica. Ausência de registro permanece distinta de fonte indisponível.

## 2026-08-30 — Manutenção de dependências é isolada de mudanças financeiras

**Decisão:** atualizações de toolchain, CI e infraestrutura de testes são promovidas em PR próprio, sem transportar silenciosamente mudanças de regra financeira.

Playwright Test, Axe e MSW entram como gates de experiência/integração. Dependências com potencial impacto semântico continuam sujeitas a critérios adicionais de maturação/benchmark.

## 2026-08-19 — Encontrabilidade é parte do produto financeiro

**Decisão:** navegação principal é orientada às perguntas de trabalho. Indicadores agregados precisam permitir chegar aos casos que os compõem. Códigos SME devem ser localizáveis em forma canônica e institucional.

## 2026-08-19 — A consulta ao vivo não cria duas verdades na mesma sessão

**Decisão:** quando uma consulta integral válida é promovida, um prontuário já aberto acompanha a nova versão do retrato. Resultado parcial/falho não substitui o retrato anterior.

## 2026-08-19 — Documentos datados são fotografias, não status corrente

**Decisão:** baseline, auditoria, checkpoint e plano datados preservam o estado daquela data. Para estado corrente prevalecem código/testes/produção e a cadeia documental soberana indicada em `LEIA_PRIMEIRO.md`.

## 2026-08-16 — Relatórios públicos complementares integram a visão financeira

**Decisão:** atendimento/ordem, prestação de contas e posições mensais de saldo/aplicações do PDDEInfo/FNDE podem integrar o canônico quando a coleta/contrato está validado, mantendo data de referência e independência das demais fontes.

## 2026-08-16 — Frontend humano não expõe o pipeline técnico

**Decisão:** o produto web consome o read model humano. Hashes, parser, retries, URLs técnicas e payloads pertencem à rastreabilidade, não à leitura comum.

## 2026-08-14 — A visão operacional corrente é 2026

**Decisão:** para as 163 UEs, a visão operacional trabalha com **2026**. Dados anteriores podem ser preservados ou investigados separadamente, mas não completam lacunas correntes.

## 2026-08-14 — Código existente não significa sistema implantado

**Decisão:** comunicação e documentação distinguem **implementado**, **validado**, **conectado/implantado** e **publicado**.

## 2026-08-14 — A escola é a unidade principal do produto

**Decisão:** a hierarquia humana prioritária é:

```text
4ª CRE → Escola → Programa/Ação → Conta → Parcela → Movimentações → Evidência
```

## 2026-08-14 — A visão fiscal humana é o contrato de apresentação

**Decisão:** a camada por escola/programa/parcela/conta é a referência semântica para frontend e relatórios humanos. A base plana pode continuar para processamento/auditoria.

## 2026-08-14 — Site e Excel são produtos complementares

**Decisão:** o site prioriza compreensão, navegação e investigação; Excel prioriza análise livre, filtros e cruzamentos. Ambos compartilham o universo de informação, não necessariamente a mesma densidade visual.

## 2026-08-14 — Aplicação/resgate não prova posição ou rendimento atual

**Decisão:** movimentos de aplicação/resgate podem ser exibidos como fatos do extrato. Não autorizam reconstruir automaticamente saldo aplicado corrente ou rendimento acumulado.

## 2026-08-13 — Evidência operacional é append-only

**Decisão:** coletas, artefatos, observações e achados relevantes entram em trilha de eventos. Fatos observados por fonte e conclusões do conciliador permanecem distinguíveis.

## 2026-08-12 — Um único repositório de implementação

**Decisão:** `WilsonMPeixoto-2/pdde-repasse-conciliador` é o repositório canônico. `extrator-pdde-4cre` é referência histórica/técnica. `EXTRATOR-PDDE-MANUS` é somente leitura neste fluxo.

## 2026-08-12 — Documentação preserva conhecimento caro de reconstruir

**Decisão:** documentação não deve virar burocracia de cada ajuste visual, mas mudanças materiais de regra, fonte, arquitetura, produção ou continuidade precisam ser registradas no conjunto canônico.

## 2026-08-12 — PDDEInfo por INEP é estratégia primária

**Decisão:** a carteira fixa da 4ª CRE prioriza consulta direta/determinística por INEP em vez de depender apenas de exportações legadas.

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

**Decisão:** IA/agentes/navegadores podem auxiliar coleta, pesquisa, diagnóstico e UX. Conciliação e conclusão financeira permanecem regras testáveis.

## 2026-08-12 — Dinheiro usa centavos inteiros

**Decisão:** cálculos monetários críticos usam inteiros em centavos.

## 2026-08-12 — Evidência forte exige chave forte

**Decisão:** valor semelhante isoladamente não liga pagamento, ordem e crédito. A associação considera a combinação mais forte disponível de CNPJ/INEP, exercício, programa, ação, parcela, valor, data, documento e conta.

## 2026-08-12 — Preservar evidência bruta quando agrega valor

**Decisão:** artefatos relevantes podem ser preservados com data/hora, origem e SHA-256 quando sustentam uma conclusão ou permitem reproduzir parsing.

## 2026-08-12 — Interface prioriza operação, não arqueologia técnica

**Decisão:** mostrar primeiro escola, resumo financeiro, exceções e ações úteis. Metadados técnicos ficam em camada secundária.

## 2026-08-12 — Reaproveitar por componente, não por repositório

**Decisão:** soluções de protótipos paralelos podem ser incorporadas seletivamente. Não haverá migração cega de runtime, banco ou pilha inteira de outro projeto.