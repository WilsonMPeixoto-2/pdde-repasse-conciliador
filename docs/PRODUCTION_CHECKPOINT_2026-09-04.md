# Production checkpoint — 04/09/2026

**Finalidade:** registrar a prova objetiva de que a coleta integral mais recente deste checkpoint chegou à produção e substituiu o snapshot histórico anterior.

## 1. Código que habilitou a promoção automática

### PR #55

- título: `ci: promover automaticamente o snapshot financeiro validado`;
- merge commit: `333948109de8ec8593500c23340b65df27484079`;
- função: ligar a execução integral validada ao snapshot público servido pelo produto.

### PR #56

- título: `ci: disponibilizar Chromium no Full 163`;
- merge commit: `c91c64f959a1f6dfcf335147565136fc0bf6a123`;
- função: tornar o fallback Playwright executável no runner do Full 163 sem enfraquecer o gate financeiro.

## 2. Execução integral aprovada

Workflow: `SIGEF Full 163 Validation`

- run number: `216`;
- run id: `33906605579`;
- head branch: `main`;
- head SHA: `c91c64f959a1f6dfcf335147565136fc0bf6a123`;
- conclusão: `success`.

Etapas verificadas como `success`:

- `npm ci`;
- instalação do Chromium e dependências;
- extração/conciliação/materialização das 163 UEs;
- gate de cobertura completa;
- preservação integral do produto e evidências.

## 3. Artefato aprovado

- nome: `sigef-full-163-2026`;
- artifact id: `9950830049`;
- digest: `sha256:f3fa9d4324d8a9b1b341efba8960f9d0324b9fbf53401a355d471d41fa75ab22`;
- tamanho: 3.973.452 bytes no registro do GitHub Actions.

O publisher utiliza exatamente o artefato da execução aprovada e não procura “o último artefato disponível” de forma genérica.

## 4. Publicação automática

Workflow: `Publicar snapshot financeiro validado`

- run id: `33909648939`;
- conclusão: `success`;
- commit gerado: `6004178a0394dfe011baa6dda7c4f6e87f028180`;
- mensagem: `data: publica snapshot financeiro validado run 33906605579`.

O publisher validou:

- `session.status === COMPLETE`;
- `session.schoolCount === 163`;
- `portfolio.schoolCount === 163`;
- existência de 163 prontuários distintos por INEP;
- proveniência do run/artifact;
- reidratação do snapshot gzip/base64 antes do push;
- proteção contra regressão para execução mais antiga.

## 5. Manifesto na main

`public/data/pdde-2026-snapshot.json` passou a registrar:

```json
{
  "source": {
    "workflowRunId": 33906605579,
    "artifactId": 9950830049,
    "artifactName": "sigef-full-163-2026"
  }
}
```

`publishedAt`: `2026-09-04T19:08:59.475Z`.

O payload foi dividido em 16 partes estáticas comprimidas.

## 6. Vercel

Deployment associado ao commit `6004178...`:

- deployment id: `dpl_pvNye9gTntZ7a18W3rcGmuW6SYVv`;
- projeto: `pdde-repasse-conciliador`;
- target: `production`;
- state: `READY`;
- branch: `main`;
- commit SHA: `6004178a0394dfe011baa6dda7c4f6e87f028180`.

## 7. Prova pública

A leitura direta do manifesto de produção retornou HTTP 200 e confirmou:

- `workflowRunId: 33906605579`;
- `artifactId: 9950830049`;
- `artifactName: sigef-full-163-2026`;
- `publishedAt: 2026-09-04T19:08:59.475Z`.

## 8. Snapshot anterior supersedido

Antes deste fechamento, produção ainda apontava para:

- workflow run id `32164281411`;
- artifact id `9335143477`.

Esses IDs são históricos e **não representam mais o retrato servido em produção neste checkpoint**.

## 9. Incidente intermediário preservado

A run #213 (`33902315275`) terminou `PARTIAL` apesar de processar 163 escolas.

Causa bloqueante:

- três falhas de saldo (`BALANCE`) para CNPJ `12.290.969/0001-23`, meses 05/2026, 06/2026 e 07/2026;
- Playwright não podia lançar navegador porque Chromium não estava instalado.

Também houve 163 falhas `ACCOUNT_OPENING` oriundas do próprio relatório FNDE, com:

`ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier`.

A arquitetura preserva essas falhas como evidência de cobertura da fonte. `ACCOUNT_OPENING` é suplementar; `BALANCE` é bloqueante. O gate não foi relaxado.

## 10. Critério de aceite cumprido

Este checkpoint só é considerado fechado porque todas as seguintes condições foram provadas:

1. coleta integral real;
2. 163/163;
3. `COMPLETE`;
4. artefato preservado;
5. publisher consumindo o artefato da mesma run;
6. snapshot novo em `main`;
7. deployment de produção `READY`;
8. manifesto público servindo os IDs novos.

Esse é o padrão mínimo para futuras declarações de que “a coleta foi atualizada em produção”.