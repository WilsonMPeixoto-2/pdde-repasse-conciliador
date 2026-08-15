# Expansão de coleta, análise e durabilidade — desenho aprovado

## Objetivo

Adicionar capacidades complementares ao `pdde-repasse-conciliador` sem substituir o coletor HTTP do PDDEInfo, sem alterar a semântica probatória do reconciliador e sem transformar CAPTCHA em um mecanismo de evasão automatizada.

## Princípios

1. A ordem de preferência de coleta é: fonte/API estruturada -> HTTP direto existente -> browser assistido.
2. O browser assistido usa Crawlee + Playwright em modo explícito. Quando detectar desafio interativo/CAPTCHA, mantém a sessão aberta, pausa a automação e aguarda o operador resolver manualmente antes de continuar.
3. O coletor PDDEInfo atual continua sendo o caminho padrão e não ganha dependência obrigatória de browser.
4. `p-queue` fornece concorrência e rate limiting dentro de um job; não substitui a fila persistente Supabase.
5. DuckDB é camada analítica complementar: reduz grandes conjuntos a candidatos/agregações, mas não decide estados probatórios.
6. `unpdf` lê PDFs digitais e produz texto/metadados; Playwright fornece a base para renderização HTML -> PDF. OCR não faz parte deste corte.
7. Inngest entra como integração opcional para execução durável/checkpoints. A fila Supabase permanece fonte de verdade e caminho padrão até validação operacional.
8. `fast-check` + `@fast-check/vitest` reforçam invariantes financeiras e de conciliação por property-based testing.
9. Dinheiro permanece em centavos inteiros; novas fontes não podem converter ausência em zero nem inferir confirmação.
10. Evidências continuam imutáveis/append-only, com artefato bruto, SHA-256, timestamp e fonte quando incorporadas ao pipeline institucional.

## Componentes

### Browser assistido

Criar um adaptador genérico de browser que:
- execute uma URL com `PlaywrightCrawler`;
- trabalhe com navegador visível quando `interactive=true`;
- detecte desafios por sinais configuráveis (seletores, URL e texto);
- invoque um `HumanInterventionHandler` quando necessário;
- retome a mesma página/sessão após o operador liberar a continuação;
- devolva HTML final, URL efetiva, timestamp e indicação de intervenção humana;
- nunca inclua solver de CAPTCHA, stealth/fingerprint spoofing ou proxy de evasão.

Criar também uma rota de aquisição genérica com prioridade `STRUCTURED_API -> HTTP -> BROWSER_ASSISTED`, permitindo que novos conectores usem o fallback sem reescrever a lógica.

### Rate limiting

Criar uma fábrica de `PQueue` com `concurrency`, `intervalCap`, `interval`, `strict`, timeout e AbortSignal. Os limites serão conservadores e configuráveis por fonte.

### DuckDB

Criar um módulo analítico em memória que receba movimentos normalizados e ofereça seleção de candidatos por CNPJ/programa/conta/valor/janela de datas. Os resultados retornam ao reconciliador existente; DuckDB não produz `ReconciliationStatus`.

### PDF

Criar:
- leitor `unpdf` para bytes de PDF, com texto por página, texto agregado e metadados básicos;
- renderizador HTML -> PDF baseado em Playwright, com browser factory injetável para testes e uso futuro em relatórios institucionais.

### Inngest

Criar integração opcional isolada em `backend/orchestration/`:
- cliente configurado apenas quando variáveis Inngest existirem;
- função durável de ponte que executa etapas explicitamente nomeadas e checkpointáveis;
- nenhuma substituição automática da `ExecutionJobQueue` ou do `ExecutionWorker` atual.

### Property-based testing

Adicionar propriedades para invariantes já consolidados, começando por:
- centavos inteiros permanecem inteiros e sem perda ao agregar;
- reordenação de movimentos equivalentes não muda o total conciliado;
- ausência/indisponibilidade de fonte não pode virar `REPASSE_CONFIRMADO`.

## Compatibilidade e ativação

- Todos os novos recursos são opt-in ou módulos auxiliares.
- `npm run check` deve continuar passando sem browser instalado no runner.
- O browser Chromium é instalado explicitamente com script próprio quando o operador precisar de coleta assistida ou geração PDF.
- Nenhuma chave/segredo é versionada.
- O corte não inclui ainda Portal da Transparência nem Dados Abertos FNDE; esses são a próxima exploração prática após esta base estar integrada.
