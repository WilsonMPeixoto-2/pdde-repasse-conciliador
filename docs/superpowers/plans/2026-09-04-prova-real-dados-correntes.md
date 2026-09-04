# Prova real de dados correntes e confiáveis — 04/09/2026

## Objetivo

Transformar a atualização financeira em uma prova operacional para o usuário da GAD: coleta nova e auditável, escalonamento de fontes quando faltar evidência, leitura cronológica explícita e publicação do retrato recém-coletado no site/Excel.

## Critérios de aceite

1. Rodar novamente a carteira completa de 163 UEs contra as fontes públicas reais, sem cache e sem substituir ausência por zero.
2. Coletar a série de saldos de todos os meses de 2026 que o PDDEInfo efetivamente disponibilizar, e não somente a última competência descoberta.
3. Distinguir na leitura gerencial: pagamento informado pelo FNDE, liberação/OB, crédito compatível no extrato e saldo posterior ao pagamento.
4. Nunca apresentar saldo anterior ao pagamento como localização atual do recurso. Quando a fonte não tiver posição posterior, mostrar explicitamente “localização atual não comprovada”.
5. Manter conta destinatária/liberação como evidência separada de crédito efetivamente localizado.
6. Exibir data da última evidência e defasagem temporal de forma visível no site e no Excel.
7. Criar uma fila nominal de lacunas com a próxima fonte/ação tentada, sem promover fonte bloqueada, antiga ou não validada a fonte ativa.
8. Publicar no retrato estático do produto os dados da nova execução integral, eliminando o manifesto antigo que ainda apontava para uma coleta anterior.
9. Validar frontend, tipos, testes e nova execução real 163/163 antes do merge.
10. Confirmar o deployment de produção e o SHA publicado.

## Limites de segurança e prova

- PDDEInfo “pagamento informado” não equivale a crédito bancário confirmado.
- Liberação/OB não equivale a crédito no extrato.
- Saldo só é temporalmente comparável a um repasse quando sua referência é igual ou posterior à data do pagamento informado.
- CAPTCHA/WAF e controles de acesso não serão contornados. Quando uma rota oficial bloquear automação, o sistema registra a indisponibilidade e tenta outra fonte pública permitida.
- Dados Abertos/Painéis só entram em conclusões se o piloto comprovar granularidade por UEx/escola e cobertura temporal útil para 2026.

## Implementação

### Etapa 1 — testes de regressão

- exigir `ALL_AVAILABLE_2026` na coleta pública de saldos;
- exigir que saldo pré-pagamento seja marcado como histórico, não como localização atual;
- exigir evidência de liberação/OB como nível intermediário independente.

### Etapa 2 — coleta e modelo gerencial

- coletar todas as competências 2026 disponíveis no PDDEInfo;
- enriquecer leitura do PDDE Básico com estado de evidência e comparabilidade temporal;
- gerar contagens de posição corrente comprovada, posição histórica e lacuna de localização atual.

### Etapa 3 — site e Excel

- priorizar perguntas de gestão;
- mascarar zeros históricos que possam ser confundidos com posição atual;
- separar “posição histórica publicada” de “onde está agora”; 
- incluir data de evidência, confiança e próxima ação.

### Etapa 4 — atualização do retrato publicado

- gerar snapshot `{portfolio, schools}` a partir do artefato integral recém-coletado;
- comprimir em `gzip-base64-parts` e atualizar `public/data/pdde-2026-snapshot.json` com run/artifact atuais;
- manter o artefato bruto para auditoria.

### Etapa 5 — prova real

- executar SIGEF Full 163 Validation;
- analisar nominalmente as lacunas restantes;
- só então marcar PR pronto, mergear e confirmar produção.
