# Conhecimento acumulado e oportunidades

**Atualização:** 04/09/2026

Este documento preserva pesquisas, possibilidades, aprendizados e caminhos ainda não materializados. Ele **não** substitui o estado corrente nem as regras de fontes.

Estado corrente: `ESTADO_ATUAL_2026-09-04.md`.  
Fontes/regras: `FONTES_E_REGRAS.md`.  
Histórico: `HISTORICO_CONSOLIDADO_2026-08-12_A_2026-09-04.md`.

## 1. Como interpretar os status

- **INCORPORADO** — existe no repositório canônico e foi validado na medida indicada.
- **INCORPORADO_COM_LIMITACAO_DE_FONTE** — integração existe, mas a fonte pode estar indisponível/quebrada.
- **PESQUISA_CONFIRMADA** — existência/possibilidade confirmada; ainda falta integração real.
- **PILOTO_NECESSARIO** — precisa provar acesso, frescor, granularidade ou ganho material.
- **CONDICIONADO_A_CREDENCIAL** — depende de acesso oficial.
- **NAO_APLICAVEL_AGORA** — existe, mas não atende as 163 UEx no estágio pesquisado.
- **HISTORICO/NAO_PRIORIZADO** — não usar como fonte corrente sem justificativa específica.

Nenhum item que não esteja `INCORPORADO` deve ser apresentado como feature produtiva.

## 2. Conhecimento de produto já incorporado

### Escola como unidade principal

**Status: INCORPORADO.**

A experiência se organiza por escola e suas relações com programa/ação, parcela, conta, saldo, movimentações, prestação e cobertura.

### Site e Excel como produtos irmãos

**Status: INCORPORADO.**

Os dois compartilham o universo de informação e o read model humano. O site prioriza compreensão/interação; o Excel, análise livre e cruzamentos.

### Registros para conferência, não “irregularidades” automáticas

**Status: INCORPORADO COMO PRINCÍPIO.**

Pagamento sem crédito localizado, tarifa, entrada de terceiro, movimento não classificado ou consulta inconclusiva são fatos para conferência, não prova automática de irregularidade.

### Cobertura da fonte é informação de produto

**Status: INCORPORADO/AMPLIADO.**

A ausência de cobertura deve ser distinguida de “não há dado”. O produto já preserva cobertura/falhas e a documentação reforça essa obrigação.

### Nova coleta deve chegar ao retrato publicado

**Status: INCORPORADO EM 04/09 PELOS PRs #55/#56.**

Não rediscutir como hipótese. A promoção automática do artefato da run Full 163 validada já existe.

## 3. Aprendizados técnicos permanentes

- sistemas FNDE podem variar encoding/estrutura;
- validar identidade retornada contra a consulta solicitada;
- agência/conta/CNPJ/INEP/documentos são texto;
- conta com dígito `X` não vira número;
- paginação/cobertura precisam ser provadas antes de concluir ausência;
- estrutura desconhecida deve falhar explicitamente;
- retries tratam instabilidade como instabilidade;
- artefato bruto pode ser preservado para reproduzir parsing;
- navegador é fallback, não semântica financeira;
- Chromium precisa existir no ambiente quando Playwright faz parte do fallback;
- fonte quebrada não pode virar zero/ausência;
- tempo longo de coleta é aceitável e não deve motivar corte de profundidade.

## 4. PDDEInfo principal

**Status: INCORPORADO.**

Consulta direta por INEP da carteira de 163 UEs. Preserva programação, pagamento, custeio/capital, ajustes, UEx/CNPJ, contas/ocorrência e demais campos existentes no contrato atual.

Não voltar a tratar exportação legada como única estratégia.

## 5. Relatórios públicos FNDE/PDDEInfo

### Atendimento/repasse

**Status: INCORPORADO.**

Fornece camada pública de atendimento/ordem/alunos conforme cobertura.

### Prestação/contabilidade

**Status: INCORPORADO.**

É parte da leitura financeira ampliada e pode ser complementado futuramente por segunda fonte.

### Saldos e aplicações

**Status: INCORPORADO.**

Posições mensais datadas são usadas para série de 2026. Mês ausente não é zero.

### Cadastro/mandato/suspensão

**Status: INCORPORADO COMO COMPLEMENTAR.**

Preservar cobertura, sem transformar falha em prova negativa.

### Abertura de conta

**Status: INCORPORADO_COM_LIMITACAO_DE_FONTE.**

Em 04/09/2026, a própria fonte retornou `ORA-00904: "REPASSE"."NU_SEQ_UNIDADE_EXECUTORA": invalid identifier` para as 163 UEx.

Consequência: manter a falha explícita e não concluir “sem conta”.

## 6. SIGEF

### Extrato público

**Status: INCORPORADO.**

Já foi validado em escala e permanece fonte de movimentação/crédito compatível.

### Série/posição corrente

O extrato observa aplicações/resgates, mas não deve ser usado sozinho para reconstruir posição aplicada atual ou rendimento acumulado.

### Liberações/conta

**Status: INCORPORADO COMO COMPLEMENTO.**

Ordem/liberação permanece separada do crédito observado.

### Novo Webservice do SIGEF

**Status: PESQUISA_CONFIRMADA.**

Foi identificada operação de consulta de extrato no ecossistema oficial. Ainda faltam condições institucionais suficientes:

- credencial;
- documentação completa;
- autenticação/homologação;
- paginação/limites;
- campos e semântica.

Se acesso oficial se tornar disponível, comparar cobertura com a rota pública antes de substituir qualquer fonte.

## 7. SiGPC Acesso Público

**Status: PESQUISA_CONFIRMADA / PILOTO_NECESSARIO.**

Valor potencial:

- segunda evidência independente de situação de prestação/UEx;
- conferência de regularidade/situação pública.

Pontos pendentes:

- testar acesso permitido e estável;
- lidar corretamente com WAF/bloqueio sem bypass;
- confirmar chave/granularidade por UEx;
- provar ganho em relação ao relatório FNDE já integrado.

**Prioridade sugerida:** alta entre as fontes ainda não integradas.

## 8. Portal da Transparência / CGU

**Status: cliente implementado, uso produtivo condicionado a credencial oficial.**

Pesquisa confirmou API REST oficial e endpoints úteis por favorecido/documentos.

Potencial:

- evidência independente de recursos federais;
- documento/OB/SIAFI por CNPJ;
- controle cruzado com PDDEInfo/SIGEF.

Antes de ativar:

1. usar token oficial;
2. testar amostra de CNPJs/OBs conhecidos;
3. confirmar granularidade por UEx/programa/documento;
4. documentar limites e frequência;
5. só então permitir influência em conclusão corrente.

## 9. Dados Abertos FNDE / Olinda

**Status: PESQUISA_CONFIRMADA / PILOTO_NECESSARIO.**

Catálogo oficial indica conjuntos relacionados a execução financeira, escolas atendidas, saldos e prestação.

Uso potencial:

- backfill;
- controle secundário;
- validação de universo/cadastros;
- comparação histórica.

Risco principal: frescor desigual. Não promover dataset histórico a evidência corrente de 2026.

## 10. Painéis PDDE Total / Básico / Ações Integradas

**Status: PESQUISA_CONFIRMADA / CONTROLE SECUNDÁRIO.**

Úteis para:

- conferência visual;
- descoberta de divergências;
- comparação de previstos/realizados/cadastro/prestação.

Não usar como fonte nuclear sem exportação estável, auditável e granular por escola/UEx.

## 11. BB Gestão Ágil

**Status: PESQUISA_CONFIRMADA; NÃO INTEGRADO.**

Potencial:

- visão bancária com maior semântica;
- fornecedor/beneficiário;
- categorias/documentos;
- eventual integração com prestação.

Direção correta: acesso/API institucional, nunca scraping de interface autenticada.

Perguntas pendentes:

- SME/4ª CRE pode obter acesso somente leitura?;
- quais contas entram?;
- autenticação/base URL/homologação?;
- campos disponíveis?;
- paginação/limites/frescor?

## 12. SIGPC Ágil

**Status: NAO_APLICAVEL_AGORA para as 163 UEx no checkpoint pesquisado.**

Pesquisa de setembro registrou lançamento em 31/08/2026 e integração bancária prevista no produto. Na fase inicial observada, UEx não estavam incluídas.

Não reabrir como fonte operacional imediata sem verificar mudança oficial de escopo posterior.

## 13. Plataforma Antonieta de Barros

**Status: PESQUISA_CONFIRMADA quanto à existência de produtos estruturados; PILOTO_NECESSARIO para conexão.**

Ainda é necessário identificar/validar mecanismo público/permitido de consulta e se existe produto com ganho real para as UEx/2026.

## 14. PDDEREx

**Status: HISTORICO/NAO_PRIORIZADO.**

Foi sucedido pelo PDDEInfo para o fluxo corrente. Não manter outro parser apenas porque o portal existe.

Só reavaliar se houver dado atual exclusivo e material que o canônico não obtém em fontes melhores.

## 15. Outras fontes analisadas

### Power BI/painéis

Coberto no item 10: controle secundário, não dependência nuclear.

### PDDEWeb

**Status: NAO_PRIORIZADO.** Autenticado e sem ganho comprovado suficiente para o monitor financeiro atual.

### SIMEC / PDDE Interativo

**Status: NAO_PRIORIZADO no monitor financeiro atual.** Pode ter valor em módulos específicos futuros.

### Transferegov

**Status: NAO_PRIORIZADO para a granularidade do PDDE escolar atual.**

## 16. Múltiplas fontes: evolução conceitual

O domínio já deve ser pensado como fatos observados por fontes independentes, sem depender de uma comparação rígida “A versus B”.

Uma terceira fonte realmente integrada deve entrar preservando sua própria evidência, não obrigando redesenho prematuro ou sobrescrita das atuais.

## 17. Aprendizados do projeto Manus

Repositório: `WilsonMPeixoto-2/EXTRATOR-PDDE-MANUS`.

**Regra absoluta:** somente leitura neste fluxo.

Ideias úteis já absorvidas ou preservadas:

- referência/cobertura claramente identificadas;
- execução parcial não substitui referência completa;
- dossiê por escola;
- filtros e detalhes progressivos;
- evidência técnica secundária;
- métricas operacionais em vez de dashboard decorativo.

Não transportar limitações nem runtime inteiro do projeto paralelo.

## 18. Aprendizados do repositório histórico ChatGPT

`WilsonMPeixoto-2/extrator-pdde-4cre` permanece referência técnica para componentes/ideias já exploradas.

Não reativar como segunda linha de desenvolvimento.

## 19. Problemas já resolvidos que não são oportunidades futuras

Não registrar novamente como “ideia a implementar”:

- frontend por escola;
- read model humano;
- site e Excel ampliados;
- relatórios públicos de saldo/prestação já integrados;
- consulta SIGEF pública;
- snapshot gzip/base64;
- promoção automática do Full 163 aprovado;
- Chromium no runner do Full 163;
- proteção contra `PARTIAL` substituir retrato válido.

Se um documento antigo disser que esses itens “ainda não existem”, ele está histórico/supersedido.

## 20. Prioridades de pesquisa remanescentes

Antes de nova rodada ampla de pesquisa, o ponto mais racional é aprofundar apenas o que ainda pode acrescentar evidência independente:

1. SiGPC Acesso Público;
2. Portal da Transparência/CGU após credencial oficial;
3. piloto de frescor dos Dados Abertos FNDE;
4. painéis como controle cruzado, se houver exportação reproduzível;
5. Webservice SIGEF/BB Gestão Ágil apenas com acesso institucional.

## 21. Protocolo contra repetição

Antes de pesquisar uma fonte:

1. procurar o nome neste documento;
2. ler `FONTES_E_REGRAS.md`;
3. ler o histórico consolidado;
4. verificar commits posteriores ao último checkpoint;
5. formular a pesquisa apenas sobre a lacuna ainda pendente.

O objetivo desta memória é impedir que o projeto pague várias vezes pelo mesmo aprendizado.