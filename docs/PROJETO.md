# Projeto PDDE — visão, missão e limites

**Atualização:** 04/09/2026  
**Estado corrente:** [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md)

## Missão

Construir uma plataforma interna para a 4ª CRE capaz de **coletar, validar, conciliar, monitorar, explicar e rastrear dados financeiros do PDDE**, preservando o que cada fonte realmente comprova e oferecendo site e Excel úteis para trabalho fiscal/gerencial.

O caso prioritário é a carteira das **163 unidades escolares da 4ª CRE no exercício de 2026**.

## Princípio de qualidade

A prioridade do produto é:

1. confiabilidade;
2. completude;
3. cruzamento de fontes;
4. investigação de divergências;
5. rastreabilidade;
6. desempenho/tempo de execução.

Uma coleta pode levar muitos minutos. Isso é aceitável. Não sacrificar retries, fallback, cobertura ou validação para terminar mais rápido.

## Fonte de verdade e governança

- repositório canônico para escrita: `WilsonMPeixoto-2/pdde-repasse-conciliador`;
- `extrator-pdde-4cre`: referência histórica/técnica;
- `EXTRATOR-PDDE-MANUS`: somente leitura neste fluxo.

A retomada obrigatória está em `AGENTS.md` e `docs/LEIA_PRIMEIRO.md`.

## Problema que o produto resolve

Dados do PDDE aparecem em múltiplas fontes e podem parecer contraditórios quando lidos sem contexto. Exemplos:

- pagamento informado sem crédito bancário localizado;
- conta corrente zero com valor positivo em aplicação;
- saldo publicado com referência mensal antiga;
- fonte complementar indisponível;
- programação nova sem pagamento novo;
- dados históricos devolvidos junto a dados de 2026.

A plataforma não deve “arrumar” essas situações inventando coerência. Deve mostrar a força da evidência, cruzar fontes e manter a incerteza explícita quando necessário.

## Produtos

### Site

Prioriza:

- compreensão rápida;
- busca/encontrabilidade;
- visão consolidada;
- prontuário por escola;
- repasses;
- contas e saldos;
- evolução mensal;
- movimentações;
- cadastro/habilitação;
- pendências/suspensões;
- prestação de contas;
- cobertura das fontes;
- atualização/coleta;
- navegação até os casos por trás dos indicadores.

### Excel

Prioriza:

- análise livre;
- filtros e cruzamentos;
- conferência da carteira;
- exportação gerencial;
- visão das mesmas dimensões informacionais do site em formato tabular.

Site e Excel são complementares e devem derivar do mesmo retrato humano, sem necessidade de copiar exatamente a mesma interface.

## Cadeia de evidência

O sistema separa:

1. valor programado;
2. pagamento informado;
3. ordem/liberação;
4. crédito compatível localizado;
5. movimentação bancária;
6. posição de saldo/aplicações com data;
7. situação de prestação de contas;
8. cobertura/falha da fonte;
9. conclusão determinística do conciliador.

Uma camada não se passa pela outra.

## Fontes principais

Integradas:

- PDDEInfo por INEP;
- SIGEF extrato público/movimentações;
- relatórios públicos FNDE/PDDEInfo para atendimento, prestação/contabilidade e saldos;
- fontes complementares de cadastro, mandato, suspensão e abertura de conta quando respondem;
- fallback Playwright/Chromium para interação pública legítima quando necessário.

Pesquisadas/candidatas e ainda condicionadas:

- SiGPC Acesso Público;
- Portal da Transparência/CGU;
- Dados Abertos FNDE;
- painéis PDDE;
- novo Webservice SIGEF;
- BB Gestão Ágil;
- Plataforma Antonieta de Barros.

SIGPC Ágil não cobria UEx na fase inicial pesquisada. PDDEREx permanece legado.

Detalhes: `docs/FONTES_E_REGRAS.md`.

## Estado de publicação em 04/09/2026

A cadeia integral foi comprovada:

- Full 163 run #216 / `33906605579`;
- `COMPLETE` 163/163;
- artefato `9950830049`;
- commit de snapshot `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- deployment Vercel `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público com a mesma proveniência.

O snapshot histórico anterior foi supersedido.

## Regras permanentes do produto

1. 2026 é o exercício operacional corrente.
2. Ausência não é zero.
3. Zero exige publicação real da fonte na referência correta.
4. Pagamento informado não comprova crédito bancário.
5. Ordem/liberação e crédito observado são fatos distintos.
6. Saldo carrega data de referência.
7. Conta corrente zero não implica recurso total zero quando há aplicações.
8. Aplicação/resgate não prova rendimento nem posição atual sozinho.
9. Cobertura parcial produz incerteza explícita.
10. Fontes independentes não se sobrescrevem.
11. Conciliação é determinística e auditável.
12. A escola é a unidade principal da experiência humana.
13. Indicador agregado deve levar aos casos que o compõem.
14. Complexidade técnica fica disponível para auditoria sem dominar a interface comum.
15. Resultado `PARTIAL` não substitui retrato válido.
16. Coleta integral nova só vira retrato oficial após `COMPLETE 163/163` e publicação comprovada.
17. Qualidade prevalece sobre velocidade.

## Evolução material do projeto

A trajetória consolidada está em:

`docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`.

Esse histórico registra:

- criação das regras de evidência;
- baselines PDDEInfo/SIGEF;
- integração dos relatórios públicos;
- evolução do site/Excel;
- regressões e gates;
- pesquisa de novas fontes;
- problemas de coerência;
- desacoplamento coleta/publicação;
- PRs #55/#56;
- fechamento em produção.

## Persistência institucional

Já existe durabilidade do retrato aprovado via Git/Vercel. Ainda é fronteira futura a implantação institucional definitiva de:

- Supabase dedicado permanentemente conectado;
- histórico persistente de coletas/evidências;
- fila/worker durável ligada ao frontend;
- consulta histórica das execuções pelo produto.

Código existente de migrations/stores não deve ser descrito como infraestrutura implantada sem verificação real.

## Documentos de referência

- porta de entrada: `docs/LEIA_PRIMEIRO.md`;
- estado corrente: `docs/ESTADO_ATUAL_2026-09-04.md`;
- continuidade: `docs/CONTINUIDADE_WORK.md`;
- decisões: `docs/DECISOES.md`;
- fontes/regras: `docs/FONTES_E_REGRAS.md`;
- arquitetura: `docs/ARCHITECTURE.md`;
- histórico: `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`;
- checkpoint produção: `docs/PRODUCTION_CHECKPOINT_2026-09-04.md`;
- conhecimento/pesquisas: `docs/CONHECIMENTO_ACUMULADO.md`.

Qualquer documento datado anterior continua preservado como fotografia histórica, não como instrução corrente.