# Arquitetura atual e direção de evolução

**Estado corrente:** 04/09/2026  
**Resumo factual:** [`ESTADO_ATUAL_2026-09-04.md`](ESTADO_ATUAL_2026-09-04.md)

## 1. Princípio arquitetural

O sistema separa três coisas que não podem ser confundidas:

1. **fato observado por uma fonte**;
2. **conclusão derivada por regra determinística**;
3. **apresentação humana no site/Excel**.

IA, agentes e navegador automatizado podem auxiliar coleta/diagnóstico, mas não decidem a conclusão financeira final.

```text
fontes públicas/autorizadas
        │
        ▼
evidência bruta / observações
        │
        ▼
normalização por fonte
        │
        ▼
conciliação determinística
        │
        ├────────► auditoria/evidência técnica
        │
        ▼
read model humano
        │
        ├────────► Excel gerencial
        └────────► site React/Vite
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

Quando HTTP direto não basta para uma fonte pública, existe fallback de navegador controlado. O workflow integral instala Chromium explicitamente desde o PR #56.

## 3. Orquestração financeira

`backend/application/run-financial-intelligence-monitoring.ts` coordena a inteligência financeira e distingue falhas bloqueantes de falhas suplementares.

Princípio:

- uma falha em dado nuclear pode tornar a execução `PARTIAL`;
- falha em fonte suplementar deve ser preservada como cobertura/erro, sem inventar ausência e sem apagar evidência nuclear.

No checkpoint de 04/09, o relatório de abertura de conta do FNDE apresentou erro Oracle para as 163 UEx; `ACCOUNT_OPENING` permaneceu suplementar. Falhas de `BALANCE`, por exemplo, continuam bloqueantes.

## 4. Fluxo integral de publicação do retrato

A arquitetura de produção foi alterada em 04/09 para eliminar o desacoplamento entre “coletar” e “publicar”.

### 4.1. Gate Full 163

Workflow: `.github/workflows/sigef-full-163-validation.yml`.

Propriedades:

- roda em mudanças relevantes e na `main`;
- Node 24;
- `npm ci`;
- instala Chromium/dependências;
- executa a sessão para `all`;
- timeout de segurança: 120 minutos;
- exige `session.status === COMPLETE`;
- exige `schoolCount === 163`;
- preserva artefato/evidências mesmo quando a execução falha.

**O timeout não é meta de velocidade.** Ele existe como proteção superior. Coletas longas são aceitáveis quando continuam saudáveis.

### 4.2. Publisher do snapshot

Workflow: `.github/workflows/publish-validated-snapshot.yml`.

Dispara somente após conclusão do Full 163 e só publica quando:

- a run terminou `success`;
- a branch da run é `main`.

O publisher:

1. encontra o artefato `sigef-full-163-2026` da **mesma run**;
2. baixa o artefato;
3. exige `COMPLETE` + 163;
4. exige portfólio com 163 escolas;
5. exige 163 prontuários distintos por INEP;
6. registra `workflowRunId`, `artifactId` e nome do artefato;
7. impede uma run mais antiga de substituir uma mais nova;
8. serializa, comprime gzip e codifica base64;
9. divide o snapshot em partes estáticas;
10. reidrata e valida o conteúdo antes do push;
11. cria commit automático em `main`;
12. deixa a integração Git do Vercel publicar a nova versão.

Essa arquitetura garante que o snapshot público tenha proveniência verificável.

## 5. Prova do circuito em 04/09

- Full 163 run #216 / id `33906605579`: `success`;
- artefato `9950830049`;
- publisher run `33909648939`: `success`;
- commit de dados `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- Vercel `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`: `READY`;
- manifesto público servindo `33906605579 / 9950830049`.

O snapshot histórico `32164281411 / 9335143477` foi supersedido.

## 6. Consulta/coleta disparada pelo site

A experiência web mantém o retrato anterior enquanto a atualização trabalha. A coleta pode realizar múltiplas consultas, retries e fallbacks.

Propriedades obrigatórias:

- exibir progresso sem tratar demora normal como falha;
- não substituir o retrato anterior por resultado `PARTIAL`;
- não transformar timeout/falha de uma fonte em zero;
- um prontuário aberto deve acompanhar o retrato válido promovido na sessão;
- o produto deve privilegiar qualidade/completude, não duração curta.

Uma futura evolução pode tornar a orquestração de longa duração ainda mais persistente, mas **não é aceitável reduzir a profundidade de coleta apenas para caber em uma janela menor**.

## 7. Fronteiras de responsabilidade

### `backend/core/`

Contratos e invariantes: dinheiro em centavos, exercício, identidade, evidência e regras determinísticas.

### `backend/adapters/`

Acesso às fontes. Cada adaptador preserva semântica/cobertura próprias. Uma fonte não reescreve outra silenciosamente.

### `backend/application/`

Orquestra coleta, monitoramento, conciliação, snapshots e projeções.

### `shared/human-financial-contract.ts`

Fronteira comum entre backend e frontend para a projeção humana.

### `backend/report/`

Geração de Excel humano/gerencial e saídas técnicas correspondentes.

### `src/product/`

Experiência fiscal. Organiza a informação; não reinterpreta o bruto nem decide conciliação.

### `public/data/`

Snapshot público materializado após gate integral validado. O manifesto registra proveniência da run/artefato.

### `supabase/migrations/`

Infraestrutura institucional planejada/testada. Código existente não significa implantação definitiva.

## 8. Produto web atual

O produto inclui visões para:

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
- leitura operacional do PDDE Básico;
- indicadores acionáveis.

Site e Excel compartilham o mesmo domínio de informação, mas têm densidades diferentes.

## 9. Regras que a arquitetura não pode violar

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
16. interface humana não expõe ruído técnico como conteúdo comum.

## 10. Persistência: o que já existe e o que ainda falta

### Já durável/publicado

- snapshot integral validado via commit em `main`;
- proveniência run/artifact;
- distribuição Vercel;
- artefato temporário da execução no GitHub Actions;
- produto web e Excel derivados do retrato.

### Ainda não institucionalizado definitivamente

- Supabase dedicado permanentemente conectado;
- histórico durável de execuções/evidências no banco institucional;
- fila/worker persistente ligada ao frontend de forma definitiva;
- consulta histórica das execuções pelo próprio produto.

A promoção automática via Git/Vercel resolveu a durabilidade do **retrato público aprovado**, mas não substitui a futura camada institucional de histórico operacional.

## 11. Gates de engenharia

A validação inclui, conforme o fluxo:

- Vitest;
- TypeScript/typecheck;
- build Vite;
- MSW para integrações controladas;
- Playwright em navegador real;
- Axe para acessibilidade;
- smoke desktop/mobile;
- Full 163 com fontes reais;
- reidratação do snapshot publicado.

CI verde de testes locais não substitui prova de fontes reais quando a mudança afeta dados.

## 12. Próxima fronteira arquitetural

Evoluções futuras devem ocorrer sobre a arquitetura atual, preservando os gates e a semântica já conquistados. Prioridades possíveis:

1. persistência institucional dedicada;
2. histórico durável de coletas e proveniência consultável;
3. integração de fontes adicionais apenas após piloto/credencial;
4. reforço da orquestração longa sem reduzir profundidade;
5. melhorias de UX que não alterem silenciosamente as regras financeiras.

Antes de qualquer mudança, ler `AGENTS.md` e `docs/LEIA_PRIMEIRO.md`.