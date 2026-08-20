# Escopo consolidado v0.5

A v0.5 prioriza informações financeiras **correntes de 2026** das 163 unidades da 4ª CRE e transforma fontes oficiais em uma leitura fiscal rastreável, sem atribuir à fonte ou ao sistema conclusões que os dados não sustentam.

> O estado operacional corrente está em [`ESTADO_ATUAL_2026-08-19.md`](ESTADO_ATUAL_2026-08-19.md). Este escopo descreve o que pertence à v0.5 e distingue o que já foi materializado do que ainda depende de implantação institucional.

## Dentro do escopo e já materializado

### Coleta e conciliação

- consulta PDDEInfo por INEP;
- consulta direta do extrato público SIGEF para contas elegíveis;
- recuperação complementar de liberação/conta quando aplicável;
- relatórios públicos PDDEInfo/FNDE de atendimento, prestação de contas e saldos;
- valores monetários em centavos inteiros;
- separação entre pagamento informado, ordem/liberação e crédito compatível localizado;
- snapshots e série mensal de saldos/aplicações de 2026;
- movimentações SIGEF com histórico/documento preservados e classificação auxiliar neutra;
- estados explícitos para ambiguidade, ausência de conta e consulta inconclusiva;
- job institucional `MONITORING` em código.

### Read models e relatórios

- visão operacional/fiscal técnica;
- contrato financeiro humano compartilhado;
- portfólio resumido das 163 escolas;
- prontuário financeiro por escola;
- Excel humano para operação;
- Excel técnico/auditoria separado.

### Produto web

- frontend React/Vite publicado no Vercel;
- Home financeira;
- busca por nome, SME e INEP;
- carteira de escolas com filtros;
- visões consolidadas de Repasses e Saldos e contas;
- indicadores acionáveis e listas nominais;
- prontuário por escola com navegação local;
- composição de saldo;
- série mensal de 2026;
- movimentações por conta;
- situação de prestação de contas quando disponível;
- consulta ao vivo com barra de progresso;
- preservação do retrato anterior em falha/cobertura parcial;
- rotas profundas da SPA no Vercel.

## Dentro do escopo, mas ainda pendente de implantação institucional

- Supabase dedicado desta plataforma;
- aplicação das migrations no banco canônico;
- persistência durável das consultas disparadas pelo site;
- armazenamento institucional definitivo dos artefatos/evidências dessas consultas;
- fila/worker persistentemente conectado ao produto publicado;
- publicação durável do novo retrato financeiro;
- credencial e ativação operacional do Portal da Transparência;
- PDF executivo final.

A ausência dessa persistência não significa ausência de frontend ou de monitoramento: hoje a consulta completa pode atualizar a sessão do navegador, mas o reload retorna ao retrato estável publicado.

## Visões operacionais

### Repasses

Por escola/programa/ação/parcela, quando conhecido:

- valor previsto/programado;
- pagamento informado;
- data associada ao pagamento informado;
- ordem FNDE quando corroborada;
- conta exibida;
- estado da evidência de crédito;
- data/valor/documento do crédito compatível quando localizado.

`Pagamento informado` nunca deve ser abreviado conceitualmente para “repasse confirmado”.

### Contas, saldos e aplicações

Por escola/programa/conta:

- banco, agência e conta;
- saldo em conta;
- posição aplicada por modalidade quando publicada;
- saldo total informado;
- data de referência;
- série mensal disponível em 2026.

Meses ausentes permanecem ausentes. Posições de referências diferentes não são somadas como se fossem simultâneas.

### Movimentações

Por conta:

- data;
- histórico original;
- documento;
- crédito/débito;
- contraparte quando disponível;
- categoria auxiliar neutra.

A classificação auxilia leitura e monitoramento; não declara regularidade jurídica ou contábil da despesa.

### Prestação de contas

O produto pode apresentar a situação publicada pela fonte e eventual suspensão de pagamento informada. Esse dado não é convertido em parecer geral de regularidade financeira.

## Fora do escopo automático da v0.5

- inferir conta vigente a partir de histórico;
- usar movimento de outro exercício para completar 2026;
- concluir irregularidade de despesa apenas pela categoria do extrato;
- calcular rendimento acumulado sem fonte adequada;
- considerar saldo publicado como saldo bancário em tempo real;
- contornar CAPTCHA ou autenticação;
- incorporar fonte nova sem piloto/contrato/cobertura comprovados;
- permitir que resultado parcial substitua um retrato integral válido.

## Critérios de qualidade

A v0.5 só considera uma informação forte o bastante para apresentação quando o nível de evidência está claro. As regras de domínio permanecem em [`FONTES_E_REGRAS.md`](FONTES_E_REGRAS.md) e os princípios da interface em [`VISUAL_PRODUCT_CONSTITUTION_2026.md`](VISUAL_PRODUCT_CONSTITUTION_2026.md).

A validação técnica combina:

- testes unitários e de propriedades;
- testes PostgreSQL/PGlite;
- TypeScript;
- build Vite;
- smoke Playwright desktop/mobile;
- verificação de rotas profundas/hosting quando mudanças de navegação são publicadas.
