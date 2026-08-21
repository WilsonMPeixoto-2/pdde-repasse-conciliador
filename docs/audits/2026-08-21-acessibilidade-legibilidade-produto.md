# Auditoria de acessibilidade e legibilidade estrutural — produto publicado

> **Prioridade atualizada em 21/08/2026:** os achados desta auditoria permanecem válidos, mas sua implementação foi deslocada para depois do marco de completude financeira. Ver `docs/audits/2026-08-21-revisao-critica-auditoria-e-roadmap.md`.

**Data:** 21/08/2026

**Modo:** auditoria de acessibilidade com observações de legibilidade

**Superfícies:** `/`, `/unidades`, `/repasses`, `/saldos` e `/unidades/33069093`

**Alvo de referência:** WCAG 2.2 nível AA, sem alegação de conformidade integral

**Estado auditado:** produção em <https://pdde-repasse-conciliador.vercel.app>, conteúdo funcional publicado pela árvore do merge `f256442bf85b2879d7a9b3ffca7be30246ae4d43`; `main` em `b883e5df04a9836f09ae1378dfce5d65d3686274`, descendente apenas documental

## 1. Objetivo

Verificar se uma pessoa comum, inclusive usando teclado ou tecnologia assistiva, consegue:

1. localizar uma escola;
2. distinguir previsto, pagamento informado, crédito localizado e saldo;
3. navegar entre as visões consolidadas e o prontuário;
4. reconhecer nomes, valores, estados e ações sem depender apenas da posição visual;
5. perceber claramente o foco do teclado;
6. usar o produto em larguras reduzidas sem perda de conteúdo ou ação.

Esta auditoria não reabre regras financeiras, fontes de dados, conciliação, planilha, backend, persistência ou Supabase.

## 2. Método e referências

A produção foi percorrida em navegador controlado, com inspeção combinada de:

- tela renderizada;
- DOM e atributos acessíveis;
- ordem de foco por teclado;
- retângulos de alvos interativos;
- estilos computados;
- títulos do documento por rota;
- código-fonte correspondente para confirmar a origem dos problemas.

As razões de contraste foram calculadas segundo a luminância relativa usada pela WCAG. Os critérios usados como referência foram:

- [1.4.3 Contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html): 4,5:1 para texto normal e 3:1 para texto grande;
- [1.4.11 Contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html): 3:1 para componentes e indicadores visuais necessários à identificação;
- [1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html): conteúdo sem perda e sem rolagem bidimensional em largura equivalente a 320 CSS px, ressalvadas exceções próprias;
- [2.4.2 Página com título](https://www.w3.org/WAI/WCAG22/Understanding/page-titled.html): títulos devem identificar assunto ou propósito;
- [2.4.11 Foco não obscurecido](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html): o componente focado não deve ficar inteiramente oculto;
- [2.5.8 Tamanho do alvo, mínimo](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html): alvo mínimo de 24×24 CSS px, consideradas as exceções do critério.

## 3. Evidência visual aceita

O viewport inspecionado pelo navegador foi 1363×936 CSS px, DPR 1. As imagens salvas possuem 1348 px de largura por causa da área útil da captura.

| Passo | Arquivo | Dimensão | SHA-256 |
| --- | --- | --- | --- |
| Home | `/workspace/scratch/pdde-a11y-home-100-2026-08-21.jpg` | 1348×3283 | `91d0aad0ea334a44c31249e44c655c67bc98d3f44c67c0d40af5606046387044` |
| Escolas | `/workspace/scratch/pdde-a11y-schools-100-2026-08-21.jpg` | 1348×926 | `9e32c179eba466e5b04bea53e54aa008e061c6dd10e82d3514f6e9f01f00a510` |
| Repasses carregados | `/workspace/scratch/pdde-a11y-repasses-loaded-100-2026-08-21.jpg` | 1348×926 | `70748e1e1c1b216f184c90ae9c371b737358ecde2eb14da46abb14ad43a79766` |
| Saldos carregados | `/workspace/scratch/pdde-a11y-saldos-loaded-100-2026-08-21.jpg` | 1348×926 | `901daba79d78f2a8f20a69c728cce32f719bf71320397c180fe0c37c77fcdb3d` |
| Prontuário carregado | `/workspace/scratch/pdde-a11y-school-loaded-100-2026-08-21.jpg` | 1348×2095 | `569afe4a01ff4e1f6b10f6ec49fd0c7247319b276c0bc05c3fe9b0bc4825ff29` |
| Foco por teclado no prontuário | `/workspace/scratch/pdde-a11y-school-keyboard-focus-2026-08-21.jpg` | 1348×926 | `5ac50af09747322513d1733d46982249c615d9cb09d0763c455a0f78ac3bcfaa` |

Capturas incidentais em estado de carregamento e a tentativa de zoom rotulada como 200% foram rejeitadas. O navegador não alterou o viewport nem o DPR ao receber o atalho de zoom; por isso, essa tentativa não serve como prova de reflow.

## 4. Passos auditados

### Passo 1 — entrada pela Home

**Saúde: boa com barreira de contraste transversal.** A página possui um único `main`, hierarquia coerente de títulos, busca com rótulo visível, resultado anunciado por `aria-live` e atalhos financeiros descritos em texto. A busca encontra por nome e códigos. Textos auxiliares, entretanto, usam o tom `--ink-500`, que não alcança a razão mínima para texto normal.

### Passo 2 — localização na carteira de escolas

**Saúde: boa.** A busca possui nome acessível, a listagem mantém nome, SME e INEP, e os estados não dependem somente de cor. Não foi observado overflow horizontal global no viewport auditado. O mesmo tom auxiliar insuficiente aparece em metadados, explicações e cabeçalhos.

### Passo 3 — visão consolidada de repasses

**Saúde: requer correção semântica.** A separação visual entre previsto, pagamento informado e crédito localizado é clara. Porém, cada `Link` recebe `role="listitem"`; isso substitui sua função nativa de link. Os cabeçalhos visuais de coluna estão com `aria-hidden="true"`, e os rótulos repetidos de cada valor usam `display: none` no desktop. Assim, a relação entre cada valor e seu significado pode desaparecer para tecnologia assistiva.

### Passo 4 — visão consolidada de saldos

**Saúde: requer a mesma correção semântica.** Saldo, referência e cobertura permanecem visualmente distintos, mas a lista repete o mesmo padrão: o link é transformado em item de lista e os rótulos de cada valor deixam de estar disponíveis no desktop.

### Passo 5 — prontuário financeiro da escola

**Saúde: boa com correções transversais necessárias.** A leitura rápida, a navegação local, os apontamentos e os detalhes possuem sequência coerente. A navegação por teclado alcançou, em ordem útil, o botão de contexto, os links de seção, a ação do acompanhamento, os controles de expansão e a navegação global. O foco apareceu visualmente e o destino focado não ficou inteiramente escondido pela navegação fixa. A cor calculada do contorno, porém, ficou abaixo de 3:1 nos fundos reais.

## 5. Problemas confirmados

### 5.1 Texto auxiliar abaixo de 4,5:1 — prioridade alta

O token `--ink-500: #718797` é aplicado a texto normal em grande parte do produto. Razões calculadas:

| Combinação | Razão |
| --- | ---: |
| `#718797` sobre `--canvas: #f2f6f7` | 3,4376:1 |
| `#718797` sobre `--paper: #ffffff` | 3,7402:1 |
| `#718797` sobre o topo `#f7fafb` | 3,5661:1 |

O uso inclui textos de ajuda, contagens, metadados da escola, datas, explicações, resumos de disclosure, legendas e cabeçalhos de coluna. Como esses textos não são necessariamente grandes, o padrão atual não atende ao mínimo de 4,5:1.

Origem principal: `src/product/design/tokens.css`, com usos distribuídos pelas folhas de design.

### 5.2 Indicador de foco abaixo de 3:1 — prioridade alta

O contorno global usa:

```css
outline: 3px solid color-mix(in srgb, var(--focus) 72%, white);
```

Com `--focus: #1878a4`, a mistura resulta em RGB fracionário aproximado `88,68 157,80 189,48`. Razões calculadas:

| Fundo adjacente | Razão |
| --- | ---: |
| `#f2f6f7` | 2,7425:1 |
| `#f7fafb` | 2,8450:1 |
| `#ffffff` | 2,9839:1 |

O contorno é espesso, tem deslocamento e é perceptível na captura, mas falha numericamente contra os fundos avaliados. Não se deve arredondar 2,9839 para 3:1.

Origem: `src/product/design/base.css`.

### 5.3 Papel de link substituído por `listitem` — prioridade alta

Foram confirmados três pontos:

- `GlobalSchoolFinder.tsx` aplica `role="listitem"` diretamente no `Link`;
- `RepasseOverviewPage.tsx` aplica o mesmo papel em todas as linhas clicáveis;
- `BalancesOverviewPage.tsx` repete o padrão.

Depois da busca por `Albino`, o resultado continha um elemento `a`, mas a árvore acessível observada apresentava um `listitem` e nenhum papel de link para esse resultado. Nas visões financeiras, as 163 linhas carregadas também recebiam `role="listitem"` no próprio `a`.

O item de lista e o link são duas informações diferentes. O invólucro deve ser o item; o `Link` deve preservar sua semântica nativa.

### 5.4 Valores financeiros sem rótulo disponível no desktop — prioridade alta

Nas visões de repasses e saldos:

- o cabeçalho visual da grade usa `aria-hidden="true"`;
- cada valor possui um `<small>` com seu rótulo;
- no desktop, `.financial-overview-row__metric small { display: none; }` remove esse rótulo também da árvore acessível.

O usuário visual ainda reconstrói o significado pela coluna; a tecnologia assistiva pode receber apenas sequências de valores sem `Previsto`, `Pagamento informado`, `Crédito localizado`, `Saldo`, `Referência` ou `Cobertura` associados.

Origem: `src/product/design/findability.css` e as duas páginas financeiras consolidadas.

### 5.5 Mesmo título em todas as rotas — prioridade média-alta

As cinco rotas auditadas mantiveram exatamente:

```text
Inteligência Financeira PDDE | 4ª CRE
```

O `index.html` define esse título e a aplicação SPA não o atualiza. A pessoa que navega por abas, histórico, leitor de tela ou mudança de rota não recebe o assunto específico da página.

Origem: `index.html`; `RouteEffects.tsx` gerencia foco e rolagem, mas não o título.

## 6. Risco confirmado de identificação dos controles

O contorno de inputs usa `--ink-200: #d5e0e5`. As razões são 1,2354:1 sobre o canvas e 1,3442:1 sobre branco. A presença de rótulo e placeholder ajuda a identificar os campos, portanto esta auditoria não o classifica isoladamente como falha universal em todos os estados. Ainda assim, a borda é uma pista visual fraca e deve receber um token próprio de controle com pelo menos 3:1, sem escurecer todos os divisores decorativos do produto.

## 7. Pontos fortes confirmados

- `html` usa `lang="pt-BR"`;
- cada rota auditada possui um único `main` e estrutura coerente de `h1`, `h2` e `h3`;
- buscas têm rótulos visíveis e contagens anunciadas;
- disclosures expõem estado expandido por meio do componente Radix;
- gráficos e séries possuem texto e nomes acessíveis, em vez de depender somente da geometria;
- a mudança de rota direciona o foco ao `main` ou ao destino do fragmento;
- os destinos de seção reservam margem para cabeçalhos fixos;
- há suporte a `prefers-reduced-motion`;
- a ordem de teclado observada no prontuário é utilizável;
- nenhum alvo medido ficou abaixo de 24×24 CSS px;
- os controles móveis de continuidade da navegação local possuem 44×44 CSS px;
- não foi observado overflow horizontal global no viewport desktop auditado.

Alguns alvos comuns ficaram abaixo da recomendação ampliada de 44 px — navegação global em aproximadamente 38,7 px, navegação local em 35,2 px e uma ação em 40 px —, mas acima do mínimo AA de 24 px. O marco não deve aumentar a altura fixa da interface apenas para perseguir um critério mais rigoroso sem necessidade comprovada.

## 8. Limites e lacunas de verificação

1. Não foi executado NVDA, JAWS, VoiceOver ou TalkBack. A análise semântica usou DOM e árvore acessível do navegador, não substituindo um teste com leitor de tela real.
2. O controle de zoom do navegador disponível não alterou viewport nem DPR. Não há evidência direta válida de 200% ou 400% nesta execução.
3. O smoke de CI existente cobre 1440×1000 e 390×844. Ele não cobre ainda as larguras equivalentes de 640 e 320 CSS px.
4. A auditoria não mediu todas as combinações de cor existentes; mediu os tokens transversais e os fundos relevantes aos problemas encontrados.
5. A captura comprova que o foco observado não ficou inteiramente oculto, mas a navegação fixa deve ser retestada em 640, 390 e 320 px.
6. Estados de carregamento e erro usam texto compreensível e o foco posterior é administrado por `RouteEffects`, mas não foram testados com leitor de tela real. Não se afirma aqui uma falha de anúncio desses estados.
7. Esta auditoria não certifica conformidade WCAG integral do produto.

## 9. Direção aprovada

Corrigir primeiro as barreiras confirmadas, sem iniciar um novo redesenho visual:

1. tornar o texto auxiliar compatível com 4,5:1;
2. usar a cor de foco sem clareamento que reduza o contraste;
3. dar às bordas funcionais um token próprio de pelo menos 3:1;
4. restaurar links nativos dentro de itens de lista;
5. manter cada rótulo financeiro disponível para tecnologia assistiva em todas as larguras;
6. atualizar o título do documento por rota e, quando disponível, pelo nome da escola;
7. ampliar o smoke para semântica, teclado, foco e reflow em 640, 390 e 320 px;
8. preservar conteúdo, hierarquia, regras financeiras, altura fixa e identidade visual atuais.

A especificação validada está em `docs/superpowers/specs/2026-08-21-acessibilidade-legibilidade-design.md`.
