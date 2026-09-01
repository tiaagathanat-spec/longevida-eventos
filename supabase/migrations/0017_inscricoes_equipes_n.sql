-- ============================================================
-- Longevida Eventos — 0017: Inscrições em equipe (dupla, trio,
-- quarteto e demais formações com N integrantes)
--
-- OBJETIVO:
--   Permitir inscrever provas disputadas em equipe com N
--   participantes (dupla = 2, quarteto = 4, etc.) e persistir todos
--   os nomes dos integrantes, para que a informação apareça na
--   inscrição vista pelo admin/operação. A prova "Aquatlhon Family"
--   usa o tipo "Revezamento Dupla" (permite_equipe = true) e hoje só
--   se capturava 1 parceiro — a formação era detectada por nome
--   ("dupla") e não pelo número de integrantes.
--
-- Mudanças (aditivas e idempotentes):
--   * app_inscricoes.atleta_nome_3 e atleta_nome_4 (text, NULL):
--     complementam atleta_nome (principal) e atleta_nome_2; cobre
--     formações de até 4 integrantes (dupla, trio, quarteto).
--     A inscrição continua identificada por `atleta_nome`
--     (participante principal), usado pelas regras de dono/RLS das
--     0009/0010 — nada muda no RLS.
--   * app_tipos_prova.integrantes (int, default 1): quantos
--     participantes cada formação exige. Usado pelas telas de
--     inscrição (quantos nomes coletar) e pela administração.
--     Backfill por padrão de nome a partir dos tipos já existentes.
--
-- SEM ALTERAÇÃO nas políticas RLS das 0009/0010: o dono continua
-- sendo o `atleta_nome`; as colunas novas são cobertas pelos grants
-- por tabela existentes (grants são por tabela, não por coluna).
-- ============================================================

alter table public.app_inscricoes
  add column if not exists atleta_nome_3 text,
  add column if not exists atleta_nome_4 text;

alter table public.app_tipos_prova
  add column if not exists integrantes int not null default 1;

-- Quarteto/4 integrantes primeiro (para não ser sobrescrito).
update public.app_tipos_prova
  set integrantes = 4
  where lower(nome) like '%quarteto%' or lower(nome) like '%quarto%';

-- Dupla/2 integrantes.
update public.app_tipos_prova
  set integrantes = 2
  where lower(nome) like '%dupla%' or lower(nome) like '%duplo%';

-- Demais formações em equipe sem tamanho explícito: assume 2.
update public.app_tipos_prova
  set integrantes = 2
  where integrantes = 1 and permite_equipe = true;
