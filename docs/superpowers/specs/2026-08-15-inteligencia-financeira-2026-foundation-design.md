# Plataforma de Inteligência Financeira das Verbas do PDDE/2026 — Design da Fundação

## Objetivo

Transformar o monitoramento já comprovado de PDDEInfo + SIGEF em uma fundação institucional capaz de coletar, preservar, consolidar e comparar dados financeiros de 2026 para as 163 UEs da 4ª CRE, incorporando os novos relatórios públicos FNDE e preparando a série histórica mensal sem transformar metadados técnicos em conteúdo de interface.

Nome institucional do produto:

**Plataforma de Inteligência Financeira das Verbas do PDDE/2026**  
*4ª Coordenadoria Regional de Educação*

Identidade curta de produto:

**Inteligência Financeira PDDE | 4ª CRE**

## Restrições globais

1. **2026 é o exercício operacional obrigatório.** Nenhuma visão corrente, indicador, Excel ou PDF pode misturar dados anteriores no cálculo de 2026.
2. **2025 é apenas contexto histórico excepcional.** Pode ser preservado separadamente para reprogramação de saldo, mudança de conta ou investigação contextual. Nunca completa lacuna de 2026 silenciosamente.
3. **Ausência não é zero.** Fonte indisponível, cobertura atrasada ou dado ausente gera estado desconhecido/inconclusivo.
4. **Ordem de pagamento não é crédito bancário.** A data pública FNDE deve ser apresentada como ordem/pagamento informado, sem rebatizá-la como crédito.
5. **Saldo informado pelo FNDE tem data de cobertura.** Um saldo de junho não é saldo de agosto.
6. **Saldo aplicado não é rendimento.** `Saldo Fundos`, `Saldo Poupança` e `Saldo RDB/CDB` são posições de aplicação na data de referência. Rendimento exige movimento explícito ou comparação temporal adequada.
7. **Metadados técnicos são internos.** Hash, parser, versão de parser, URL bruta, IDs técnicos, número de páginas, tentativas HTTP, códigos internos, `sourceUrl`, `technicalClassification` e estruturas de auditoria não aparecem em interfaces ou relatórios destinados a gestores/fiscais.
8. **Rastreabilidade continua integral no backend.** Ocultar metadados da apresentação não significa descartá-los. Artefatos, timestamps, SHA-256, URLs, cobertura e cadeia de evidência continuam preservados.
9. **Linguagem humana e neutra.** A apresentação usa termos como “Pagamento informado no PDDEInfo”, “Crédito compatível localizado no extrato SIGEF”, “Saldo informado até 30/06/2026” e “Requer conferência”. Não produz acusação automática.
10. **Design da informação não replica o banco.** A estrutura interna pode ser extensa; a camada humana deve expor apenas recortes necessários para decisão.

## Escopo desta fundação

### A. Contrato temporal

Criar um módulo central de política temporal:

- `CURRENT_FISCAL_YEAR = 2026`;
- `CONTEXT_FISCAL_YEAR = 2025`;
- operações correntes aceitam somente 2026;
- rotas de contexto histórico aceitam somente 2025 e devem marcar o resultado como contextual;
- relatórios humanos padrão não incluem 2025.

### B. Monitoramento público FNDE em lote

Integrar ao `MONITORING` os adapters públicos já existentes:

1. **Atendimento 2026 por INEP**
   - UEx/CNPJ;
   - programa/destinação;
   - custeio/capital/total;
   - data da ordem de pagamento.

2. **Prestação de Contas 2026 por INEP**
   - programa;
   - situação da prestação;
   - suspensão de pagamento;
   - total previsto.

3. **Saldo por CNPJ e mês**
   - banco/agência/conta;
   - programa;
   - saldo em conta;
   - saldo em fundos;
   - saldo em poupança;
   - saldo RDB/CDB;
   - total aplicado;
   - saldo total informado;
   - `coverageThrough` explícito.

A coleta deve:

- usar HTTP direto como padrão;
- usar fallback de browser assistido somente quando a falha for classificada como indisponibilidade recuperável;
- limitar concorrência;
- deduplicar consultas de saldo por CNPJ/mês;
- preservar HTML bruto e hash;
- isolar falha por escola/fonte sem abortar toda a carteira;
- descobrir o mês de saldo disponível mais recente em vez de fixar junho em código.

### C. Série histórica e snapshots

Criar um modelo normalizado de snapshot financeiro por conta/programa/data de referência.

Campos mínimos:

- escola INEP;
- CNPJ UEx;
- programa;
- banco;
- agência;
- conta;
- data de referência;
- saldo em conta;
- saldo em fundos;
- saldo em poupança;
- saldo em RDB/CDB;
- saldo aplicado total;
- saldo total informado;
- fonte;
- coletado em;
- referência do artefato preservado.

A chave lógica deve impedir duplicação do mesmo CNPJ/programa/conta/data/fonte.

A série histórica deve ser derivada desses snapshots, e não calculada a partir da estrutura de apresentação.

### D. Persistência institucional

Criar migrations incrementais que:

- incluam `PORTAL_TRANSPARENCIA` no contrato de fontes do banco;
- permitam `application/pdf` no bucket privado;
- criem tabela de snapshots financeiros de conta;
- criem índices por escola, CNPJ, programa, conta e data de referência;
- mantenham RLS/negação para clientes finais e acesso de serviço controlado;
- criem read model corrente de 2026 com o último snapshot conhecido por conta/programa;
- não alterem migrations históricas já aplicadas em potencial.

### E. Portal da Transparência

O adapter já existente permanece `CREDENTIAL_REQUIRED` até existir chave oficial configurada fora do código.

Quando a credencial estiver disponível:

- consultar documentos por favorecido, fases 1/2/3, exercício 2026;
- consultar recursos recebidos por CNPJ e período 2026;
- preservar JSON bruto;
- manter a fonte como evidência independente;
- nunca converter documento SIAFI em “crédito bancário confirmado”.

A ausência da chave deve ser exibida internamente como fonte não configurada, sem poluir a experiência do gestor.

### F. Camada de apresentação humana

Separar explicitamente dois contratos:

1. **Audit/technical model**
   - completo;
   - preserva metadados e rastreabilidade;
   - usado por backend, auditoria técnica e diagnóstico.

2. **Human financial model**
   - apenas conteúdo necessário à gestão;
   - sem hash, parser, tentativas, URL bruta, IDs técnicos ou regras internas;
   - orientado a escola, programa, conta, recebimentos, movimentações, aplicações, saldos, prestação de contas e alertas de conferência.

O primeiro read model humano desta fase deve fornecer, por escola:

- identificação essencial;
- programas em 2026;
- repasses/parcelas;
- contas vinculadas;
- posição financeira mais recente com data de referência;
- composição de aplicação financeira;
- movimentações 2026;
- situação de prestação de contas;
- indicadores descritivos de acompanhamento.

## Princípios de design da informação

- Não haverá uma “mega tabela” como visão principal.
- Tabelas extensas podem existir apenas como base técnica/exportação especializada e não como experiência padrão.
- O usuário deve poder navegar de **carteira → escola → programa → conta → período/movimentos**.
- O padrão visual futuro deve se apoiar em conceitos familiares: resumo financeiro, extrato, linha do tempo, cartões de posição e filtros simples.
- A transparência das fontes continua, mas em linguagem humana, por exemplo:
  - “PDDEInfo: repasses, contas e situação da prestação”;
  - “SIGEF: movimentações e créditos compatíveis”;
  - “FNDE - Saldos: posição de conta e aplicações até a data informada”.
- Textos como “hash”, “parser versionado”, “retry”, “RLS”, “payload” e “sourceUrl” são proibidos na camada de apresentação.

## Decisão de produto deliberadamente adiada

Esta fundação **não congela o frontend final**. Depois que a coleta das 163 UEs e a série histórica estiverem materializadas, deve haver uma parada explícita para decidir:

- arquitetura de navegação;
- hierarquia dos blocos de informação;
- indicadores prioritários;
- visualizações temporais;
- nível de detalhe padrão e sob demanda;
- desenho do Excel/PDF executivo;
- alertas que são úteis sem criar linguagem acusatória.

Essa parada é obrigatória antes de construir o dashboard fiscal final.

## Critérios de aceitação

1. Uma execução de monitoramento aceita apenas 2026 como exercício corrente.
2. O monitoramento agrega Atendimento, Prestação e Saldo FNDE sem perder PDDEInfo/SIGEF existentes.
3. O mês de saldo é descoberto dinamicamente e cada saldo mantém data de cobertura.
4. Snapshots não duplicam a mesma posição lógica.
5. O banco aceita a nova fonte e PDFs sem alterar migrations históricas.
6. A ausência de chave do Portal não derruba o monitoramento.
7. Existe um read model humano cujo JSON não contém termos técnicos proibidos.
8. Testes garantem que `hash`, `parser`, URLs brutas, IDs técnicos e classificações internas não vazam para a camada humana.
9. 2025 não aparece no relatório humano padrão de 2026.
10. A implementação termina antes do frontend final e registra o ponto de decisão de produto.