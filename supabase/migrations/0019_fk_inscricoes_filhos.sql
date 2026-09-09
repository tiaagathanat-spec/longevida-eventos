-- FKs de integridade: pagamentos/qrcodes/dorsais apontam para inscrições
-- Impede órfãos (inscrição inexistente) e limpa em cascata quando a inscrição é excluída.
alter table public.app_pagamentos
  add constraint app_pagamentos_inscricao_id_fkey
  foreign key (inscricao_id) references public.app_inscricoes (id) on delete cascade;

alter table public.app_qrcodes
  add constraint app_qrcodes_inscricao_id_fkey
  foreign key (inscricao_id) references public.app_inscricoes (id) on delete cascade;

alter table public.app_dorsais
  add constraint app_dorsais_inscricao_id_fkey
  foreign key (inscricao_id) references public.app_inscricoes (id) on delete cascade;