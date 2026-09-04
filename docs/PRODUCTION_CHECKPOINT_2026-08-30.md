> [!IMPORTANT]
> **CHECKPOINT HISTÓRICO.** Este arquivo registra o estado do refresh em 30/08/2026, inclusive o bloqueio temporário de quota da Vercel. Para o estado de produção atual, leia [`PRODUCTION_CHECKPOINT_2026-09-04.md`](PRODUCTION_CHECKPOINT_2026-09-04.md).

# Checkpoint de produção — 30/08/2026

## Escopo daquele ciclo

Fechamento do refresh de dependências e gates de qualidade da Plataforma de Inteligência Financeira PDDE | 4ª CRE, sem transportar as mudanças funcionais então existentes em PRs separados.

## Integração GitHub

- PR final: **#45** — `chore: atualizar dependências e gates de qualidade sobre main`;
- merge por squash: `6711ccf81ea458cb84563710102cd6a8270d6408`;
- PR #43 fechado como supersedido;
- PR #44 fechado e substituído pelo #45 após problema operacional do conector;
- PRs #41/#42 permaneceram fora da promoção daquele ciclo.

## Gates aprovados

- instalação imutável `npm ci`;
- Vitest;
- TypeScript;
- build Vite cliente + bundle live;
- smoke determinístico;
- navegação desktop/mobile;
- Playwright Test;
- Axe;
- MSW.

Runs pós-merge registrados:

- `Verificação contínua`: `33339818684` — `success`;
- `Frontend Product Smoke 2026`: `33339818696` — `success`.

## Incidente de publicação

Na data de 30/08, a publicação do novo build ficou temporariamente bloqueada pela cota diária da Vercel. Isso não representava falha do código nem dos gates. O domínio continuou servindo o deployment anterior com segurança até o reset da quota.

O bloqueio foi encerrado em 31/08 e está documentado no checkpoint de 31/08.

## Valor histórico

Este arquivo é útil para lembrar que:

- falha de infraestrutura externa deve ser distinguida de regressão de código;
- dependências devem continuar isoladas de mudanças financeiras;
- um build validado não pode ser descrito como publicado antes de existir deployment real.

## Supersessão

Os estados de produção de 30/08 e 31/08 foram posteriormente superados. O checkpoint soberano de produção é o de **04/09/2026**, quando o snapshot integral da run #216 foi promovido e confirmado no manifesto público.