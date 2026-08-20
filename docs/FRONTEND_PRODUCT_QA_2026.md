# QA do Produto Visual — Inteligência Financeira PDDE | 4ª CRE

Este arquivo é um **checklist permanente de critérios**, não um registro de homologação concluída. Por isso os itens permanecem desmarcados no template. A evidência de cada rodada deve ficar no PR/CI correspondente, com run, screenshots e eventuais ressalvas.

Ele complementa a Constituição Visual e deve ser aplicado em desktop e mobile antes da integração à `main`.

## 1. Semântica financeira

- [ ] `Previsto`, `Pagamento informado`, `Crédito compatível localizado` e `Saldo informado` aparecem como conceitos distintos.
- [ ] A carteira compacta não reduz `Pagamento informado` a `Pagamento` nem `Crédito localizado` a `Crédito` quando isso enfraquece a linguagem probatória.
- [ ] `Ordem FNDE` não é apresentada como data de crédito.
- [ ] `Saldo informado` exibe sua data de referência quando disponível.
- [ ] `Saldo aplicado` não é rotulado como rendimento.
- [ ] Ausência de dado aparece como ausência, nunca como `R$ 0,00` inventado.
- [ ] A Home soma saldos/aplicações apenas dentro de uma mesma data de referência.
- [ ] Lacunas mensais na timeline permanecem visualmente abertas e não são interpoladas.

## 2. Hierarquia e densidade

- [ ] A primeira leitura da Home responde à posição financeira de 2026 sem exigir explicação metodológica.
- [ ] Os números principais respiram e não competem com texto técnico.
- [ ] Valores monetários não invadem a coluna vizinha em desktop nem mobile.
- [ ] Cards e bordas são usados apenas para unidades conceituais/interativas reais.
- [ ] A página da unidade apresenta identidade, posição, repasses, contas/evolução e acompanhamento em ordem compreensível.
- [ ] Textos explicativos não interrompem sequências financeiras.
- [ ] Informação de origem fica em contexto sob demanda.

## 3. Interação e encontrabilidade

- [ ] Todo indicador agregado abre exatamente sua lista nominal de unidades.
- [ ] Contagens executivas de atenção/cobertura/situação possuem drill-down para o subconjunto correspondente.
- [ ] Contagem do indicador é igual ao tamanho da lista.
- [ ] Busca por nome, SME e INEP funciona na carteira e nos subconjuntos.
- [ ] Código SME armazenado como 7 dígitos também é encontrado quando digitado com pontuação institucional.
- [ ] A busca da Home diferencia total encontrado de quantidade máxima exibida (`6 de N`, quando aplicável).
- [ ] Setas de navegação navegam; chevrons expandem; `i` mostra contexto.
- [ ] Nada com aparência clicável é puramente decorativo.
- [ ] URLs de unidade, filtros e indicador são compartilháveis e funcionam com voltar/avançar.
- [ ] Um prontuário já aberto acompanha um novo retrato ao vivo promovido na mesma sessão.

## 4. Timeline e visualizações

- [ ] Zero observado e mês sem observação têm representações diferentes.
- [ ] Clique, toque, `Enter` e `Espaço` abrem o mesmo detalhe de mês.
- [ ] A timeline não conecta dois meses atravessando uma lacuna sem observação.
- [ ] O detalhe textual adjacente contém posição, saldo e aplicações quando conhecidos.
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
- [ ] Nenhum valor financeiro ultrapassa os limites do próprio bloco/coluna.
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

## 8. Hosting e publicação

- [ ] `/` responde corretamente no domínio publicado.
- [ ] `/unidades`, `/repasses` e `/saldos` funcionam também por acesso direto, não apenas por navegação interna do React.
- [ ] `/unidades/<INEP>` funciona como deep link.
- [ ] `/indicadores/<slug>` funciona como deep link.
- [ ] rewrites da SPA não capturam `/api/*`.
- [ ] `/api/live` mantém contrato de método/JSON esperado.
- [ ] não há erros de runtime introduzidos pelo deploy verificado.

## 9. Critério de aprovação de uma rodada

Uma versão só deve ser tratada como aprovada quando a **evidência da rodada** registrar:

1. `npm run check` verde;
2. smoke Playwright desktop/mobile verde;
3. screenshots inspecionados visualmente;
4. ausência de workflow temporário ou fixture técnica acidental no diff;
5. navegação Home → subconjunto/indicador → unidade → programa/conta → timeline funcionando;
6. deep links relevantes verificados quando o hosting/navegação mudou;
7. qualquer discrepância visual corrigida ou explicitamente registrada como decisão futura.

Marcar itens neste template não substitui logs/testes. A prova concreta fica associada ao commit/PR que foi homologado.
