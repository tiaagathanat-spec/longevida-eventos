-- ============================================================
-- Correção: garante que o host (tiaagathanat@gmail.com) entre como
-- administrador da plataforma.
--
-- O login decide o destino em app/(public)/login/page.tsx
-- (destinoPorPerfil): para ir para /admin/dashboard, o usuário
-- precisa de usuarios.tipo_conta = 'staff' E um vínculo em
-- organizacao_usuarios com papel = 'administrador'.
--
-- Este script é idempotente e cobre os três cenários possíveis:
--   1. linha em `usuarios` faltando (conta criada fora do fluxo de
--      signup do app)          -> insere a partir de auth.users
--   2. tipo_conta errado         -> força 'staff'
--   3. vínculo ausente/errado    -> garante 'administrador' na
--      organização demo "Espaço Longevida"
-- ============================================================

-- 1. Garante a organização demo. A tabela `organizacoes` (0002) não tem
-- a coluna `descricao`; a organização existe e só criamos quando ausente.
insert into organizacoes (nome)
select 'Espaço Longevida'
where not exists (select 1 from organizacoes where nome = 'Espaço Longevida');

-- 2. Garante a linha do host em `usuarios`, a partir de auth.users.
insert into usuarios (id, nome, email, tipo_conta)
select
  id,
  coalesce(raw_user_meta_data ->> 'nome', email),
  email,
  'staff'::tipo_conta_usuario
from auth.users
where email = 'tiaagathanat@gmail.com'
on conflict (id) do update
  set tipo_conta = 'staff',
      email = excluded.email;

-- 3. Garante o vínculo administrador na organização demo.
insert into organizacao_usuarios (organizacao_id, usuario_id, papel)
select o.id, u.id, 'administrador'
from organizacoes o
cross join usuarios u
where o.nome = 'Espaço Longevida'
  and u.email = 'tiaagathanat@gmail.com'
on conflict (organizacao_id, usuario_id) do update
  set papel = 'administrador';
