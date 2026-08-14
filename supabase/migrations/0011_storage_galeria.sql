-- ============================================================
-- 0011 — STORAGE: policies da galeria compatíveis com o modelo atual
-- ============================================================
-- As policies criadas na 0002 usavam o schema antigo (tabela `eventos`
-- com id UUID e fn_evento_organizacao). O app hoje usa `app_eventos`
-- com id TEXT e o modelo de segurança 0009/0010 (organização → evento →
-- módulo). O cast `::uuid` no path faria o upload/edição/remoção falhar.
--
-- Esta migration redefine as policies do bucket `galeria` (que já existe
-- e permanece público, como decidido na 0002: o controle fino de
-- público/privado é feito pela linha em app_galeria.visibilidade; o app
-- só expõe a URL de arquivos marcados como 'publica').
--
-- Formato do path esperado:
--   galeria/{eventoId}/{categoria}/{visibilidade}/{arquivo}
--     [1]=eventoId (TEXT)  [2]=categoria  [3]=visibilidade ('publica'|'privada')
--
-- REGRAS:
--   * SELECT: qualquer papel vê caminhos de arquivos 'publica'; staff do
--     evento (app_pode_evento) vê também os 'privada'.
--   * INSERT/UPDATE/DELETE: apenas usuário autenticado com permissão de
--     escrita do módulo 'eventos' no evento do path (espelha a policy
--     app_galeria_write_escopo da 0010).
-- ============================================================

-- 1. Remove as policies antigas da 0002 (incompatíveis com id TEXT).
drop policy if exists storage_galeria_select on storage.objects;
drop policy if exists storage_galeria_insert on storage.objects;
drop policy if exists storage_galeria_update on storage.objects;
drop policy if exists storage_galeria_delete on storage.objects;

-- 2. SELECT: público vê 'publica'; staff-do-evento vê o resto.
create policy storage_galeria_select_escopo on storage.objects
  for select
  using (
    bucket_id = 'galeria'
    and (
      (storage.foldername(name))[3] = 'publica'
      or public.app_pode_evento((storage.foldername(name))[1])
    )
  );

-- 3. INSERT: usuário autenticado com escrita no módulo 'eventos' do evento.
create policy storage_galeria_insert_escopo on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'galeria'
    and public.app_pode_escrever_modulo_evento(
      (storage.foldername(name))[1],
      'eventos'
    )
  );

-- 4. UPDATE: mesma regra do insert.
create policy storage_galeria_update_escopo on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'galeria'
    and public.app_pode_escrever_modulo_evento(
      (storage.foldername(name))[1],
      'eventos'
    )
  );

-- 5. DELETE: mesma regra do insert.
create policy storage_galeria_delete_escopo on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'galeria'
    and public.app_pode_escrever_modulo_evento(
      (storage.foldername(name))[1],
      'eventos'
    )
  );

-- Sanidade: o bucket deve continuar existindo e público (criado na 0002).
-- select id, name, public from storage.buckets where id = 'galeria';
-- ESPERADO: 1 linha, public = true.
