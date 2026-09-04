# Fontes e regras de evidência

**Atualização material:** 04/09/2026  
**Estado corrente:** [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md)

Este documento registra a maturidade das fontes, o que cada uma realmente prova, falhas conhecidas e regras que impedem conclusões financeiras falsas.

## 1. Regra mestra

Nenhuma fonte deve “ganhar” apagando silenciosamente outra. O sistema preserva:

- o fato observado;
- a fonte;
- a data/cobertura;
- a conclusão derivada;
- divergências e lacunas.

**Ausência não é zero. Fonte indisponível não é ausência. Pagamento informado não é crédito bancário.**

## 2. Estado das fontes em 04/09/2026

| Fonte | Finalidade | Estado | Observação atual |
|---|---|---|---|
| **PDDEInfo — consulta por escola/INEP** | programação, pagamento informado, custeio/capital, ajustes, UEx/CNPJ, contas/ocorrências | **INTEGRADO** | Fonte nuclear da carteira 163; consulta direta por INEP. |
| **SIGEF — extrato público** | créditos, débitos, aplicações, resgates, documentos, histórico e contraparte | **INTEGRADO** | Fonte nuclear/complementar para movimentação e crédito compatível. |
| **PDDEInfo/FNDE — atendimento/repasse** | atendimento, ordem, alunos e campos relacionados | **INTEGRADO** | Falha aqui pode ser bloqueante conforme contrato do monitoramento. |
| **PDDEInfo/FNDE — prestação/contabilidade** | situação e registros públicos de prestação | **INTEGRADO** | Tratado como evidência pública independente dentro do contrato atual. |
| **PDDEInfo/FNDE — saldos/aplicações** | posição mensal datada de conta/aplicações | **INTEGRADO** | `BALANCE` e descoberta mensal são bloqueantes para completude. |
| **PDDEInfo/FNDE — cadastro/mandato** | situação cadastral, mandato, atualização/contatos quando publicados | **COMPLEMENTAR INTEGRADO** | Ausência/falha não apaga fatos financeiros de fontes nucleares. |
| **PDDEInfo/FNDE — abertura de conta** | situação pública de abertura | **COMPLEMENTAR, FONTE EXTERNA COM ERRO EM 04/09** | Relatório retornou ORA-00904 para as 163 UEx; não usar como prova negativa. |
| **PDDEInfo/FNDE — suspensões/motivos** | situação e motivos publicados | **COMPLEMENTAR INTEGRADO** | Cobertura deve permanecer explícita. |
| **SIGEF — liberação/conta** | OB/data/valor/conta quando disponível | **INTEGRADO COMO COMPLEMENTO** | Não confundir ordem/liberação com crédito observado. |
| **SIGEF — CSV/arquivo autorizado** | movimentos bancários exportados | **LEITOR SUPORTADO** | Cobertura temporal do arquivo precisa ser explicitada. |
| **Browser assistido / Playwright** | fallback permitido para fonte pública quando HTTP direto não basta | **INTEGRADO** | Chromium é instalado no Full 163 desde PR #56. |
| **Portal da Transparência / CGU** | recursos/documentos federais por favorecido | **CLIENTE EM CÓDIGO; NÃO ATIVO COMO AUTORIDADE CORRENTE** | Exige token oficial e piloto real antes de influenciar conclusões. |
| **SiGPC Acesso Público** | segunda evidência para prestação/situação UEx | **PESQUISA CONFIRMADA; PILOTO PENDENTE** | Acesso público descrito pelo FNDE; WAF/legado exige estratégia permitida/testável. |
| **Dados Abertos FNDE / Olinda** | execução financeira, saldos, prestação, backfill/controle | **CANDIDATO FORTE; PILOTO PENDENTE** | Frescor desigual; não promover histórico a corrente. |
| **Painéis PDDE Total/Básico/Ações Integradas** | conferência e controle cruzado | **SECUNDÁRIO; PILOTO DE EXPORTAÇÃO PENDENTE** | Não usar como fonte nuclear sem exportação estável por escola/UEx. |
| **Novo Webservice SIGEF** | potencial consulta institucional de extrato | **PESQUISA CONFIRMADA; NÃO INTEGRADO** | Falta credencial/documentação/homologação. |
| **BB Gestão Ágil** | potencial visão bancária/documental institucional | **NÃO INTEGRADO** | Preferir API/acesso institucional; não raspar interface autenticada. |
| **Plataforma Antonieta de Barros** | potenciais produtos/datasets estruturados | **POTENCIAL; NÃO CERTIFICADO** | Exige piloto que prove ganho real para 2026. |
| **SIGPC Ágil** | nova prestação digital com integração bancária | **NÃO APLICÁVEL ÀS 163 UEx NA FASE PESQUISADA** | Fase inicial de 31/08/2026 não inclui UEx. |
| **PDDEREx** | legado FNDE | **HISTÓRICO; NÃO USAR COMO FONTE CORRENTE** | Só investigação histórica específica. |

## 3. Baselines já comprovados

### 14/08/2026 — PDDEInfo principal + SIGEF

- 163/163 escolas concluídas;
- 284/284 contas SIGEF então mapeadas;
- 520 registros de repasse/parcela;
- 394 movimentos pertencentes a 2026;
- R$ 827.615,00 com pagamento informado;
- R$ 409.010,00 em créditos compatíveis localizados naquele retrato.

Esses números são históricos, não constantes permanentes.

### 16/08/2026 — relatórios públicos complementares

- 163 CNPJs de UEx;
- 169 registros de atendimento/repasse;
- 311 registros de prestação;
- 2.690 posições mensais de saldo;
- 461 séries conta/programa;
- cobertura então disponível jan–jun/2026;
- 0 falhas de coleta e 0 inconsistências aritméticas naquele baseline.

### 02/09/2026 — prova de frescor

Uma nova coleta alterou o total programado de R$ 2.182.050,00 para R$ 2.238.502,00, concentrado em 17 novos registros de Educação Conectada.

Na mesma comparação permaneceram:

- pagamento informado: R$ 827.615,00;
- crédito compatível SIGEF: R$ 409.010,00;
- saldo: R$ 1.644.171,85;
- aplicações: R$ 1.368.045,22;
- referência de saldo: 31/07/2026.

**Conclusão:** coleta fresca pode devolver números iguais quando a fonte não publicou fatos novos. Frescor e mudança de valor são coisas diferentes.

## 4. Execução integral validada de 04/09/2026

A run #216 (`33906605579`) concluiu `COMPLETE` 163/163 após o runner receber Chromium para o fallback Playwright.

Artefato aprovado:

- `sigef-full-163-2026`;
- id `9950830049`.

O snapshot foi promovido automaticamente e confirmado em produção com os mesmos IDs.

## 5. Falha conhecida do relatório de abertura de conta

Na execução analisada em 04/09, o relatório de abertura de conta retornou para as 163 UEx:

`ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`

Interpretação obrigatória:

- isso é **falha da fonte**, não “sem conta”;
- deve aparecer como cobertura indisponível/falha suplementar;
- não pode apagar conta localizada em PDDEInfo/SIGEF;
- não pode virar zero;
- não deve derrubar a coleta nuclear quando as evidências bloqueantes estão completas.

No contrato atual, `ACCOUNT_OPENING` é suplementar. Falhas como `ATTENDANCE`, `ACCOUNTING`, `BALANCE` e `BALANCE_MONTH_DISCOVERY` são bloqueantes para `COMPLETE`.

## 6. Regra temporal — exercício 2026

A visão operacional trabalha com 2026.

Dados anteriores podem ser preservados como evidência histórica, mas não:

- completam conta corrente ausente;
- entram em saldo corrente;
- provam aplicação/rendimento atual;
- fecham lacuna de crédito de 2026;
- mudam conclusão sobre cobertura corrente.

## 7. Níveis de evidência financeira

### Programado / previsto

Valor informado como programação. Não significa pagamento.

### Pagamento informado

Registro de pagamento na fonte. Não comprova sozinho crédito bancário.

### Ordem/liberação

Documento/OB/data/valor/conta em fonte adequada. Continua distinto do crédito observado no extrato.

### Crédito compatível localizado

Movimentação bancária compatível encontrada com identidade suficiente. A expressão humana preferida é **“Crédito compatível localizado”** quando essa é a força real da evidência.

### Evidência bancária direta autorizada

Se futura fonte institucional bancária fornecer evidência mais forte, esse nível deve permanecer distinguível.

### Consulta inconclusiva

Usada quando falta cobertura, fonte, chave ou informação necessária para concluir com segurança.

## 8. Estados operacionais de repasse

O núcleo pode usar estados como:

- `PROGRAMADO_NAO_PAGO`;
- `CREDITO_CONFIRMADO`;
- `PAGO_SEM_CONTA_ATUAL`;
- `PAGO_CREDITO_NAO_LOCALIZADO`;
- `CREDITO_AMBIGUO`;
- `CONSULTA_INCONCLUSIVA`.

A camada humana traduz de forma neutra. `CREDITO_CONFIRMADO`, quando sustentado apenas pela associação existente, deve ser apresentado como **Crédito compatível localizado**.

## 9. PDDE Básico — ciclos operacionais

Para leitura gerencial, preservando os nomes de origem:

- **1º ciclo:** `PDDE Básico · 1ª Parcela` ou `PDDE Básico — Primeira Infância · P1`;
- **2º ciclo:** `PDDE Básico · 2ª Parcela` ou `PDDE Básico — Primeira Infância · P2`.

Essa agregação é apenas de leitura. Não funde nem renomeia os registros de origem.

No retrato de 31/07/2026 usado para validar a regra:

- 111 unidades tinham pagamento informado na 1ª Parcela regular;
- 52 tinham pagamento informado em Primeira Infância P1;
- os conjuntos cobriam as 163 unidades;
- as 52 de Primeira Infância tinham saldo positivo em conta PDDE: 33 com valor em conta corrente e 19 com valor em aplicações.

Portanto, **conta corrente zero não pode ser mostrada como ausência de recurso quando aplicações ou saldo total são positivos**.

## 10. Saldos e aplicações

Saldo é fato datado.

Regras:

- mostrar a data de referência;
- não misturar referências diferentes em um total rotulado como atual;
- mês ausente permanece ausência;
- zero publicado permanece zero conhecido naquela referência;
- `Saldo Fundos`, `Poupança`, `RDB/CDB` são posições aplicadas publicadas;
- aplicação não é rendimento;
- aplicação/resgate do extrato não bastam para reconstruir posição atual.

## 11. Movimentações

Categorias auxiliares podem incluir:

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

A categoria auxilia leitura. Não é juízo automático de regularidade.

## 12. Regras de correspondência

Usar a combinação mais forte disponível de:

- INEP/UEx/CNPJ;
- exercício;
- programa/ação;
- parcela;
- conta;
- valor;
- data;
- documento/OB.

Proibido:

- confirmar por valor semelhante isoladamente;
- escolher arbitrariamente entre candidatos;
- usar histórico para preencher corrente;
- converter cobertura incompleta em prova de ausência;
- usar conta/programa de outro contexto silenciosamente;
- esconder divergência por “fonte preferida”;
- usar movimento de outro exercício para fechar 2026.

## 13. Contas bancárias

Banco, agência e conta permanecem texto. Canonização interna pode apoiar associação, sem apagar a representação original.

Uma conta ausente pode receber complemento de outra fonte apenas quando a origem fica explícita e a correspondência é confiável.

## 14. Estratégia de aquisição

Ordem preferencial:

1. HTTP direto + parser determinístico;
2. navegador controlado quando a interação pública real for necessária;
3. IA/agente como apoio de diagnóstico/adaptação;
4. interromper/registrar diante de CAPTCHA, login, autorização ou bloqueio sem rota permitida.

CAPTCHA não será contornado.

Desde 04/09, o Full 163 instala Chromium porque o fallback Playwright faz parte do caminho legítimo de coleta pública.

## 15. Qualidade > velocidade

A coleta pode usar o tempo necessário para:

- retentar fonte instável;
- abrir fallback de navegador;
- descobrir meses publicados;
- cruzar fontes;
- investigar inconsistências;
- validar 163/163.

Não reduzir profundidade apenas para “caber” em poucos minutos.

## 16. Incorporação de nova fonte

Uma fonte só influencia conclusão corrente quando houver:

1. acesso permitido;
2. chave de consulta conhecida;
3. parser/contrato testável;
4. cobertura/limitações explícitas;
5. integração sem sobrescrita silenciosa;
6. piloto real com utilidade;
7. compatibilidade com o foco 2026;
8. política de falha que não converta indisponibilidade em ausência.

Pesquisa, protótipo ou existência de API não equivalem a integração produtiva.

## 17. Pesquisa de 03/09 — prioridades que não devem ser esquecidas

Ordem de investigação sugerida e ainda válida como ponto de partida, salvo evidência posterior:

1. **SiGPC Acesso Público** para segunda evidência de prestação;
2. **Portal da Transparência/CGU** para recursos/documentos, após token oficial;
3. **Dados Abertos FNDE** para piloto de frescor/backfill;
4. **painéis PDDE** como controle secundário;
5. **novo Webservice SIGEF/BB Gestão Ágil** somente com condições institucionais adequadas.

Antes de repetir essas pesquisas, consultar também `CONHECIMENTO_ACUMULADO.md` e o histórico consolidado.

## 18. Evidência e rastreabilidade

Quando agrega valor à conclusão, preservar artefatos/observações com data, origem e hash. A camada técnica pode conter IDs, URLs, parser e tentativas; a interface humana deve expor a proveniência em nível compreensível, não o ruído interno.

## 19. Regra de publicação

Uma fonte nova ou dado novo não deve ser considerado publicado apenas porque existe no workspace/artefato.

Para o retrato integral da carteira:

`coleta -> COMPLETE 163/163 -> artefato da mesma execução -> snapshot validado -> main -> Vercel -> manifesto público`.

Essa regra foi materializada nos PRs #55/#56 e comprovada pela run #216.