# Vercel: produção e homologação

Projeto Vercel: `pdde-repasse-conciliador`.

- Produção: branch `main`.
- O conteúdo do PR #26 foi incorporado à `main` em 18/08/2026.
- O hotfix do runtime da rota `/api/session` foi incorporado pelo PR #27.
- Alterações em variáveis de ambiente da Vercel só passam a valer em novos deployments; por isso, após mudanças de credenciais ou escopo, é necessário gerar um novo deployment da `main`.
- Novas mudanças funcionais devem voltar a ser homologadas em Preview antes de promoção para produção.
