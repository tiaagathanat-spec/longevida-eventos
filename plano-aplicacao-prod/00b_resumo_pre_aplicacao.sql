-- ============================================================
-- RESUMO PRÉ-APLICAÇÃO — Longevida Eventos (PRODUÇÃO)
-- Projeto: bvgozcltxilseqfmazow
--
-- SOMENTE SELECT / verificações. NÃO altera nada.
-- Resultado consolidado em UM ÚNICO RESULT SET (2 colunas):
--   categoria | resultado
-- Execute ANTES de aplicar a 0009.
-- ============================================================

with app_tabelas(tabela) as (values
  ('app_categorias'),('app_modalidades'),('app_tipos_prova'),('app_eventos'),
  ('app_provas'),('app_atletas'),('app_perfis'),('app_inscricoes'),
  ('app_pagamentos'),('app_resultados'),('app_publicacoes'),
  ('app_faixas_numeracao'),('app_dorsais'),('app_galeria'),
  ('app_regulamentos'),('app_patrocinadores'),('app_qrcodes'),
  ('app_funcionarios')
),
papeis(papel) as (
  select e.enumlabel
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  where t.typname = 'papel_organizacao'
)

select categoria, resultado
from (
  -- 1. Tabelas app_* existentes
  select '01_tabelas_app_existentes' as categoria,
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r')::text as resultado
  union all
  -- 2. Tabelas app_* com RLS habilitado
  select '02_tabelas_app_rls_habilitado',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where c.relrowsecurity)::text
  union all
  -- 3. Total de policies nas app_*
  select '03_policies_app_total',
         (select count(*) from pg_policies
           where schemaname = 'public' and tablename like 'app\_%')::text
  union all
  -- 4. Policies com sufixo "_todos"
  select '04_policies_com_todos',
         (select count(*) from pg_policies
           where schemaname = 'public' and policyname like '%\_todos')::text
  union all
  -- 5. Policies com sufixo "_select_publico"
  select '05_policies_com_select_publico',
         (select count(*) from pg_policies
           where schemaname = 'public' and policyname like '%\_select\_publico')::text
  union all
  -- 6. Policies com sufixo "_write_papel"
  select '06_policies_com_write_papel',
         (select count(*) from pg_policies
           where schemaname = 'public' and policyname like '%\_write\_papel')::text
  union all
  -- 7. Tabelas app_* com GRANT SELECT para anon
  select '07_anon_grant_select',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where has_table_privilege('anon', 'public.' || t.tabela, 'SELECT'))::text
  union all
  -- 8. Tabelas app_* com GRANT INSERT para anon
  select '08_anon_grant_insert',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where has_table_privilege('anon', 'public.' || t.tabela, 'INSERT'))::text
  union all
  -- 9. Tabelas app_* com GRANT UPDATE para anon
  select '09_anon_grant_update',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where has_table_privilege('anon', 'public.' || t.tabela, 'UPDATE'))::text
  union all
  -- 10. Tabelas app_* com GRANT DELETE para anon
  select '10_anon_grant_delete',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where has_table_privilege('anon', 'public.' || t.tabela, 'DELETE'))::text
  union all
  -- 11. Tabelas app_* com CRUD (SELECT+INSERT+UPDATE+DELETE) para authenticated
  select '11_authenticated_grant_crud',
         (select count(*) from app_tabelas t
           join pg_class c
             on c.relname = t.tabela
             and c.relnamespace = 'public'::regnamespace
             and c.relkind = 'r'
           where has_table_privilege('authenticated', 'public.' || t.tabela, 'SELECT')
             and has_table_privilege('authenticated', 'public.' || t.tabela, 'INSERT')
             and has_table_privilege('authenticated', 'public.' || t.tabela, 'UPDATE')
             and has_table_privilege('authenticated', 'public.' || t.tabela, 'DELETE'))::text
  union all
  -- 12. Existência da função app_inscritos_publicos (criada/substituída na 0009)
  select '12_funcao_app_inscritos_publicos',
         case when exists (
           select 1 from pg_proc p
           where p.pronamespace = 'public'::regnamespace
             and p.proname = 'app_inscritos_publicos'
         ) then 'EXISTE' else 'NAO EXISTE' end
  union all
  -- 13. Existência da tabela app_funcionario_eventos (criada na 0010)
  select '13_tabela_app_funcionario_eventos',
         case when to_regclass('public.app_funcionario_eventos') is not null
           then 'EXISTE' else 'NAO EXISTE - esperado antes da 0010' end
  union all
  -- 14. Existência da coluna app_eventos.organizacao_id (criada na 0010)
  select '14_coluna_app_eventos_organizacao_id',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'public' and table_name = 'app_eventos'
                       and column_name = 'organizacao_id') > 0
           then 'EXISTE' else 'NAO EXISTE - esperado antes da 0010' end
  union all
  -- 15. Existência da coluna app_funcionarios.usuario_id (criada na 0010)
  select '15_coluna_app_funcionarios_usuario_id',
         case when (select count(*) from information_schema.columns
                     where table_schema = 'public' and table_name = 'app_funcionarios'
                       and column_name = 'usuario_id') > 0
           then 'EXISTE' else 'NAO EXISTE - esperado antes da 0010' end
  union all
  -- 16. Quantidade de organizações
  select '16_organizacoes_total',
         (select count(*) from public.organizacoes)::text
  union all
  -- 17. Nome e ID da organização Espaço Longevida
  select '17_organizacao_espaco_longevida',
         coalesce(
           (select id || ' | ' || nome
            from public.organizacoes
            where nome = 'Espaço Longevida'
            limit 1),
           'NAO ENCONTRADA'
         )
  union all
  -- 18. Quantidade de usuários em organizacao_usuarios por papel
  select '18_usuarios_por_papel_' || p.papel,
         coalesce(s.qtd::text, '0')
  from papeis p
  left join (
    select papel, count(*) as qtd
    from public.organizacao_usuarios
    group by papel
  ) s on s.papel = p.papel
  union all
  -- 19. Quantidade total de eventos
  select '19_eventos_total',
         (select count(*) from public.app_eventos)::text
  union all
  -- 20. Quantidade total de funcionários
  select '20_funcionarios_total',
         (select count(*) from public.app_funcionarios)::text
  union all
  -- 21. Quantidade total de inscrições
  select '21_inscricoes_total',
         (select count(*) from public.app_inscricoes)::text
  union all
  -- 22. Quantidade total de resultados
  select '22_resultados_total',
         (select count(*) from public.app_resultados)::text
  union all
  -- 23. Quantidade total de dorsais
  select '23_dorsais_total',
         (select count(*) from public.app_dorsais)::text
  union all
  -- 24. Quantidade total de QR Codes
  select '24_qrcodes_total',
         (select count(*) from public.app_qrcodes)::text
  union all
  -- 25. Quantidade de nomes duplicados em app_atletas
  select '25_nomes_duplicados_atletas',
         (select count(*) from (
           select nome
           from public.app_atletas
           group by nome
           having count(*) > 1
         ) d)::text
  union all
  -- 26. Quantidade de usuários em auth.users
  select '26_usuarios_auth_total',
         (select count(*) from auth.users)::text
) resumo
order by categoria;
