-- ============================================================
-- Longevida Eventos - 0022: Etapas/Percursos por prova
-- (Módulo Relatórios Operacionais)
--
-- OBJETIVO:
--   Permitir que um relatório operacional GENÉRICO (qualquer evento
--   e qualquer prova) saiba o que cada participante faz numa prova,
--   com função, percurso/etapa e distância correspondente — sem
--   regras fixas de código (nada de "se o evento é Aquathlon então...").
--
--   Em provas INDIVIDUAIS sem etapas configuradas, o relatório deriva
--   a informação da Modalidade da prova (nome + distância_metros).
--   Em provas EM EQUIPE/DUPLA, as etapas configuradas aqui descrevem
--   cada participante (posição → função, percurso, distância).
--
-- Mudanças (aditivas e idempotentes):
--   * app_prova_etapas: etapas/percurso de uma prova.
--       - prova_id          → app_provas (FK, cascade na exclusão)
--       - posicao           → que participante da inscrição executa
--                             (1 = atleta principal/nadador, 2 = 2º
--                             integrante, ...). Em prova individual
--                             a posição é sempre 1.
--       - funcao            → papel do participante na etapa
--                             (ex.: "Nadador", "Corredor", "Atleta").
--       - nome              → nome do percurso/etapa (ex.: "Natação",
--                             "Corrida").
--       - ordem             → ordem de exibição das etapas.
--       - distancia_metros  → distância da etapa (opcional; NULL ou 0
--                             = "a definir"/sem informação).
--       - unidade           → 'm' ou 'km' (apenas para formatação).
--       - descricao         → observações/livre.
--   * Seed conservador: para a prova cuja modalidade se chama
--     "Aquathlon Family" (evento Aquathlon real), registra as duas
--     etapas da dupla (Natação pelo participante 1 e Corrida de 3km
--     pelo participante 2). Não cria dados fictícios: espelha a
--     realidade do evento já cadastrado.
-- ============================================================

-- 1) Tabela de etapas por prova
create table if not exists public.app_prova_etapas (
  id text primary key,
  prova_id text not null,
  posicao int not null default 1,
  funcao text not null default '',
  nome text not null default '',
  ordem int not null default 0,
  distancia_metros numeric,
  unidade text not null default 'm',
  descricao text not null default ''
);

-- 2) FK: excluir prova exclui suas etapas em cascata
alter table public.app_prova_etapas
  drop constraint if exists app_prova_etapas_prova_id_fkey;
alter table public.app_prova_etapas
  add constraint app_prova_etapas_prova_id_fkey
  foreign key (prova_id) references public.app_provas (id) on delete cascade;

-- 3) Índice para consultas por prova
create index if not exists ix_app_prova_etapas_prova_id
  on public.app_prova_etapas (prova_id);

-- 4) RLS idempotente (mesmo padrão permissivo-demo das demais app_*)
alter table public.app_prova_etapas enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'app_prova_etapas'
      and policyname = 'app_prova_etapas_todos'
  ) then
    create policy app_prova_etapas_todos
      on public.app_prova_etapas
      for all using (true) with check (true);
  end if;
end $$;

-- 5) Grants (anon/authenticated como as demais; service_role mantém pleno)
grant select, insert, update, delete on public.app_prova_etapas to anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on public.app_prova_etapas to service_role;

-- 6) Seed conservador: etapas da dupla "Aquathlon Family" (real).
--    Natação pelo participante principal (posição 1) e Corrida de 3km
--    pelo 2º integrante (posição 2). A distância da natação não está
--    definida na base (varia por faixa etária), então fica NULL = "a
--    definir", editável pela tela de provas.
--    Requisitos para casar: prova da modalidade Family que seja EM
--    EQUIPE (tipo permite_equipe) na categoria "Family" — evita provas
--    individuais órfãs que porventura usem o nome "Aquathlon Family".
do $$
declare
  v_prova_id text;
begin
  select p.id into v_prova_id
  from public.app_provas p
  join public.app_modalidades m on m.id = p.modalidade_id
  join public.app_categorias cat on cat.id = p.categoria_id
  join public.app_tipos_prova t on t.id = p.tipo_prova_id
  where lower(m.nome) in (lower('Aquatlhon Family'), lower('Aquathlon Family'))
    and lower(cat.nome) = 'family'
    and t.permite_equipe = true
  limit 1;

  if v_prova_id is not null and not exists (
    select 1 from public.app_prova_etapas where prova_id = v_prova_id
  ) then
    insert into public.app_prova_etapas
      (id, prova_id, posicao, funcao, nome, ordem, distancia_metros, unidade, descricao)
    values
      (gen_random_uuid()::text, v_prova_id, 1, 'Nadador', 'Natação', 0, null, 'm', 'Distância de acordo com a faixa etária.'),
      (gen_random_uuid()::text, v_prova_id, 2, 'Corredor', 'Corrida', 1, 3000, 'km', 'Corrida de 3 km.');
  end if;

  -- Configuração nossa (etapas criadas antes de a unidade 'km' existir):
  -- percursos de corrida em distâncias > 0 são exibidos em quilômetros.
  update public.app_prova_etapas
    set unidade = 'km'
    where unidade = 'm'
      and distancia_metros is not null
      and distancia_metros > 0
      and lower(nome) in ('corrida', 'corrida de rua');
end $$;