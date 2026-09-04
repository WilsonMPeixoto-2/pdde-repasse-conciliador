> [!IMPORTANT]
> **DOCUMENTO HISTÓRICO.** Este arquivo registra a fotografia operacional de 19/08/2026. Foi supersedido primeiro pelo estado de 30/08 e, depois, pelo estado soberano de 04/09/2026. Para qualquer decisão presente, comece por [`LEIA_PRIMEIRO.md`](LEIA_PRIMEIRO.md) e [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md).

# Estado operacional — fotografia de 19/08/2026

Este documento foi o índice factual do estado corrente **naquela data**. Ele permanece preservado para reconstrução histórica e não deve determinar próximos passos atuais.

## Escopo naquele checkpoint

- Carteira institucional: **163 unidades escolares da 4ª CRE / SME-Rio**.
- Exercício operacional: **2026**.
- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `extrator-pdde-4cre`: referência histórica/técnica.
- `EXTRATOR-PDDE-MANUS`: projeto paralelo somente leitura para este fluxo.

## Capacidades materializadas naquele momento

### Coleta e inteligência financeira

- consulta PDDEInfo por INEP;
- extrato público SIGEF para contas elegíveis;
- conciliação determinística entre pagamento informado e crédito compatível;
- recuperação complementar de conta/liberação no SIGEF quando aplicável;
- relatórios públicos complementares do PDDEInfo/FNDE para atendimento, prestação de contas e saldos;
- snapshots e série mensal de saldos/aplicações de 2026;
- classificação auxiliar neutra das movimentações;
- job institucional `MONITORING` em código;
- read model fiscal/técnico e humano separados;
- Excel humano e Excel técnico/auditoria.

### Produto web naquele momento

- Home financeira;
- busca por escola;
- carteira das 163 unidades;
- visões consolidadas de Repasses e Saldos e contas;
- indicadores acionáveis;
- prontuário financeiro por escola;
- navegação por Resumo, Repasses, Contas e saldos, Movimentações e Prestação de contas quando havia dados;
- composição do saldo e série mensal;
- extrato de movimentações;
- consulta ao vivo com progresso por unidade;
- proteção contra resultado parcial substituir o retrato anterior;
- deep links da SPA no Vercel.

## Limitações registradas naquele checkpoint

- Supabase dedicado ainda não implantado definitivamente;
- migrations ainda não aplicadas no banco canônico definitivo;
- persistência durável das consultas disparadas pelo site ainda não ligada;
- fila/worker institucional não permanentemente conectado ao frontend;
- persistência durável de artefatos/evidências ainda pendente;
- Portal da Transparência sem credencial operacional;
- PDF executivo final pendente.

A frase antiga de que recarregar a página sempre retornaria ao retrato estável publicado foi **parcialmente supersedida em 04/09**, quando a promoção automática do snapshot integral validado passou a atualizar duravelmente o retrato publicado via `main`/Vercel.

## Regras financeiras deste documento que continuam válidas

1. pagamento informado não equivale a crédito bancário;
2. ordem/liberação e crédito observado são fatos distintos;
3. preferir a expressão humana `Crédito compatível localizado` quando essa é a força real da evidência;
4. saldo carrega data de referência;
5. saldo aplicado não é rendimento;
6. ausência não é zero;
7. cobertura parcial não prova ausência;
8. histórico não completa lacunas de 2026;
9. fontes independentes não se sobrescrevem;
10. conciliação financeira é determinística e testável.

## Hierarquia documental atual

A antiga hierarquia deste arquivo está revogada. A hierarquia vigente é a definida em:

1. `AGENTS.md`;
2. `docs/LEIA_PRIMEIRO.md`;
3. `docs/ESTADO_ATUAL_2026-09-04.md` ou sucessor soberano posterior;
4. `docs/CONTINUIDADE_WORK.md`;
5. `docs/INDICE_DOCUMENTAL.md`.

Para entender a evolução entre este checkpoint e 04/09, consulte `docs/HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`.