# LEIA PRIMEIRO — mapa de autoridade documental

**Atualização soberana:** 11/09/2026  
**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

## 1. Ordem obrigatória de leitura

Antes de responder sobre o estado do projeto ou alterar código/workflows, leia:

1. este documento;
2. [`ESTADO_ATUAL_2026-09-11.md`](ESTADO_ATUAL_2026-09-11.md);
3. [`CONTINUIDADE_WORK.md`](CONTINUIDADE_WORK.md);
4. [`DECISOES.md`](DECISOES.md);
5. [`FONTES_E_REGRAS.md`](FONTES_E_REGRAS.md) para coleta/dados/Excel;
6. [`ARCHITECTURE.md`](ARCHITECTURE.md) para código/runtime/publicação;
7. código, testes, workflows, GitHub Actions e produção reais.

`AGENTS.md`, na raiz, repete o protocolo para agentes de desenvolvimento.

## 2. Documento soberano do estado corrente

A fotografia operacional corrente está em:

[`ESTADO_ATUAL_2026-09-11.md`](ESTADO_ATUAL_2026-09-11.md)

Estados de 04/09, agosto e checkpoints anteriores permanecem históricos. Servem para reconstruir decisões e incidentes, não para determinar automaticamente a situação atual.

## 3. Precedência

Quando houver divergência:

1. código/testes/workflows atuais;
2. execução e produção real;
3. `ESTADO_ATUAL_2026-09-11.md`;
4. `DECISOES.md`;
5. documentação técnica vigente;
6. documentos históricos.

Nunca escolher um documento antigo apenas porque ele é mais detalhado.

## 4. Estado arquitetural resumido

A cadeia financeira atual é:

```text
fontes públicas/autorizadas
        ↓
Full 163
        ↓ COMPLETE 163/163
artefato da mesma run
        ↓
publisher do snapshot
        ↓
manifesto público versionado
        ↓ repository_dispatch (quando credencial habilitada)
PDDE Online
        ↓ valida proveniência/maturidade
Supabase PDDE Online
```

O `pdde-repasse-conciliador` produz evidência e snapshot. Ele **não recebe service_role do PDDE Online** e não publica diretamente no banco operacional externo.

## 5. Automação e kill-switches

### Coleta integral

O schedule Full 163 existe, mas só executa automaticamente com:

`PDDE_FULL_163_SCHEDULE_ENABLED=true`

### Handoff ao PDDE Online

O publisher tenta `repository_dispatch` depois que um snapshot novo é realmente publicado. O token esperado é:

`PDDE_ONLINE_DISPATCH_TOKEN`

Ausência/falha do token gera warning e preserva o snapshot. O PDDE Online mantém fallback próprio.

**Nunca versionar ou documentar o valor desses secrets.**

## 6. Classes documentais

### Vigentes

- `AGENTS.md`;
- `docs/LEIA_PRIMEIRO.md`;
- `docs/ESTADO_ATUAL_2026-09-11.md`;
- `docs/CONTINUIDADE_WORK.md`;
- `docs/DECISOES.md`;
- `docs/FONTES_E_REGRAS.md`;
- `docs/ARCHITECTURE.md`;
- `docs/PROJETO.md`;
- `docs/CONHECIMENTO_ACUMULADO.md`;
- `docs/INDICE_DOCUMENTAL.md`.

### Históricos

- `ESTADO_ATUAL_2026-09-04.md` e anteriores;
- checkpoints de produção anteriores;
- baselines;
- auditorias datadas;
- planos/specs já executados;
- handoffs e prompts de retomada antigos.

## 7. Regras que nunca devem ser inferidas ao contrário

- ausência não é zero;
- zero publicado só é zero conhecido naquela fonte/referência;
- pagamento informado não é prova automática de crédito;
- ordem/liberação não é o mesmo fato que crédito observado;
- saldo é uma posição datada;
- resultado `PARTIAL` não substitui retrato válido;
- falha de fonte complementar não prova ausência;
- coleta só vira retrato oficial após gate integral;
- duração longa não autoriza reduzir profundidade/retries;
- CAPTCHA/restrição externa não será contornado.

## 8. Roteiro de retomada segura

1. ler a documentação vigente na ordem acima;
2. conferir `main` e PRs recentes;
3. conferir workflows relevantes e últimas execuções;
4. conferir manifesto/produção quando a tarefa tocar dados publicados;
5. localizar a área de código afetada;
6. confrontar qualquer plano antigo com implementações posteriores;
7. alterar somente o que ainda falta;
8. atualizar estado/decisão/arquitetura quando houver mudança material.

O objetivo deste roteiro é simples: impedir que uma ferramenta diligentemente reconstrua um problema que o projeto já resolveu.