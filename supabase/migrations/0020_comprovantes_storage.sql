-- ============================================================
-- 0020 — STORAGE: bucket `comprovantes` (comprovantes de PIX)
-- ============================================================
-- Comprovantes deixam de trafegar como base64 na coluna
-- app_pagamentos.comprovante_url e passam a morar no bucket
-- `comprovantes`, como as mídias da galeria (0011). A linha em
-- app_pagamentos.comprovante_url guarda a URL pública do arquivo.
-- Registros antigos com data URL continuam funcionando (o navegador
-- renderiza data URLs; o admin exibe ambos os formatos).
--
-- Formato do path:
--   comprovantes/{eventoId}/{inscricaoId}/{arquivo}
--     [1]=eventoId     [2]=inscricaoId
--
-- REGRAS (espelham as policies de app_pagamentos da 0010):
--   * SELECT: staff com módulo 'financeiro' do evento OU dono da
--     inscrição (app_sou_dono_inscricao).
--   * INSERT/UPDATE/DELETE: escrita do módulo 'financeiro' OU dono da
--     inscrição — o atleta anexa o comprovante no portal; o financeiro
--     (admin) pode substituir/remover.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', true)
on conflict (id) do nothing;

drop policy if exists storage_comprovantes_select on storage.objects;
drop policy if exists storage_comprovantes_insert on storage.objects;
drop policy if exists storage_comprovantes_update on storage.objects;
drop policy if exists storage_comprovantes_delete on storage.objects;

create policy storage_comprovantes_select on storage.objects
  for select
  using (
    bucket_id = 'comprovantes'
    and (
      public.app_pode_modulo_evento((storage.foldername(name))[1], 'financeiro')
      or public.app_sou_dono_inscricao((storage.foldername(name))[2])
    )
  );

create policy storage_comprovantes_insert on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'comprovantes'
    and (
      public.app_pode_escrever_modulo_evento((storage.foldername(name))[1], 'financeiro')
      or public.app_sou_dono_inscricao((storage.foldername(name))[2])
    )
  );

create policy storage_comprovantes_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and (
      public.app_pode_escrever_modulo_evento((storage.foldername(name))[1], 'financeiro')
      or public.app_sou_dono_inscricao((storage.foldername(name))[2])
    )
  );

create policy storage_comprovantes_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'comprovantes'
    and (
      public.app_pode_escrever_modulo_evento((storage.foldername(name))[1], 'financeiro')
      or public.app_sou_dono_inscricao((storage.foldername(name))[2])
    )
  );