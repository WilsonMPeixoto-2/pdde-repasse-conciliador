# Evidência — Antonieta produtos 66 e 70 — 08/09/2026

**PR:** #58  
**Branch:** `feat/temporal-coverage-sigef-export-2026-09-05`  
**HEAD investigado:** `0753f88423e63fa26766665ff06321c26ce5313f`  
**Workflow:** `Antonieta PDDE Product Probe` #9  
**Run:** `34277611962`

## Objetivo

Verificar por extração integral, sem inferência por nome do produto ou data de atualização do arquivo, se os produtos atuais da Plataforma Antonieta de Barros para execução financeira e saldos do PDDE Básico contêm registros do exercício de 2026 para as 163 UEs da 4ª CRE.

## Produto 66 — Execução Financeira PDDE Básico - Público

Artefato oficial observado:

- nome: `PDDE_Execucao_Financeira_PDDE_Basico_Publico.txt.gz`;
- tamanho declarado e baixado: **9.347.505 bytes**;
- `lastUpdated`: `2026-01-29T16:45:56Z`;
- SHA-256 do GZ: `1e57be6ae1ba9c2d00cb56c1a431fde081b86f7366b704c0ed97d8fffcf21184`;
- tamanho do metadata igual ao download: **sim**;
- registros: **338.709**;
- coluna temporal explícita: `AN_EXERCICIO`;
- distribuição de exercício observada: **2025 = 338.709**;
- UEs-alvo localizadas: **163/163**;
- linhas de 2026 das UEs-alvo: **0**.

Conclusão: `EXTRAIU_DADO_REAL`, com cobertura integral da carteira, mas o artefato oficial observado está restrito ao exercício de **2025**. Não serve para preencher as lacunas correntes de 2026.

## Produto 70 — Saldos das Contas das UEx - PDDE Básico - Públicas

Artefato oficial observado:

- nome: `PDDE_Saldo_Contas_UEX_Publico.txt.gz`;
- tamanho declarado e baixado: **10.426.019 bytes**;
- `lastUpdated`: `2026-02-10T18:04:56Z`;
- SHA-256 do GZ: `95c02ccdf10c788ae681cf6362a9aae37e1d404d176245e83cbba0d0d021a9a5`;
- tamanho do metadata igual ao download: **sim**;
- registros: **260.926**;
- coluna temporal explícita: `an_exercicio`;
- distribuição de exercício observada: **2025 = 260.926**;
- UEs-alvo localizadas: **163/163**;
- linhas de 2026 das UEs-alvo: **0**.

Conclusão: `EXTRAIU_DADO_REAL`, com cobertura integral da carteira, mas o artefato oficial observado está restrito ao exercício de **2025**. Não serve para preencher as lacunas correntes de 2026.

## Consequência operacional

1. A descrição “dados a partir de 2025” e o `lastUpdated` em 2026 não constituem evidência de competência 2026.
2. Os produtos 66 e 70 foram efetivamente baixados, validados e analisados com coluna temporal explícita; portanto não devem permanecer como rotas pendentes para resolver as 73 lacunas bancárias atuais enquanto os artefatos oficiais permanecerem com essa mesma distribuição temporal.
3. O portal `dados.gov.br` não deve ser tratado como fonte independente quando apontar para os mesmos artefatos oficiais. Só há motivo para reabrir essa frente se houver evidência de arquivo diferente/mais recente, por exemplo mudança de tamanho, hash, metadata ou conteúdo temporal.
4. A prioridade investigativa passa para rotas com evidência material de 2026, especialmente SIMEC/liberações, Power BI público e demais fontes que possam alcançar UEx/conta sem promover liberação administrativa a crédito bancário observado.
5. Permanece a regra do PR #58: ausência de cobertura temporal não vira zero nem “crédito não localizado” por inferência.

## Proveniência do diagnóstico

O workflow executou dois jobs independentes, `Probe produto PDDE 66` e `Probe produto PDDE 70`, ambos concluídos com `success`. Os artefatos publicados foram `antonieta-pdde-product-66` e `antonieta-pdde-product-70`, contendo o JSON de análise, logs do parser, metadata e diagnóstico de transporte.