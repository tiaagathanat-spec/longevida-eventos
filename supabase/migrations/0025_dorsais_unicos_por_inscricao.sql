-- ============================================================
-- Longevida Eventos - 0025: 1 dorsal por (prova, inscricao)
--
-- OBJETIVO:
--   Eliminar a causa raiz do consumo excessivo / loop de gravações:
--   o banco permitia VÁRIOS dorsais para a MESMA inscrição na MESMA
--   prova (não havia UNIQUE(prova_id, inscricao_id)). Isso fazia o
--   auto-assign (dorsais-auto-assign.tsx) re-renumerar duplicatas a
--   cada mudança de store, disparando rajadas de POST em app_dorsais
--   e em app_inscricoes (espelho numero_peito).
--
-- SEGURO / IDEMPOTENTE (pode rodar mais de uma vez):
--   * Não apaga dado sem rastro: todo dorsal removido é copiado para a
--     tabela `_backup_dorsais_0025` ANTES do DELETE.
--   * Mantém 1 dorsal por (prova_id, inscricao_id), preferindo a linha
--     cujo numero coincide com o espelho numero_peito da inscrição
--     (mais confiável / já usado nas telas); senão, o dorsal de menor
--     numero (mais antigo). NÃO renumera nada nem altera QR.
--   * Cast seguro: numero_peito só é comparado quando for numérico
--     inteiro (regexp ~ '^[0-9]+$'), evitando erro de ::int.
--   * Adiciona UNIQUE(prova_id, inscricao_id) para bloquear novas
--     duplicatas.
-- ============================================================

-- 1) Backup completo da tabela (snapshot para rollback/auditoria)
drop table if exists _backup_dorsais_0025;
create table _backup_dorsais_0025 as
select * from public.app_dorsais;

-- 2) Remove APENAS as linhas redundantes (duplicatas), conservando por
--    (prova_id, inscricao_id) a linha preferida, na ordem:
--      a) numero = numero_peito (espelho) quando a inscrição tiver
--         espelho numérico;
--      b) senão, o menor numero (dorsal mais antigo).
--    As linhas removidas já estão todas no backup acima.
delete from public.app_dorsais d
where d.id not in (
  select id
  from (
    select d.id,
           row_number() over (
             partition by d.prova_id, d.inscricao_id
             order by
               case
                 when i.numero_peito ~ '^[0-9]+$'
                  and (i.numero_peito)::int = d.numero
                 then 0
                 else 1
               end,
               d.numero asc,
               d.id asc
           ) as rn
    from public.app_dorsais d
    left join public.app_inscricoes i on i.id = d.inscricao_id
  ) t
  where t.rn = 1
);

-- 3) Bloqueio definitivo: 1 dorsal por inscrição dentro da mesma prova.
--    (UNIQUE(prova_id, inscricao_id))
alter table public.app_dorsais
  drop constraint if exists app_dorsais_prova_inscricao_uniq;
alter table public.app_dorsais
  add constraint app_dorsais_prova_inscricao_uniq
  unique (prova_id, inscricao_id);
