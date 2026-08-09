-- Correção: concede permissões nas tabelas app_* aos papéis anon e
-- authenticated (necessário para o RLS funcionar — políticas sozinhas
-- não dão acesso se a role não tiver GRANT nas tabelas).
-- Rode este script UMA vez no SQL Editor do Supabase, após a 0005.

do $$
declare
  t text;
begin
  grant usage on schema public to anon, authenticated;

  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated',
      t
    );
  end loop;
end $$;
