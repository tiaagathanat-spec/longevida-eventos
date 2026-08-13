-- ============================================================
-- VALIDAÇÃO PÓS-0009 — Longevida Eventos (PRODUÇÃO)
-- SOMENTE SELECT / verificações. NÃO altera nada.
-- Rode IMEDIATAMENTE após executar a 0009 e ANTES da 0010.
-- Só aplique a 0010 se TODOS os "ESPERADO" baterem.
-- ============================================================

-- 1. anon SEM acesso às tabelas protegidas (esperado: todos FALSE)
select
  t.tabela,
  has_table_privilege('anon', 'public.' || t.tabela, 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.' || t.tabela, 'INSERT') as anon_insert,
  has_table_privilege('anon', 'public.' || t.tabela, 'UPDATE') as anon_update,
  has_table_privilege('anon', 'public.' || t.tabela, 'DELETE') as anon_delete
from (values
  ('app_atletas'),('app_perfis'),('app_inscricoes'),('app_pagamentos'),
  ('app_resultados'),('app_faixas_numeracao'),('app_dorsais'),('app_qrcodes'),
  ('app_funcionarios')
) as t(tabela)
order by t.tabela;

-- 2. authenticated COM CRUD nas 18 tabelas (esperado: todos TRUE)
select
  t.tabela,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'SELECT') as sel,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'INSERT') as ins,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'UPDATE') as upd,
  has_table_privilege('authenticated', 'public.' || t.tabela, 'DELETE') as del
from (values
  ('app_categorias'),('app_modalidades'),('app_tipos_prova'),('app_eventos'),
  ('app_provas'),('app_atletas'),('app_perfis'),('app_inscricoes'),
  ('app_pagamentos'),('app_resultados'),('app_publicacoes'),
  ('app_faixas_numeracao'),('app_dorsais'),('app_galeria'),
  ('app_regulamentos'),('app_patrocinadores'),('app_qrcodes'),
  ('app_funcionarios')
) as t(tabela)
order by t.tabela;

-- 3. RLS ligado nas 18 app_* (relrowsecurity = true)
select c.relname, c.relrowsecurity, c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname like 'app\_%' and c.relkind = 'r'
order by c.relname;

-- 4. Policies esperadas da 0009 existem (nenhuma FALTANDO)
with esperadas(policy) as (values
  ('app_categorias_select_publico'),('app_categorias_write_papel'),
  ('app_modalidades_select_publico'),('app_modalidades_write_papel'),
  ('app_tipos_prova_select_publico'),('app_tipos_prova_write_papel'),
  ('app_eventos_select_publico'),('app_eventos_write_papel'),
  ('app_provas_select_publico'),('app_provas_write_papel'),
  ('app_publicacoes_select_publico'),('app_publicacoes_write_papel'),
  ('app_regulamentos_select_publico'),('app_regulamentos_write_papel'),
  ('app_patrocinadores_select_publico'),('app_patrocinadores_write_papel'),
  ('app_galeria_select_publica'),('app_galeria_write_papel'),
  ('app_faixas_numeracao_select'),('app_faixas_numeracao_write'),
  ('app_funcionarios_select'),('app_funcionarios_write'),
  ('app_perfis_select'),('app_perfis_insert'),('app_perfis_update'),('app_perfis_delete'),
  ('app_atletas_select'),('app_atletas_insert'),('app_atletas_update'),('app_atletas_delete'),
  ('app_inscricoes_select'),('app_inscricoes_insert'),('app_inscricoes_update'),('app_inscricoes_delete'),
  ('app_pagamentos_select'),('app_pagamentos_insert'),('app_pagamentos_update'),('app_pagamentos_delete'),
  ('app_resultados_select'),('app_resultados_write'),
  ('app_dorsais_select'),('app_dorsais_write'),
  ('app_qrcodes_select'),('app_qrcodes_insert'),('app_qrcodes_update'),('app_qrcodes_delete')
)
select e.policy,
       case when p.policyname is null then 'FALTANDO' else 'OK' end as situacao
from esperadas e
left join pg_policies p
  on p.schemaname = 'public' and p.policyname = e.policy
order by e.policy;

-- 5. Policies permissivas da 0005 foram removidas (esperado: NENHUMA linha)
select tablename, policyname
from pg_policies
where schemaname = 'public' and policyname like '%\_todos';

-- 6. Funções da 0009 existem, com EXECUTE p/ anon+authenticated e sem PUBLIC
select
  p.proname as funcao,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
  (p.proacl is null) as acl_publico_default
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in
   ('app_papel_atual','app_eh_staff','app_usuario_atual_nome',
    'app_pode_esc_catalogo','app_pode_esc_inscritos','app_pode_esc_kits',
    'app_pode_esc_resultados','app_pode_esc_financeiro','app_pode_esc_config',
    'app_sou_dono_atleta','app_sou_dono_atleta_nome','app_sou_dono_inscricao',
    'app_inscritos_publicos')
order by p.proname;
-- ESPERADO: anon_exec = true, auth_exec = true, acl_publico_default = false.

-- 7. Catálogos públicos continuam legíveis por anon, mas SÓ leitura
select
  t.tabela,
  has_table_privilege('anon', 'public.' || t.tabela, 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.' || t.tabela, 'INSERT') as anon_insert
from (values
  ('app_categorias'),('app_modalidades'),('app_tipos_prova'),('app_eventos'),
  ('app_provas'),('app_publicacoes'),('app_regulamentos'),
  ('app_patrocinadores'),('app_galeria')
) as t(tabela)
order by t.tabela;
-- ESPERADO: anon_select = true, anon_insert = false.

-- 8. Tabelas críticas protegidas: RLS on, anon sem privilégio, policies presentes
select
  t.tabela,
  c.relrowsecurity as rls,
  has_table_privilege('anon', 'public.' || t.tabela, 'SELECT') as anon_select,
  has_table_privilege('anon', 'public.' || t.tabela, 'INSERT') as anon_insert,
  (select count(*) from pg_policies p
     where p.schemaname = 'public' and p.tablename = t.tabela) as n_policies
from (values
  ('app_inscricoes'),('app_atletas'),('app_perfis'),('app_pagamentos'),
  ('app_resultados'),('app_faixas_numeracao'),('app_dorsais'),('app_qrcodes'),
  ('app_funcionarios')
) as t(tabela)
join pg_class c on c.relname = t.tabela and c.relnamespace = 'public'::regnamespace
order by t.tabela;
-- ESPERADO: rls = true, anon_select/insert = false, n_policies >= 2.

-- 9. Detalhe das policies das tabelas críticas (conferir a expressão)
select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('app_inscricoes','app_atletas','app_perfis','app_pagamentos','app_qrcodes')
order by tablename, policyname;
-- ESPERADO: app_inscricoes_select usa app_pode_esc_inscritos() OU app_sou_dono_inscricao(id).

-- 10. (Comportamental — opcional, fora do editor) confirmação real de acesso:
--     GET {SUPABASE_URL}/rest/v1/app_inscricoes?select=*
--       apikey: <ANON_KEY>   (sem Authorization)
--       ESPERADO: 401 ou array vazio — nunca dados.
--     Os GRANTs acima já comprovam; este teste é redundância de segurança.
