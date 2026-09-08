-- ============================================================
-- Longevida Eventos - 0018: Dorsais únicos por prova
--
-- OBJETIVO:
--   Cada inscrição recebe um único dorsal DENTRO de sua prova; a
--   numeração é independente entre provas (cada prova recomeça em 1)
--   e duplas/equipes (1 inscrição por equipe) compartilham um único
--   dorsal. Para garantir isso no banco, adicionamos a coluna
--   prova_id em app_dorsais e uma constraint UNIQUE(prova_id, numero).
--
-- Aditivo e idempotente (seguro re-executar).
-- ============================================================

-- 1) Coluna prova_id em app_dorsais
alter table public.app_dorsais
  add column if not exists prova_id text;

-- 2) Backfill de prova_id a partir da inscrição correspondente
update public.app_dorsais d
set prova_id = i.prova_id
from public.app_inscricoes i
where d.inscricao_id = i.id
  and d.prova_id is null;

-- 3) Remover duplicatas de número dentro da mesma prova
--    (mantém o dorsal mais antigo)
with ranked as (
  select id,
         row_number() over (
           partition by prova_id, numero
           order by atribuido_em asc
         ) as rn
  from public.app_dorsais
  where prova_id is not null
)
delete from public.app_dorsais
where id in (select id from ranked where rn > 1);

-- 4) Reiniciar a numeração por prova quando houver lacunas/duplicatas
--    após a limpeza acima (opcional, mas restaura numeração 1..n).
do $$
declare
  p record;
  n integer := 1;
begin
  for p in
    select distinct prova_id
    from public.app_dorsais
    where prova_id is not null
    order by prova_id
  loop
    n := 1;
    update public.app_dorsais
    set numero = n + (rn - 1)
    from (
      select d.id,
             row_number() over (order by d.numero) as rn
      from public.app_dorsais d
      where d.prova_id = p.prova_id
    ) sub
    where app_dorsais.id = sub.id;
  end loop;
end $$;

-- 5) Tornar prova_id NOT NULL e número positivo
alter table public.app_dorsais
  alter column prova_id set not null;

alter table public.app_dorsais
  drop constraint if exists app_dorsais_numero_positive;
alter table public.app_dorsais
  add constraint app_dorsais_numero_positive check (numero > 0);

-- 6) Constraint única: mesmo número NÃO pode repetir na mesma prova
alter table public.app_dorsais
  drop constraint if exists app_dorsais_prova_numero_unique;
alter table public.app_dorsais
  add constraint app_dorsais_prova_numero_unique unique (prova_id, numero);

-- 7) Índice para consultas por prova
create index if not exists ix_app_dorsais_prova_id
  on public.app_dorsais (prova_id);
