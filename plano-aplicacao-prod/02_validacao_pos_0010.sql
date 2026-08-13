-- ============================================================
-- VALIDAÇÃO PÓS-0010 — Longevida Eventos (PRODUÇÃO)
-- SOMENTE SELECT / verificações. NÃO altera nada.
-- Rode IMEDIATAMENTE após executar a 0010.
-- Só libere o uso do sistema se TODOS os "ESPERADO" baterem.
-- ============================================================

-- 1. app_eventos.organizacao_id: coluna criada + backfill conservador
--    (esperado: 1 NULL = hskreu4u, copa de natação sem evidência de origem)
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'app_eventos'
       and column_name = 'organizacao_id') as coluna_organizacao_id,
  (select count(*) from public.app_eventos where organizacao_id is null) as eventos_sem_org,
  (select count(*) from public.app_eventos where organizacao_id is not null) as eventos_com_org,
  (select count(distinct organizacao_id) from public.app_eventos) as organizacoes_distintas;
-- ESPERADO: coluna_organizacao_id = 1; eventos_sem_org = 1 (hskreu4u permanece
-- SEM organização por design — backfill conservador); eventos_com_org = 1
-- (bbo2gmwd -> Espaço Longevida); organizacoes_distintas = 1.

-- 2. app_funcionario_eventos: tabela criada, RLS on, policies e vazia
select c.relname, c.relrowsecurity,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = c.relname) as n_policies
from pg_class c
where c.relname = 'app_funcionario_eventos' and c.relnamespace = 'public'::regnamespace;

select policyname, cmd from pg_policies
where schemaname = 'public' and tablename = 'app_funcionario_eventos'
order by policyname;

select count(*) as vinculos_criados from public.app_funcionario_eventos;
-- ESPERADO: tabela existe, RLS ligado, policies select+write, 0 vínculos
-- (a 0010 não popula a junção — nasce vazia por design).

-- 3. app_funcionarios.usuario_id: coluna criada + backfill por e-mail
select
  (select count(*) from information_schema.columns
     where table_schema = 'public' and table_name = 'app_funcionarios'
       and column_name = 'usuario_id') as coluna_usuario_id,
  (select count(*) from public.app_funcionarios) as total,
  (select count(*) from public.app_funcionarios where usuario_id is not null) as com_usuario,
  (select count(*) from public.app_funcionarios where usuario_id is null) as sem_usuario;
-- ESPERADO: coluna_usuario_id = 1; sem_usuario = apenas os e-mails demo sem
-- usuário correspondente em auth/usuarios.

-- 4. Funções da 0010 existem, com EXECUTE p/ anon+authenticated
select
  p.proname as funcao,
  pg_get_function_identity_arguments(p.oid) as args,
  p.prosecdef as security_definer,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in
   ('app_papel_na_org','app_permissoes_do_papel','app_org_do_evento',
    'app_evento_da_inscricao','app_evento_da_prova','app_evento_autorizado',
    'app_eventos_autorizados','app_pode_evento','app_modulo_permitido_evento',
    'app_pode_modulo_evento','app_pode_escrever_modulo_evento',
    'app_pode_escrever_modulo_org','app_pode_ler_inscricoes_cronometragem',
    'app_atualizar_updated_at')
order by p.proname;
-- ESPERADO: 14 linhas; anon_exec/auth_exec = true.

-- 5. Policies de escopo da 0010 existem (nenhuma FALTANDO)
with esperadas(policy) as (values
  ('app_funcionario_eventos_select'),('app_funcionario_eventos_write'),
  ('app_eventos_write_escopo'),('app_provas_write_escopo'),
  ('app_inscricoes_select'),('app_inscricoes_insert'),('app_inscricoes_update'),('app_inscricoes_delete'),
  ('app_pagamentos_select'),('app_pagamentos_insert'),('app_pagamentos_update'),('app_pagamentos_delete'),
  ('app_resultados_select'),('app_resultados_write'),
  ('app_publicacoes_write_escopo'),
  ('app_faixas_numeracao_select'),('app_faixas_numeracao_write'),
  ('app_dorsais_select'),('app_dorsais_write'),
  ('app_galeria_select_escopo'),('app_galeria_write_escopo'),
  ('app_regulamentos_write_escopo'),
  ('app_qrcodes_select'),('app_qrcodes_insert'),('app_qrcodes_update'),('app_qrcodes_delete')
)
select e.policy,
       case when p.policyname is null then 'FALTANDO' else 'OK' end as situacao
from esperadas e
left join pg_policies p
  on p.schemaname = 'public' and p.policyname = e.policy
order by e.policy;

-- 6. Policies genéricas da 0009 substituídas (esperado: NENHUMA linha)
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and policyname in
   ('app_eventos_write_papel','app_provas_write_papel',
    'app_publicacoes_write_papel','app_regulamentos_write_papel',
    'app_galeria_write_papel')
order by policyname;

-- 7. Policies da 0009 que DEVEM permanecer (atletas/perfis/funcionários/catálogos)
--    Obs.: app_galeria_select_publica foi REMOVIDA pela 0010 e substituída por
--    app_galeria_select_escopo (item 5) — por isso não consta mais desta lista.
with esperadas(policy) as (values
  ('app_atletas_select'),('app_atletas_insert'),('app_atletas_update'),('app_atletas_delete'),
  ('app_perfis_select'),('app_perfis_insert'),('app_perfis_update'),('app_perfis_delete'),
  ('app_funcionarios_select'),('app_funcionarios_write'),
  ('app_eventos_select_publico'),('app_provas_select_publico'),
  ('app_categorias_select_publico'),('app_modalidades_select_publico'),
  ('app_tipos_prova_select_publico'),('app_regulamentos_select_publico'),
  ('app_patrocinadores_select_publico'),('app_publicacoes_select_publico')
)
select e.policy,
       case when p.policyname is null then 'FALTANDO' else 'OK' end as situacao
from esperadas e
left join pg_policies p
  on p.schemaname = 'public' and p.policyname = e.policy
order by e.policy;

-- 8. Índices da 0010 criados
select indexname
from pg_indexes
where schemaname = 'public'
  and indexname in
   ('ix_app_eventos_organizacao_id','ix_app_funcionarios_usuario_id',
    'ix_app_funcionario_eventos_evento_id','ix_app_provas_evento_id',
    'ix_app_inscricoes_evento_id','ix_app_publicacoes_prova_id',
    'ix_app_pagamentos_inscricao_id','ix_app_resultados_inscricao_id',
    'ix_app_dorsais_inscricao_id','ix_app_qrcodes_inscricao_id',
    'ix_app_faixas_numeracao_evento_id','ix_app_galeria_evento_id',
    'ix_app_regulamentos_evento_id')
order by indexname;

-- 9. FUNÇÃO ESPECÍFICA DA CRONOMETRAGEM na política SELECT de app_inscricoes
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'app_inscricoes' and cmd = 'SELECT';
-- ESPERADO: qual contém app_pode_modulo_evento(...) OU
-- app_pode_ler_inscricoes_cronometragem(evento_id) OU app_sou_dono_inscricao(id).

-- 10. BLOQUEIO DE ESCRITA PARA CRONOMETRISTA (política INSERT de app_inscricoes)
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'app_inscricoes' and cmd = 'INSERT';
-- ESPERADO: qual usa app_pode_escrever_modulo_evento(evento_id, 'inscritos')
-- OU app_sou_dono_atleta_nome(atleta_nome) — e NÃO contém
-- app_pode_ler_inscricoes_cronometragem (o crono não escreve inscrições).

-- 11. (Comportamental — fora do editor) confirmação real do cronometrista:
--     GET {SUPABASE_URL}/rest/v1/app_inscricoes?select=*
--       apikey: <ANON_KEY>, Authorization: Bearer <JWT_de_usuario_cronometragem>
--       ESPERADO: 200 com as inscrições dos eventos autorizados.
--     POST {SUPABASE_URL}/rest/v1/app_inscricoes
--       mesmos headers, body = uma inscrição de evento autorizado
--       ESPERADO: 403 (RLS bloqueia escrita; não cria linha).
--     Obs.: no SQL editor não é possível assumir a role anon (NOLOGIN);
--     os checks estruturais acima + o teste no navegador cobrem isso.
