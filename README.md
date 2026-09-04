# Inteligência Financeira PDDE | 4ª CRE

**Plataforma de Inteligência Financeira das Verbas do PDDE/2026**  
**4ª Coordenadoria Regional de Educação · SME-Rio**

Este repositório é a fonte canônica de implementação do monitoramento financeiro do PDDE para as **163 unidades escolares da 4ª CRE**.

> **Antes de trabalhar no projeto:** leia [`AGENTS.md`](AGENTS.md) e [`docs/LEIA_PRIMEIRO.md`](docs/LEIA_PRIMEIRO.md). Eles definem a hierarquia documental e impedem que checkpoints antigos sejam tratados como estado atual.

## Estado corrente

Estado factual soberano: [`docs/ESTADO_ATUAL_2026-09-04.md`](docs/ESTADO_ATUAL_2026-09-04.md).

No checkpoint de 04/09/2026, a coleta integral foi comprovada ponta a ponta:

- Full 163 run #216 / id `33906605579`;
- `COMPLETE` 163/163;
- artefato `9950830049` (`sigef-full-163-2026`);
- commit automático do snapshot `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- Vercel `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`, `READY`;
- manifesto público servindo a mesma proveniência.

O snapshot histórico `32164281411 / 9335143477` foi supersedido.

## Missão

Coletar, validar, cruzar e apresentar fatos de fontes independentes sem transformar:

- ausência em zero;
- atraso de cobertura em “não existe”;
- pagamento informado em crédito bancário;
- saldo datado em saldo de hoje;
- aplicação/resgate em rendimento;
- erro de fonte em prova negativa.

O sistema deve explicar divergências e completar lacunas com fontes adicionais quando possível, mantendo a incerteza explícita quando a evidência não fecha.

## Qualidade > velocidade

Decisão de produto/arquitetura de 04/09/2026:

**a coleta pode demorar o tempo necessário para maximizar confiança.**

Não reduzir retries, fallbacks, cruzamentos, descoberta de meses ou investigação de inconsistências apenas para terminar mais rápido. Execução longa saudável não é falha; timeout, cancelamento, fonte quebrada, cobertura insuficiente ou `PARTIAL` são situações diferentes.

## Escopo operacional

- exercício corrente: **2026**;
- carteira: **163 UEs da 4ª CRE**;
- histórico anterior pode ser preservado para investigação, mas não completa lacunas correntes.

## Cadeia de evidência

O produto separa:

1. valor programado;
2. pagamento informado;
3. ordem/liberação;
4. crédito compatível localizado;
5. movimentação bancária;
6. posição de saldo/aplicações com data;
7. prestação/contabilidade;
8. cobertura/falha da fonte;
9. conclusão do conciliador.

Uma fonte não sobrescreve silenciosamente outra.

## Fontes integradas

### PDDEInfo principal

Consulta direta por INEP para programação, pagamento, custeio/capital, ajustes, UEx/CNPJ, contas/ocorrências e demais campos do contrato atual.

### SIGEF

Extrato público/movimentações e recuperação complementar de conta/liberação quando aplicável.

### Relatórios públicos PDDEInfo/FNDE

- atendimento/ordem/alunos;
- prestação/contabilidade;
- saldos/aplicações mensais;
- cadastro/mandato;
- suspensão/motivos;
- abertura de conta como fonte suplementar.

Em 04/09, o relatório de abertura de conta apresentou erro Oracle da própria fonte para as 163 UEx. Isso é preservado como indisponibilidade, não como “sem conta”.

### Fallback de navegador

Playwright/Chromium é usado quando a interação pública legítima exige navegador. O Full 163 instala Chromium explicitamente desde o PR #56.

Detalhes de maturidade e fontes candidatas: [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md).

## Pipeline integral de publicação

A partir dos PRs #55/#56, uma coleta nova só vira retrato oficial após:

```text
coleta real das 163
        ↓
COMPLETE 163/163
        ↓
artefato da mesma run
        ↓
snapshot reidratado/validado
        ↓
commit automático em main
        ↓
deploy Vercel
        ↓
manifesto público com proveniência nova
```

Isso elimina o problema anterior em que a coleta era nova, mas o site continuava iniciando com um snapshot histórico.

## Site

O frontend React/Vite oferece, conforme cobertura disponível:

- visão geral;
- escolas;
- repasses;
- contas e saldos;
- evolução mensal;
- movimentações;
- cadastro e habilitação;
- pendências e suspensões;
- prestação de contas;
- cobertura das fontes;
- prontuário por escola;
- indicadores acionáveis;
- coleta/atualização;
- download do Excel gerencial.

## Excel

O Excel é produto complementar para:

- filtros livres;
- cruzamentos;
- análise da carteira;
- conferência das mesmas dimensões informacionais do site em formato tabular.

Site e Excel compartilham o universo de dados, mas não precisam ter a mesma densidade visual.

## Regras que não podem regredir

1. ausência ≠ zero;
2. zero exige evidência publicada;
3. pagamento informado ≠ crédito bancário;
4. ordem/liberação ≠ crédito observado;
5. saldo é datado;
6. conta corrente zero não implica recurso total zero se houver aplicações;
7. aplicação/resgate não prova rendimento/posição atual sozinho;
8. histórico não completa 2026;
9. fontes não se sobrescrevem;
10. cobertura parcial permanece inconclusiva;
11. associação financeira usa a chave mais forte disponível;
12. `PARTIAL` não substitui retrato válido;
13. coleta nova só é “publicada” quando a produção servir o novo snapshot;
14. qualidade prevalece sobre velocidade.

## Fontes ainda em avaliação

Já pesquisadas e classificadas, portanto não começar do zero:

- SiGPC Acesso Público;
- Portal da Transparência/CGU;
- Dados Abertos FNDE;
- painéis PDDE;
- novo Webservice SIGEF;
- BB Gestão Ágil;
- Plataforma Antonieta de Barros;
- SIGPC Ágil;
- PDDEREx.

Ver [`docs/CONHECIMENTO_ACUMULADO.md`](docs/CONHECIMENTO_ACUMULADO.md) antes de nova pesquisa.

## Persistência institucional

Já existe persistência do retrato aprovado via Git/Vercel. Ainda são fronteiras futuras:

- Supabase dedicado permanentemente conectado;
- histórico durável de execuções/evidências;
- fila/worker persistente ligada definitivamente ao frontend;
- histórico consultável pelo próprio produto.

Código de migrations/stores não deve ser descrito como infraestrutura implantada sem verificação real.

## Documentação canônica

- [`AGENTS.md`](AGENTS.md) — protocolo de agentes;
- [`docs/LEIA_PRIMEIRO.md`](docs/LEIA_PRIMEIRO.md) — porta de entrada;
- [`docs/ESTADO_ATUAL_2026-09-04.md`](docs/ESTADO_ATUAL_2026-09-04.md) — estado corrente;
- [`docs/CONTINUIDADE_WORK.md`](docs/CONTINUIDADE_WORK.md) — retomada operacional;
- [`docs/DECISOES.md`](docs/DECISOES.md) — decisões;
- [`docs/FONTES_E_REGRAS.md`](docs/FONTES_E_REGRAS.md) — fontes e semântica;
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura;
- [`docs/PROJETO.md`](docs/PROJETO.md) — missão/limites;
- [`docs/CONHECIMENTO_ACUMULADO.md`](docs/CONHECIMENTO_ACUMULADO.md) — pesquisas e oportunidades;
- [`docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`](docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md) — trajetória;
- [`docs/PRODUCTION_CHECKPOINT_2026-09-04.md`](docs/PRODUCTION_CHECKPOINT_2026-09-04.md) — prova de produção;
- [`docs/INDICE_DOCUMENTAL.md`](docs/INDICE_DOCUMENTAL.md) — inventário/autoridade.

Baselines, auditorias, checkpoints, specs e planos anteriores permanecem preservados como **históricos**. Eles explicam decisões, mas não substituem o estado atual.