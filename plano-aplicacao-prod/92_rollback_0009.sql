-- ============================================================
-- ROLLBACK 0009 — restaurar o comportamento funcional SEM
-- reabrir a escrita anônima (versão RECOMENDADA e SEGURA)
-- PRODUÇÃO. Execute SOMENTE após o rollback da 0010 (se aplicável)
-- e SOMENTE se a 0009 causar problema.
--
-- Diferença intencional em relação ao estado original 0005/0006:
--   * anon volta a LER todas as app_* (o app público lê via stores),
--     mas NÃO recebe INSERT/UPDATE/DELETE.
--   * authenticated mantém o CRUD (grant da 0009 permanece).
--   * RLS permanece LIGADO; as policies voltam a ser permissivas
--     (_todos), portanto a leitura de anon/authenticated volta.
--
-- Se, por exigência de auditoria, você quiser o estado EXATO da
-- 0005/0006 (anon com CRUD completo), NÃO use este arquivo: troque o
-- passo 2 por "grant all on public.<tabela> to anon" — isto reabre
-- a vulnerabilidade que a 0009 fechou.
-- ============================================================

-- 1. REMOVE AS POLICIES RESTRITIVAS DA 0009
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_select_publico', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_publica', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_escopo', t);
    execute format('drop policy if exists %I on public.%I', t || '_write_papel', t);
    execute format('drop policy if exists %I on public.%I', t || '_write_escopo', t);
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
  end loop;
end $$;

-- 2. RECRIA AS POLICIES PERMISSIVAS (_todos) — mesmo efeito da 0005
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format(
      'create policy %I on public.%I for all using (true) with check (true)',
      t || '_todos', t
    );
  end loop;
end $$;

-- 3. GRANTS — anon volta a LER (nada de escrita); authenticated mantém CRUD
do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format('grant select on public.%I to anon', t);
    -- Se quiser o estado EXATO da 0005/0006 (NÃO recomendado), descomente:
    -- execute format('grant insert, update, delete on public.%I to anon', t);
  end loop;
end $$;

-- 4. REMOVE AS FUNÇÕES DA 0009 (nenhuma policy restante as referencia)
drop function if exists public.app_papel_atual();
drop function if exists public.app_eh_staff();
drop function if exists public.app_usuario_atual_nome();
drop function if exists public.app_pode_esc_catalogo();
drop function if exists public.app_pode_esc_inscritos();
drop function if exists public.app_pode_esc_kits();
drop function if exists public.app_pode_esc_resultados();
drop function if exists public.app_pode_esc_financeiro();
drop function if exists public.app_pode_esc_config();
drop function if exists public.app_sou_dono_atleta(text, text);
drop function if exists public.app_sou_dono_atleta_nome(text);
drop function if exists public.app_sou_dono_inscricao(text);
-- app_inscritos_publicos é MANTIDA: expõe apenas uma contagem e é usada
-- pelo site público (RPC). Reavaliar apenas se desejar estado 0005 exato.
-- drop function if exists public.app_inscritos_publicos(text);

-- 5. VALIDAÇÃO PÓS-ROLLBACK
--   * anon: SELECT true nas 18, INSERT/UPDATE/DELETE false;
--   * authenticated: CRUD nas 18;
--   * RLS continua LIGADO;
--   * policies *_todos presentes, sem policies *_select_publico/_write_*;
--   * funções da 0009 ausentes.
-- Use o 00_diagnostico_pre_aplicacao.sql para conferir o formato do
-- estado final (a única diferença será anon sem escrita).
