# Escopo consolidado v0.5

O produto prioriza informações financeiras **correntes de 2026** das 163 unidades da 4ª CRE.

O escopo não é apenas extrair dados. O objetivo é transformar fontes oficiais em uma leitura fiscal rastreável, sem atribuir à fonte ou ao sistema conclusões que os dados não sustentam.

## Estado atual do produto em código

Já existem no repositório canônico:

1. coleta PDDEInfo por INEP;
2. consulta direta SIGEF Extrato para contas mapeadas;
3. visão operacional de repasses e movimentos;
4. visão fiscal humana;
5. Excel Fiscal v3;
6. backend institucional com fila/API/worker/evidências em código;
7. migrations Supabase/Postgres.

Ainda **não existem implantados**:

- Supabase dedicado desta plataforma;
- read model financeiro corrente persistido;
- API fiscal de prontuário;
- frontend fiscal novo;
- site publicado no Vercel.

## Visões operacionais

### 1. Repasses e contas

Exibir, conforme a fonte:

- programa/ação;
- parcela;
- valor programado;
- pagamento informado;
- data apresentada pelo PDDEInfo;
- conta correspondente, quando exibida;
- crédito compatível localizado no SIGEF em campo próprio.

### 2. Movimentações e utilização

Exibir fatos de extrato de 2026:

- créditos;
- débitos;
- documento;
- histórico;
- contraparte/origem quando disponível;
- aplicação;
- resgate;
- tarifa;
- entrada externa;
- estorno/reversão;
- movimento não classificado.

Categorias são auxiliares e não substituem o histórico original.

### 3. Registros para Conferência

Selecionar fatos que merecem atenção humana sem transformá-los automaticamente em irregularidades.

A conciliação é uma camada analítica complementar. Histórico técnico é auxiliar, não o produto principal.

## Regra temporal

A visão corrente é **2026**.

Dados históricos podem ser preservados no bruto/evidência, mas não podem ser usados para:

- completar conta atual ausente;
- provar aplicação atual;
- compor extrato corrente;
- alterar contagens de 2026;
- concluir ausência/presença de um fato em 2026.

## Execução institucional

O backend admite **uma única tarefa pendente/em andamento por vez**. Não fazem parte do escopo atual multi-worker, lease, heartbeat, fencing ou coordenação distribuída.

A implantação deve manter uma única instância do runner/executor enquanto esse contrato permanecer vigente.

Se o processo for interrompido durante uma tarefa, a infraestrutura existente possui recuperação para marcar execução interrompida como `FAILED` e liberar a fila.

Achados e relatórios atuais só devem ser promovidos como resultado válido quando a execução tiver cobertura e estado adequados. Artefatos parciais podem permanecer preservados para diagnóstico/auditoria.

## Próxima prioridade: `MONITORING`

O próximo corte do backend é criar um job institucional de primeira classe que orquestre:

```text
MONITORING
├── fiscalYear = 2026
├── carteira inteira ou subconjunto de INEPs
├── coleta PDDEInfo
├── consulta SIGEF
├── preservação de evidências
├── visão operacional
├── visão fiscal
├── JSONs
└── Excel Fiscal
```

O objetivo é remover a dependência dos scripts como orquestradores principais antes de implantar Supabase e frontend.

## Persistência seguinte

Depois do `MONITORING` institucional:

- criar/conectar Supabase dedicado;
- revisar/aplicar migrations adequadas;
- preservar raw HTML/artefatos no Storage;
- manter trilha append-only;
- persistir um **read model financeiro corrente** otimizado para consulta da carteira/prontuário.

O frontend não deve fazer joins complexos de evidências no navegador.

## Frontend futuro

A interface desejada segue:

```text
Visão Geral
→ Unidades Escolares
→ Prontuário Financeiro
→ Programa/Ação
→ Conta
→ Parcela
→ Movimentações
→ Evidências
```

Áreas complementares:

- Registros para Conferência;
- Atualizações;
- Evidências/Rastreabilidade.

A escola é a unidade principal de navegação.

## Preservado

- coleta e normalização PDDEInfo;
- adaptador público SIGEF;
- parsers de Liberações e Movimentações existentes;
- motor financeiro e tratamento conservador de divergências/estornos;
- visão operacional/fiscal;
- Excel auditável;
- Storage privado e upload validado em código;
- API e processamento em segundo plano em código;
- RLS e evidência append-only;
- Assistente de Liberações.

## Fora da prioridade imediata

Continuam registradas para evolução futura, sem bloquear a plataforma-base:

- posição atual de aplicações/rendimentos;
- relatórios complementares do PDDEInfo;
- Webservice institucional SIGEF;
- BB Gestão Ágil/API;
- Plataforma Antonieta de Barros;
- PDDEREx;
- Portal da Transparência;
- Dados Abertos FNDE;
- SiGPC.

O grau de maturidade e os experimentos necessários estão em [`CONHECIMENTO_ACUMULADO.md`](CONHECIMENTO_ACUMULADO.md).

## Regra de implantação

O Supabase dedicado continua obrigatório antes do deploy institucional. Bancos de outros sistemas não devem ser reutilizados.

Não publicar o frontend novo sobre mocks/JSONs temporários apenas para “ter um site”. Primeiro materializar `MONITORING`, persistência e API de leitura adequadas.