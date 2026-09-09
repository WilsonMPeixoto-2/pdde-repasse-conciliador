# Evidência — piloto público SiGPC UEx em 09/09/2026

## Objetivo

Registrar o resultado real do piloto reproduzível da consulta pública de situação de UEx no SiGPC, sem confundir disponibilidade HTTP com acesso funcional à fonte e sem contornar CAPTCHA, WAF ou qualquer controle de acesso.

## Execução observada

- workflow: `SiGPC Public UEx Diagnostic Probe`;
- run: `#3` (`34331214261`);
- branch: `feat/temporal-coverage-sigef-export-2026-09-05`;
- HEAD: `be6575261acab9c2bd88fae789b40ed6dcf30994`;
- artefato: `sigpc-public-uex-probe-3`;
- artifact id: `10095854795`;
- digest: `sha256:64b77f3fce287f60201f404f66ad09b055fc49a80db159bbe9e5981cac735029`;
- consulta observada em: `2026-09-09T08:50:05.339Z`.

A rota pública consultada foi:

`https://www.fnde.gov.br/sigpcadm/actionPublico.pu?tilesPublico=ConsultarSituacao`

## Resultado técnico

O navegador controlado com Playwright/Chromium conseguiu concluir a navegação no nível HTTP, mas não alcançou a aplicação pública de consulta.

O diagnóstico preservado no artefato registrou:

- `navigation.status = 200`;
- `navigation.statusText = "OK"`;
- `navigation.ok = true`;
- `finalUrl` igual à URL pública solicitada;
- `title = "Request Rejected"`;
- corpo: `The requested URL was rejected. Please consult with your administrator.` seguido de support ID;
- `htmlBytes = 247`;
- `challengeSignals = ["request rejected"]`;
- `error = null`.

A resposta HTTP 200, portanto, **não prova acesso funcional ao SiGPC**. O conteúdo retornado é uma página de rejeição administrativa da requisição.

## Interpretação obrigatória

1. O piloto público foi efetivamente executado; não deve permanecer classificado apenas como "piloto pendente".
2. A rota testada está **bloqueada para esta estratégia de acesso**, inclusive com navegador controlado legítimo.
3. `Request Rejected` é sinal de bloqueio/controle de acesso mesmo quando o status HTTP é 200.
4. O resultado não autoriza inferir ausência de dados, ausência de UEx ou ausência de prestação de contas.
5. Não haverá tentativa de contornar WAF, CAPTCHA, autenticação ou outro controle.
6. A fonte só deve ser reaberta para investigação corrente se surgir rota pública permitida distinta, mudança material de comportamento da rota, documentação oficial que indique mecanismo de acesso compatível ou condição institucional legítima.
7. Enquanto isso, o SiGPC não pode ser usado para reduzir as lacunas de cobertura bancária de 2026 nem para substituir evidência financeira direta.

## Validações relacionadas

O commit que passou a classificar explicitamente `request rejected` como sinal de bloqueio foi validado pela **SIGEF Full 163 Validation #275**, concluída com sucesso no mesmo HEAD `be6575261acab9c2bd88fae789b40ed6dcf30994`.

No mesmo HEAD, CI, frontend smoke e o próprio probe SiGPC também concluíram com sucesso. O sucesso do workflow do probe significa que o diagnóstico foi executado e preservado corretamente; **não significa que a consulta SiGPC ficou acessível**.

## Consequência para a fila de fontes

O SiGPC Acesso Público deixa de ser uma investigação aberta imediata pela rota testada. A prioridade permanece em fontes públicas ou institucionais que possam fornecer material de 2026 com granularidade suficiente e acesso permitido, preservando a regra central do projeto:

**pagamento informado, ordem/liberação e crédito bancário observado são níveis distintos de evidência e não podem ser promovidos uns aos outros por conveniência.**
