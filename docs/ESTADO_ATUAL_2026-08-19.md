# Estado operacional atual — 19/08/2026

Este documento é o **índice factual do estado corrente** da Plataforma de Inteligência Financeira PDDE | 4ª CRE. Documentos com datas anteriores continuam úteis como baseline, auditoria ou registro de decisão, mas não devem ser usados isoladamente para concluir o que está ou não implantado hoje.

## Escopo corrente

- Carteira institucional: **163 unidades escolares da 4ª CRE / SME-Rio**.
- Exercício operacional: **2026**.
- Repositório canônico: `WilsonMPeixoto-2/pdde-repasse-conciliador`.
- `extrator-pdde-4cre`: referência histórica/técnica.
- `EXTRATOR-PDDE-MANUS`: projeto paralelo somente leitura para este fluxo.

## O que está materializado

### Coleta e inteligência financeira

- consulta PDDEInfo por INEP;
- coleta do extrato público SIGEF para contas elegíveis;
- conciliação determinística entre pagamento informado e crédito compatível;
- recuperação complementar de conta/liberação no SIGEF quando aplicável;
- relatórios públicos complementares do PDDEInfo/FNDE para atendimento, prestação de contas e saldos;
- snapshots e série mensal de saldos/aplicações de 2026;
- classificação auxiliar neutra das movimentações, preservando histórico/documento original;
- job institucional `MONITORING` implementado em código;
- read model fiscal/técnico e read model financeiro humano separados;
- Excel humano e Excel técnico/auditoria.

### Produto web publicado

O frontend React/Vite está publicado no Vercel e possui:

- Home financeira;
- busca por escola;
- carteira das 163 unidades;
- visões consolidadas de **Repasses** e **Saldos e contas**;
- indicadores acionáveis;
- prontuário financeiro por escola;
- navegação por `Resumo`, `Repasses`, `Contas e saldos`, `Movimentações` e `Prestação de contas` quando houver dados;
- composição do saldo e série mensal;
- extrato de movimentações;
- consulta ao vivo da carteira com progresso por unidade;
- preservação do retrato anterior quando a atualização falha ou termina parcial;
- deep links da SPA no ambiente Vercel.

## O que ainda não está implantado definitivamente

- **Supabase dedicado** para esta plataforma;
- aplicação das migrations no banco canônico definitivo;
- persistência durável das consultas disparadas pelo site;
- fila/worker institucional permanentemente conectado ao frontend publicado;
- persistência durável de artefatos/evidências das consultas web em infraestrutura dedicada;
- credencial oficial e ativação do Portal da Transparência como fonte operacional;
- PDF executivo final.

Enquanto o Supabase dedicado não for conectado, uma consulta ao vivo completa atualiza a sessão do navegador. Recarregar a página retorna ao retrato estável publicado.

## Regras financeiras que continuam obrigatórias

1. `Pagamento informado` não equivale a crédito bancário.
2. Ordem FNDE/OB e crédito observado são fatos distintos.
3. A expressão humana preferida é `Crédito compatível localizado`, salvo evidência mais forte.
4. Saldo sempre carrega data de referência; não é saldo bancário em tempo real.
5. Saldo aplicado não é rendimento.
6. Ausência de dado não é zero.
7. Cobertura parcial não prova ausência.
8. Dados históricos não completam silenciosamente lacunas de 2026.
9. Fontes independentes não se sobrescrevem.
10. Conciliação financeira é determinística e testável; IA não decide regularidade financeira.

## Hierarquia documental

Para evitar que fotografias antigas do projeto sejam confundidas com estado corrente:

1. **README.md** — visão operacional resumida atual;
2. **este documento** — estado corrente consolidado;
3. `FONTES_E_REGRAS.md` — regras de evidência e maturidade das fontes;
4. `VISUAL_PRODUCT_CONSTITUTION_2026.md` — princípios permanentes de apresentação;
5. `DECISOES.md` — registro datado de decisões, não status operacional;
6. `BASELINE_*.md`, auditorias e planos datados — fotografias históricas que permanecem válidas apenas no contexto de sua data.

Em caso de conflito sobre **o que existe hoje**, prevalecem o código da `main`, os testes/verificações do commit corrente, o README e este estado operacional, nessa ordem.
