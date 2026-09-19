-- ============================================================
-- 0026 — Créditos: grants + RLS iguais às demais tabelas app_*
--
-- PROBLEMA: as tabelas criadas na 0023 (app_creditos e
-- app_credito_movimentacoes) só receberam GRANT para a role
-- `authenticated`. O app ainda entra pelo login mock, que usa a
-- ANON key como role — então o navegador recebia HTTP 401/404 a
-- cada leitura de crédito:
--   "permission denied for table app_creditos" (42501)
--
-- As demais tabelas app_* (0005) são concedidas a
-- `anon, authenticated` com política permissiva `for all using
-- (true) with check (true)`. Esta migração alinha as duas tabelas
-- de crédito ao mesmo padrão — aditivo e idempotente.
-- ============================================================

-- ---------- 1. Grants ----------
grant select, insert, update, delete on public.app_creditos to anon, authenticated;
grant select, insert, update, delete on public.app_credito_movimentacoes to anon, authenticated;

-- ---------- 2. RLS permissivo (drop-if-exists antes de recriar) ----------
drop policy if exists app_creditos_select on public.app_creditos;
drop policy if exists app_creditos_write on public.app_creditos;
create policy app_creditos_todos on public.app_creditos
  for all using (true) with check (true);

drop policy if exists app_credito_movimentacoes_select on public.app_credito_movimentacoes;
drop policy if exists app_credito_movimentacoes_write on public.app_credito_movimentacoes;
create policy app_credito_movimentacoes_todos on public.app_credito_movimentacoes
  for all using (true) with check (true);