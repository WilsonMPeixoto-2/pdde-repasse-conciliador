# Índice documental canônico — PDDE Repasse Conciliador

**Atualização:** 21/08/2026

**Repositório:** `WilsonMPeixoto-2/pdde-repasse-conciliador`

**Branch deste checkpoint:** `codex/accessibility-legibility-aa`

**Finalidade:** permitir que qualquer ferramenta retome o projeto sem descobrir documentos por tentativa e erro.

## 1. Regra de continuidade

Um documento textual do projeto somente pode ser chamado de **salvo, publicado ou disponível para continuidade** quando:

1. está dentro do repositório canônico;
2. está rastreado por Git e incluído em commit;
3. o commit está em uma branch remota do GitHub;
4. o caminho está registrado neste índice ou em `docs/CONTINUIDADE_WORK.md`;
5. a existência do arquivo no remoto foi verificada depois do push.

Commit local, arquivo no workspace, resposta de chat ou cópia isolada na Biblioteca não atendem sozinhos a essa definição.

Artefatos binários volumosos ou datados — planilhas, JSON, ZIP, imagens, HTML e PDF — podem permanecer na Biblioteca ou no CI, desde que este índice registre nome, tipo, tamanho, finalidade, vigência e localização. Quando um binário for necessário para reproduzir uma decisão atual, seu checksum e a forma de recuperação também devem constar na auditoria ou no checkpoint correspondente.

## 2. Ordem única de leitura

Toda retomada deve começar por esta sequência:

1. `docs/INDICE_DOCUMENTAL.md`;
2. `docs/CONTINUIDADE_WORK.md`;
3. `docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`;
4. `docs/ESTADO_ATUAL_2026-08-19.md`;
5. `docs/DECISOES.md`;
6. auditoria, especificação e plano do marco corrente indicados em `CONTINUIDADE_WORK.md`;
7. código, testes, histórico Git e estado remoto real.

A auditoria integral é o diagnóstico de origem. `CONTINUIDADE_WORK.md` é o checkpoint operacional mais recente. Em caso de divergência, código, testes e execução real prevalecem, seguidos pelos documentos vigentes.

## 3. Auditoria integral recuperada

A auditoria que iniciou a reorganização está disponível integralmente em:

`docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md`

Propriedades da cópia da Biblioteca:

- 1.260 linhas;
- 59.761 bytes;
- SHA-256 `4686dc461c658f0204834b97b37cdf105c202a202a5bd9eec594edd657f78b43`;
- escopo declarado: código-fonte, documentação, 414 commits, PRs nº 1–36, produção, snapshot, Excel humano, planilhas históricas, handoff e artefatos;
- limite declarado no próprio relatório: os chats posteriores a 13/08 não estavam integralmente disponíveis; a cronologia foi reconstruída por evidências materiais e não apresentada como transcrição palavra por palavra.

A cópia versionada preserva exatamente os bytes e o SHA-256 do arquivo existente na Biblioteca.

## 4. Documentos do repositório

| Caminho | Finalidade | Vigência | Publicação após este checkpoint |
| --- | --- | --- | --- |
| `docs/ARCHITECTURE.md` | Arquitetura técnica | Vigente | `origin/main` |
| `docs/ASSISTENTE_LIBERACOES.md` | Caminho auxiliar de liberações | Referência técnica | `origin/main` |
| `docs/BASELINE_FINANCEIRO_PUBLICO_2026-08-16.md` | Baseline financeiro público | Histórico | `origin/main` |
| `docs/BASELINE_TECNICO_2026-08-14.md` | Baseline técnico | Histórico | `origin/main` |
| `docs/CONHECIMENTO_ACUMULADO.md` | Memória técnica e de domínio | Vigente | `origin/main` |
| `docs/CONTINUIDADE_WORK.md` | Checkpoint operacional e próximo ponto de retomada | Vigente | branch remota `codex/accessibility-legibility-aa`; versão anterior em `origin/main` |
| `docs/DECISOES.md` | Registro enxuto de decisões estabilizadas | Vigente | `origin/main` |
| `docs/ESCOPO_V05.md` | Escopo da v0.5 | Histórico | `origin/main` |
| `docs/ESTADO_ATUAL_2026-08-19.md` | Estado consolidado anterior aos marcos publicados | Vigente com complementos posteriores | `origin/main` |
| `docs/FONTES_E_REGRAS.md` | Fontes, semântica e regras financeiras | Vigente | `origin/main` |
| `docs/FRONTEND_PRODUCT_IMPLEMENTATION_2026-08-16.md` | Registro de implementação do frontend inicial | Histórico | `origin/main` |
| `docs/FRONTEND_PRODUCT_QA_2026.md` | QA do frontend do marco inicial | Histórico de verificação | `origin/main` |
| `docs/INDICE_DOCUMENTAL.md` | Mapa único de documentos e artefatos | Vigente | branch remota `codex/accessibility-legibility-aa` |
| `docs/MONITORING_INSTITUCIONAL.md` | Contrato do monitoramento institucional | Referência técnica | `origin/main` |
| `docs/PRODUCT_DECISION_GATE_2026.md` | Registro do gate de produto original | Histórico; decisões posteriores prevalecem | `origin/main` |
| `docs/PROJETO.md` | Visão e limites do projeto | Vigente | `origin/main` |
| `docs/REFERENCIAS_NORMATIVAS.md` | Referências normativas aplicáveis | Vigente | `origin/main` |
| `docs/TECHNICAL_AUDIT_2026-08-16.md` | Auditoria técnica do marco de 16/08 | Histórico de diagnóstico | `origin/main` |
| `docs/VALIDACAO_REAL_V05_2026-08-13.md` | Validação real da v0.5 | Histórico | `origin/main` |
| `docs/VISAO_FISCAL.md` | Contrato de leitura fiscal | Vigente | `origin/main` |
| `docs/VISUAL_PRODUCT_CONSTITUTION_2026.md` | Princípios visuais do produto | Vigente, sujeito aos marcos posteriores | `origin/main` |
| `docs/audits/2026-08-20-leitura-operacional-escola.md` | Evidência de auditoria do marco indicado | Evidência datada | `origin/main` |
| `docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md` | Evidência de auditoria do marco indicado | Evidência datada | branch remota `codex/accessibility-legibility-aa` |
| `docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md` | Evidência de auditoria do marco indicado | Evidência datada | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/HANDOFF_CONTINUIDADE_PDDE_WORK.md` | Checkpoint ou prompt histórico recuperado da Biblioteca | Histórico; não substitui CONTINUIDADE_WORK | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.md` | Checkpoint ou prompt histórico recuperado da Biblioteca | Histórico; não substitui CONTINUIDADE_WORK | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/PROMPT_NOVO_CHAT_WORK_PDDE.txt` | Checkpoint ou prompt histórico recuperado da Biblioteca | Histórico; não substitui CONTINUIDADE_WORK | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/source-material/2026-08-14-codigos-referencia-extracao-pdde-sigef.md` | Fonte textual bruta preservada sem promover suas afirmações | Histórico; não canônico | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/source-material/2026-08-14-pesquisa-extracao-sistemas-legados.md` | Fonte textual bruta preservada sem promover suas afirmações | Histórico; não canônico | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/source-material/2026-08-14-pesquisa-fontes-e-evolucao.md` | Fonte textual bruta preservada sem promover suas afirmações | Histórico; não canônico | branch remota `codex/accessibility-legibility-aa` |
| `docs/history/source-material/2026-08-14-relatorio-piloto-10-escolas.md` | Fonte textual bruta preservada sem promover suas afirmações | Histórico; não canônico | branch remota `codex/accessibility-legibility-aa` |
| `docs/superpowers/plans/2026-08-15-acquisition-analytics-tooling.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-15-inteligencia-financeira-2026-foundation.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-16-frontend-inteligencia-financeira-2026.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-17-modo-sessao-visual-tooling.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-17-visao-geral-executiva.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-19-coerencia-produto-layout-documentacao.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-19-ux-encontrabilidade-navegacao.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-20-leitura-operacional-escola.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/plans/2026-08-21-acessibilidade-legibilidade.md` | Plano executável do marco indicado | Vigente apenas para o marco correspondente | branch remota `codex/accessibility-legibility-aa` |
| `docs/superpowers/specs/2026-08-15-acquisition-analytics-tooling-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/specs/2026-08-15-inteligencia-financeira-2026-foundation-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/specs/2026-08-17-visao-geral-executiva-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/specs/2026-08-19-ux-encontrabilidade-navegacao-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/specs/2026-08-20-leitura-operacional-escola-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | `origin/main` |
| `docs/superpowers/specs/2026-08-21-acessibilidade-legibilidade-design.md` | Especificação de produto/engenharia do marco indicado | Vigente apenas para o marco correspondente | branch remota `codex/accessibility-legibility-aa` |
| `docs/vercel-preview.md` | Operação de preview Vercel | Referência operacional | `origin/main` |

## 5. Materiais textuais recuperados da Biblioteca

Além da auditoria integral, foram preservados no GitHub:

- handoff Work de 20/08;
- handoff v0.4 de 13/08;
- prompt original de retomada;
- pesquisa sobre extração de sistemas legados;
- relatório piloto de dez escolas;
- pesquisa extensa de fontes e evolução;
- códigos de referência de extração PDDEInfo/SIGEF.

A auditoria, os dois handoffs e o prompt preservam o conteúdo e os bytes originais. As fontes brutas com terminações CRLF foram normalizadas para LF pelo Git; o conteúdo textual foi preservado e o índice abaixo mantém os nomes originais da Biblioteca. Fontes históricas não substituem código, testes, decisões ou documentação vigente.

| Material | SHA-256 na Biblioteca | SHA-256 no GitHub | Observação |
| --- | --- | --- | --- |
| Auditoria integral | `4686dc461c658f0204834b97b37cdf105c202a202a5bd9eec594edd657f78b43` | `4686dc461c658f0204834b97b37cdf105c202a202a5bd9eec594edd657f78b43` | Bytes idênticos |
| Handoff Work de 20/08 | `d4e8d10b3b4da99d6f2b3a197ca37fa650b80cfb5559d1a5c11086f5e680c925` | `d4e8d10b3b4da99d6f2b3a197ca37fa650b80cfb5559d1a5c11086f5e680c925` | Bytes idênticos |
| Handoff v0.4 de 13/08 | `01eca205354f41f29aa93615459dc46bdadd2431aba203bc889edd8e87e18b8a` | `01eca205354f41f29aa93615459dc46bdadd2431aba203bc889edd8e87e18b8a` | Bytes idênticos |
| Prompt original de retomada | `a22ee5378b188629ed7e3173559f89c1a48e65a5de42f5819caa2220377891ed` | `a22ee5378b188629ed7e3173559f89c1a48e65a5de42f5819caa2220377891ed` | Bytes idênticos |
| Pesquisa de extração em legados | `97ba46e14d714e6ec783b6a1de0b843594b141f7b0f351c05b000f7a65536eec` | `9fb79e7edfc7196302df3b24545ceb10b3b9ecfd0101ac8705bd7558a5702c34` | CRLF normalizado para LF |
| Relatório piloto de dez escolas | `04c946bc414dcdc3e38a5a37c797ad6dde0b916bb1526914445787b295b2da98` | `e88f841a77227ff92cd43aeba91c31e325ef7aad731f4790452dda758cd66e4e` | CRLF normalizado para LF |
| Pesquisa de fontes e evolução | `af0dc205a5f94e82a26c3e9948bb25fc1184f6acd9e7f40710088cef17c4c13d` | `6180ebac161ff24ed629bd8a8d9aef248704d7547d2e5a34d570152e6b55edd0` | Conteúdo preservado; término final normalizado |
| Códigos de referência | `29b4e78b31a178828df007a2862eac08005e45163e340840438bb45090ba04d3` | `82c0b3825841ef670beb81d83e487036a2f6051a861a7528998db75cf8740d0e` | CRLF normalizado para LF |

## 6. Inventário integral da pasta `/EXTRAÇÃO PDDE INFO` na Biblioteca

**Quantidade inventariada:** 66 arquivos.

**Data do inventário:** 21/08/2026.

**Escopo:** todos os itens retornados pela pasta e suas subpastas, sem seleção manual por nome.

| Nome original | Tipo | Bytes | Finalidade | Vigência | Localização/acesso |
| --- | --- | ---: | --- | --- | --- |
| `011b7ce3-1f32-45b7-a76d-2762cd1d6e09.png` | image/png | 604882 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `0438bf55-4435-42c2-b137-f40799d8b98e.png` | image/png | 426115 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `0d66a792-aeb1-44c4-b36d-0a435ab7571e.png` | image/png | 56572 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `1cea8fca-8982-4ec8-a82a-5d0ef8c90382.png` | image/png | 1005902 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `2496d7e1-2f38-4130-b552-216598328f83.png` | image/png | 134862 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `348ba445-7c79-4709-b816-b2d616de34c3.png` | image/png | 133687 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `42e91d8d-0c0e-4d13-bb08-ef3ec1bf3fe4.png` | image/png | 69209 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `5d73eb5c-7150-4511-95ee-6ec9c04e9a43.png` | image/png | 86992 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `5ddd6732-a304-4544-8fac-30a4eafaf984.png` | image/png | 29846 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `5f5a9d4a-ee02-4032-8e27-8ef7da7eb17f.png` | image/png | 62991 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `7e18ca2a-e8ee-4176-a60f-32aaf2150fc4.png` | image/png | 82826 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `85bc05d3-96e8-4118-9a39-a8c2c9baa3d3.png` | image/png | 46641 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `a0305194-b860-436e-847a-14884ac409d6.png` | image/png | 131636 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md` | text/markdown | 59761 | Auditoria integral de continuidade | Diagnóstico histórico que originou a reorganização | Biblioteca + `docs/audits/AUDITORIA_CONTINUIDADE_PDDE_2026-08-20.md` |
| `Base_Consolidada_Contas_PDDE_4CRE_2026.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 54402 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `c5d2fb9c-79a7-4efd-83b9-b70c39c753de.png` | image/png | 49192 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `c90593ea-2716-40a7-873c-8996437cb834.png` | image/png | 77151 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `ce063e47-b4e3-445c-b176-7e78ba617540.png` | image/png | 408858 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `d353df5d-122a-4099-b440-ab350c8ced35.png` | image/png | 37583 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `da123516-d9ff-464d-94b0-cec806ee2973.png` | image/png | 687540 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `EVIDENCIA_OFICIAL_SIGEF_APLICACOES_EM_PRESIDENTE_EURICO_DUTRA.pdf` | application/pdf | 6738 | Evidência oficial ou captura bruta SIGEF | Evidência datada | Biblioteca; metadado inventariado no GitHub |
| `EVIDENCIAS_SIGEF_EM_PRESIDENTE_EURICO_DUTRA.zip` | application/zip | 18635 | Pacote de dados ou evidências | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `Extrato_2026_EM_Andrade_Neves.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 9030 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `Extrator_PDDEInfo_4a_CRE_2026_Codigo_Fonte_v21.zip` | application/zip | 26704 | Arquivo histórico de código-fonte | Histórico; repositório Git atual prevalece | Biblioteca; metadado inventariado no GitHub |
| `Extrator_PDDEInfo_Rio_2026_Codigo_Fonte_v1786408930184.zip` | application/zip | 14985 | Arquivo histórico de código-fonte | Histórico; repositório Git atual prevalece | Biblioteca; metadado inventariado no GitHub |
| `fc073183-1542-4a93-8f36-bb88dca51428.png` | image/png | 38235 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `fiscal-human-view-163-2026.zip` | application/zip | 238763 | Pacote de dados ou evidências | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `frontend-product-smoke-2026-final.zip` | application/zip | 1322686 | Pacote de evidência visual de smoke test | Evidência datada | Biblioteca/CI; metadado inventariado no GitHub |
| `frontend-product-smoke-executive-final.zip` | application/zip | 2221409 | Pacote de evidência visual de smoke test | Evidência datada | Biblioteca/CI; metadado inventariado no GitHub |
| `frontend-product-smoke-ledger.zip` | application/zip | 1504729 | Pacote de evidência visual de smoke test | Evidência datada | Biblioteca/CI; metadado inventariado no GitHub |
| `frontend-product-smoke-portfolio-final.zip` | application/zip | 1994601 | Pacote de evidência visual de smoke test | Evidência datada | Biblioteca/CI; metadado inventariado no GitHub |
| `HANDOFF_CONTINUIDADE_PDDE_WORK.md` | text/markdown | 10515 | Checkpoint Work de 20/08 | Histórico; supersedido por `docs/CONTINUIDADE_WORK.md` | Biblioteca + `docs/history/HANDOFF_CONTINUIDADE_PDDE_WORK.md` |
| `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13(1).docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 51770 | Duplicata Word enviada do handoff v0.4 | Histórico | Biblioteca; conteúdo textual disponível no GitHub em Markdown |
| `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13(1).md` | text/markdown | 31333 | Duplicata do handoff v0.4 enviada pelo usuário | Histórico; conteúdo equivalente à cópia versionada | Biblioteca; cópia única preservada no GitHub |
| `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.docx` | application/vnd.openxmlformats-officedocument.wordprocessingml.document | 51770 | Versão Word do handoff v0.4 | Histórico | Biblioteca; conteúdo textual disponível no GitHub em Markdown |
| `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.md` | text/markdown | 31333 | Handoff canônico da v0.4 | Histórico | Biblioteca + `docs/history/HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13.md` |
| `Markdown (2).md colado` | text/plain | 13289 | Pesquisa técnica sobre extração em sistemas legados | Fonte bruta histórica; não canônica | Biblioteca + cópia LF em `docs/history/source-material/2026-08-14-pesquisa-extracao-sistemas-legados.md` |
| `Markdown(1).md colado` | text/plain | 11614 | Relatório piloto de dez escolas e registro de execução | Fonte bruta histórica; números dependem do recorte datado | Biblioteca + cópia LF em `docs/history/source-material/2026-08-14-relatorio-piloto-10-escolas.md` |
| `Markdown(2).md colado` | text/plain | 158395 | Pesquisa extensa de fontes, alternativas e evolução | Fonte bruta histórica; decisões atuais prevalecem | Biblioteca + cópia LF em `docs/history/source-material/2026-08-14-pesquisa-fontes-e-evolucao.md` |
| `Markdown(3).md colado` | application/javascript | 16807 | Códigos de referência para PDDEInfo/SIGEF | Fonte bruta histórica; código atual prevalece | Biblioteca + cópia LF em `docs/history/source-material/2026-08-14-codigos-referencia-extracao-pdde-sigef.md` |
| `Markdown.md colado` | text/plain | 13289 | Duplicata byte a byte da pesquisa sobre sistemas legados | Fonte bruta histórica; não canônica | Biblioteca; uma única cópia LF preservada no GitHub |
| `monitor-all-163-2026.json` | application/json | 1597674 | Dataset ou saída estruturada de execução | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_163_UEs(1).xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 135536 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_163_UEs.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 135536 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_bruto.json` | application/json | 956393 | Dataset ou saída estruturada de execução | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_Caderno_Fiscal_v2.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 138163 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_Excel_Fiscal_v3.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 329177 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_operacional.json` | application/json | 794216 | Dataset ou saída estruturada de execução | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `Monitoramento_PDDE_4CRE_2026_Visao_Fiscal_v2.json` | application/json | 941942 | Dataset ou saída estruturada de execução | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `monitoring-operational-163-2026.zip` | application/zip | 2652019 | Pacote de dados ou evidências | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `Painel Financeiro PDDE 4ª CRE 2026.png` | image/png | 1602561 | Evidência visual ou referência de interface | Evidência histórica | Biblioteca; metadado inventariado no GitHub |
| `PDDE_4CRE_2026_Inteligencia_Financeira_163_UEs.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 99815 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDE_4CRE_2026_Pacote_Completo_163_UEs.zip` | application/zip | 3303522 | Pacote de dados ou evidências | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `PDDE_Repasse_Conciliador_v0.1.0_mvp_backend_core.zip` | application/zip | 129662 | Arquivo histórico de código-fonte | Histórico; repositório Git atual prevalece | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_Auditavel_V2.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 59580 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_Auditavel_Versao_3.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 66983 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_por_UE.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 35719 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_V2.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 43488 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_V2_Formatacao_Corrigida.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 43625 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_4a_CRE_2026_Visao_Financeira_V2_Texto_Enxuto.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 42905 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PDDEInfo_Rio_2026_Visao_Financeira_por_UE.xlsx` | application/vnd.openxmlformats-officedocument.spreadsheetml.sheet | 286159 | Planilha de dados ou entrega humana | Artefato datado; não substitui a geração atual | Biblioteca; metadado inventariado no GitHub |
| `PROMPT_NOVO_CHAT_WORK_PDDE.txt` | text/plain | 7753 | Prompt original de retomada do Work | Histórico | Biblioteca + `docs/history/PROMPT_NOVO_CHAT_WORK_PDDE.txt` |
| `sigef-full-163-2026-final-product-head.zip` | application/zip | 2638095 | Pacote de dados ou evidências | Artefato datado | Biblioteca; metadado inventariado no GitHub |
| `SIGEF_OFICIAL_EM_PRESIDENTE_EURICO_DUTRA_PDDE_BASICO_000056270X.html` | text/html | 36881 | Evidência oficial ou captura bruta SIGEF | Evidência datada | Biblioteca; metadado inventariado no GitHub |
| `SIGEF_OFICIAL_EM_PRESIDENTE_EURICO_DUTRA_PDDE_EQUIDADE_0000645567.html` | text/html | 10036 | Evidência oficial ou captura bruta SIGEF | Evidência datada | Biblioteca; metadado inventariado no GitHub |
| `SIGEF_OFICIAL_EM_PRESIDENTE_EURICO_DUTRA_PDDE_QUALIDADE_0000555215.html` | text/html | 52129 | Evidência oficial ou captura bruta SIGEF | Evidência datada | Biblioteca; metadado inventariado no GitHub |

## 7. Lacunas e limites conhecidos

- O relatório integral de 20/08 é completo quanto ao trabalho que efetivamente auditou, mas declara que não obteve a íntegra de todos os chats antigos.
- A Biblioteca contém duplicatas do handoff v0.4 e da pesquisa sobre sistemas legados; o GitHub preserva uma cópia textual de cada conteúdo único.
- Binários históricos não foram duplicados indiscriminadamente no GitHub. Ferramentas sem acesso à Biblioteca conseguem identificar todos pelo inventário, mas precisam de acesso à Biblioteca ou ao artefato de CI para abrir os bytes.
- As seis capturas da auditoria de acessibilidade de 21/08 continuam evidência local identificada por nome e SHA-256 na própria auditoria. Elas não devem ser confundidas com documentação textual.
- A branch deste checkpoint não autoriza PR, merge ou deploy. Ela apenas torna a documentação acessível remotamente.

## 8. Protocolo obrigatório para novos documentos

Ao final de toda análise, especificação, plano ou relatório relevante:

1. escolher um único caminho canônico no repositório;
2. marcar claramente se o documento é vigente, histórico ou evidência datada;
3. atualizar este índice e `CONTINUIDADE_WORK.md` quando houver mudança de marco;
4. executar verificação de links, `git diff --check` e varredura de segredos;
5. commit e push para uma branch remota;
6. confirmar o arquivo pelo objeto remoto;
7. somente então informar ao usuário que o documento está salvo e acessível.

Não criar uma segunda fonte de verdade na Biblioteca. A Biblioteca pode manter cópias, anexos e artefatos; o GitHub remoto é a fonte textual canônica.
