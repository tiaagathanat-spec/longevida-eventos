-- ============================================================
-- Correção: grants da role service_role nas tabelas public.
--
-- As migrations anteriores concederam acesso apenas a `anon` e
-- `authenticated`. A API de criação de funcionário
-- (/api/admin/funcionarios) usa a chave service_role via PostgREST
-- para gravar o vínculo em `organizacao_usuarios` e o perfil staff
-- em `usuarios` — sem o GRANT, o PostgREST responde
-- "permission denied for table ..." (a permissão de tabela é
-- verificada ANTES do RLS). Por isso o usuário aparecia no Auth,
-- mas não no site.
--
-- Padrão do próprio Supabase: service_role tem acesso pleno ao
-- schema public (a chave é um segredo, usada só no servidor, e a
-- role ignora o RLS por definição).
-- ============================================================

grant usage on schema public to service_role;

grant select, insert, update, delete
  on all tables in schema public to service_role;

grant usage, select on all sequences in schema public to service_role;

grant execute on all functions in schema public to service_role;
