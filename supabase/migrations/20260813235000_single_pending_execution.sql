-- O produto opera com uma única tarefa pendente ou em andamento por vez.
-- Estados terminais não bloqueiam novas consultas.
create unique index if not exists execution_jobs_single_pending_idx
  on public.execution_jobs ((1))
  where status in ('QUEUED', 'RUNNING');
