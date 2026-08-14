# Validação real v0.5 — 13/08/2026

Este registro documenta a repetição controlada da coleta pública do PDDEInfo durante o desenvolvimento da v0.5. Ele preserva resultados e hashes verificáveis sem transformar uma fonte mutável em fixture eterna.

## Sequência executada

1. Duas tentativas iniciais de uma escola receberam HTTP 502; a indisponibilidade não foi convertida em ausência ou zero.
2. Quando a fonte voltou a responder, o teste opt-in de uma escola passou em 5,9 segundos.
3. Uma amostra de três escolas passou em 16,8 segundos, com 3/3 concluídas e 13 eventos íntegros.
4. A primeira carteira completa atingiu o antigo timeout do teste em 300 segundos. Até o corte havia 141 escolas, 141 sucessos na primeira tentativa, 424 eventos e nenhuma falha; não existia evento terminal porque o processo foi interrompido pelo runner de testes.
5. Sem alterar coletor, lote, pausa ou retries, o timeout exclusivo do teste opt-in foi elevado para 600 segundos. A carteira completa passou em 398,6 segundos.

Comando de escala:

```bash
PDDEINFO_FULL_LIVE=1 npx vitest run \
  tests/integration/pddeinfo-full-live.test.ts
```

## Resultado da carteira completa

- `runId`: `20260813T134355259Z-3c75744f`;
- início: `2026-08-13T13:43:55.259Z`;
- término: `2026-08-13T13:50:33.746Z`;
- status: `COMPLETE`;
- 163/163 escolas concluídas;
- 163 tentativas, todas `SUCCESS` e todas na primeira chamada;
- 468 linhas financeiras nos HTMLs brutos;
- 468 registros normalizados;
- 169 registros com pagamento informado;
- 47 pares escola/programa sem conta correspondente;
- 0 linhas zeradas desconhecidas ignoradas;
- 0 warnings;
- 328 artefatos registrados;
- 493 eventos append-only e 493/493 hashes íntegros.

## Distribuição independente das linhas brutas

| Destinação recebida | Linhas |
|---|---:|
| PDDE Básico — 1ª Parcela | 111 |
| PDDE Básico — 2ª Parcela | 111 |
| PDDE Básico — Primeira Infância P1 | 52 |
| Educação Conectada 2026 | 145 |
| Escola e Comunidade 2026 | 43 |
| Escola das Adolescências 2026 | 6 |
| **Total** | **468** |

A contagem acima foi feita diretamente nos 163 HTMLs preservados e coincide com a saída do normalizador. Isso demonstra que a redução de 52 linhas em relação ao snapshot v0.4 de 520 ocorreu no conteúdo atualmente fornecido pelo portal, não por descarte silencioso do parser. O total de pagamentos informados permaneceu 169.

## Comparação com o baseline histórico

| Métrica | v0.4 histórico | v0.5 atual |
|---|---:|---:|
| Escolas concluídas | 163 | 163 |
| Linhas/registros financeiros | 520 | 468 |
| Pagamentos informados | 169 | 169 |
| Ausências de conta de programa | 47 | 47 |
| Warnings | 0 | 0 |
| Eventos íntegros | 493/493 | 493/493 |

O baseline de 520 não foi sobrescrito: ele continua sendo evidência do snapshot anterior. Testes contra arquivos atuais verificam conservação das linhas recebidas; testes determinísticos continuam responsáveis pelas regras do parser e da normalização.

## Identidade dos artefatos principais

| Artefato | Bytes | SHA-256 |
|---|---:|---|
| `pddeinfo-2026.json` | 386.090 | `3648af052de349b437a0aefd3ba83b14e45f84dc3266fa9379f7e7b81bfc0722` |
| `manifest.json` | 125.708 | `9ed65a53d1af67bcb3487e04841995cb51224858877c27ce05511517fde11e87` |
| `events.jsonl` | 298.780 | `b68532d9441d2180ee78484a6388b2342cfecb782189d653bb73207a616d0297` |

O evento terminal possui `sequence = 493` e `eventHash = 64fda6732d7e773301df14048f67ab4da9a13bf6bf810a3d6cd5bd0d376d6b0b`.

## Limite de preservação atual

Os artefatos completos foram produzidos no workspace transitório da validação. Os hashes deste documento não substituem a preservação institucional: o upload para Storage e a validação Postgres real continuam bloqueados até existir um projeto Supabase exclusivo para este sistema. Nenhum banco de outro produto foi reutilizado.
