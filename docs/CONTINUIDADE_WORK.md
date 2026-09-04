# Continuidade do projeto — checkpoint soberano de 04/09/2026

**Repositório canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Escopo:** 163 UEs da 4ª CRE, exercício 2026  
**Estado corrente:** [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md)

## 1. Como retomar sem depender do chat anterior

Ler, nesta ordem:

1. `AGENTS.md`;
2. `docs/LEIA_PRIMEIRO.md`;
3. `docs/ESTADO_ATUAL_2026-09-04.md`;
4. este documento;
5. `docs/DECISOES.md`;
6. `docs/FONTES_E_REGRAS.md` para coleta/dados/Excel;
7. `docs/ARCHITECTURE.md` para runtime/publicação;
8. `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md` somente quando for necessário reconstruir origem de uma solução;
9. código, testes, workflows, `main`, CI e produção reais.

Não usar `ESTADO_ATUAL_2026-08-30.md` como estado corrente. Ele é histórico.

## 2. Estado fechado em produção

A extração integral deste checkpoint foi concluída e publicada ponta a ponta:

- Full 163 run #216;
- run id `33906605579`;
- `COMPLETE` 163/163;
- artefato `9950830049`, `sigef-full-163-2026`;
- publisher run `33909648939`, `success`;
- commit automático `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- Vercel `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público confirmado com `workflowRunId=33906605579` e `artifactId=9950830049`.

Os IDs históricos `32164281411 / 9335143477` foram supersedidos na produção.

## 3. Problemas recentes encerrados

### 3.1. Coleta nova sem snapshot novo

Problema: o pipeline conseguia coletar dados atuais, mas o site continuava iniciando com snapshot histórico.

Solução: PR #55 criou promoção automática baseada **no artefato exato da execução Full 163 aprovada**, com validação 163/163, proveniência e proteção contra regressão.

### 3.2. Run #213 ficou PARTIAL

Problema: três coletas de saldo precisaram do fallback Playwright e o runner não possuía Chromium.

Solução: PR #56 adicionou `npx playwright install --with-deps chromium`. O gate financeiro não foi relaxado.

### 3.3. Abertura de conta retornando erro para 163 UEx

Causa observada: erro Oracle do relatório FNDE:

`ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`.

Tratamento: preservar como falha `ACCOUNT_OPENING` suplementar. Não converter em “sem conta” e não derrubar uma coleta nuclear completa por uma fonte complementar quebrada.

## 4. Decisão de desempenho que deve ser preservada

**Qualidade > velocidade.**

Uma coleta integral pode demorar muitos minutos. Não otimizar o tempo às custas de:

- retries;
- fallbacks;
- cruzamento de fontes;
- investigação de divergências;
- busca de cobertura mensal;
- validação 163/163.

Tempo longo é normal quando há progresso. Erro é timeout, cancelamento, falha bloqueante, cobertura insuficiente ou estado `PARTIAL`.

## 5. Regra central de confiança dos dados

Não voltar ao comportamento que motivou a revisão de setembro:

- pagamento informado ≠ crédito observado;
- conta corrente zero ≠ recurso total zero;
- saldo datado ≠ saldo de hoje;
- ausência ≠ zero;
- fonte indisponível ≠ dado ausente;
- divergência entre fontes deve aparecer e ser investigada;
- histórico não completa 2026;
- resultado parcial não substitui retrato válido.

## 6. Fontes já pesquisadas: não começar do zero

Antes de nova pesquisa, consultar `FONTES_E_REGRAS.md` e `CONHECIMENTO_ACUMULADO.md`.

Estado resumido:

- PDDEInfo principal: integrado;
- SIGEF extrato público: integrado;
- relatórios FNDE de atendimento/prestação/saldos: integrados;
- cadastro/mandato/suspensão/abertura: complementares, com cobertura dependente da fonte;
- Portal da Transparência/CGU: cliente em código, operacionalmente condicionado a credencial oficial;
- SiGPC Acesso Público: candidato prioritário para segunda evidência de prestação;
- Dados Abertos FNDE: candidato para backfill/controle, frescor a validar;
- painéis PDDE: controle secundário;
- novo Webservice SIGEF: pesquisa confirmada, integração institucional pendente;
- BB Gestão Ágil: potencial, não integrado;
- SIGPC Ágil: UEx fora da fase inicial pesquisada;
- PDDEREx: legado, não usar como fonte corrente.

## 7. O que está em produção versus o que ainda é fronteira institucional

### Em produção

- frontend React/Vite;
- snapshot integral validado e automaticamente promovido;
- consulta ao vivo/coleta do site;
- Excel humano/gerencial;
- rotas de escola, repasses, saldos, evolução, movimentações, cadastro, pendências, prestação e cobertura de fontes;
- proteção contra promoção de resultado `PARTIAL`.

### Ainda não institucionalizado de forma definitiva

- Supabase dedicado permanentemente conectado;
- histórico durável de execuções e artefatos no banco institucional;
- fila/worker persistente ligada de forma definitiva ao frontend;
- integrações adicionais de fontes que ainda exigem piloto/credencial.

A promoção via Git/Vercel já garante um retrato público durável após a coleta integral aprovada, mas não substitui o histórico institucional completo.

## 8. Próximas ações legítimas

Não existe pendência para “terminar a extração de 04/09”: ela está fechada em produção.

As próximas tarefas devem partir de uma necessidade nova e, antes de alterar código:

1. verificar a `main` atual e commits posteriores a este checkpoint;
2. verificar se alguma coleta nova já substituiu os IDs deste documento;
3. ler a área de código afetada;
4. comparar qualquer plano antigo com hotfixes/decisões posteriores;
5. executar somente o que ainda falta;
6. manter documentação e estado de produção sincronizados.

## 9. O que não reabrir como hipótese

- não voltar a discutir se a coleta integral deve ser rápida;
- não enfraquecer `COMPLETE 163/163`;
- não tratar o erro `ACCOUNT_OPENING` como prova de inexistência de conta;
- não reintroduzir snapshot fixo histórico;
- não voltar a preencher ausência com zero;
- não usar documento antigo para sobrescrever solução posterior;
- não escrever no repositório do Manus.

## 10. Regra de encerramento de futuras coletas

Uma coleta só pode ser declarada “concluída em produção” após verificar:

1. execução real completa;
2. gate 163/163;
3. artefato correto;
4. publisher correto;
5. commit do snapshot;
6. Vercel `READY`;
7. manifesto público servindo a nova proveniência.

Esse é o ponto de continuidade a partir de 04/09/2026.