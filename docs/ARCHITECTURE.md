# Arquitetura atual e direção de evolução

**Estado corrente:** 11/09/2026  
**Resumo factual:** [`ESTADO_ATUAL_2026-09-11.md`](ESTADO_ATUAL_2026-09-11.md)

## 1. Princípio arquitetural

O sistema separa três coisas que não podem ser confundidas:

1. **fato observado por uma fonte**;
2. **conclusão derivada por regra determinística**;
3. **apresentação humana no site/Excel**.

IA, agentes e navegador automatizado podem auxiliar coleta/diagnóstico, mas não decidem a conclusão financeira final.

```text
fontes públicas/autorizadas
        ↓
evidência bruta / observações
        ↓
normalização por fonte
        ↓
conciliação determinística
        ├── auditoria/evidência técnica
        ↓
read model humano
        ├── Excel gerencial
        └── site React/Vite
```

## 2. Fontes materializadas

```text
Lista-mestre · 163 UEs · exercício 2026
        │
        ├── PDDEInfo principal por INEP
        │     ├── UEx/CNPJ/cadastro
        │     ├── contas/ocorrências
        │     ├── repasses/ações/parcelas
        │     └── custeio/capital/ajustes
        │
        ├── Relatórios públicos PDDEInfo/FNDE
        │     ├── atendimento/ordem/alunos
        │     ├── cadastro/mandato
        │     ├── abertura de conta (suplementar)
        │     ├── suspensão/motivos
        │     ├── prestação/contabilidade
        │     └── saldos/aplicações mensais
        │
        └── SIGEF
              ├── conta/liberação quando aplicável
              └── extrato/movimentações/crédito compatível
```

Quando HTTP direto não basta para uma fonte pública, existe fallback de navegador controlado. O workflow integral instala Chromium explicitamente.

## 3. Orquestração financeira

`backend/application/run-financial-intelligence-monitoring.ts` coordena a inteligência financeira e distingue falhas bloqueantes de falhas suplementares.

- falha em dado nuclear pode tornar a execução `PARTIAL`;
- falha em fonte suplementar permanece como cobertura/erro, sem inventar ausência e sem apagar evidência nuclear;
- resultado `PARTIAL` nunca substitui retrato válido.

## 4. Cadeia integral de snapshot

### 4.1. Gate Full 163

Workflow: `.github/workflows/sigef-full-163-validation.yml`.

Propriedades:

- Node 24 + `npm ci`;
- Chromium para fallbacks públicos;
- coleta `all` para 163 unidades;
- timeout superior de 120 minutos;
- exige `session.status === COMPLETE`;
- exige `schoolCount === 163`;
- preserva artefato/evidências;
- continua disponível em PR, push relevante e `workflow_dispatch`;
- possui schedule diário às 10:05 UTC (07:05 BRT), inerte até `PDDE_FULL_163_SCHEDULE_ENABLED=true`.

O timeout não é meta de velocidade. Qualidade e cobertura continuam prevalecendo sobre duração.

### 4.2. Publisher do snapshot

Workflow: `.github/workflows/publish-validated-snapshot.yml`.

Só processa Full 163 `success` cuja `head_branch` seja `main`.

O publisher:

1. encontra `sigef-full-163-2026` da mesma run;
2. baixa o artefato;
3. exige `COMPLETE` + 163;
4. exige portfólio com 163 escolas;
5. exige 163 prontuários distintos por INEP;
6. registra `workflowRunId`, `artifactId` e `artifactName`;
7. impede run antiga de substituir run mais nova;
8. serializa, comprime gzip e codifica base64;
9. divide em partes estáticas;
10. reidrata/valida antes do push;
11. cria commit automático em `main`;
12. deixa a integração Git/Vercel publicar a nova versão.

## 5. Handoff orientado a evento para PDDE Online

Depois de um snapshot novo ser efetivamente publicado em `main`, o publisher tenta um `repository_dispatch` para:

`WilsonMPeixoto-2/pddeonlinesme-rj`

Evento:

`financial-snapshot-published-v1`

Payload:

- `sourceRepository`;
- `workflowRunId`;
- `artifactId`;
- `artifactName`;
- `publishedAt`.

O segredo `PDDE_ONLINE_DISPATCH_TOKEN` serve somente para autenticar esse handoff GitHub→GitHub.

### Fronteira de confiança

O conciliador **não** recebe:

- `PDDE_SUPABASE_URL`;
- `PDDE_SUPABASE_SERVICE_ROLE_KEY`.

Ele também não chama a RPC do PDDE Online. A responsabilidade do motor termina ao publicar evidência/snapshot e notificar o destino.

O PDDE Online então:

1. confronta o payload do evento com o manifesto público;
2. reidrata o snapshot;
3. transforma o contrato;
4. avalia maturidade;
5. usa suas próprias credenciais para publicar no Supabase.

## 6. Falha do handoff e fallback

O snapshot é o produto primário deste repositório. Portanto, falha de notificação externa não deve invalidar um snapshot já aprovado e publicado.

Se `PDDE_ONLINE_DISPATCH_TOKEN` estiver ausente ou o endpoint de dispatch falhar:

- workflow registra warning;
- snapshot permanece publicado;
- o PDDE Online possui schedule de reconciliação/fallback às 13:30 UTC (10:30 BRT), protegido por kill-switch próprio.

Essa separação evita acoplamento frágil entre disponibilidade dos dois repositórios.

## 7. Kill-switches

### Motor

`PDDE_FULL_163_SCHEDULE_ENABLED=true`

Controla somente a coleta Full 163 agendada.

### PDDE Online

`PDDE_FINANCIAL_SYNC_ENABLED=true`

Controla ingestão automática por evento/fallback no destino.

A separação permite homologar cada metade sem dar ao motor poder de escrita direta no banco operacional.

## 8. Prova recente do circuito do motor

Referência validada antes desta evolução:

- Full 163 run `34355577593`;
- artefato `10107480089`;
- snapshot publicado em `2026-09-09T13:50:50.872Z`;
- cobertura 163/163;
- duração integral observada de aproximadamente 44 minutos.

Esses IDs são checkpoint, não constantes. O manifesto real prevalece quando houver execução posterior.

## 9. Fronteiras de responsabilidade internas

### `backend/core/`

Contratos e invariantes: dinheiro em centavos, exercício, identidade, evidência e regras determinísticas.

### `backend/adapters/`

Acesso às fontes. Cada adaptador preserva semântica/cobertura próprias.

### `backend/application/`

Orquestra coleta, monitoramento, conciliação, snapshots e projeções.

### `shared/human-financial-contract.ts`

Fronteira comum entre backend e frontend para a projeção humana.

### `backend/report/`

Excel humano/gerencial e saídas técnicas.

### `src/product/`

Experiência humana. Organiza a informação; não redefine regra financeira.

### `public/data/`

Snapshot público promovido após gate integral validado.

## 10. Regras que a arquitetura não pode violar

1. exercício operacional corrente = 2026;
2. ausência não vira zero;
3. zero exige evidência publicada;
4. dado histórico não completa dado corrente;
5. pagamento informado não equivale a crédito bancário;
6. ordem/liberação e crédito observado são fatos distintos;
7. saldo é posição datada;
8. conta corrente zero não significa recurso total zero quando há aplicações;
9. aplicação/resgate não é rendimento nem posição atual automática;
10. cobertura incompleta permanece inconclusiva;
11. fontes preservam independência;
12. conciliação usa a chave mais forte disponível;
13. resultado parcial não substitui retrato válido;
14. coleta nova só vira snapshot oficial após `COMPLETE 163/163`;
15. duração longa não autoriza cortar investigação/retries;
16. interface humana não expõe ruído técnico como conteúdo comum;
17. credencial de banco do PDDE Online nunca cruza para o motor.

## 11. Gates de engenharia

Conforme o fluxo:

- Vitest;
- TypeScript/typecheck;
- build Vite;
- MSW;
- Playwright;
- Axe;
- smoke desktop/mobile;
- Full 163 com fontes reais;
- reidratação do snapshot publicado.

CI local verde não substitui prova de fontes reais quando a mudança afeta coleta/publicação.

## 12. Próxima fronteira

Depois da ativação/homologação do handoff ponta a ponta, as evoluções devem priorizar:

1. histórico durável de coletas/proveniência;
2. novas dimensões apenas com cobertura/semântica próprias;
3. reforço da orquestração longa sem reduzir profundidade;
4. fontes adicionais somente após piloto/credencial;
5. manter a fronteira clara entre motor de evidência e sistema operacional consumidor.

Antes de qualquer alteração, ler `AGENTS.md` e `docs/LEIA_PRIMEIRO.md`.