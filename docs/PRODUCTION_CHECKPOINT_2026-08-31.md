> [!IMPORTANT]
> **CHECKPOINT HISTÓRICO.** Este arquivo prova o estado de produção em 31/08/2026. Não representa a produção corrente após as mudanças de setembro. Para o checkpoint atual, consulte [`PRODUCTION_CHECKPOINT_2026-09-04.md`](PRODUCTION_CHECKPOINT_2026-09-04.md) e [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md).

# Checkpoint de produção — 31/08/2026

## Resultado naquele momento

O refresh de dependências e gates de qualidade estava concluído, integrado à `main`, validado e publicado em produção.

## GitHub

- PR funcional do refresh: **#45**;
- merge por squash: `6711ccf81ea458cb84563710102cd6a8270d6408`;
- checkpoint documental e pin de Zod: `7781b3f077f20c10776ed82dc23c160fcfd8aebf`;
- commit de acionamento pós-reset: `107a78d92de0d089445cdeb3911d98cdf4f3b859`;
- árvore publicada: `1232a855796c307a00739ff8fa5358e9185d8522`;
- PR #43 fechado como supersedido;
- PRs #41/#42 permaneceram Draft e não foram promovidos naquele ciclo.

## Gates daquele ciclo

- `npm ci`;
- Vitest;
- TypeScript;
- build Vite cliente + SSR;
- smoke determinístico;
- desktop/mobile;
- Playwright E2E;
- Axe para violações críticas/sérias fora da dívida conhecida;
- MSW.

Runs finais registrados: `33340242326` e `33340242325`, ambos `success`.

## Produção naquele checkpoint

O deployment homologado em 31/08 foi:

- `dpl_J74Zef4USvkMjjPG21yXLbRM1gGv`;
- target `production`;
- branch `main`;
- commit `107a78d92de0d089445cdeb3911d98cdf4f3b859`;
- estado `READY`.

A homologação daquele momento registrou HTTP 200 para `/repasses`, `/saldos` e `/unidades`, e HTTP 405 esperado para GET em `/api/live`.

## Supersessão

Em 04/09/2026, a arquitetura de publicação financeira foi ampliada pelos PRs #55/#56 e um novo snapshot integral validado foi efetivamente promovido. Portanto, o deployment e os IDs deste documento são **evidência histórica**, não o estado de produção atual.

Ver:

- `docs/PRODUCTION_CHECKPOINT_2026-09-04.md`;
- `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`.