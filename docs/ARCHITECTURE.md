# Arquitetura do Conciliador de Repasses PDDE

## Objetivo

Materializar, por UEx, programa, ação e parcela, a correspondência entre três evidências oficiais:

1. pagamento informado no PDDEInfo;
2. ordem bancária e conta destinatária do SIGEF Liberações;
3. crédito correspondente no SIGEF Movimentações.

O sistema não transforma ausência de arquivo, indisponibilidade de fonte ou defasagem de cobertura em conclusão negativa.

## Fluxo de dados

1. `pddeinfo-normalizer.ts` converte o retorno do PDDEInfo em pagamentos esperados.
2. `load-sigef-release-exports.ts` incorpora exportações de Liberações por manifesto ou pasta.
3. `sigef-releases-html.ts` interpreta o `.xls`, que fisicamente é HTML em Windows-1252.
4. `sigef-movements-csv.ts` lê o CSV nacional em fluxo e retém somente os CNPJs e programas da carteira.
5. `reconciliation-pipeline.ts` valida unicidade, exercício e procedência das três fontes.
6. `portfolio-reconciliation.ts` isola cada ação e parcela e resolve a conta bancária de modo explícito.
7. `reconciliation.ts` aplica os seis estados gerenciais e seus códigos de razão.
8. `reconciliation-workbook.ts` gera e relê o Excel auditável antes da gravação.

## Invariantes

- Dinheiro é comparado em centavos inteiros.
- CNPJ, banco, agência, conta, INEP, código SME e ordem bancária permanecem texto.
- Uma liberação só participa da linha compatível em CNPJ, exercício, programa, ação e parcela.
- Um movimento só participa depois que uma liberação candidata fornece contexto à parcela.
- Conta divergente entre PDDEInfo e SIGEF nunca é escolhida automaticamente.
- Conta ausente no PDDEInfo só pode ser completada por uma liberação confiável.
- Arquivo de Liberações duplicado para o mesmo CNPJ/programa interrompe a execução.
- Cabeçalho ou destinação desconhecidos interrompem a execução em vez de desaparecer do resultado.
- Fórmulas provenientes de fontes externas são neutralizadas e fórmulas no relatório final são proibidas.
- O relatório só é gravado depois de ser relido e auditado.

## Importação em lote de Liberações

A pasta usa o contrato `CNPJ__PROGRAMA.xls`, por exemplo:

```text
12345678000190__02.xls
12345678000190__0B.xls
```

O carregador valida o par declarado no nome, o CNPJ interno do arquivo, sua pertinência à carteira e a ausência de duplicidade. O resultado informa pares esperados, importados e faltantes.

O manifesto permanece disponível quando for necessário preservar a URL específica de cada exportação.

## Limites do marco v0.1.0

- A obtenção do CAPTCHA continua sob intervenção humana.
- O núcleo é executável por CLI; a interface web ainda não aciona a conciliação completa.
- Persistência de histórico, autenticação e implantação pertencem aos próximos marcos.
- Os arquivos nacionais e relatórios gerados podem ser públicos, mas ficam fora do Git por tamanho e reprodutibilidade.

## Dependência transitiva corrigida

O ExcelJS 4.4.0 ainda declara `uuid ^8.3.0`. O projeto força `uuid 11.1.1`, primeira versão corrigida da linha 11 para o CVE-2026-41907. A chamada utilizada pelo ExcelJS é `v4()`, preservada nessa versão. A geração, serialização e releitura do workbook permanecem cobertas por testes. O override deve ser removido quando uma futura versão do ExcelJS atualizar sua dependência nativa.
