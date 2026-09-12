# Continuidade do projeto — 11/09/2026

**Repositório canônico:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Escopo:** 163 UEs da 4ª CRE, exercício 2026  
**Estado corrente:** [`ESTADO_ATUAL_2026-09-11.md`](ESTADO_ATUAL_2026-09-11.md)

## 1. Retomada obrigatória

Ler, nesta ordem:

1. `AGENTS.md`;
2. `docs/LEIA_PRIMEIRO.md`;
3. `docs/ESTADO_ATUAL_2026-09-11.md`;
4. este documento;
5. `docs/DECISOES.md`;
6. `docs/FONTES_E_REGRAS.md`;
7. `docs/ARCHITECTURE.md`;
8. código, testes, workflows, `main`, CI e produção reais.

Documentos de 04/09 e agosto são checkpoints históricos.

## 2. Estado consolidado

O motor já possui cadeia automática de snapshot:

`Full 163 → COMPLETE 163/163 → artefato da mesma run → publisher → snapshot em main → Vercel/manifesto`.

Última referência validada antes desta frente:

- run `34355577593`;
- artefato `10107480089`;
- `publishedAt=2026-09-09T13:50:50.872Z`;
- 163/163 escolas.

O manifesto real prevalece caso uma execução posterior já tenha sido promovida.

## 3. Nova fronteira com o PDDE Online

O PDDE Online passou a receber snapshots publicados por evento na PR #134, commit `83f069a1f1f0d38c3937fc76fa001bb602bf315b`.

A responsabilidade permanece separada:

- **conciliador:** coleta, evidência, validação integral e snapshot;
- **PDDE Online:** valida proveniência do evento/manifesto, avalia maturidade e publica no próprio Supabase.

O conciliador não recebe `service_role` do PDDE Online.

## 4. Agendamento da coleta integral

`SIGEF Full 163 Validation` possui schedule diário às 10:05 UTC (07:05 BRT), mas a execução automática depende de:

`PDDE_FULL_163_SCHEDULE_ENABLED=true`

A variável funciona como kill-switch. O schedule deve permanecer desligado até a ativação operacional deliberada.

## 5. Handoff após snapshot novo

`publish-validated-snapshot.yml` notifica o PDDE Online somente depois de um snapshot novo ser efetivamente commitado.

Evento:

`financial-snapshot-published-v1`

Secret dedicado:

`PDDE_ONLINE_DISPATCH_TOKEN`

Se o token estiver ausente ou a chamada falhar:

- o snapshot não é revertido;
- o workflow registra warning;
- o fallback diário do PDDE Online permanece capaz de reconciliar a publicação.

## 6. Ativação operacional ainda externa ao código

Para ligar a cadeia inteira:

### conciliador

- configurar `PDDE_ONLINE_DISPATCH_TOKEN`;
- configurar `PDDE_FULL_163_SCHEDULE_ENABLED=true` quando a coleta recorrente for autorizada.

### PDDE Online

- configurar `PDDE_SUPABASE_URL`;
- configurar `PDDE_SUPABASE_SERVICE_ROLE_KEY`;
- executar homologação manual;
- somente depois configurar `PDDE_FINANCIAL_SYNC_ENABLED=true`.

Nunca registrar valores de secrets em documentação, PRs ou logs.

## 7. Regras preservadas

- qualidade > velocidade;
- `COMPLETE 163/163` não é negociável;
- ausência ≠ zero;
- pagamento informado ≠ crédito observado;
- fonte complementar quebrada ≠ ausência;
- resultado `PARTIAL` não substitui retrato válido;
- run antiga não substitui snapshot novo;
- CAPTCHA/restrições não são contornados.

## 8. Critério do primeiro ciclo ponta a ponta

Depois da configuração segura das variáveis/secrets:

1. Full 163 controlado;
2. `COMPLETE 163/163`;
3. publisher encontra o artefato da mesma run;
4. snapshot novo entra em `main`;
5. dispatch chega ao PDDE Online;
6. receiver confronta proveniência com manifesto;
7. dry-run confirma dimensões maduras;
8. RPC publica ou retorna idempotente;
9. repetição/fallback não duplica dados.

Até esse ciclo real ser comprovado, comunicar **automação implementada**, não “automação plenamente ativada”.
