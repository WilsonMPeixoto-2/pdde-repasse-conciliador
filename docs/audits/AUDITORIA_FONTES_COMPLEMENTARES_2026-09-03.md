# Auditoria de frescor e fontes complementares — 03/09/2026

## Objetivo

Verificar por que a ação **Fazer nova consulta** pode produzir números visualmente semelhantes ao retrato publicado e identificar fontes oficiais adicionais capazes de complementar a leitura financeira das 163 UEs da 4ª CRE.

## 1. Frescor da consulta ao vivo

A implementação corrente:
- chama `POST /api/live` por escola;
- cria execução nova e workspace transitório;
- volta ao PDDEInfo e SIGEF;
- não promove resultado parcial;
- usa `Cache-Control: private, no-store` na resposta da API;
- após esta revisão, também solicita `no-cache/no-store` nas requisições ao PDDEInfo, SIGEF e Portal da Transparência.

A rodada integral de 02/09/2026 terminou `COMPLETE` para 163 UEs.

### Comparação com o baseline anterior

| Indicador | Baseline anterior | Coleta 02/09/2026 | Variação |
|---|---:|---:|---:|
| Programado | R$ 2.182.050,00 | R$ 2.238.502,00 | + R$ 56.452,00 |
| Pagamento informado | R$ 827.615,00 | R$ 827.615,00 | R$ 0,00 |
| Crédito compatível SIGEF | R$ 409.010,00 | R$ 409.010,00 | R$ 0,00 |
| Saldo informado | R$ 1.644.171,85 | R$ 1.644.171,85 | R$ 0,00 |
| Aplicações | R$ 1.368.045,22 | R$ 1.368.045,22 | R$ 0,00 |
| Referência dos saldos | 31/07/2026 | 31/07/2026 | sem nova referência |

A variação de R$ 56.452,00 decorreu de 17 novos registros de Educação Conectada.

A conclusão é que a busca ao vivo está voltando às fontes e detecta alteração quando ela existe. A semelhança dos principais números decorre, no retrato observado, de ausência de novos pagamentos/créditos/saldos publicados.

## 2. Falha externa confirmada

Na rodada de 02/09:
- 163 cadastros de UEx foram obtidos;
- 325 registros de prestação de contas foram obtidos;
- o relatório de abertura de conta retornou 0 observações;
- foram registradas 163 falhas `ACCOUNT_OPENING`;
- erro publicado pela fonte FNDE: `ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`.

A indisponibilidade deve continuar explícita e não pode ser convertida em “sem pendência”.

## 3. Fontes complementares verificadas

### 3.1 SiGPC - Acesso Público

Fonte oficial:
https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-acesso-publico

O FNDE informa que:
- o acesso público não exige cadastro prévio;
- é possível localizar prestações de contas;
- existe consulta específica da situação das UEx.

**Potencial:** segunda evidência independente de prestação de contas/regularidade.

**Limite:** o sistema legado pode aplicar WAF e rejeitar automação. A integração deve ser precedida de piloto permitido e testável.

**Prioridade:** P1.

### 3.2 API do Portal da Transparência / CGU

Fontes oficiais:
- https://portaldatransparencia.gov.br/api-de-dados/
- https://api.portaldatransparencia.gov.br/

Endpoints relevantes já modelados no repositório:
- `/despesas/recursos-recebidos`;
- `/despesas/documentos-por-favorecido`.

O token é obtido por autenticação oficial Gov.br e deve permanecer exclusivamente no backend.

**Potencial:** evidência independente de recursos federais recebidos e documentos SIAFI por CNPJ da UEx.

**Estado:** cliente implementado; falta credencial operacional e piloto real.

**Prioridade:** P1.

### 3.3 Dados Abertos do FNDE

Fontes oficiais:
- https://www.gov.br/fnde/pt-br/acesso-a-informacao/dados-abertos
- https://dados.gov.br/dados/conjuntos-dados/programa-dinheiro-direto-na-escola-pdde

O catálogo oficial declara recursos de PDDE para:
- execução financeira do PDDE Básico;
- escolas atendidas;
- consulta de prestação de contas;
- saldos das contas das UEx.

A execução financeira é descrita até nível de escola e com custeio/capital.

**Potencial:** controle independente, backfill e detecção de divergências.

**Limite:** recursos e metadados apresentam atualização desigual; não podem ser presumidos como frescos para 2026 sem piloto.

**Prioridade:** P2, podendo subir para P1 se o piloto comprovar frescor corrente.

### 3.4 Painéis PDDE Total / Básico / Ações Integradas

Fonte oficial:
https://www.gov.br/fnde/pt-br/acesso-a-informacao/acoes-e-programas/programas/pdde/monitore-o-pdde-1

O FNDE informa que os painéis permitem consultar:
- cadastro;
- atendimento;
- repasses previstos e realizados;
- execução;
- prestação de contas.

**Potencial:** controle cruzado e descoberta de divergências.

**Limite:** Power BI não é, por si só, um contrato de integração. É necessário provar exportação estável e granularidade escola/UEx antes de usar em conclusões automáticas.

**Prioridade:** P2.

### 3.5 SIGPC Ágil

Fonte oficial:
https://www.gov.br/fnde/pt-br/assuntos/sistemas/sigpc-agil

O sistema foi lançado em 31/08/2026 e recebe movimentações bancárias diretamente do Banco do Brasil, com consulta de transações e situação financeira.

Nesta fase, para o PDDE:
- atende EEx e EM;
- UEx ainda não migram.

**Conclusão:** não serve como fonte operacional das 163 UEx neste momento.

## 4. Ordem recomendada

1. Implantar comparação antes × depois no site — executado nesta branch.
2. Solicitar respostas frescas às fontes HTTP — executado nesta branch.
3. Pilotar SiGPC Acesso Público como segunda evidência de prestação.
4. Configurar token oficial do Portal da Transparência e executar piloto por CNPJ.
5. Pilotar Dados Abertos FNDE para 2026 e medir frescor/granularidade.
6. Usar painéis PDDE como controle secundário somente se houver exportação auditável.
7. Reavaliar SIGPC Ágil quando o FNDE incluir UEx.

## 5. Regra de produto

Após cada consulta completa, o usuário deve ver:
- valor anterior;
- valor atual;
- diferença;
- referência anterior e atual;
- variação de registros;
- quantidade de escolas com mudança;
- fontes indisponíveis por nome.

Assim, “nova consulta concluída” deixa de ser um aviso opaco e passa a responder a pergunta operacional: **o que realmente mudou?**
