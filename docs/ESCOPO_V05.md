# Escopo consolidado v0.5

O produto prioriza informações financeiras atuais das 163 unidades da 4ª CRE.

## Visões operacionais

1. **Repasses e contas:** valores programados/pagos, datas e contas nas fontes oficiais.
2. **Movimentações e utilização:** créditos, débitos, estornos e demais movimentações obtidas do SIGEF.

A conciliação é uma camada analítica complementar. Histórico técnico é auxiliar, não produto.

## Execução

O backend admite **uma única tarefa ativa por vez**. Não fazem parte do escopo atual multi-worker, lease, heartbeat, fencing, retomada automática por outro executor ou cadeia de tentativas técnicas.

A implantação deve manter **uma única instância do runner/executor**. Se o processo for interrompido durante uma tarefa, qualquer execução que tenha permanecido `RUNNING` será marcada como `FAILED` na próxima inicialização, liberando uma nova consulta.

Achados e relatório só são publicados como resultado atual quando a execução termina `COMPLETE`. Artefatos incompletos podem permanecer para auditoria.

A trilha append-only permanece como evidência auxiliar; o estado operacional atual não é reconstruído a partir dela.

## Preservado

- coleta e normalização PDDEInfo;
- parsers de Liberações e Movimentações SIGEF;
- motor financeiro e tratamento conservador de divergências/estornos;
- Excel auditável;
- Storage privado e upload validado;
- API e processamento em segundo plano;
- RLS e evidência append-only.

## Próxima prioridade

Materializar as visões atuais de Repasses/Contas e Movimentações/Utilização e ampliar a aquisição permitida/assistida do SIGEF sem burlar CAPTCHA.

O Supabase dedicado continua obrigatório antes do deploy institucional. Bancos de outros sistemas não devem ser reutilizados.
