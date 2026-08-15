# Atualização controlada de dependências — desenho

## Objetivo
Atualizar apenas dependências já existentes e diretamente úteis ao projeto, em branch isolada, preservando o comportamento funcional atual e evitando introduzir novas tecnologias sem necessidade comprovada.

## Escopo aprovado
- Verificar versões atuais disponíveis para Vite, Tailwind CSS, TypeScript, Lucide e demais dependências já presentes.
- Aplicar atualizações compatíveis de forma incremental, com atenção especial a mudanças de versão principal.
- Manter Zod, Cheerio, ExcelJS e Supabase JS sem alteração se já estiverem atuais ou se não houver ganho claro.
- Não adicionar DuckDB, Kysely, Dinero.js, Trigger.dev/Inngest, Next.js ou outros componentes novos nesta rodada.
- Não alterar regras de negócio, coletores PDDEInfo/SIGEF, modelos fiscais, migrations institucionais ou contratos de API, exceto ajustes estritamente exigidos por compatibilidade da atualização.

## Estratégia
1. Confirmar baseline com `npm ci` e `npm run check`.
2. Consultar o registry npm para descobrir versões atuais e requisitos de engine/peer dependencies.
3. Atualizar primeiro versões menores/patches seguras; depois avaliar separadamente majors de Vite, Tailwind, TypeScript e Lucide.
4. Para cada major, executar `npm run check`; se houver quebra estrutural desproporcional, manter a versão atual e registrar o motivo em vez de forçar migração.
5. Preservar `package-lock.json` versionado e reprodutível.

## Critérios de aceite
- `npm ci` concluído sem erro.
- `npm run test`, `npm run typecheck` e `npm run build` verdes após a atualização final.
- Nenhuma regressão funcional nos testes existentes.
- Nenhuma nova dependência fora do escopo aprovado.
- Branch pronta para PR apenas com mudanças justificadas de dependências/configuração mínima de compatibilidade.
