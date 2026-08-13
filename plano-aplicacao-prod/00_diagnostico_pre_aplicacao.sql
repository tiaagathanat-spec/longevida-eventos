-- ============================================================
-- DIAGNÓSTICO PRÉ-APLICAÇÃO — Longevida Eventos (PRODUÇÃO)
-- Projeto: bvgozcltxilseqfmazow
--
-- SOMENTE SELECT / verificações. NÃO altera nada.
-- Execute ANTES de aplicar a 0009. Compare cada resultado com o
-- "ESPERADO" comentado e arquive a saída.
-- ============================================================

-- 1. Tabelas app_* esperadas (18) + situação do RLS
with esperadas(tabela) as (values
  ('app_categorias'),('app_modalidades'),('app_tipos_prova'),('app_eventos'),
  ('app_provas'),('app_atletas'),('app_perfis'),('app_inscricoes'),
  ('app_pagamentos'),('app_resultados'),('app_publicacoes'),
  ('app_faixas_numeracao'),('app_dorsais'),('app_galeria'),
  ('app_regulamentos'),('app_patrocinadores'),('app_qrcodes'),
  ('app_funcionarios')
)
select e.tabela,
       case
         when c.relname is null then 'FALTANDO'
         when c.relrowsecurity then 'OK (RLS ligado)'
         else 'OK (RLS DESLIGADO)'
       end as situacao,
       c.relrowsecurity as rls
from esperadas e
left join pg_class c
  on c.relname = e.tabela
  and c.relnamespace = 'public'::regnamespace
  and c.relkind = 'r'
order by e.tabela;
-- ESPERADO: 18 linhas; nenhuma FALTANDO; RLS ligado em todas (habilitado pela 0005).

-- 2. Policies atuais (todas as app_*) — deve conter as permissivas da 0005
select tablename, policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename like 'app\_%'
order by tablename, policyname;
-- ESPERADO: policies *_todos (0005) presentes; *_select_publico / *_write_papel
-- / *_escopo AUSENTES (0009/0010 ainda não aplicadas).

-- 3. Grants atuais de anon e authenticated (todas as app_*)
select
  t.tabela,
  has_table_privilege('anon', 'public.' || t.tabela, 'SELECT')  as anon_select,
  has_table_privilege('anon', 'public.' || t.tabela, 'INSERT')  as anon_insert,
  has_table_privilege('anon', 'public.' || t.tabela, 'UPDATE')  as anon_update,
  has_table_privilege('anon', 'public.' || t.tabela, 'DELETE')  as anon_delete,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'SELECT') as auth_select,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'INSERT') as auth_insert,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'UPDATE') as auth_update,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'DELETE') as auth_delete
from (values
  ('app_categorias'),('app_modalidades'),('app_tipos_prova'),('app_eventos'),
  ('app_provas'),('app_atletas'),('app_perfis'),('app_inscricoes'),
  ('app_pagamentos'),('app_resultados'),('app_publicacoes'),
  ('app_faixas_numeracao'),('app_dorsais'),('app_galeria'),
  ('app_regulamentos'),('app_patrocinadores'),('app_qrcodes'),
  ('app_funcionarios')
) as t(tabela)
order by t.tabela;
-- ESPERADO (estado pré-0009): anon com acesso amplo às app_* (vulnerabilidade
-- conhecida da 0005/0006); authenticated com CRUD.

-- 4. Funções app_* já existentes (a 0009 cria/substitui por CREATE OR REPLACE)
select p.proname as funcao,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef as security_definer
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname like 'app\_%'
order by p.proname;
-- ESPERADO: no máximo app_inscritos_publicos (se criada manualmente antes);
-- as funções de papel/permissão da 0009/0010 NÃO devem existir ainda.

-- 5. Objetos da 0010 (devem estar AUSENTES antes da aplicação)
select to_regclass('public.app_funcionario_eventos') as tabela_funcionario_eventos;
-- ESPERADO: NULL (a tabela só é criada na 0010).

select
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='app_eventos'
       and column_name='organizacao_id') as col_app_eventos_organizacao_id,
  (select count(*) from information_schema.columns
     where table_schema='public' and table_name='app_funcionarios'
       and column_name='usuario_id') as col_app_funcionarios_usuario_id;
-- ESPERADO: 0 e 0 (as colunas só existem após a 0010).

-- 6. Enum papel_organizacao (usado pelas funções 0009/0010)
select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where t.typname = 'papel_organizacao'
order by e.enumsortorder;
-- ESPERADO: administrador, organizador, cronometragem, financeiro, leitura.

-- 7. Organização demo "Espaço Longevida" (alvo do backfill da 0010)
select id, nome from public.organizacoes order by nome;
-- ESPERADO: linha "Espaço Longevida" presente.

-- 8. Vínculos por papel (organizacao_usuarios)
select papel, count(*) as qtd
from public.organizacao_usuarios
group by papel
order by papel;

-- Detalhe dos usuários vinculados
select ou.papel, u.email, u.nome
from public.organizacao_usuarios ou
left join public.usuarios u on u.id = ou.usuario_id
order by ou.papel, u.email;

-- 9. Eventos: total + sem organização (a coluna só existe após a 0010;
--    se ainda não existir, a segunda consulta retorna vazio sem erro)
select count(*) as total_eventos from public.app_eventos;

select id, nome
from public.app_eventos
where exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='app_eventos'
    and column_name='organizacao_id'
)
  and organizacao_id is null;

-- 10. Funcionários: total e expectativa do backfill por e-mail da 0010
select
  (select count(*) from public.app_funcionarios) as total_funcionarios,
  (select count(*) from public.app_funcionarios f
     where f.email is not null and f.email <> ''
       and exists (select 1 from public.usuarios u where u.email = f.email)) as emails_com_usuario,
  (select count(*) from public.app_funcionarios f
     where f.email is not null and f.email <> ''
       and not exists (select 1 from public.usuarios u where u.email = f.email)) as emails_sem_usuario,
  (select count(*) from public.app_funcionarios
     where email is null or email = '') as sem_email;
-- ESPERADO: emails_sem_usuario = funcionários demo que permanecerão NULL
-- após o backfill da 0010 (correspondência inequívoca).

-- Funcionários sem usuario_id (guarda: coluna só existe após a 0010)
select id, email, nome
from public.app_funcionarios
where exists (
  select 1 from information_schema.columns
  where table_schema='public' and table_name='app_funcionarios'
    and column_name='usuario_id'
)
  and usuario_id is null;

-- 11. Inscrições, resultados, dorsais e QR codes (volume)
select 'inscricoes' as objeto, count(*) as qtd from public.app_inscricoes
union all select 'resultados', count(*) from public.app_resultados
union all select 'dorsais', count(*) from public.app_dorsais
union all select 'qrcodes', count(*) from public.app_qrcodes;

select evento_id, count(*) as inscricoes
from public.app_inscricoes
group by evento_id
order by 2 desc;

select status, count(*) as qtd
from public.app_inscricoes
group by status
order by 2 desc;

-- 12. Duplicidade de nome em app_atletas (afeta as regras de "dono")
select nome, count(*) as qtd
from public.app_atletas
group by nome
having count(*) > 1
order by qtd desc;

-- 13. Usuários de auth (conferência com usuarios e app_funcionarios)
select id, email, created_at from auth.users order by created_at;
