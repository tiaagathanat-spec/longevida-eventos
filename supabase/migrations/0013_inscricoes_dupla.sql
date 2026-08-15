-- ============================================================
-- Longevida Eventos — 0013: Inscrições em dupla
--
-- OBJETIVO (item 7 da tarefa "FINALIZAR LONGevida EVENTOS"):
--   Inscrição de provas em DUPLA (2 participantes por inscrição)
--   persistindo no Supabase.
--
-- Mudanças (aditivas e idempotentes):
--   * app_inscricoes.atleta_nome_2 (text, NULL): nome do 2º participante.
--     A inscrição continua identificada por `atleta_nome` (participante
--     principal, usado pelas regras de dono/RLS da 0009/0010 — nada muda).
--   * Tipo de prova "Dupla" em app_tipos_prova (catálogo público, já
--     coberto pelo grant/RLS de catálogo da 0009; sem nova política).
--
-- SEM ALTERAÇÃO nas políticas RLS das 0009/0010: o novo tipo usa
-- `permite_equipe = true` e o insert de dupla passa pela mesma política
-- de `app_inscricoes` (dono via atleta_nome). A coluna nova é coberta
-- pelo grant de tabela existente (authenticated) — grants são por
-- tabela, não por coluna.
-- ============================================================

alter table public.app_inscricoes
  add column if not exists atleta_nome_2 text;

insert into public.app_tipos_prova (id, nome, permite_equipe, descricao) values
  ('dupla', 'Dupla', true, 'Prova disputada em duplas (2 participantes por inscrição).')
on conflict (id) do nothing;
