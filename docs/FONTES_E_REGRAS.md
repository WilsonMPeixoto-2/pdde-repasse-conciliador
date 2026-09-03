# Fontes e regras de evidência

Este documento registra o estado operacional das fontes e as regras que afetam conclusões financeiras. Ele muda quando a fonte ou a regra muda de forma material, não a cada ajuste visual.

Estado corrente consolidado: [`ESTADO_ATUAL_2026-08-30.md`](ESTADO_ATUAL_2026-08-30.md).  
Baseline PDDEInfo + SIGEF: [`BASELINE_TECNICO_2026-08-14.md`](BASELINE_TECNICO_2026-08-14.md).  
Baseline dos relatórios públicos complementares: [`BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md`](BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md).  
Pesquisas futuras: [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).

## Estado das fontes — revisão de 02/09/2026

| Fonte | Finalidade | Estado no canônico | Observação |
|---|---|---|---|
| **PDDEInfo — consulta por escola** | valores programados/pagos com custeio e capital, ajustes, datas, UEx/CNPJ, situação textual, contas e ocorrência | **INTEGRADO; CONTRATO AMPLIADO EM 02/09** | Consulta direta por INEP; carteira integral de 163 escolas já comprovada. |
| **SIGEF Extrato público direto** | créditos, débitos, aplicações, resgates, documentos, histórico e contraparte | **INTEGRADO E VALIDADO** | Extrato público integra o monitoramento e a visão humana; 284/284 contas então mapeadas foram completadas na rodada integral de 14/08. |
| **PDDEInfo/FNDE — relatórios públicos complementares** | atendimento/ordem/alunos, cadastro/mandato, abertura de conta, suspensão e motivo, prestação de contas, saldo e aplicações | **INTEGRADO; ESCOPO AMPLIADO EM 02/09** | Atendimento/prestação/saldos possuem baseline integral de 16/08; cadastro, abertura e suspensão entram como fontes complementares explicitamente cobertas no novo read model. |
| **SIGEF Liberações** | OB, data, valor e conta destinatária | **INTEGRADO COMO COMPLEMENTO / ASSISTIDO QUANDO NECESSÁRIO** | O fluxo possui recuperação complementar e continua aceitando exportações preservadas como evidência adicional. |
| **SIGEF Movimentações por CSV/arquivo** | movimentos bancários em arquivos autorizados/exportados | **LEITOR SUPORTADO** | Fonte adicional; a cobertura temporal do arquivo precisa permanecer explícita. |
| **Portal da Transparência / CGU** | documentos e transferências federais | **CLIENTE IMPLEMENTADO; FONTE OPERACIONAL DESABILITADA** | Depende de credencial oficial e piloto real antes de influenciar conclusões correntes. |
| **Novo Webservice do SIGEF** | potencial interface institucional de extrato | **PESQUISA CONFIRMADA; NÃO INTEGRADO** | Depende de documentação/credenciais/escopo institucional. |
| **BB Gestão Ágil / transição SIGPC Ágil** | potencial camada bancária institucional e documentos | **NÃO INTEGRADO** | O FNDE iniciou a transição gradual ao SIGPC Ágil em 31/08/2026; as UEx não integram a fase inicial. Não fazer scraping de interface autenticada. |
| **Plataforma Antonieta de Barros** | produtos estruturados/datasets | **POTENCIAL; CONEXÃO NÃO CERTIFICADA** | Exige piloto que prove ganho material para 2026. |
| **PDDEREx** | fonte legada | **NÃO USAR COMO FONTE CORRENTE** | Foi sucedido pelo PDDEInfo; manter apenas como referência histórica quando necessário. |
| **Dados Abertos FNDE / Olinda** | execução financeira do PDDE, escolas atendidas, saldos e regularidade de prestação | **CANDIDATO SECUNDÁRIO FORTE** | O catálogo oficial inclui execução financeira até nível de escola e consulta de prestação; metadados/recursos apresentam frescor desigual e exigem piloto antes de entrar na conclusão corrente. |
| **SiGPC - Acesso Público** | situação de prestação de contas das UEx e EEx | **PÚBLICO; PILOTO NECESSÁRIO** | O FNDE informa acesso sem cadastro prévio e consulta específica de situação UEx. Pode servir como evidência independente de prestação, mas o acesso legado pode aplicar WAF/bloqueios e precisa de estratégia permitida/testável. |
| **Painéis PDDE Total / Básico / Ações Integradas** | cadastro, atendimento, repasses previstos/realizados, execução e prestação | **CONTROLE SECUNDÁRIO; PILOTO NECESSÁRIO** | Painéis oficiais Power BI do FNDE. Úteis para cruzamento e descoberta, mas integração produtiva depende de exportação estável e granularidade por escola/UEx. |

## Evidência já comprovada

### PDDEInfo principal + SIGEF — 14/08/2026

- 163/163 escolas concluídas no PDDEInfo;
- 284/284 contas SIGEF então mapeadas concluídas;
- 520 registros de repasse/parcela;
- 394 movimentos pertencentes a 2026;
- movimentos históricos recebidos no bruto ficaram fora da visão corrente;
- R$ 827.615,00 com pagamento informado no PDDEInfo;
- R$ 409.010,00 em créditos compatíveis localizados no SIGEF naquele retrato.

### Relatórios públicos complementares — 16/08/2026

- 163 CNPJs de UEx localizados para as 163 UEs;
- 169 registros de atendimento/repasse;
- 311 registros de prestação de contas;
- 2.690 posições mensais de saldo;
- 461 séries conta/programa;
- cobertura publicada então disponível de janeiro a junho de 2026;
- 0 falhas de coleta e 0 inconsistências aritméticas observadas no baseline.

Esses números são **baselines datados**, não constantes de negócio. Uma nova coleta pode produzir valores e cobertura diferentes.

## Regra temporal — 2026

A visão operacional atual trabalha exclusivamente com o exercício de **2026**.

Dados históricos podem ser preservados como evidência ou usados numa investigação histórica separada, mas não:

- completam conta corrente ausente;
- entram em saldo corrente;
- provam aplicação/rendimento atual;
- fecham lacuna de crédito de 2026;
- mudam a conclusão sobre cobertura corrente.

## Níveis de evidência financeira

### Valor programado / previsto

Valor informado pela fonte como programação. Não significa pagamento nem crédito.

### Pagamento informado

O PDDEInfo informa que determinado pagamento foi registrado. Isso não comprova, sozinho, crédito bancário.

### Ordem de pagamento / liberação

Uma fonte adequada pode corroborar documento/OB, data, valor e conta destinatária. A existência da ordem continua distinta do crédito observado em extrato.

### Crédito compatível localizado

Movimentação bancária compatível encontrada no SIGEF dentro da identidade financeira disponível. Na interface humana, preferir **“Crédito compatível localizado”** a uma formulação absoluta de “crédito confirmado” quando essa é a evidência disponível.

### Evidência bancária direta autorizada

Quando houver fonte bancária institucional/autorizada com contrato próprio, esse nível deve permanecer distinguível dos anteriores.

### Consulta inconclusiva

Usada quando falta cobertura, fonte, chave ou informação necessária para concluir com segurança. Indisponibilidade não vira ausência.

## Estados técnicos dos repasses

A camada operacional pode usar:

- `PROGRAMADO_NAO_PAGO`;
- `CREDITO_CONFIRMADO`;
- `PAGO_SEM_CONTA_ATUAL`;
- `PAGO_CREDITO_NAO_LOCALIZADO`;
- `CREDITO_AMBIGUO`;
- `CONSULTA_INCONCLUSIVA`.

A camada humana traduz esses estados para linguagem probatória neutra. Exemplos:

- `CREDITO_CONFIRMADO` → **Crédito compatível localizado**;
- `PAGO_CREDITO_NAO_LOCALIZADO` → pagamento informado, crédito compatível ainda não localizado nesta coleta;
- `PAGO_SEM_CONTA_ATUAL` → pagamento informado, conta correspondente não exibida na coleta atual;
- `PROGRAMADO_NAO_PAGO` → pagamento ainda não informado.

Não usar “repasse ausente” como sinônimo automático de pagamento ainda não informado.

## Saldos e aplicações

Posição de saldo é um **fato datado**.

Regras:

- mostrar a data de referência junto ao valor;
- não misturar contas de referências diferentes no mesmo total rotulado;
- mês ausente permanece ausência, não zero;
- zero publicado continua zero conhecido;
- `Saldo Fundos`, `Poupança` e `RDB/CDB` são posições aplicadas publicadas na referência;
- posição aplicada não é sinônimo de rendimento;
- aplicação/resgate observados no extrato não bastam para reconstruir automaticamente a posição atual.

## Movimentações e categorias auxiliares

Categorias possíveis incluem:

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

Sempre preservar o histórico e documento originais da fonte. A categoria auxilia leitura e monitoramento, mas **não é juízo automático de regularidade da despesa**. Ausência de categoria “rendimento” também não prova ausência de rendimento.

## Regras de correspondência

Uma associação usa a combinação mais forte disponível de:

- INEP/UEx e CNPJ;
- exercício;
- programa;
- ação;
- parcela;
- conta;
- valor;
- data;
- documento/OB quando disponível.

### Proibições

- não confirmar por valor semelhante isoladamente;
- não escolher arbitrariamente entre múltiplos candidatos;
- não promover referência histórica a dado corrente;
- não converter cobertura incompleta em prova de ausência;
- não usar um programa para preencher silenciosamente conta de outro;
- não esconder divergência entre fontes por meio de uma “fonte preferida”;
- não usar movimento de outro exercício para fechar 2026.

## Contas bancárias

Banco, agência e conta permanecem texto. Identidades equivalentes podem ser canonizadas internamente para associação, sem apagar a representação observada na fonte.

Uma conta ausente pode receber informação complementar de outra fonte somente quando a origem ficar explícita e a correspondência for confiável. Complementar não significa reescrever silenciosamente a observação original.

## Autonomia e limites de acesso

Ordem preferencial:

1. HTTP direto + parser determinístico quando permitido;
2. navegador controlado quando interação real for necessária;
3. IA/agente apenas como auxílio de diagnóstico/adaptação;
4. interromper e registrar o estado diante de CAPTCHA, login, autorização ou bloqueio externo.

CAPTCHA não será contornado.

## Evidência e rastreabilidade

Quando agrega valor à conclusão, preservar artefatos/observações com data, origem e hash. A trilha técnica pode conter URLs, parser, páginas e IDs internos; a interface humana não precisa expor esses detalhes como conteúdo operacional.

## Regra de incorporação de nova fonte

Uma fonte só vira oficial quando possuir:

1. estratégia de acesso permitida;
2. chave de consulta conhecida;
3. parser/contrato testável;
4. cobertura e limitações explícitas;
5. integração sem sobrescrita silenciosa;
6. piloto/execução controlada com utilidade real;
7. comportamento compatível com o foco de 2026.

Pesquisa, protótipo ou existência de API não equivalem a integração produtiva.


## Ampliação de cobertura — 02/09/2026

A revisão de completude identificou informação oficial que já existia nas fontes, mas não sobrevivia até o produto humano. O contrato passa a preservar:

- programação e pagamento separados em custeio/capital;
- ajustes de custeio/capital;
- quantidade de alunos informada no relatório de atendimento;
- situação cadastral e mandato da UEx;
- data de atualização cadastral e dados de contato quando publicados;
- situação pública de abertura de conta;
- coluna `Ocorrência` da conta exibida na Consulta por Escola;
- motivos/tipos de suspensão publicados;
- cobertura nominal de cada conjunto consultado.

As fontes complementares de cadastro, abertura e suspensão **não são tratadas como prova negativa quando retornam sem cobertura**. Falha dessas fontes fica exposta como cobertura indisponível e não apaga um retrato financeiro completo obtido pelas fontes nucleares.


## Verificação de frescor e fontes complementares — 03/09/2026

A rodada integral concluída em 02/09/2026 confirmou que a consulta ao vivo realmente volta às fontes e pode detectar mudanças: o total programado passou de **R$ 2.182.050,00** para **R$ 2.238.502,00**, concentrado em 17 novos registros de Educação Conectada. No mesmo intervalo, pagamento informado (**R$ 827.615,00**), crédito compatível SIGEF (**R$ 409.010,00**), saldo (**R$ 1.644.171,85**) e aplicações (**R$ 1.368.045,22**) permaneceram iguais, com referência de saldo ainda em **31/07/2026**.

A mesma execução registrou:
- 537 registros de repasse/parcela;
- 325 registros de prestação de contas;
- 408 movimentações SIGEF de 2026;
- 163 cadastros de UEx;
- 0 registros de abertura de conta;
- 163 falhas do relatório de abertura de conta;
- erro da própria fonte FNDE na abertura de conta: `ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`.

Consequência: uma nova consulta pode ser tecnicamente fresca e, ainda assim, manter os mesmos números centrais quando as fontes oficiais não publicaram fatos financeiros novos.

### Fontes adicionais verificadas em 03/09

1. **SiGPC - Acesso Público**
   - acesso oficialmente descrito pelo FNDE como público e sem cadastro prévio;
   - permite consultar situação das prestações e situação das UEx;
   - prioridade: **P1**, como segunda evidência de prestação/regularidade;
   - restrição prática: o sistema legado pode rejeitar acessos automatizados por WAF; qualquer integração deve respeitar esse limite.

2. **API do Portal da Transparência / CGU**
   - API REST oficial ativa;
   - endpoint de recursos recebidos por favorecido e documentos por favorecido;
   - cliente já existe no repositório;
   - token oficial é obtido por autenticação Gov.br e fica apenas no backend;
   - prioridade: **P1**, como evidência independente de recursos federais/documentos SIAFI por CNPJ.

3. **Dados Abertos do FNDE**
   - catálogo oficial do PDDE declara execução financeira até nível de escola, saldos e situação da prestação de contas;
   - há recursos de execução financeira, consulta de prestação e saldos de UEx;
   - prioridade: **P2/P1 para backfill**, condicionado a teste de atualização efetiva de 2026.

4. **Painéis PDDE Total / PDDE Básico / Ações Integradas**
   - o próprio FNDE declara que permitem consultas sobre cadastro, atendimento, repasses previstos e realizados, execução e prestação;
   - prioridade: **P2**, como controle cruzado e detecção de divergências;
   - não usar como fonte nuclear enquanto não houver mecanismo de exportação estável e auditável por escola/UEx.

5. **SIGPC Ágil**
   - lançado em 31/08/2026;
   - recebe movimentações bancárias diretamente do Banco do Brasil e prevê extratos/transações;
   - nesta fase do PDDE, atende EEx e EM; **UEx ainda não migram**;
   - portanto: **não aplicável como fonte operacional das 163 UEx neste momento**.

A ordem de próxima integração permanece: **SiGPC Acesso Público (prestação) → Portal da Transparência (recursos/documentos, após token) → piloto Dados Abertos → painéis PDDE como controle secundário**.
