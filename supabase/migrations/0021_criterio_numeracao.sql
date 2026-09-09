-- ============================================================
-- 0021 — CRITÉRIO DE NUMERAÇÃO POR EVENTO
-- ============================================================
-- O critério de agrupamento das faixas de numeração (CATEGORIA ou
-- IDADE) era guardado apenas em memória pelo store
-- lib/mock/faixas-numeracao-store.tsx e se perdia ao recarregar a
-- página, fazendo o administrador parecer que as alterações não
-- "pegavam". Esta tabela-espelho persiste o critério escolhido por
-- evento, no mesmo padrão das demais tabelas app_* (migration 0005).

create table if not exists public.app_criterio_numeracao (
  evento_id text primary key,
  criterio text not null default 'categoria'
);

alter table public.app_criterio_numeracao enable row level security;

create policy app_criterio_numeracao_todos
  on public.app_criterio_numeracao
  for all
  using (true)
  with check (true);

grant select, insert, update, delete on public.app_criterio_numeracao
  to anon, authenticated;