# QA do Produto Visual — Inteligência Financeira PDDE | 4ª CRE

Este checklist acompanha a implementação da experiência web da Plataforma de Inteligência Financeira das Verbas do PDDE/2026. Ele complementa a Constituição Visual e deve ser aplicado em desktop e mobile antes da integração à `main`.

## 1. Semântica financeira

- [ ] `Previsto`, `Pagamento informado`, `Crédito compatível localizado` e `Saldo informado` aparecem como conceitos distintos.
- [ ] `Ordem FNDE` não é apresentada como data de crédito.
- [ ] `Saldo informado` exibe sua data de referência quando disponível.
- [ ] `Saldo aplicado` não é rotulado como rendimento.
- [ ] Ausência de dado aparece como ausência, nunca como `R$ 0,00` inventado.
- [ ] A Home soma saldos/aplicações apenas dentro de uma mesma data de referência.
- [ ] Lacunas mensais na timeline permanecem visualmente abertas e não são interpoladas.

## 2. Hierarquia e densidade

- [ ] A primeira leitura da Home responde à posição financeira de 2026 sem exigir explicação metodológica.
- [ ] Os números principais respiram e não competem com texto técnico.
- [ ] Cards e bordas são usados apenas para unidades conceituais/interativas reais.
- [ ] A página da unidade apresenta identidade, posição, repasses, contas/evolução e acompanhamento em ordem compreensível.
- [ ] Textos explicativos não interrompem sequências financeiras.
- [ ] Informação de origem fica em contexto sob demanda.

## 3. Interação e encontrabilidade

- [ ] Todo indicador agregado abre exatamente sua lista nominal de unidades.
- [ ] Contagem do indicador é igual ao tamanho da lista.
- [ ] Busca por nome, SME e INEP funciona na carteira e nos subconjuntos.
- [ ] Setas de navegação navegam; chevrons expandem; `i` mostra contexto.
- [ ] Nada com aparência clicável é puramente decorativo.
- [ ] URLs de unidade e indicador são compartilháveis e funcionam com voltar/avançar.

## 4. Timeline e visualizações

- [ ] Zero observado e mês sem observação têm representações diferentes.
- [ ] Clique, toque, `Enter` e `Espaço` abrem o mesmo detalhe de mês.
- [ ] A timeline não conecta dois meses atravessando uma lacuna sem observação.
- [ ] O detalhe textual adjacente contém posição, saldo, aplicações e conta quando conhecidos.
- [ ] Existe caminho textual equivalente para a informação principal do gráfico.

## 5. Cor e acessibilidade

- [ ] Pagamento informado usa papel cromático consistente.
- [ ] Crédito localizado usa papel distinto de pagamento informado.
- [ ] Atenção não usa vermelho como linguagem de acusação.
- [ ] Estados não dependem exclusivamente de cor.
- [ ] Foco de teclado é visível.
- [ ] Controles interativos têm área de toque adequada no mobile.
- [ ] `prefers-reduced-motion` preserva significado sem animações.
- [ ] Hover possui equivalente por foco ou toque quando carrega informação.

## 6. Responsividade

### Desktop 1440 × 1000

- [ ] Sem overflow horizontal do conteúdo principal.
- [ ] Métricas executivas formam uma faixa editorial e não uma coleção de cartões genéricos.
- [ ] Sidebar de acompanhamento não compete com a leitura principal.
- [ ] Tipografia e espaçamento mantêm ritmo editorial.

### Mobile 390 × 844

- [ ] Mesmos dados essenciais permanecem acessíveis.
- [ ] Composição é reorganizada, não simplesmente reduzida.
- [ ] Nenhuma tabela financeira essencial exige scroll horizontal por padrão.
- [ ] Navegação principal continua compreensível.
- [ ] Valores não colidem nem quebram a hierarquia visual.
- [ ] Timeline, quando mais larga que a viewport, mantém alternativa textual e gesto de exploração claro.

## 7. Fronteira humana

Os seguintes termos/chaves não podem aparecer no DOM da experiência fiscal comum:

- `sha256`
- `parser`
- `sourceUrl`
- `pagesFetched`
- `technicalClassification`
- `requestHash`
- `payload`
- `retry`
- `runId`

A trilha técnica continua no backend e nas áreas de auditoria apropriadas.

## 8. Critério de aprovação

A primeira versão só pode ser considerada pronta para PR quando:

1. `npm run check` estiver verde;
2. smoke Playwright desktop/mobile estiver verde;
3. screenshots forem inspecionados visualmente;
4. não houver workflow temporário ou fixture técnica acidental no diff;
5. a navegação Home → indicador → unidade → programa/conta → timeline funcionar de ponta a ponta;
6. qualquer discrepância observada na inspeção visual tiver sido corrigida ou explicitamente registrada como decisão futura de produto.
