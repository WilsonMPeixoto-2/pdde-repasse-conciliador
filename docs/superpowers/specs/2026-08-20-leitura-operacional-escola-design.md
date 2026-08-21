# Leitura operacional da escola — desenho do produto

**Data:** 20/08/2026

**Marco:** segunda etapa após a estabilização da planilha humana

**Escopo:** frontend do prontuário financeiro `/unidades/:inep`

## 1. Problema observado

O prontuário contém os dados necessários, mas a ordem atual exige que o usuário interprete quatro métricas, abra programas e contas e só então relacione o resultado com o bloco lateral de acompanhamento.

Em telas estreitas, o bloco lateral é empilhado depois de todos os detalhes. Assim, a informação que deveria orientar a leitura pode aparecer somente após repasses, contas, saldos, séries mensais e movimentações.

O problema deste marco é de hierarquia e ação. Não é ausência de dados nem falha de conciliação.

## 2. Resultado pretendido

A primeira área do prontuário deve responder, sem conhecimento técnico prévio:

1. quanto estava previsto;
2. quanto possui pagamento informado pelo PDDEInfo;
3. quanto possui crédito compatível localizado no SIGEF;
4. qual é o saldo público mais recente e sua data;
5. o que merece conferência e onde continuar a investigação.

O usuário continuará tendo acesso integral aos detalhes existentes logo abaixo.

## 3. Contrato semântico

- `Previsto` não será apresentado como valor recebido.
- `Pagamento informado` continuará identificado como registro do PDDEInfo.
- `Crédito compatível localizado` continuará distinto de confirmação final do repasse.
- `Saldo informado` sempre exibirá a data de referência quando disponível.
- ausência de posição continuará apresentada como ausência, nunca como zero.
- acompanhamento usará linguagem neutra e não declarará irregularidade.
- valores, datas e estados serão derivados apenas do contrato humano existente.

## 4. Estrutura visual

### 4.1 Cabeçalho

Permanecem nome da escola, SME, INEP e acesso às informações da unidade executora.

### 4.2 Leitura rápida

O atual bloco `Posição financeira da escola` será substituído por uma síntese única contendo:

- título `Leitura rápida desta escola`;
- estado `Acompanhamento necessário` ou `Sem apontamento no retrato atual`;
- sequência financeira com `Previsto`, `Pagamento informado` e `Crédito compatível localizado`;
- saldo informado em área contextual separada da sequência de repasse;
- lista de pontos de acompanhamento com links para a seção pertinente.

O saldo não será desenhado como quarta etapa do repasse, pois é uma posição financeira datada e não uma consequência aritmética direta dos três valores anteriores.

### 4.3 Detalhes

Permanecem, sem perda de conteúdo:

- programas e parcelas;
- contas e composição do saldo;
- série mensal;
- movimentações;
- prestação de contas;
- navegação local por âncoras.

A antiga barra lateral `O que merece atenção` será removida para impedir repetição. Seus dados serão promovidos para a leitura rápida.

## 5. Regras dos pontos de acompanhamento

Os itens serão derivados de fatos estruturados, nesta ordem:

1. prestação com pagamento suspenso;
2. pagamento informado sem conta do repasse exibida;
3. pagamento informado sem crédito compatível localizado;
4. crédito que requer conferência ou consulta inconclusiva;
5. conta sem posição pública de saldo;
6. indisponibilidade adicional de fonte ou outro apontamento humano ainda não representado pelos itens anteriores.

Cada item será exibido uma única vez. Mensagens de `followUp` já representadas por um fato estruturado não serão repetidas.

| Situação | Destino útil |
| --- | --- |
| Pagamento suspenso | `#prestacao-contas` |
| Conta do repasse não exibida | `#repasses` |
| Crédito não localizado, inconclusivo ou a conferir | `#repasses` |
| Conta sem posição de saldo | `#contas-saldos` |
| Indisponibilidade adicional de fonte | sem destino artificial |

Quando não houver item, a interface apresentará uma mensagem neutra de ausência de apontamento e recomendará apenas a continuidade do acompanhamento periódico.

## 6. Arquitetura da mudança

Um derivador puro produzirá o read model visual dos pontos de acompanhamento. Ele não modificará o contrato compartilhado nem o backend.

```ts
type SchoolAttentionTarget = '#repasses' | '#contas-saldos' | '#prestacao-contas';

interface SchoolAttentionItem {
  key: string;
  title: string;
  description: string;
  target: SchoolAttentionTarget | null;
}

interface SchoolOperationalReading {
  tone: 'attention' | 'clear';
  statusLabel: string;
  attentionItems: SchoolAttentionItem[];
}
```

Responsabilidades:

- `src/product/visual/school-operational-reading.ts`: derivação determinística;
- `src/product/components/SchoolOperationalSummary.tsx`: apresentação acessível;
- `src/product/pages/SchoolPage.tsx`: composição da página e remoção da duplicação lateral;
- `src/product/design/school-operational.css`: hierarquia responsiva própria;
- testes unitários: comportamento do derivador e markup público do componente;
- smoke: desktop, mobile, âncoras e ausência de overflow.

## 7. Responsividade e acessibilidade

- desktop: sequência financeira horizontal e acompanhamento ao lado ou abaixo, conforme largura disponível;
- tablet e celular: sequência vertical ou em grade sem rolagem horizontal da página;
- não depender apenas de cor para diferenciar estados;
- títulos e listas com semântica nativa;
- links de acompanhamento com texto que descreve a ação;
- foco visível e destinos de âncora preservados;
- valores essenciais permanecem disponíveis como texto.

## 8. Fora do escopo

- alterar conciliação, fontes ou coleta;
- criar novo endpoint;
- modificar schemas compartilhados ou migrations;
- conectar Supabase;
- calcular regularidade, suficiência de gasto ou rendimento;
- redesenhar home, carteira, repasses consolidados ou saldos consolidados;
- remover detalhes existentes do prontuário;
- merge ou deploy.

## 9. Critérios de aceite

1. a leitura rápida aparece antes dos detalhes financeiros;
2. previsto, pagamento informado e crédito localizado conservam rótulos probatórios distintos;
3. saldo apresenta valor ausente corretamente e data quando conhecida;
4. qualquer ponto de acompanhamento aparece uma única vez;
5. pontos estruturados levam à seção pertinente;
6. uma escola sem apontamentos recebe estado neutro, sem falsa certificação de regularidade;
7. programas, contas, séries, movimentações e prestação continuam acessíveis;
8. não há overflow horizontal global em 1440×1000 e 390×844;
9. testes, typecheck, build e smoke de produto passam;
10. o checkpoint de continuidade registra o estado exato do marco.
