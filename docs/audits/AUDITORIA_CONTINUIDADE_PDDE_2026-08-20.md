# Auditoria de continuidade do PDDE Repasse Conciliador

**Data de corte:** 20 de agosto de 2026  
**Repositório canônico auditado:** `WilsonMPeixoto-2/pdde-repasse-conciliador`  
**Branch e commit de referência:** `main` em `f78d06c799caf6ef177e9cfec41a8463416019ec`  
**Último commit com alteração de código:** `f7da740` — o commit `f78d06c` apenas reacionou o deploy  
**Produção observada:** `https://pdde-repasse-conciliador.vercel.app`  
**Natureza deste documento:** diagnóstico e reorganização; nenhum código, dado, deploy ou banco foi alterado

---

## 1. Escopo, método e limite de prova

Esta auditoria cobre, em detalhe, os materiais que puderam ser efetivamente acessados e verificados:

1. todo o estado atual do código-fonte no repositório canônico;
2. os testes, contratos, scripts, workflows, configuração de deploy e documentação versionada;
3. o histórico Git disponível, incluindo 414 commits e os corpos das pull requests 1 a 36;
4. o site publicado, observado em desktop e em nove estados/telas representativos;
5. o snapshot público atualmente embarcado na aplicação;
6. o artefato Excel humano da execução publicada mais recente;
7. planilhas históricas recuperadas, inclusive versões de conciliação e auditoria anteriores;
8. o handoff de 13 de agosto e trechos factuais recuperáveis das conversas iniciais;
9. os artefatos de execução e metadados preservados no projeto.

### 1.1 Limite importante: os chats antigos não estavam integralmente disponíveis

Não foi possível recuperar a íntegra de todos os chats normais realizados depois do handoff de 13 de agosto. A busca direta de conversas antigas falhou, e não havia uma exportação completa desses diálogos entre os arquivos acessíveis. Portanto, este documento **não afirma** ter lido palavra por palavra todos os chats citados pelo usuário.

Para o período sem transcrição integral, a reconstrução cronológica foi feita a partir de evidências primárias preservadas: commits, PRs, documentação criada em cada etapa, código, testes, artefatos, planilhas e comportamento publicado. Isso permite reconstruir com bastante precisão **o que foi materializado e em que ordem**, mas não permite atribuir com segurança a cada conversa todas as intenções, alternativas rejeitadas ou justificativas verbais que não foram registradas.

Essa distinção é mantida ao longo do relatório:

- **Fato verificado:** diretamente observável em código, teste, commit, artefato, planilha, documentação ou interface.
- **Leitura analítica:** interpretação apoiada em uma sequência de fatos explicitamente indicada.
- **Lacuna:** algo que não pode ser reconstituído sem a transcrição ausente ou uma decisão nova do responsável pelo produto.

### 1.2 Hierarquia de confiança usada

Quando materiais divergiam, foi aplicada a hierarquia já definida no próprio handoff do projeto:

1. código executável atual;
2. testes atuais;
3. execuções e artefatos reais;
4. documentação atual explicitamente marcada como vigente;
5. documentação histórica;
6. corpos de PR e mensagens de commit;
7. trechos recuperados de chats.

Essa hierarquia é importante porque várias divergências encontradas não são falhas nos cálculos, mas diferenças entre documentação histórica, comandos renomeados e caminhos de produto abandonados.

---

## 2. Diagnóstico central, sem diminuir a evolução obtida

O projeto não está em um estado de fracasso técnico. O motor de coleta, normalização, reconciliação, rastreabilidade e proteção contra dados parciais evoluiu de forma substancial e verificável. A semântica financeira ficou mais rigorosa; o portfólio passou a separar valor previsto, pagamento informado pelo PDDEInfo, crédito compatível localizado no SIGEF e saldo; a identidade das unidades e das contas recebeu correções; a cobertura de testes cresceu; o último PR de código registrou 431 testes aprovados e seis ignorados intencionalmente.

O problema principal está em outra camada: **a entrega ao usuário foi iniciada antes de as perguntas de produto e os critérios de decisão estarem fechados**. Isso produziu uma sequência em que cada versão tentou resolver a deficiência perceptível da versão anterior:

- primeiro, uma planilha ampla e tecnicamente rica;
- depois, uma planilha mais auditável;
- em seguida, uma visualização fiscal agrupada;
- depois, uma pasta de trabalho em camadas;
- posteriormente, um frontend completo;
- depois, correções técnicas do frontend;
- depois, um modo temporário com senha;
- depois, a retirada da senha e a publicação de snapshot estático;
- depois, uma consulta direta das 163 unidades no navegador;
- depois, progresso, encontrabilidade, rotas novas, deep links e alinhamento visual.

Cada uma dessas etapas contém melhorias reais. O loop aparece porque as etapas foram acumuladas sem um contrato único e estável para responder às perguntas básicas do usuário comum. A interface e a planilha foram progressivamente organizadas por **entidades e disponibilidade de dados** — unidades, repasses, contas, saldos, movimentações, prestação de contas —, mas ainda não por uma narrativa decisória completa:

1. quanto era esperado;
2. quanto foi informado como pago;
3. quanto foi localizado como crédito compatível;
4. quanto aparece como saldo, em qual data;
5. o que está incompleto e por quê;
6. o que o usuário precisa fazer agora;
7. qual evidência sustenta cada conclusão.

Essa é a razão pela qual o layout atual parece, ao mesmo tempo, importante e insuficiente. Ele preserva distinções técnicas relevantes, mas distribui a história em muitas páginas, cards, listas e expansões. A planilha humana atual também melhorou muito em relação às tabelas de 39 ou 53 colunas, porém ainda projeta a arquitetura dos dados em sete abas, sem transformar exceções em uma fila de trabalho nem oferecer uma ficha curta e navegável de cada escola.

Em termos precisos: **o avanço está concentrado no conhecimento e na confiabilidade do domínio; a regressão está na sequência de decisão e na coerência da camada de entrega; o loop é o retrabalho necessário para compensar essa sequência.**

---

## 3. Evolução cronológica reconstruída

## 3.1 10 de agosto: prova inicial de acesso ao PDDEInfo

### Fatos recuperados

- Uma consulta ao portal PDDEInfo para a 4ª CRE foi executada com sucesso.
- A exportação direta por Excel/impressão no portal não funcionou como caminho confiável.
- A necessidade inicial era obter uma visão operacional das unidades e dos repasses sem depender da interface manual do portal.

### Consequência material

O projeto começou como extração orientada a uma necessidade prática: gerar uma busca nova, visualizar temporariamente os dados e produzir uma planilha compreensível.

## 3.2 11 de agosto: planilha por escola, escopo das 163 unidades e regra de não inferência

### Fatos recuperados

- Foi construída uma planilha financeira por escola com agência, conta, valor previsto, valor pago e datas.
- O universo foi fechado nas 163 escolas com prefixo SME `04`.
- Foram identificadas 47 unidades sem conta corrente disponível no contexto consultado.
- O usuário aprovou a regra de manter agência e conta em branco nesses 47 casos e marcá-los textualmente.
- Foi explicitamente recusado o preenchimento por histórico ou adivinhação.
- A versão exclusiva das 163 unidades e uma versão financeira V2 foram produzidas.

### Regras de negócio consolidadas nessa fase

- ausência de dado não deve ser preenchida por inferência;
- uma unidade pode existir no universo institucional e não possuir conta disponível no recorte atual;
- o usuário humano precisa perceber essa ausência sem confundi-la com erro de extração.

### Estado quantitativo recuperado

- 163 escolas;
- 284 contas no recorte então utilizado;
- 520 registros de repasse;
- 47 escolas sem conta;
- 46 escolas com pagamento no estado daquela execução;
- auditoria v21 sem diferenças ou erros reportados.

### Aprendizado semântico decisivo

O campo “Valor Pago Total” do PDDEInfo foi reconhecido como uma **informação do sistema PDDEInfo**, e não como prova automática de crédito bancário. Essa distinção foi o ponto de partida para a separação posterior entre pagamento, ordem bancária e crédito compatível.

## 3.3 11–12 de agosto: da extração para evidência e conciliação

### Fatos recuperados

- O escopo foi fechado em torno de valor previsto, valor pago, ordem bancária, data, banco/agência/conta e crédito.
- Foi explicitada a intenção de esconder a complexidade técnica do usuário final.
- O projeto passou a ser concebido como plataforma de evidência, conciliação e rastreabilidade, e não apenas como extrator.
- O HTML amplo do PDDEInfo foi analisado:
  - 1.559 unidades em 156 páginas;
  - 3.027 contas;
  - 4.987 registros;
  - 163 unidades da 4ª CRE;
  - 116 unidades com conta básica no recorte observado;
  - 47 sem conta;
  - preservação da regra de não inferir dados ausentes.
- Foi estabelecida a cadeia semântica: pagamento informado não equivale a ordem bancária, que não equivale a crédito bancário.

### Piloto SIGEF

- Um CSV autorizado do SIGEF com 478.855 linhas foi usado em piloto.
- Foram localizados 13 créditos candidatos.
- Os 520 registros permaneceram inconclusivos até que a evidência necessária fosse estabelecida.
- Um artefato posterior registrou 169 pagamentos, 167 movimentos-alvo e cobertura SIGEF até 29 de maio.
- Nesse estado, os 520 registros continuavam inconclusivos e nenhum estava confirmado.

### Mudança de natureza do projeto

Até aqui a evolução foi coerente: o produto deixou de prometer uma confirmação que os dados não sustentavam. A complexidade aumentou porque a realidade financeira exigia fontes distintas, datas de cobertura, chaves de conciliação e graus de certeza.

## 3.4 13 de agosto: handoff v0.4 e governança

O handoff `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13(1).docx` registrou:

- o repositório canônico;
- a hierarquia de fontes de verdade;
- a missão do produto;
- regras de governança e continuidade;
- o commit `df80e4a` como referência daquele momento.

Esse documento foi uma tentativa explícita de resolver o problema de memória entre chats. A tentativa foi correta, mas o ritmo posterior de alteração superou rapidamente o handoff: após `df80e4a`, ocorreram 407 novos commits.

## 3.5 13–14 de agosto: automação, evidência e primeira arquitetura operacional

### PRs 2 a 8

- **PR 2 — Assistente Liberações:** introduziu um caminho auxiliar e reportou 64 testes, com três opcionais ignorados.
- **PR 3 — documentação e governança:** fortaleceu o registro formal do projeto.
- **PR 4 — automação PDDEInfo:** executou as 163 unidades, preservando 520 registros, 169 pagamentos e 47 casos sem conta.
- **PR 5 — evidência v0.4:** consolidou a trilha de prova.
- **PR 6 — backend institucional simplificado:** uma primeira proposta muito ampla foi reduzida a uma tarefa ativa única.
- **PR 7 — PDDEInfo + SIGEF ao vivo:** materializou 163/163 unidades, 284/284 contas e 51.547 movimentos históricos, dos quais 394 eram de 2026.
- **PR 8 — visão operacional:** consolidou 520 registros, 96 créditos confirmados, 47 unidades sem conta, 26 casos pagos sem crédito localizado e 351 registros sem pagamento informado.

### Valores materializados no PR 7

- previsto/programado: R$ 2.182.050,00;
- informado como pago: R$ 827.615,00;
- crédito localizado: R$ 409.010,00;
- aplicações: R$ 178.205,03 naquele artefato;
- valor pago ainda não localizado como crédito: R$ 418.605,00;
  - R$ 257.435,00 nas 47 unidades sem conta corrente atual;
  - R$ 161.170,00 em 26 unidades com conta, mas sem crédito compatível localizado.

### Evolução efetiva

O projeto já conseguia explicar diferenças que uma planilha simples não explicava. Esse é um ganho estrutural: em vez de ocultar lacunas, passou a classificá-las.

## 3.6 14–15 de agosto: visão fiscal humana, Excel em camadas e memória técnica

### PRs 9 a 12

- **PR 9 — visão fiscal humana:** agrupou 163 unidades, 357 grupos/programas, 284 extratos e 394 movimentos em uma pasta de trabalho inicial de quatro abas.
- **PR 10 — Excel em nove abas:** separou uma pasta técnica em camadas.
- **PR 11 — baseline e memória:** registrou um novo ponto de continuidade.
- **PR 12 — documentação normativa:** ampliou o contexto legal e semântico.

### Leitura da evolução das planilhas

A sequência histórica verificável foi:

1. conciliação parcial com 53 colunas e duas abas de 520 linhas;
2. versão auditável com 39 colunas em sua aba principal;
3. visão fiscal agrupada em quatro abas;
4. pasta técnica em nove abas;
5. pasta humana atual em sete abas.

Isso demonstra que houve trabalho real para reduzir a densidade. Contudo, a complexidade foi principalmente **redistribuída entre abas**, e não convertida em uma história orientada à decisão.

## 3.7 15–16 de agosto: monitoramento, proveniência, descoberta de contas e expansão de ferramentas

### PRs 13 a 21

- **PR 13:** criou job de monitoramento em código, ainda sem frontend, Supabase ou deploy.
- **PR 14:** criou catálogo e proveniência de dados.
- **PR 15:** consolidou um modelo de leitura fiscal, promovendo somente portfólios completos.
- **PR 16:** adicionou descoberta de contas.
- **PR 17:** organizou toolchain.
- **PR 18:** alteração de dependências não integrada.
- **PR 19:** adicionou PGlite.
- **PR 20:** acrescentou ferramentas auxiliares de navegador, DuckDB, Inngest, PDF e testes por propriedades, marcadas como opt-in.
- **PR 21:** integrou relatórios públicos do FNDE e um cliente de portal dependente de credenciais.

### Ganhos

- proveniência mais explícita;
- promoção atômica de portfólio completo;
- novas fontes e capacidades exploratórias;
- ferramentas para investigar dados e gerar outros formatos.

### Primeiro sinal forte de dispersão

O PR 20 ampliou bastante a superfície de tecnologia antes do fechamento das perguntas de produto. Embora as ferramentas fossem opt-in, cada nova possibilidade aumentou documentação, testes, dependências e decisões futuras. Não se trata de dizer que essas tecnologias eram erradas; o problema foi a simultaneidade entre exploração de infraestrutura, fontes, UI e produto.

## 3.8 16 de agosto: fundação consolidada e gate explícito para não construir o frontend

### PR 22 — fundação

O PR 22 reuniu 82 commits, alterou 46 arquivos e adicionou aproximadamente 5.522 linhas líquidas. Registrou:

- 163 unidades;
- 169 registros de serviço;
- 311 registros contábeis;
- 2.690 posições mensais;
- 461 séries;
- cobertura de janeiro a junho;
- 1.304 artefatos brutos;
- zero falhas, duplicidades ou inconsistências aritméticas reportadas;
- 444 posições de junho, totalizando R$ 1.642.034,41.

O próprio PR dizia expressamente que **não construía o frontend final**.

### PR 23 — constituição visual

O PR 23 documentou princípios visuais, mas deixou em aberto layout final, paleta, tipografia e várias decisões de produto.

### Gate de decisão

`docs/PRODUCT_DECISION_GATE_2026.md` determinava que o dashboard final não deveria começar antes de:

- piloto validado;
- fluxo das 163 unidades comprovado;
- cobertura histórica conhecida;
- divergências caracterizadas;
- decisões A–H fechadas.

As decisões A–H continuaram descritas como abertas. Portanto, o gate não foi formalmente satisfeito.

## 3.9 17 de agosto: frontend completo antes do fechamento do gate

### PR 24 — primeira implementação completa do frontend

No dia seguinte ao gate, o PR 24 adicionou o frontend completo. Foram 77 commits, 54 arquivos e aproximadamente 3.295 adições para 107 remoções.

### Fato processual

O frontend foi materializado enquanto o documento de decisão ainda dizia que ele não deveria começar. Isso é uma quebra verificável de sequência. Não prova que o frontend era tecnicamente inválido; prova que o projeto implementou uma resposta visual antes de concluir o contrato de problema que deveria orientá-la.

### Efeito posterior observável

Os PRs seguintes precisaram corrigir identidade, conta, datas, contratos, dependências, modo de acesso, forma de publicação, consulta ao vivo, progresso, encontrabilidade, rotas e alinhamento de layout. Essa sequência é consistente com um produto que entrou em construção antes de estabilizar decisões fundamentais.

## 3.10 17–18 de agosto: auditoria técnica, modo temporário, senha e reversão de acesso

### PR 25 — auditoria técnica

Corrigiu identidade, conta, datas, API, contratos e dependências. Também alterou deliberadamente a semântica de comandos:

- `monitor:human:xlsx` passou a representar a pasta humana;
- `monitor:fiscal:xlsx` voltou a gerar a pasta técnica;
- `monitor:audit:xlsx` permaneceu apontando para o gerador técnico.

Essa mudança foi coerente no código, mas a documentação principal não foi atualizada integralmente, gerando uma contradição atual.

### PR 26 — “Modo Sessão”

O caminho de sessão temporária acumulou 170 commits, 86 arquivos e aproximadamente 9.433 adições para 306 remoções. Ele incluiu API, orchestration, workflow, tela inicial e scripts dedicados.

### PRs 27 e 28

- hotfix de runtime;
- hotfix de tamanho da chave de acesso.

### PR 29 — retirada da senha e snapshot estático

Logo depois, a senha foi removida e o produto passou a publicar um snapshot estático. Foram 25 commits e 17 arquivos, com 253 adições e 271 remoções.

### Loop comprovado

A sequência “construir modo de sessão → corrigir runtime → corrigir chave → retirar senha → publicar snapshot” é um loop materializado, não uma impressão. Parte considerável do código e dos testes do modo temporário permanece no repositório embora sua interface já não esteja conectada ao fluxo público.

## 3.11 18–19 de agosto: consulta direta, proteção contra parcialidade e encontrabilidade

### PRs 30 a 36

- **PR 30:** adicionou consulta direta das 163 unidades pelo navegador.
- **PR 31:** impediu a promoção de portfólios parciais.
- **PR 32:** sincronizou parte do README.
- **PR 33:** acrescentou feedback de progresso.
- **PR 34:** adicionou rotas e melhorou encontrabilidade.
- **PR 35:** acrescentou deep links.
- **PR 36:** alinhou layout e documentação, registrando a verificação final mais ampla.

### Verificação registrada no PR 36

- 131 arquivos de teste aprovados;
- quatro arquivos de teste ignorados;
- 431 testes aprovados;
- seis testes ignorados;
- TypeScript e build aprovados;
- smoke tests desktop e mobile aprovados.

### Estado final desse ciclo

O site público tornou-se navegável e semanticamente mais seguro. Ao mesmo tempo, a atualização ao vivo passou a depender de 163 chamadas iniciadas pelo navegador, com estado apenas em memória e sem persistência institucional. Isso resolve a demonstração de uma “nova consulta”, mas não fecha a arquitetura operacional de atualização.

---

## 4. Escala objetiva da evolução

Entre o handoff de 13 de agosto e o corte desta auditoria:

- 407 commits foram adicionados ao repositório;
- o repositório chegou a 414 commits em oito dias;
- 339 arquivos foram modificados desde o handoff;
- o saldo foi de aproximadamente 48.389 adições e 3.056 remoções.

### 4.1 Distribuição diária depois do handoff

| Data | Commits |
|---|---:|
| 13/08 | 68 |
| 14/08 | 75 |
| 15/08 | 20 |
| 16/08 | 3 |
| 17/08 | 142 |
| 18/08 | 36 |
| 19/08 | 63 |

### 4.2 Distribuição por tipo de commit

| Tipo | Quantidade |
|---|---:|
| `test` | 113 |
| `fix` | 92 |
| `feat` | 82 |
| `docs` | 31 |
| `chore` | 18 |
| `ci` | 16 |
| `data` | 14 |
| `style` | 13 |
| `refactor` | 11 |
| `build` | 9 |
| outros | 8 |

### 4.3 Dimensão atual por área

| Área | Arquivos | Linhas aproximadas |
|---|---:|---:|
| `backend` | 82 | 16.828 |
| `src` | 53 | 6.306 |
| `tests` | 137 | 14.599 |
| `docs` | 32 | 6.242 |
| `scripts` | 19 | 2.675 |
| `api` | 2 | 365 |
| `server` | 1 | 81 |
| `shared` | 1 | 178 |
| `supabase` | 9 | 1.764 |
| `.github` | 10 | 540 |

### Interpretação apoiada nesses números

O volume de testes e correções é sinal de diligência, não de negligência. Contudo, 142 commits em um único dia, seguidos de mais 99 nos dois dias posteriores, tornam praticamente impossível manter memória humana estável sem gates, registro de decisões e redução explícita de escopo. A documentação cresceu, mas foi ultrapassada pelo ritmo do código.

---

## 5. O que o produto sabe hoje

## 5.1 Conceitos que estão corretamente separados

O domínio atual preserva distinções que não devem ser perdidas em um redesenho:

- **previsto/programado:** valor informado para o repasse;
- **pago:** pagamento informado pelo PDDEInfo;
- **crédito localizado:** movimento compatível encontrado no SIGEF segundo as regras determinísticas;
- **saldo:** posição da conta em uma data de referência;
- **aplicações:** parcela do saldo identificada na fonte;
- **prestação de contas:** situação contábil, sem inferir automaticamente irregularidade financeira;
- **informação parcial:** ausência ou limitação de cobertura, não sinônimo de erro ou irregularidade.

## 5.2 Regras de negócio preservadas no código

- não preencher conta ausente com histórico presumido;
- não equiparar pagamento informado a crédito;
- não promover um portfólio se qualquer escola falhar ou retornar estado parcial;
- preservar o snapshot anterior diante de atualização incompleta;
- registrar fonte e data de referência;
- usar reconciliação determinística em vez de interpretação automática não auditável;
- evitar classificar automaticamente uma unidade como irregular apenas por falta de dado.

## 5.3 Snapshot público atual

O snapshot embarcado foi produzido pela execução `32164281411`, artefato `9335143477`, identificado como `sigef-full-163-2026`.

### Portfólio

| Métrica | Valor |
|---|---:|
| Unidades | 163 |
| Programas/grupos | 357 |
| Parcelas/registros de repasse | 520 |
| Contas | 335 |
| Contas com posição | 335 |
| Movimentos | 408 |
| Registros de prestação de contas | 311 |
| Valor previsto | R$ 2.182.050,00 |
| Valor informado como pago | R$ 827.615,00 |
| Crédito compatível localizado | R$ 409.010,00 |
| Saldo | R$ 1.644.171,85 |
| Aplicações | R$ 1.368.045,22 |
| Data de referência dos saldos | 31/07/2026 |

### Estados de repasse

| Estado | Quantidade |
|---|---:|
| Sem pagamento informado | 351 |
| Crédito compatível localizado | 96 |
| Pagamento informado sem crédito compatível localizado | 73 |

### Cobertura e distribuição

- 125 escolas possuem ao menos um movimento no snapshot;
- as 335 contas têm exatamente uma posição publicada;
- todas as posições publicadas usam 31/07/2026 como referência;
- programas associados às contas: 167 PDDE, 163 Qualidade e cinco Equidade;
- datas de pagamento mais frequentes: 5 de agosto (72), 30 de abril (57), 22 de maio (33), 12 de maio (6) e 8 de julho (1);
- datas de ordem bancária mais frequentes: 4 de agosto (72), 30 de abril (39), 22 de maio (33), 29 de abril (18), 12 de maio (6) e 8 de julho (1);
- prestação de contas publicada: 163 registros PDDE e 148 Qualidade, todos marcados como adimplentes no recorte; nenhum registro de suspensão.

## 5.4 Lacuna de publicação histórica

O PR de fundação registrou 2.690 posições mensais de janeiro a junho. O snapshot público atual contém somente uma posição por conta, todas em 31 de julho.

Portanto:

- a capacidade de backfill/histórico existiu em artefato;
- a interface oferece elementos de linha do tempo;
- mas o dado publicado atual não permite uma série histórica real na tela.

Isso deve ser tratado como **lacuna entre capacidade de ingestão e contrato de publicação**, não como prova de que o projeto nunca coletou histórico.

---

## 6. Auditoria da arquitetura e do código atual

## 6.1 Caminho estático

`src/product/api.ts` carrega um snapshot dividido em dez partes, comprimido com gzip e codificado em Base64. Esse mecanismo permite publicar um portfólio completo sem depender de banco de dados em tempo de leitura.

### Vantagens verificadas

- leitura rápida e determinística;
- demonstração pública independente de Supabase;
- preservação de um estado completo conhecido;
- reduz risco de expor credenciais da fonte no cliente.

### Limitações

- qualquer atualização exige reconstruir e republicar o snapshot;
- não há histórico institucional persistente na aplicação;
- o usuário não consegue recuperar uma consulta feita anteriormente após recarregar a página;
- o snapshot embarcado aumenta acoplamento entre execução, build e frontend.

## 6.2 Caminho de consulta ao vivo

Em `src/product/PortfolioContext.tsx`, “Fazer nova consulta” dispara a consulta das 163 unidades no cliente, com concorrência três e até duas tentativas. O resultado aprovado substitui o portfólio apenas na memória da sessão.

Em `src/product/live-portfolio.ts`, a aplicação rejeita a promoção se houver falha ou estado `PARTIAL`. Essa proteção é correta e importante.

O endpoint `server/live-source.ts` recebe um INEP por requisição, executa o monitoramento daquela escola em diretório temporário e devolve o resultado.

### Riscos operacionais observáveis

- um clique inicia 163 chamadas de rede;
- o navegador precisa permanecer aberto;
- não há botão de cancelamento exposto;
- não há identificador de job durável;
- não há retomada após fechamento ou recarga;
- o limite de concorrência existe no cliente, mas não constitui limite global no servidor;
- não foi observada autenticação ou rate limiting server-side para o endpoint público;
- não há cache institucional compartilhado;
- mensagens brutas de erro do backend podem chegar como resposta 502.

Esses pontos constituem risco de disponibilidade, custo e experiência. Esta auditoria **não declara uma vulnerabilidade explorada**; declara que os controles esperados para uma operação pública de alto custo não estão evidentes no código atual.

## 6.3 Código remanescente do modo temporário

Apesar de a interface pública ter abandonado o fluxo com senha/sessão, permanecem aproximadamente 1.994 linhas dedicadas ou diretamente associadas ao caminho temporário, somando implementação e testes. Entre os arquivos:

- `api/session.ts`;
- `backend/api/temporary-session-api.ts`;
- `backend/infrastructure/github-actions-temporary-session.ts`;
- `backend/application/temporary-financial-session.ts`;
- `scripts/run-temporary-session.ts`;
- `scripts/frontend-session-smoke.mjs`;
- stub de `SessionStartDialog`;
- workflow e testes dedicados;
- métodos temporários ainda presentes em `src/product/api.ts`.

O endpoint `api/session.ts` continua deployável. A tela pública já não importa o diálogo.

### Consequência

Esse código não é, por si só, prova de defeito em produção. Ele é, porém, uma trilha abandonada que:

- amplia a superfície mental do repositório;
- mantém contratos e testes de um produto que já não é o produto público;
- dificulta determinar qual arquitetura é canônica;
- aumenta o custo de toda mudança futura.

## 6.4 Workflows históricos ainda presentes

Há dez workflows. Vários representam probes ou branches históricas, por exemplo:

- `crosscheck-pdde02-163.yml`;
- `fiscal-human-view-validation.yml`;
- `monitoring-operational-validation.yml`;
- `probe-sigef-account-search.yml`;
- `probe-sigef-release-direct.yml`;
- workflow do modo de sessão temporária.

Alguns estão associados a branches antigas e já não representam o caminho atual da `main`. Eles preservam história útil, mas misturam laboratório, validação e operação no mesmo plano visual do repositório.

## 6.5 Supabase

Há aproximadamente 1.764 linhas sob `supabase`, mas o produto publicado não depende de um projeto Supabase conectado para sua experiência principal. Assim:

- existe trabalho preparatório e exploração;
- não existe persistência institucional ativa comprovada no produto público;
- a presença do diretório não deve ser interpretada como banco de produção concluído.

Conectar Supabase agora, antes de definir o contrato de atualização e retenção, apenas tornaria permanente uma ambiguidade ainda não resolvida.

## 6.6 Qualidade e verificação

Pontos fortes:

- amplo conjunto de testes unitários e de integração;
- testes de contrato e de dados;
- proteção explícita contra promoção parcial;
- verificação de TypeScript e build no último PR de código;
- smoke tests desktop e mobile registrados;
- `git diff --check` limpo no estado auditado;
- working tree limpa.

Limite desta auditoria:

- as dependências locais não estavam instaladas;
- para não alterar o repositório nem introduzir variação de ambiente, a suíte não foi reinstalada e reexecutada localmente;
- a afirmação de 431 testes aprovados provém do resultado registrado no PR 36 e dos artefatos de CI, não de uma execução nova nesta auditoria.

---

## 7. Contradições de fonte de verdade

## 7.1 Comando da planilha fiscal

O README afirma que `monitor:fiscal:xlsx` aponta para o gerador humano por compatibilidade. O `package.json` atual diz:

- `monitor:human:xlsx` → `export-human-financial-workbook.ts`;
- `monitor:fiscal:xlsx` → `export-fiscal-workbook.ts`;
- `monitor:audit:xlsx` → `export-fiscal-workbook.ts`.

O PR 25 confirma que essa alteração foi intencional.

### Consequência

Hoje existem nomes que induzem o operador a gerar uma planilha diferente da que a documentação descreve. Isso também torna ambígua a expressão “a planilha gerada hoje”: o caminho humano e o caminho fiscal/técnico não são equivalentes.

## 7.2 Gate de produto versus frontend materializado

`docs/PRODUCT_DECISION_GATE_2026.md` determina não iniciar o dashboard final antes de fechar decisões A–H. O PR 24 construiu o frontend completo sem que o documento tenha registrado o fechamento dessas decisões.

### Consequência

O repositório contém simultaneamente:

- um contrato que manda pausar;
- uma implementação que avançou;
- documentação posterior tentando descrever o resultado.

Isso enfraquece a capacidade de qualquer chat novo identificar se deve obedecer ao gate, ao frontend atual ou à intenção mais recente do usuário.

## 7.3 Documentação histórica apresentada junto da atual

`docs/CONHECIMENTO_ACUMULADO.md` e `docs/FRONTEND_PRODUCT_IMPLEMENTATION_2026-08-16.md` preservam estados em que o frontend ou deploy ainda não estavam materializados. `docs/ESTADO_ATUAL_2026-08-19.md` é o índice mais atual e faz distinções melhores.

### Consequência

Os documentos antigos são valiosos como história, mas precisam ser rotulados como snapshots históricos. Sem isso, um novo agente ou colaborador pode tratar frases verdadeiras em 16 de agosto como verdade presente em 20 de agosto.

## 7.4 Capacidade histórica versus snapshot publicado

A fundação comprova janeiro–junho e 2.690 posições. O snapshot público oferece somente julho. A UI, entretanto, possui uma linguagem de linha do tempo.

### Consequência

A interface sugere uma dimensão que o pacote publicado não entrega. Não há falsificação, porque a data é exibida; há, porém, uma expectativa visual não cumprida.

---

## 8. Auditoria das planilhas

## 8.1 Evolução histórica observada

### Conciliação parcial de 11 de agosto

- aba `Conciliação`: 520 linhas e 53 colunas;
- aba `Exceções`: 520 linhas e 53 colunas;
- aba `Metadados`: 28 linhas;
- 520 casos inconclusivos;
- zero confirmados;
- 520 revisões humanas;
- 426 registros com conta apenas no PDDEInfo;
- 94 sem conta;
- ausência da base de Liberações naquele artefato.

Essa pasta preservava prova e detalhe, mas era impraticável para leitura cotidiana.

### Versão auditável V3

- `Financeiro 4ª CRE`: 167 linhas por 39 colunas;
- `Contas Históricas`: 76 linhas por 37 colunas;
- `Metodologia e Legenda`: 18 linhas.

Ela reduziu o número de linhas da visão principal e acrescentou metodologia, mas continuou muito larga. Em tela, exige rolagem horizontal extensa e não oferece uma leitura imediata do que demanda ação.

### Visão fiscal e pasta técnica

Os PRs 9 e 10 separaram o conteúdo em quatro e depois nove abas. Essa foi uma melhoria arquitetural correta: os dados deixaram de competir na mesma linha. A pasta técnica continuou apropriada para auditoria, mas não se tornou automaticamente uma ferramenta humana.

## 8.2 Pasta humana atual auditada

O artefato exato da execução publicada contém sete abas:

| Aba | Intervalo usado | Papel atual |
|---|---|---|
| Visão Geral | A1:F19 | métricas e links para abas |
| Acompanhamento | A1:D149 | alertas/observações |
| Unidades | A1:I166 | cadastro e resumo por escola |
| Repasses | A1:J523 | parcelas e estados de pagamento |
| Contas e Saldos | A1:J338 | posição de conta |
| Movimentações | A1:I411 | movimentos SIGEF |
| Prestação de Contas | A1:G314 | situação contábil |

### Melhorias reais

- separação clara entre domínios;
- redução drástica da largura das tabelas;
- filtros automáticos em todas as áreas detalhadas;
- formatação monetária em Real presente no arquivo XLSX;
- links internos na visão geral;
- preservação de dados brutos suficientes para investigação;
- linguagem mais cuidadosa para informação parcial.

O renderizador usado na inspeção visual mostrou números sem `R$`, mas a inspeção do XML do arquivo confirmou formatos monetários `R$ #,##0.00`. Portanto, isso não é registrado como defeito da planilha.

### Problemas da Visão Geral

- mostra previsto, pago e saldo, mas omite “crédito compatível localizado”;
- quebra a cadeia semântica que é central no código e na interface;
- não há gráfico ou visualização que explique a passagem entre previsto, pago e crédito;
- não há geração em data/hora visível, apenas data de referência;
- há somente dez hyperlinks internos, concentrados no topo;
- não há atalho para uma ficha de escola.

### Problemas do Acompanhamento

- as mesmas 73 escolas aparecem duas vezes: uma em “Pagamento informado sem crédito compatível localizado” e outra em “Informação parcial”;
- isso produz 146 linhas de caso para 73 unidades distintas;
- não há prioridade, responsável, próxima ação, prazo ou estado de resolução;
- a aba descreve condições, mas não funciona como fila operacional.

### Problemas das abas detalhadas

- `Unidades` tem 163 linhas, `Repasses` 520, `Contas e Saldos` 335, `Movimentações` 408 e `Prestação de Contas` 311;
- não há hyperlinks por escola ligando essas linhas entre as abas;
- não há ficha de uma página por unidade;
- `Repasses` contém previsto, pago e estado, mas não expõe na mesma linha o valor/data/documento do crédito localizado;
- a prova existe em outras estruturas, mas o leitor precisa reconstruir a relação manualmente;
- não há uma camada curta de “o que fazer agora”.

### Diagnóstico da planilha

A pasta humana atual é significativamente melhor que as versões de 39 e 53 colunas. Ela não é “ruim”; ela ainda é uma **exportação organizada do modelo de dados**, e não um produto de decisão desenhado para um usuário comum.

## 8.3 Ausência de exportação na interface pública

Não foi localizado botão de download do Excel no site publicado. A pasta é gerada por workflow, CLI ou caminhos técnicos. Portanto, os dois produtos de entrega — site e planilha — não formam hoje um fluxo único para o usuário final.

---

## 9. Auditoria do layout e da experiência publicada

Foram observados nove estados representativos em viewport desktop de aproximadamente 1.348 × 926:

1. home;
2. resultado de busca por “Heitor Beltrão”;
3. visão geral da escola;
4. repasses expandidos da escola;
5. conta expandida da escola;
6. visão geral de repasses;
7. visão geral de saldos;
8. portfólio de unidades;
9. consulta nova em andamento.

## 9.1 Fluxo 1 — entender o portfólio na home

**Saúde:** parcialmente saudável.

### O que funciona

- os quatro conceitos principais aparecem como métricas distintas;
- a data de referência é visível;
- o texto evita igualar pagamento a crédito;
- os indicadores de atenção são apresentados sem linguagem acusatória;
- a busca de escola é central e fácil de localizar.

### O que prejudica a clareza

- o título inicial ocupa espaço vertical muito grande;
- há amplos vazios entre blocos;
- o primeiro viewport prioriza marca e apresentação antes da tarefa;
- os números informam estado, mas não respondem “o que mudou?” nem “o que devo fazer?”;
- o indicador de 73 casos aparece, mas não como fila priorizada acionável.

### Consequência para o usuário comum

O usuário entende que existe um portfólio e que há valores distintos, mas precisa conhecer previamente a semântica para interpretar por que R$ 827.615,00 “pagos” convivem com R$ 409.010,00 de crédito localizado.

## 9.2 Fluxo 2 — localizar uma escola

**Saúde:** saudável.

- a busca retorna resultado claro;
- o nome e o identificador da unidade aparecem;
- o link leva diretamente à ficha;
- o caminho é curto.

Esse é um dos fluxos mais bem resolvidos do produto atual.

## 9.3 Fluxo 3 — entender uma escola

**Saúde:** parcialmente saudável.

Na escola Heitor Beltrão, por exemplo, a tela apresenta:

- previsto: R$ 13.258,00;
- pago: R$ 4.965,00;
- crédito localizado: R$ 0,00;
- saldo: R$ 4.866,93;
- Educação Conectada: R$ 3.328,00 sem pagamento;
- PDDE Básico: R$ 9.930,00 previsto e R$ 4.965,00 pago;
- pagamento em 5 de agosto e ordem bancária em 4 de agosto;
- uma única posição de conta, em julho.

### O que funciona

- a ficha mantém previsto, pago, crédito e saldo separados;
- programas e contas são agrupados;
- detalhes podem ser expandidos sem sair da página;
- a linguagem protege contra conclusão automática de irregularidade.

### O que falta

- uma frase narrativa curta, por exemplo: “Há pagamento informado de R$ 4.965,00, mas nenhum crédito compatível foi localizado na cobertura publicada”;
- cobertura/data da pesquisa de crédito ao lado dessa conclusão;
- próxima ação sugerida;
- histórico real de saldo;
- ligação mais explícita entre parcela, movimento e conta.

## 9.4 Fluxo 4 — inspecionar parcela e conta

**Saúde:** parcialmente saudável.

O componente de parcela calcula um `shownValue`: apresenta o valor pago quando existe; caso contrário, apresenta o previsto. Isso reduz repetição visual, mas impede comparar os dois valores lado a lado na linha. O leitor precisa expandir ou usar a métrica global para entender a diferença.

Quando não há crédito localizado, o rótulo principal da linha é “Pagamento informado”. A ausência do crédito aparece em outras partes da ficha, mas não domina a parcela em que a dúvida nasce.

A conta expandida mostra a posição disponível, mas, no snapshot publicado, há somente julho. Assim, a visualização de histórico é estruturalmente esparsa.

## 9.5 Fluxo 5 — navegar por repasses, saldos e unidades

**Saúde:** utilizável, porém pouco eficiente.

- as páginas oferecem busca;
- a página de unidades dispõe de filtros e ordenação melhores;
- os conceitos permanecem separados.

Por outro lado:

- as páginas de repasses e saldos são listas extensas;
- há poucas formas de priorizar, ordenar ou segmentar o trabalho;
- a apresentação repete grandes blocos em vez de uma grade compacta ou fila por exceção;
- o usuário precisa percorrer muitos itens para encontrar o que exige atenção.

## 9.6 Fluxo 6 — fazer uma nova consulta

**Saúde:** frágil.

Ao clicar em “Fazer nova consulta”, a operação começou imediatamente. Não houve diálogo de confirmação, estimativa ou explicação do custo. Após cerca de dez segundos, a tela registrava três de 163 unidades, ou 2%.

### Problemas observados

- efeito colateral pesado disparado em um clique;
- ausência de confirmação;
- ausência de tempo estimado;
- ausência de cancelamento;
- dependência do navegador permanecer ativo;
- resultado não persistido;
- snapshot antigo permanece visível durante a operação, o que é seguro, mas pode gerar dúvida sobre o estado exibido;
- erros são tratados dentro da execução, porém não há fila institucional recuperável.

## 9.7 Fluxo 7 — gerar ou baixar a planilha

**Saúde:** ausente na interface.

O usuário comum não encontra na aplicação pública um caminho para baixar a pasta humana. Esse fluxo existe no ecossistema técnico, não no produto publicado.

## 9.8 Acessibilidade

### Elementos positivos verificados no código e na interface

- regiões semânticas e hierarquia de headings;
- labels associados a campos;
- botões reais para ações;
- foco visível;
- suporte a `prefers-reduced-motion`;
- disclosures com atributos ARIA;
- semântica de progresso;
- linha do tempo navegável por teclado.

### Limite da afirmação

Não foi executada uma auditoria WCAG completa com contraste instrumental, leitor de tela e bateria automatizada. Portanto, o projeto possui bons fundamentos observáveis, mas não deve ser declarado plenamente conforme com WCAG com base apenas nesta inspeção.

---

## 10. Loops, regressões e dívidas — classificação baseada em evidência

| Item | Tipo | Gravidade | Evidência | Consequência atual |
|---|---|---|---|---|
| Frontend iniciado antes do fechamento A–H | quebra de processo | alta | gate de produto + PR 24 | UI responde perguntas ainda não formalmente escolhidas |
| Modo sessão criado e logo removido da experiência | loop de implementação | alta | PRs 26–29 | cerca de 1.994 linhas remanescentes e arquitetura ambígua |
| `monitor:fiscal:xlsx` divergente do README | regressão documental/contrato | alta | `package.json`, README e PR 25 | operador pode gerar o arquivo errado |
| Consulta ao vivo em 163 chamadas do navegador | dívida arquitetural | alta | `PortfolioContext.tsx` + `/api/live` | operação não durável, sem cancelamento/persistência |
| Histórico coletado não publicado | lacuna de entrega | alta | PR 22 versus snapshot atual | timeline visual sem série histórica real |
| Pasta humana omite crédito na visão geral | regressão semântica de apresentação | alta | XLSX atual | narrativa central fica incompleta |
| 73 escolas duplicadas no acompanhamento | defeito de organização | média/alta | XLSX atual | 146 linhas aparentes para 73 casos, sem fila única |
| Excel não disponível no site | lacuna de integração | média/alta | UI publicada | dois canais de entrega desconectados |
| Páginas extensas com poucos filtros | dívida de UX | média | `/repasses`, `/saldos` | esforço alto para encontrar exceções |
| Valor previsto e pago não comparados na linha da parcela | dívida de UX | média | componente de parcela | leitor perde a diferença local |
| Erro bruto potencial em 502 | dívida de UX/observabilidade | média | `server/live-source.ts` | mensagem técnica e possível exposição de detalhe interno |
| Workflows de branches históricas na área principal | dívida operacional | média | `.github/workflows` | difícil distinguir operação de laboratório |
| Documentos históricos sem rótulo uniforme | dívida de memória | média | `docs/` | novos chats recuperam estados incompatíveis |
| Grande hero e espaços verticais | dívida visual | baixa/média | telas publicadas e CSS | tarefa aparece depois da apresentação |

### 10.1 O que não regrediu

Não foi encontrada evidência de regressão conceitual nas regras centrais de não inferência, separação entre pagamento e crédito, promoção apenas de portfólio completo ou preservação do snapshot anterior. Ao contrário, essas regras foram reforçadas.

### 10.2 Onde a regressão realmente ocorreu

A regressão está principalmente em:

- coerência entre documentação e execução;
- fechamento de produto antes de implementação;
- multiplicação de caminhos temporários;
- transformação insuficiente de dado confiável em orientação humana;
- falta de persistência de uma atualização iniciada pelo usuário.

---

## 11. O que existe, o que está demonstrado e o que ainda não existe

| Capacidade | Estado comprovado |
|---|---|
| Coleta das 163 unidades no PDDEInfo | implementada e executada |
| Dados SIGEF e conciliação determinística | implementados em artefatos e snapshot |
| Separação previsto/pago/crédito/saldo | implementada |
| Proteção contra promoção parcial | implementada |
| Snapshot público navegável | implementado e publicado |
| Busca e ficha por escola | implementadas |
| Planilha humana de sete abas | implementada como artefato técnico |
| Download da planilha no site | não encontrado |
| Histórico mensal completo no snapshot público | não publicado |
| Banco Supabase institucional conectado | não comprovado/ativo no produto público |
| Job durável de atualização com retomada | não implementado no fluxo público |
| Fila de acompanhamento com responsável/ação/prazo | não implementada |
| Critérios A–H formalmente fechados | não registrados como fechados |
| Classificação automática de irregularidade | deliberadamente não implementada; deve continuar assim sem regra aprovada |

---

## 12. Plano de reorganização cronológico

O plano abaixo evita novo ciclo de UI antes de corrigir a memória e o contrato do produto.

## Fase 0 — congelar expansão e declarar a fonte de verdade

### Objetivo

Interromper temporariamente novas fontes, páginas, frameworks e formatos até que exista um núcleo documental único.

### Entregáveis

1. `CURRENT_STATE.md`: somente fatos do estado atual, com commit, execução, cobertura e limitações.
2. `DECISION_LOG.md`: decisões numeradas, data, responsável, alternativa rejeitada e condição de revisão.
3. `DATA_CATALOG.md`: campo, significado, fonte, cobertura, data, granularidade e limitações.
4. `PRODUCT_QUESTIONS.md`: perguntas que o produto deve responder ao usuário.
5. pasta `docs/history/`: documentos antigos movidos ou claramente marcados como históricos.

### Gate 0

Nenhum novo frontend ou conector entra antes de esses quatro documentos estarem coerentes entre si.

## Fase 1 — fechar as perguntas do usuário, sem código

As perguntas mínimas propostas são:

1. Quanto era esperado para esta escola/programa/parcela?
2. Quanto o PDDEInfo informa como pago, em que data e com qual documento?
3. Foi localizado crédito compatível no SIGEF? Qual valor, data, conta e evidência?
4. Qual é o saldo e a aplicação da conta, e em qual data de referência?
5. O que mudou entre competências?
6. O que está incompleto e qual é a razão conhecida?
7. O que o usuário precisa verificar ou fazer agora?
8. Qual detalhe permite auditar a conclusão?

Para cada pergunta, registrar:

- persona que a faz;
- frequência;
- decisão resultante;
- dado necessário;
- situação em que a resposta deve ser “não sabemos”;
- critério de aceitação.

### Gate A

O responsável pelo produto aprova ou altera essas perguntas antes de qualquer redesenho.

## Fase 2 — criar a matriz de disponibilidade e ação

Para cada resposta desejada, classificar:

- disponível no snapshot atual;
- disponível apenas em artefato histórico;
- disponível somente após consulta nova;
- indisponível;
- confiável para exibição;
- confiável para decisão;
- demanda revisão humana.

### Gate B

Nenhuma tela promete histórico, prioridade ou conclusão que os dados publicados não sustentem.

## Fase 3 — unificar a planilha antes de redesenhar o sistema inteiro

### Ações

1. escolher um único comando canônico para a planilha humana;
2. renomear explicitamente a pasta técnica, por exemplo `monitor:technical:xlsx`;
3. corrigir README e scripts no mesmo commit;
4. incluir crédito compatível na Visão Geral;
5. transformar os 73 casos em 73 tarefas únicas, com motivo, cobertura e próxima verificação;
6. criar uma ficha curta por escola ou um índice navegável por escola;
7. ligar escola, repasse, conta, movimento e prestação de contas por hyperlinks;
8. exibir data/hora de geração e data de referência;
9. manter abas brutas como apoio, não como entrada principal.

### Gate C

Três tarefas devem ser concluídas por uma pessoa não técnica sem explicação oral:

- localizar uma escola e dizer o que ocorreu;
- identificar por que um pagamento não tem crédito localizado;
- abrir a evidência e dizer qual seria a próxima verificação.

## Fase 4 — redesenhar a experiência por perguntas e ações

### Home

- reduzir o peso do hero;
- começar por busca e estado do portfólio;
- apresentar o funil previsto → pago → crédito localizado;
- mostrar uma fila curta de atenção por motivo;
- deixar data de referência e cobertura inseparáveis dos números.

### Escola

Organizar em três profundidades:

1. **dez segundos:** uma frase que conte o estado da escola;
2. **um minuto:** previsto, pago, crédito, saldo, cobertura e próxima ação;
3. **investigação:** parcelas, contas, movimentos, documentos e prestação de contas.

### Portfólio

- priorizar exceções em vez de listar tudo primeiro;
- oferecer filtros por situação de pagamento, crédito, cobertura, programa e data;
- preservar lista completa como visão secundária;
- permitir exportar o recorte atual.

### Gate D

Validar primeiro uma única escola como fatia vertical completa. Só depois replicar para o portfólio.

## Fase 5 — decidir a arquitetura da consulta nova

Há duas alternativas legítimas; uma precisa ser escolhida.

### Alternativa 1 — retirar a consulta nova do usuário comum

- atualização executada por rotina operacional controlada;
- aplicação pública apenas lê o último snapshot aprovado;
- menor custo e risco;
- adequada enquanto o produto ainda é demonstração/consulta.

### Alternativa 2 — transformar a consulta em job durável

Requisitos mínimos:

- confirmação antes de iniciar;
- estimativa e explicação da cobertura;
- ID de job;
- execução server-side;
- rate limiting e controle de concorrência global;
- cache;
- cancelamento;
- retomada após fechar o navegador;
- persistência de versões;
- taxonomia de erro legível;
- promoção atômica apenas quando completa;
- histórico de quem iniciou e qual snapshot foi publicado.

Supabase ou outro banco só deve ser escolhido depois dessa decisão. O banco é meio, não definição do fluxo.

### Gate E

Uma atualização precisa sobreviver a recarga/fechamento e produzir uma versão identificável, ou o botão não deve existir para o usuário público.

## Fase 6 — publicar histórico e integrar exportação

- decidir janela histórica canônica;
- publicar posições mensais com cobertura explícita;
- garantir que a timeline tenha mais de um ponto quando apresentada como histórico;
- disponibilizar o Excel humano no fluxo da aplicação;
- fazer o arquivo usar o mesmo snapshot e a mesma versão visível na tela;
- permitir verificar checksum/ID da execução sem expor complexidade ao usuário comum.

### Gate F

Site e planilha devem contar a mesma história para uma escola amostral e para os totais do portfólio.

## Fase 7 — remover trilhas abandonadas

Somente depois de migrar e testar:

- remover ou arquivar o modo de sessão temporária;
- despublicar endpoints abandonados;
- separar workflows de laboratório dos workflows operacionais;
- remover comandos duplicados;
- rotular documentação histórica;
- reduzir dependências opt-in que não tenham uso aprovado.

### Gate G

Um colaborador novo deve conseguir, lendo quatro documentos e executando um comando, identificar o produto atual, os dados atuais e o próximo trabalho autorizado.

---

## 13. Decisões que precisam ser tomadas antes de continuar a implementação

1. **Usuário primário:** gestor de CRE, direção escolar, equipe financeira ou auditor? A mesma tela não deve tentar ser a primeira tela ideal para todos.
2. **Unidade principal de trabalho:** escola, parcela, conta ou exceção?
3. **Resultado esperado da sessão:** compreender, monitorar, cobrar documento, exportar ou registrar acompanhamento?
4. **Definição operacional de “atenção”:** ausência de crédito, atraso de cobertura, conta ausente, divergência de valor ou outra regra aprovada?
5. **Fonte e período de cobertura do crédito:** o que exatamente permite dizer “não localizado” sem induzir conclusão indevida?
6. **Histórico mínimo:** julho isolado é aceitável na primeira entrega ou janeiro–julho é requisito?
7. **Atualização:** rotina controlada ou ação do usuário?
8. **Persistência:** o que precisa ser guardado, por quanto tempo e para qual finalidade?
9. **Planilha canônica:** humana de sete abas revisada, técnica de nove abas ou ambas com nomes inequivocamente distintos?
10. **Ação de acompanhamento:** será apenas uma recomendação visual ou haverá responsável, prazo e estado no sistema?

Essas decisões não são detalhes de layout. Elas determinam a arquitetura de dados, o conteúdo da planilha e a navegação.

---

## 14. Ações que não devem ser iniciadas agora

- adicionar nova fonte de dados apenas porque ela está disponível;
- construir outra página para compensar a falta de hierarquia nas atuais;
- criar uma terceira variante de planilha humana;
- conectar Supabase sem contrato de persistência e atualização;
- tratar a consulta das 163 unidades no navegador como arquitetura institucional definitiva;
- criar classificação automática de irregularidade sem regra formal e evidência adequada;
- fazer mais ajustes cosméticos antes de validar as perguntas do usuário;
- apagar código histórico antes de identificar dependências e preservar o registro necessário.

---

## 15. Próximo passo recomendado

O próximo artefato não deve ser código. Deve ser uma **constituição curta do produto**, aprovada pelo responsável, contendo:

- usuário primário;
- oito perguntas centrais;
- definições de previsto, pago, crédito, saldo, cobertura e informação parcial;
- matriz do que está disponível hoje;
- uma única jornada principal;
- critérios de aceitação da planilha e da tela;
- decisão sobre atualização controlada versus job durável.

Depois disso, a primeira intervenção material deve ser a planilha humana, porque ela é o artefato mais simples para testar a narrativa sem reabrir toda a arquitetura do frontend. Uma vez que três tarefas humanas sejam compreendidas nela, a mesma hierarquia pode orientar o redesenho da ficha da escola e da home.

---

## 16. Registro integral das pull requests examinadas

| PR | Papel na evolução | Situação relevante |
|---:|---|---|
| 1 | scaffold inicial | não integrado |
| 2 | Assistente Liberações | 64 testes; caminho auxiliar |
| 3 | documentação/governança | memória inicial |
| 4 | automação PDDEInfo 163 | 520 registros; 169 pagamentos; 47 sem conta |
| 5 | evidência v0.4 | rastreabilidade |
| 6 | backend institucional | escopo inicialmente amplo, depois simplificado |
| 7 | PDDEInfo + SIGEF | conciliação e valores globais |
| 8 | monitoramento operacional | 96 confirmados; 26 sem crédito; 351 não pagos |
| 9 | visão fiscal humana | quatro abas |
| 10 | Excel em camadas | nove abas técnicas |
| 11 | baseline/memória | checkpoint |
| 12 | normas e conhecimento | expansão documental |
| 13 | job de monitoramento | código, sem frontend/Supabase/deploy |
| 14 | proveniência e catálogo | fonte e linhagem |
| 15 | modelo fiscal atual | promoção somente completa |
| 16 | descoberta de contas | ampliação de ingestão |
| 17 | toolchain | organização técnica |
| 18 | dependências | não integrado |
| 19 | PGlite | capacidade auxiliar |
| 20 | navegador/DuckDB/Inngest/PDF/fast-check | grande expansão opt-in |
| 21 | FNDE e portal | novas fontes; credencial pendente para parte do fluxo |
| 22 | fundação | dados históricos e regra de não iniciar frontend final |
| 23 | constituição visual | decisões finais ainda abertas |
| 24 | frontend completo | construído antes do fechamento do gate |
| 25 | auditoria técnica | correções e mudança do comando Excel |
| 26 | modo sessão | grande caminho temporário |
| 27 | hotfix runtime | correção do modo sessão |
| 28 | hotfix chave | correção de acesso |
| 29 | sem senha + snapshot | reversão do modelo de acesso |
| 30 | consulta direta | 163 chamadas iniciadas no cliente |
| 31 | bloqueio de parcial | proteção correta |
| 32 | README | sincronização parcial |
| 33 | progresso | feedback visual |
| 34 | encontrabilidade | novas rotas |
| 35 | deep links | navegação direta |
| 36 | alinhamento final | 431 testes e build/smokes registrados |

---

## 17. Fontes e caminhos auditados

### Código e contratos centrais

- `src/product/api.ts`
- `src/product/PortfolioContext.tsx`
- `src/product/live-portfolio.ts`
- `server/live-source.ts`
- `api/session.ts`
- `backend/api/temporary-session-api.ts`
- `backend/infrastructure/github-actions-temporary-session.ts`
- `backend/application/temporary-financial-session.ts`
- `scripts/export-human-financial-workbook.ts`
- `scripts/export-fiscal-workbook.ts`
- `scripts/run-temporary-session.ts`
- `package.json`
- `public/data/pdde-2026-snapshot.json`
- `tests/`
- `.github/workflows/`

### Documentação central

- `README.md`
- `docs/ESTADO_ATUAL_2026-08-19.md`
- `docs/PRODUCT_DECISION_GATE_2026.md`
- `docs/FRONTEND_PRODUCT_IMPLEMENTATION_2026-08-16.md`
- `docs/CONHECIMENTO_ACUMULADO.md`
- documentos de fundação, proveniência, visual e operação em `docs/`
- `HANDOFF_PDDE_INFO_Work_v0.4_2026-08-13(1).docx`

### Artefatos de dados

- snapshot publicado da execução `32164281411`;
- pasta humana `inteligencia-financeira-pdde-4cre-2026.xlsx` do artefato `9335143477`;
- versões auditáveis V2 e V3;
- conciliação parcial de 11 de agosto;
- artefatos e métricas preservados nas PRs.

### Evidência visual

- home publicada;
- busca por escola;
- ficha da unidade;
- repasse e conta expandidos;
- listas de repasses, saldos e unidades;
- consulta nova em andamento;
- renderizações das sete abas do Excel humano;
- renderizações das planilhas históricas largas.

---

## 18. Conclusão

Há uma base valiosa que deve ser preservada: dados reais, regras cautelosas, rastreabilidade, testes e uma aplicação navegável. A sensação de regressão não vem de perda total desse trabalho. Ela vem do fato de que o projeto passou a responder simultaneamente a muitos problemas — extração, auditoria, conciliação, monitoramento, histórico, planilha, site, sessão, autenticação, atualização ao vivo, novas fontes e infraestrutura — antes de escolher uma única jornada humana como eixo.

Organizar a casa significa agora fazer o movimento inverso: congelar expansão, transformar o conhecimento acumulado em quatro fontes de verdade curtas, fechar as perguntas do usuário, provar a disponibilidade de cada resposta e validar uma única história na planilha e em uma escola. Só então o layout deve ser redesenhado e a persistência escolhida.

O projeto não precisa ser refeito do zero. Ele precisa deixar de crescer lateralmente e passar a avançar por gates verificáveis.
