# Fontes e regras de evidência

Este documento registra o estado operacional das fontes e as regras que afetam conclusões financeiras. Ele deve mudar quando a fonte ou a regra mudar de forma material, não a cada ajuste de implementação.

Baseline factual atual: [`BASELINE_TECNICO_2026-08-14.md`](BASELINE_TECNICO_2026-08-14.md).

Pesquisas e fontes futuras ainda não integradas: [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).

## Estado das fontes — 14/08/2026

| Fonte | Finalidade | Estado no repositório canônico | Observação |
|---|---|---|---|
| **PDDEInfo — consulta por escola** | valores programados/pagos, datas, UEx/CNPJ e contas apresentadas | **AUTÔNOMA E VALIDADA** | Consulta direta por INEP; 163/163 escolas concluídas na rodada integral de 14/08/2026. |
| **SIGEF Extrato público direto** | créditos, débitos, aplicações, resgates, documento, histórico e contraparte | **AUTÔNOMO E VALIDADO** | 284/284 contas mapeadas foram consultadas completamente na rodada integral; 394 movimentos pertencem a 2026. |
| **SIGEF Liberações por exportação** | OB, data, valor e conta destinatária | **SUPORTADO / ASSISTIDO** | O Assistente de Liberações organiza e valida `.xls`; continua útil como evidência adicional, mas não é necessário para obter o extrato público já integrado. |
| **SIGEF Movimentações por CSV/arquivo** | movimentos bancários em arquivos autorizados/exportados | **LEITOR SUPORTADO** | Continua disponível como fonte adicional; cobertura temporal do arquivo precisa ser registrada. |
| **PDDEInfo — relatórios complementares** | saldo, atendimento, prestação de contas, suspensão, abertura de contas e outros relatórios | **PESQUISA CONFIRMADA; NÃO INTEGRADO** | Requer pilotos de 2026 e validação de parâmetros/cobertura antes de virar fonte oficial do canônico. |
| **Novo Webservice do SIGEF** | potencial interface institucional de extrato | **PESQUISA CONFIRMADA; NÃO INTEGRADO** | Depende de documentação/credenciais/escopo institucional. |
| **BB Gestão Ágil API** | potencial camada de movimentações/uso e documentos | **PESQUISA CONFIRMADA; ACESSO INSTITUCIONAL PENDENTE** | Não fazer scraping da interface autenticada; integração futura deve usar API autorizada. |
| **Plataforma Antonieta de Barros** | produtos estruturados/datasets | **POTENCIAL CONFIRMADO; CONEXÃO NÃO CERTIFICADA** | Requer mapear endpoints/artefatos e provar utilidade para PDDE 2026. |
| **PDDEREx** | possível fonte complementar de repasses/contas | **PILOTO NECESSÁRIO** | Integrar somente se uma amostra real de 2026 acrescentar informação material. |
| **Portal da Transparência / CGU** | confirmação externa de transferências/documentos | **API EXISTE; UTILIDADE PDDE/UEx A VALIDAR** | Exige chave e piloto de granularidade por UEx/OB. |
| **Dados Abertos FNDE / Olinda** | controle secundário e histórico | **CANDIDATO SECUNDÁRIO** | Frescor/cobertura precisam ser avaliados dataset a dataset. |
| **SiGPC** | prestação de contas/regularidade | **FUTURO / ASSISTIDO OU PILOTO** | Não é prioridade antes da plataforma-base; autenticação/proteções devem ser respeitadas. |

## Evidência da rodada integral PDDEInfo + SIGEF

Em 14/08/2026:

- 163 escolas esperadas;
- 163 consultas PDDEInfo concluídas;
- 0 falhas;
- 284 contas SIGEF tentadas;
- 284 contas completas;
- 0 parciais;
- 0 falhas;
- 520 registros de repasse/parcela;
- 394 movimentos de 2026;
- 51.547 movimentos históricos recebidos nas respostas brutas;
- R$ 827.615,00 com pagamento informado no PDDEInfo;
- R$ 409.010,00 em créditos compatíveis localizados no SIGEF.

O histórico bruto não é confundido com a visão operacional de 2026.

## Programas e contas observados na rodada

Cobertura de contas atuais:

- `0B` — PDDE Qualidade: 163 contas;
- `02` — PDDE Básico: 116 contas;
- `0A` — PDDE Equidade: 5 contas.

Total: 284 contas.

O normalizador também possui mapeamento `Z9` para PDDE Educação Integral. Isso não autoriza inferir outros códigos. Novos códigos devem ser promovidos somente após evidência real da própria fonte.

## Regra temporal — 2026

A visão operacional atual é exclusivamente do exercício **2026**.

A fonte SIGEF pode devolver movimentos históricos. Esses dados podem ser preservados no artefato bruto, mas:

- não entram no extrato corrente de 2026;
- não completam conta/saldo corrente ausente;
- não provam aplicação ou rendimento atual;
- não mudam a conclusão sobre ausência/presença na cobertura de 2026.

Uma futura análise histórica deve ser uma visualização separada.

## Regra de autonomia

A ordem preferencial de coleta é:

1. HTTP direto + parser determinístico quando a fonte permitir;
2. navegador controlado quando a interação real for necessária;
3. IA/agente como auxílio para diagnóstico ou adaptação de estrutura;
4. interromper e registrar estado quando houver CAPTCHA, login, autorização ou bloqueio externo.

CAPTCHA não será contornado.

O uso atual do extrato SIGEF direto não consiste em resolver CAPTCHA: o sistema consulta uma rota pública de resultado usando banco, agência, conta, CNPJ e programa já conhecidos e valida a identidade devolvida.

## Níveis de evidência financeira

Os seguintes conceitos não são sinônimos.

### Pagamento informado

O PDDEInfo informa que determinado pagamento/ordem foi registrado. Isso não comprova, sozinho, crédito bancário.

### Ordem bancária corroborada

Uma fonte de Liberações pode confirmar documento/OB, data, valor e conta destinatária. A existência da OB não é idêntica ao crédito observado em extrato.

### Crédito compatível localizado no extrato SIGEF

Movimentação bancária compatível encontrada no extrato público, com associação baseada na identidade da escola/programa/conta, valor e janela/documento disponíveis.

Na camada humana, preferir essa linguagem a uma expressão genérica “crédito confirmado” quando a prova disponível é a correspondência no extrato SIGEF.

### Evidência bancária direta autorizada

Quando houver extrato bancário fornecido/autorizado ou outra evidência com contrato próprio, esse nível deve permanecer distinguível.

### Estorno ou devolução

Crédito inicialmente identificado não deve permanecer apresentado como situação final positiva se existir evidência de estorno/devolução suficientemente vinculada.

### Consulta inconclusiva

Usada quando falta cobertura, fonte, chave suficiente ou informação necessária para concluir com segurança.

Fonte indisponível não é “sem dados” e não deve gerar divergência artificial.

## Estados da visão operacional de repasses

Estados técnicos internos atuais:

- `PROGRAMADO_NAO_PAGO`;
- `CREDITO_CONFIRMADO`;
- `PAGO_SEM_CONTA_ATUAL`;
- `PAGO_CREDITO_NAO_LOCALIZADO`;
- `CREDITO_AMBIGUO`;
- `CONSULTA_INCONCLUSIVA`.

Na visão fiscal, a terminologia é adaptada para linguagem neutra. Exemplos:

- `CREDITO_CONFIRMADO` → **Crédito compatível localizado no extrato SIGEF**;
- `PAGO_CREDITO_NAO_LOCALIZADO` → **Pagamento informado no PDDEInfo; crédito compatível ainda não localizado nesta coleta SIGEF**;
- `PAGO_SEM_CONTA_ATUAL` → **Pagamento informado no PDDEInfo; conta correspondente não exibida na coleta atual do PDDEInfo**;
- `PROGRAMADO_NAO_PAGO` → **Pagamento ainda não informado no PDDEInfo**.

Não usar “repasse ausente” para uma parcela cujo pagamento ainda não foi informado.

## Classificações auxiliares de movimentação

A visão operacional pode atribuir:

- `REPASSE_FNDE`;
- `APLICACAO_FINANCEIRA`;
- `RESGATE_APLICACAO`;
- `PAGAMENTO_TRANSFERENCIA`;
- `PAGAMENTO_CARTAO`;
- `RENDIMENTO_FINANCEIRO`;
- `ENTRADA_TERCEIRO`;
- `TARIFA_BANCARIA`;
- `ESTORNO_REVERSAO`;
- `MOVIMENTO_NAO_CLASSIFICADO`.

Regras:

- preservar sempre `history` e `document` originais do SIGEF;
- classificação auxiliar não é juízo jurídico/contábil da despesa;
- um movimento sem classificação segura permanece `MOVIMENTO_NAO_CLASSIFICADO`;
- ausência de linha explicitamente classificada como rendimento não prova ausência de rendimento.

## Aplicações financeiras

Aplicação e resgate observados no extrato são fatos bancários válidos para apresentação.

Eles **não provam a posição atual do investimento**.

Não calcular automaticamente saldo aplicado atual ou rendimento acumulado apenas pela soma de aplicações e resgates históricos. Essa informação exige outra fonte/posição adequada.

## Regras de correspondência

Uma associação deve usar a combinação mais forte disponível de:

- INEP/UEx e CNPJ;
- exercício;
- programa;
- ação;
- parcela;
- conta;
- valor;
- data;
- documento/ordem bancária, quando disponível.

### Proibições

- não confirmar por valor semelhante isoladamente;
- não escolher arbitrariamente entre múltiplas contas/créditos candidatos;
- não promover referência histórica a dado corrente;
- não considerar cobertura incompleta como prova de ausência;
- não usar um programa para preencher silenciosamente conta de outro;
- não esconder divergência entre fontes através de uma “fonte preferida”;
- não usar movimento de outro exercício para fechar uma lacuna de 2026.

## Contas bancárias

A conta original apresentada pelo PDDEInfo deve ser preservada como informação da própria fonte.

Uma conta ausente pode receber informação complementar de outra fonte somente quando a origem ficar explícita e a correspondência for confiável. Complementar não significa reescrever a observação original.

Banco, agência, conta e dígitos verificadores permanecem texto.

## Tempo e cobertura

Toda conclusão é limitada à cobertura temporal efetivamente consultada.

Datas civis precisam existir no calendário gregoriano. Valores apenas formatados como `AAAA-MM-DD`, mas impossíveis, são rejeitados.

Instantes de coleta, ocorrência e geração usam timestamp ISO 8601/RFC 3339 completo quando a semântica exigir horário.

Consultas/artefatos relevantes devem registrar, quando possível:

- data/hora;
- período coberto;
- fonte/URL;
- identidade consultada;
- hash quando a preservação do artefato for importante.

## Excel e apresentação

Relatórios financeiros devem:

- materializar valores, sem depender de fórmulas ocultas para provar o resultado;
- preservar identificadores como texto;
- separar crédito e débito;
- preservar histórico/documento da fonte;
- neutralizar formula injection;
- ser relidos/validados quando o fluxo assim exigir;
- separar base analítica de visão humana;
- evitar juízo automático de regularidade.

## Regra de incorporação de novas fontes

Uma fonte observada em pesquisa ou outro protótipo não vira automaticamente fonte oficial deste projeto. Para ser promovida, deve possuir:

1. estratégia de acesso permitida;
2. chave de consulta conhecida;
3. parser/contrato de dados testável;
4. cobertura e limitações explicitadas;
5. integração sem sobrescrita silenciosa de outras fontes;
6. piloto ou execução controlada que demonstre utilidade real;
7. comportamento compatível com o foco operacional de 2026.

O backlog de fontes futuras e seu grau de maturidade está em [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).