# Promoção automática do snapshot financeiro — 04/09/2026

## Problema observado

A execução integral das 163 UEs podia concluir com sucesso e preservar um novo artefato, enquanto o site continuava carregando o manifesto estático de uma execução histórica. Assim, código novo e coleta nova podiam coexistir com um retrato público antigo.

## Correção

- `SIGEF Full 163 Validation` passa a executar também em `push` para `main` quando arquivos que afetam a coleta, conciliação ou planilha são alterados.
- Uma execução `COMPLETE` 163/163 em `main` aciona `Publicar snapshot financeiro validado`.
- O publicador baixa exatamente o artefato `sigef-full-163-2026` da execução verde, reconstitui carteira e 163 prontuários, gera o snapshot comprimido usado pelo site e valida a decomposição antes do commit.
- O manifesto registra `publishedAt`, `workflowRunId` e `artifactId` da execução efetivamente publicada.
- Uma execução mais antiga não pode substituir snapshot de run mais novo.
- O commit de dados não dispara novamente a coleta 163 porque `public/data/**` não faz parte dos caminhos do workflow de coleta, evitando loop.

## Critério de aceite

A correção só é considerada concluída quando, após o merge desta mudança:

1. a execução 163/163 em `main` termina com sucesso;
2. o workflow de publicação promove o artefato dessa mesma execução;
3. o manifesto público em produção deixa de apontar para o run histórico `32164281411` / artefato `9335143477`;
4. o site de produção responde com o novo snapshot e a planilha gerada pela interface usa a mesma carteira publicada.
