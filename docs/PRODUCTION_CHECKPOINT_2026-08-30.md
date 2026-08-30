# Checkpoint de produção — 30/08/2026

## Escopo

Fechamento do refresh de dependências e gates de qualidade da Plataforma de Inteligência Financeira PDDE | 4ª CRE, sem transportar as mudanças funcionais dos PRs #41 e #42.

## Integração GitHub

- PR final: **#45** — `chore: atualizar dependências e gates de qualidade sobre main`;
- merge por squash: `6711ccf81ea458cb84563710102cd6a8270d6408`;
- PR #43: fechado como supersedido por estar empilhado sobre #42;
- PR #44: fechado e substituído pelo #45 após falha do conector ao retirar o estado Draft;
- PRs #41 e #42: permanecem Draft e não foram promovidos.

## Gates aprovados

No head final e novamente após o merge:

- instalação imutável `npm ci`: aprovada;
- Vitest: aprovado;
- TypeScript: aprovado;
- build Vite cliente + bundle live: aprovado;
- smoke determinístico: aprovado;
- navegação desktop/mobile: aprovada;
- Playwright Test: aprovado;
- Axe: aprovado para violações críticas/sérias fora da dívida conhecida de contraste;
- MSW: integrado e exercitado em teste do adapter PDDEInfo.

Runs pós-merge da `main`:

- `Verificação contínua`: `33339818684` — `success`;
- `Frontend Product Smoke 2026`: `33339818696` — `success`.

## Dependências deste ciclo

- Vite 8.2.2;
- Vitest 4.1.11;
- @vitejs/plugin-react 6.1.1;
- @supabase/supabase-js 2.112.4;
- @tanstack/react-virtual 3.14.10;
- @electric-sql/pglite 0.5.8;
- @types/react-dom 19.2.5;
- Motion 13.1.1;
- @playwright/test 1.62.1;
- @axe-core/playwright 4.13.0;
- MSW 2.15.0;
- GitHub Actions checkout/setup-node/upload-artifact em v6/v6/v7.

A dependência opcional explícita `@rollup/rollup-linux-x64-gnu` foi removida e o build em runner Linux permaneceu verde.

Zod fica **fixado em 4.4.3**. A série 4.5 continua adiada até maturação e benchmark; o Dependabot ignora atualizações minor/major de Zod enquanto essa decisão estiver vigente.

## Vercel — bloqueio externo de publicação

A tentativa de criar novo deployment recebeu HTTP 402 da Vercel:

- código: `payment_required`;
- recurso: `api-deployments-free-per-day`;
- limite diário: 100;
- restante: 0;
- reset informado pela API: **31/08/2026 às 19:46:57 (America/Sao_Paulo)**.

Por isso, em 30/08/2026 **não foi tecnicamente possível promover o novo commit para produção sem contratar um plano pago**.

O domínio público permanece no deployment anterior:

- deployment: `dpl_BcgcVXiFv3vcRoZ1BCw3gMBFNMAF`;
- commit: `6cab204dcd2bc49da233a1d8fca966b2607b3d36`;
- estado: `READY`;
- domínio: `https://pdde-repasse-conciliador.vercel.app`.

Verificações de segurança operacional do deployment ainda publicado:

- `/repasses`: HTTP 200;
- `/api/live` via GET: HTTP 405, resposta esperada pelo contrato;
- erros de runtime na última hora: zero.

## Regra para a próxima publicação

Após o reset da cota, publicar exclusivamente a `main` corrente ou seu descendente documental. Não promover nenhum preview do antigo PR #43, pois esses deployments carregam a pilha funcional #41/#42.

Até que um deployment associado à `main` corrente esteja `READY` e os aliases públicos apontem para ele, a documentação deve distinguir **integrado à main** de **publicado em produção**.
