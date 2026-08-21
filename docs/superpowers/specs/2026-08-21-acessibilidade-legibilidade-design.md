# Acessibilidade estrutural e legibilidade — desenho do produto

**Data:** 21/08/2026

**Marco:** quarta etapa de produto após a publicação da leitura operacional e da navegação local móvel

**Escopo:** frontend publicado nas rotas `/`, `/unidades`, `/repasses`, `/saldos`, `/unidades/:inep`, `/indicadores/:slug` e rota não encontrada

**Auditoria de origem:** `docs/audits/2026-08-21-acessibilidade-legibilidade-produto.md`

## 1. Problema

O produto já oferece uma sequência financeira mais clara e navegação utilizável, mas cinco barreiras estruturais reduzem a compreensão fora da leitura visual ideal:

1. o principal tom auxiliar não atinge 4,5:1;
2. o contorno global de foco fica abaixo de 3:1 porque a cor é misturada com branco;
3. links clicáveis recebem o papel de item de lista e perdem sua função acessível de link;
4. rótulos financeiros somem da árvore acessível no desktop;
5. todas as rotas mantêm o mesmo título de documento.

Há ainda uma pista fraca nos limites de campos, causada pelo uso de um divisor decorativo muito claro como borda funcional.

O problema é de legibilidade, semântica e robustez responsiva. Não é um pedido de novo layout, nova regra de negócio ou nova fonte de dados.

## 2. Resultado pretendido

Depois deste marco:

- textos auxiliares normais serão legíveis com razão mínima de 4,5:1 nos fundos usados pelo produto;
- o foco do teclado será claramente identificável com pelo menos 3:1;
- buscas e linhas financeiras continuarão sendo anunciadas como links, agrupadas em listas reais;
- cada valor financeiro terá um rótulo disponível para tecnologia assistiva, independentemente do cabeçalho visual;
- cada rota terá título específico e o prontuário usará o nome da escola quando os dados estiverem prontos;
- larguras de 640, 390 e 320 CSS px serão verificadas contra perda de conteúdo, overflow global e foco oculto;
- nenhuma regra financeira, dado ou fluxo operacional será alterado.

O alvo é eliminar as barreiras encontradas com referência à WCAG 2.2 AA. O marco não declarará conformidade integral sem teste assistivo e auditoria completa posteriores.

## 3. Abordagem escolhida

Será aplicada uma correção cirúrgica sobre o sistema atual de tokens, componentes e smoke tests. Essa abordagem foi escolhida porque resolve as barreiras transversais na origem e preserva a hierarquia visual já validada.

Alternativas rejeitadas:

- **redesenho visual amplo:** misturaria acessibilidade com nova hierarquia, aumentaria o risco de regressão e reabriria decisões que acabaram de chegar à produção;
- **correções locais por seletor:** multiplicariam exceções, deixariam telas esquecidas e tornariam a manutenção do contraste imprevisível;
- **auditoria sem implementação:** documentaria o problema, mas deixaria barreiras confirmadas na produção.

## 4. Sistema visual

### 4.1 Texto auxiliar

O token será atualizado para:

```css
--ink-500: #5c7385;
```

Razões esperadas:

| Fundo | Razão |
| --- | ---: |
| `--canvas: #f2f6f7` | 4,5456:1 |
| `--paper: #ffffff` | 4,9458:1 |
| topo `#f7fafb` | 4,7155:1 |

`--ink-400` continuará apontando para `--ink-500`. `--ink-600` e os tons principais permanecem inalterados. A mudança conserva diferença entre texto principal e auxiliar, mas torna o auxiliar compatível com texto normal.

### 4.2 Foco do teclado

O contorno global usará diretamente:

```css
outline: 3px solid var(--focus);
```

`--focus: #1878a4` permanece. Sem a mistura com branco, suas razões são 4,5291:1 no canvas, 4,9279:1 no papel e 4,6984:1 no topo claro.

O deslocamento de 3 px permanece. Regras específicas poderão conservar espessuras próprias somente quando ainda usarem `var(--focus)` e não reduzirem o contraste.

### 4.3 Limites funcionais

Será criado o token:

```css
--control-border: #788e9c;
```

Razões esperadas: 3,1394:1 no canvas, 3,4158:1 no papel e 3,2567:1 no topo claro.

Esse token será usado apenas em limites necessários para identificar inputs, selects e botões cuja forma depende da borda. Divisores de seção, grades e separadores decorativos continuarão usando `--ink-200`; isso evita tornar toda a página visualmente pesada.

## 5. Semântica das listas clicáveis

`GlobalSchoolFinder`, `RepasseOverviewPage` e `BalancesOverviewPage` usarão listas nativas e preservarão o `Link` como link nativo. Na busca, cada resultado será um `li` contendo um `Link`. Nas duas visões consolidadas, o cabeçalho visual ficará fora do `ul`; cada linha será um `li` contendo o `Link` que conserva a grade visual.

Contrato:

```text
lista
└── item de lista
    └── link para o prontuário
```

Não será aplicado `role="listitem"` diretamente a `a` ou `Link`. O CSS de `ul` e `li` removerá marcadores e margens padrão sem mudar a aparência existente.

Critério observável: cada resultado deve aparecer simultaneamente como link navegável e como descendente de um item de lista na árvore acessível.

## 6. Rótulos dos valores financeiros

Os cabeçalhos visuais da grade poderão continuar com `aria-hidden="true"` porque a associação por coluna não é robusta para leitura linear. Em compensação, cada valor terá seu próprio rótulo no mesmo grupo semântico.

No desktop, uma classe própria de rótulo aplicará as propriedades de ocultação visual da técnica `sr-only`, mas nunca `display: none`, `visibility: hidden` ou `aria-hidden`. Até 700 px, essa mesma classe será restaurada ao fluxo visual, como ocorre hoje.

O contrato vale para:

- previsto em 2026;
- pagamento informado;
- crédito localizado;
- saldo conhecido;
- referência;
- cobertura;
- acompanhamento geral, quando a identificação não estiver disponível por texto adjacente.

O valor e o rótulo permanecerão texto real. Não serão substituídos por uma única frase opaca em `aria-label` se isso criar divergência entre conteúdo visual e acessível.

## 7. Títulos por rota

Uma derivação pura resolverá o título a partir da rota e, quando necessário, dos dados carregados. `RouteEffects` aplicará o resultado a `document.title`, mantendo no mesmo ponto as responsabilidades de mudança de rota, foco e rolagem.

Títulos definidos:

| Rota/estado | Título |
| --- | --- |
| `/` | `Visão geral | Inteligência Financeira PDDE | 4ª CRE` |
| `/unidades` | `Escolas | Inteligência Financeira PDDE | 4ª CRE` |
| `/repasses` | `Repasses 2026 | Inteligência Financeira PDDE | 4ª CRE` |
| `/saldos` | `Saldos e contas 2026 | Inteligência Financeira PDDE | 4ª CRE` |
| `/unidades/:inep`, antes dos dados | `Escola | Inteligência Financeira PDDE | 4ª CRE` |
| `/unidades/:inep`, pronta | `{nome da escola} | Inteligência Financeira PDDE | 4ª CRE` |
| `/indicadores/:slug`, antes dos dados | `Indicador | Inteligência Financeira PDDE | 4ª CRE` |
| `/indicadores/:slug`, pronto | `{nome do indicador} | Inteligência Financeira PDDE | 4ª CRE` |
| rota desconhecida | `Página não encontrada | Inteligência Financeira PDDE | 4ª CRE` |

O título do prontuário será atualizado novamente quando o nome da escola chegar. Uma escola ausente ou um erro de carregamento conservará o título genérico de escola; a interface continua responsável por explicar o erro no conteúdo. O efeito de título ficará separado do efeito atual de foco e rolagem: uma atualização assíncrona do nome não poderá reposicionar a página nem mover o foco novamente.

A derivação ficará isolada e testável, sem ler títulos do DOM e sem duplicar textos entre páginas.

## 8. Teclado, alvos e navegação fixa

- a ordem de tabulação existente será preservada;
- todo controle focável manterá indicador visível;
- o elemento focado não poderá ficar inteiramente atrás do cabeçalho global ou da navegação local fixa;
- o `main` e os destinos de fragmento continuarão recebendo foco após mudança de rota;
- nenhum alvo poderá ficar abaixo do mínimo de 24×24 CSS px;
- controles novos ou diretamente alterados devem preferir 44×44 px no mobile quando isso não aumentar a altura fixa nem provocar sobreposição;
- não será ampliada a altura da navegação local apenas para atingir 44 px, pois os alvos atuais já excedem o mínimo AA e a altura foi uma restrição validada no marco anterior.

## 9. Reflow e overflow

O smoke continuará cobrindo 1440×1000 e 390×844 e ganhará verificações dedicadas em 640 e 320 CSS px.

Em 640, 390 e 320 px:

1. não pode existir overflow horizontal global;
2. todos os textos, valores e ações essenciais devem permanecer presentes;
3. a linha do tempo pode manter sua rolagem horizontal local, pois representa uma série bidimensional, mas não pode expandir a página;
4. a navegação horizontal local pode rolar dentro do próprio componente, com seus controles de continuidade;
5. o foco atual deve permanecer ao menos parcialmente visível e alcançável;
6. rótulos financeiros devem estar visualmente presentes no layout de uma coluna;
7. nenhuma captura ou asserção pode ser aceita em estado intermediário de carregamento.

As larguras reduzidas são aproximações determinísticas de reflow. Elas não serão descritas como prova de zoom real do navegador.

## 10. Estados e erros

Este marco não muda cópia, fluxo de carregamento, política de erro ou recuperação de dados. Os testes devem comprovar que a atualização de título e o foco de rota não impedem os estados atuais.

Adicionar `role="status"`, `role="alert"` ou uma política de anúncios ao vivo sem teste de leitor de tela fica fora deste marco, pois a auditoria não confirmou uma barreira específica nesses estados e anúncios excessivos também podem prejudicar a experiência.

## 11. Arquitetura da mudança

Responsabilidades previstas:

- `src/product/design/tokens.css`: tokens acessíveis de texto e borda funcional;
- `src/product/design/base.css`: foco global sem clareamento;
- folhas de componentes: aplicação de `--control-border` somente a controles funcionais;
- `GlobalSchoolFinder.tsx`: lista e link com papéis separados;
- `RepasseOverviewPage.tsx` e `BalancesOverviewPage.tsx`: estrutura nativa de lista e rótulos persistentes;
- `src/product/document-title.ts`: derivação pura dos títulos;
- `RouteEffects.tsx`: aplicação do título sem remover o gerenciamento atual de foco;
- testes unitários de contraste, semântica e títulos;
- `scripts/frontend-product-smoke.mjs`: teclado, papéis, título, 640 px e 320 px.

Não será incluída uma dependência automatizada ampla de acessibilidade apenas para este marco. Os contratos confirmados serão cobertos diretamente; a adoção futura de `axe-core` deve ser decidida separadamente, considerando manutenção e alcance.

## 12. Fora do escopo

- novo layout ou nova direção estética;
- reordenação de conteúdo financeiro;
- alteração da planilha;
- alteração de fontes, coleta ou conciliação;
- endpoint, schema, migration, persistência ou Supabase;
- autenticação ou permissões;
- redução adicional do prontuário;
- certificação formal de conformidade WCAG;
- teste real com NVDA, JAWS, VoiceOver ou TalkBack sem disponibilidade desses ambientes;
- merge, deploy ou alteração direta da produção sem novo gate.

## 13. Estratégia de testes

### Testes unitários

1. calcular contraste dos tokens críticos contra canvas, papel e topo;
2. exigir pelo menos 4,5:1 para texto auxiliar;
3. exigir pelo menos 3:1 para foco e borda funcional;
4. renderizar resultados de busca e linhas financeiras e confirmar lista, item e link nativo;
5. confirmar que os rótulos essenciais continuam no markup;
6. cobrir todos os títulos da tabela, inclusive atualização após dados prontos e rota desconhecida;
7. preservar os testes existentes de foco em hash e conteúdo financeiro.

### Smoke de navegador

1. validar títulos em cada rota;
2. buscar uma escola e exigir papel de link no resultado;
3. exigir papel de link nas linhas de repasses e saldos;
4. verificar que os rótulos financeiros aparecem no texto acessível;
5. percorrer controles essenciais por teclado e comprovar foco visível;
6. verificar que o foco não fica inteiramente obscurecido;
7. executar as verificações de reflow e overflow em 640, 390 e 320 px;
8. preservar as capturas desktop/mobile e a validação da navegação horizontal local.

### Verificação de entrega

- suíte completa de testes;
- typecheck;
- build cliente;
- build SSR/live;
- `git diff --check`;
- smoke de navegador em CI ou ambiente com Chromium;
- nova inspeção das telas afetadas em produção somente depois de autorização de publicação.

## 14. Critérios de aceite

1. `--ink-500` atinge pelo menos 4,5:1 em todos os fundos claros definidos neste documento;
2. o contorno de foco atinge pelo menos 3:1 e permanece visível em teclado;
3. bordas funcionais que identificam controles atingem pelo menos 3:1;
4. divisores decorativos permanecem visualmente leves;
5. todo resultado e toda linha clicável auditada preserva o papel de link dentro de um item de lista;
6. todo valor financeiro auditado possui rótulo no conteúdo acessível em desktop e mobile;
7. cada rota usa o título especificado e o prontuário atualiza para o nome da escola;
8. foco e rolagem de rota continuam funcionando com e sem fragmento;
9. não há overflow horizontal global em 1440, 640, 390 ou 320 CSS px;
10. a linha do tempo e a navegação local, quando roláveis, permanecem contidas;
11. nenhum alvo fica abaixo de 24×24 CSS px;
12. testes, typecheck, builds e smoke passam;
13. a entrega registra explicitamente qualquer lacuna de leitor de tela ou zoom real;
14. nenhuma regra, fonte ou valor financeiro muda;
15. o checkpoint de continuidade informa branch, commit, verificações e próximo gate.

## 15. Gate de produto

Esta especificação registra a direção aprovada em conversa. A implementação só começa depois da revisão explícita deste arquivo pelo usuário e da criação de um plano executável próprio. A conclusão técnica não autoriza, por si só, merge ou deploy.
