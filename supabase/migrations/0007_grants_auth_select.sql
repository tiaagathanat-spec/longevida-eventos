-- ============================================================
-- Correção: concede SELECT das tabelas de autenticação/perfil à
-- role authenticated.
--
-- Motivo: a página de login (app/(public)/login/page.tsx, função
-- destinoPorPerfil) consulta `usuarios`, `organizacao_usuarios` e
-- `organizacoes` logo após o sign-in para decidir o destino do
-- usuário (Admin / Organização / Portal). Essas tabelas têm RLS
-- habilitado (0002), mas as migrations não concediam privilégio
-- algum à role `authenticated` — o que fazia a consulta falhar com
-- "permission denied" e todo usuário cair no Portal, mesmo o admin.
--
-- A concessão aqui é apenas SELECT e continua restrita pelas
-- políticas de RLS existentes (usuarios_select, organizacao_usuarios
-- select, organizacoes_select), preservando o controle de acesso.
-- ============================================================

grant select on public.usuarios to authenticated;
grant select on public.organizacao_usuarios to authenticated;
grant select on public.organizacoes to authenticated;
