-- ============================================================
-- Longevida Eventos — 0016: CORREÇÃO da inscrição de atleta/responsável
--
-- SINTOMA RELATADO (confirmado em produção):
--   * "Permissão negada ao salvar em app_inscricoes. Entre com um perfil
--     com acesso a este módulo." ao cadastrar um aluno/atleta.
--   * O administrador não enxerga a inscrição (porque ela nunca é
--     persistida — o INSERT é barrado pelo RLS e fica só em memória).
--
-- DIAGNÓSTICO (reproduzido contra a base real, via token de usuário):
--   * `app_sou_dono_atleta_nome(atleta_nome)` retorna TRUE (RPC) para o
--     próprio atleta e para o responsável — a regra de "dono" está OK.
--   * Mesmo assim, o INSERT (upsert) em `app_inscricoes` é rejeitado com
--     42501 ("new row violates row-level security policy").
--   * O admin enxerga as provas/eventos e `app_pode_*` = true, porém o
--     SELECT de `app_inscricoes` vem vazio — pois só existem linhas de
--     evento fantasma "1" e nenhuma inscrição real foi jamais persistida.
--   * Conclusão: a(s) política(s) de INSERT efetivamente aplicada(s) em
--     `app_inscricoes` está(ão) bloqueando a inserção de DONO legítimo —
--     divergência da base em relação ao que está documentado nas 0009/0010
--     (política extra/restritiva ou versão divergente).
--
-- CORREÇÃO (aditiva e idempotente; sem apagar linhas):
--   1) `app_usuario_atual_nome()` passa a replicar o fallback do Portal
--      (lib/mock/sessao.tsx): usuarios.nome → raw_user_meta_data (nome/
--      full_name/name) → prefixo do e-mail. Assim o casamento de
--      "responsável" e de "atleta = usuário" fica confiável mesmo quando
--      usuarios.nome está vazio.
--   2) Remove TODAS as políticas RLS de `app_inscricoes` (qualquer nome,
--      inclusive quaisquer variantes divergentes em produção) e recria o
--      conjunto correto: staff com módulo 'inscritos' OR dono (atleta/
--      responsável) OR leitura da cronometragem, exatamente como desenhado
--      na 0010.
-- ============================================================


-- ------------------------------------------------------------
-- 1. HARDENING DE `app_usuario_atual_nome` (fallback igual ao Portal)
-- ------------------------------------------------------------
-- Substitui a versão da 0009 (que lia somente usuarios.nome). Agora:
--   1) usuarios.nome (fonte de verdade);
--   2) auth.users.raw_user_meta_data (nome/full_name/name);
--   3) prefixo do e-mail (antes do @).
-- Só AMPLIA o reconhecimento de "dono"; nunca restringe o acesso.
create or replace function public.app_usuario_atual_nome()
returns text language sql stable security definer
set search_path = '' as $$
  select coalesce(
    nullif((select nome from public.usuarios where id = auth.uid()), ''),
    nullif(
      coalesce(
        auth.jwt() -> 'user_metadata' ->> 'nome',
        auth.jwt() -> 'user_metadata' ->> 'full_name',
        auth.jwt() -> 'user_metadata' ->> 'name'
      ),
      ''
    ),
    split_part(coalesce(auth.email(), ''), '@', 1)
  );
$$;

revoke all on function public.app_usuario_atual_nome() from public;
grant execute on function public.app_usuario_atual_nome() to anon, authenticated;


-- ------------------------------------------------------------
-- 2. remove TODAS as políticas RLS de app_inscricoes (qualquer nome)
-- ------------------------------------------------------------
do $$
declare
  rec record;
begin
  for rec in
    select policyname
    from pg_policies
    where schemaname = 'public'
      and tablename = 'app_inscricoes'
  loop
    execute format('drop policy if exists %I on public.app_inscricoes', rec.policyname);
  end loop;
end $$;


-- ------------------------------------------------------------
-- 3. recria o conjunto correto de políticas para app_inscricoes
--    (mesma regra desenhada na 0010: módulo 'inscritos' OR dono OR
--     leitura da cronometragem)
-- ------------------------------------------------------------
create policy app_inscricoes_select on public.app_inscricoes
  for select using (
    app_pode_modulo_evento(evento_id, 'inscritos')
    or app_pode_ler_inscricoes_cronometragem(evento_id)
    or app_sou_dono_inscricao(id)
  );
create policy app_inscricoes_insert on public.app_inscricoes
  for insert with check (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_atleta_nome(atleta_nome)
  );
create policy app_inscricoes_update on public.app_inscricoes
  for update
  using (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_inscricao(id)
  )
  with check (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_atleta_nome(atleta_nome)
  );
create policy app_inscricoes_delete on public.app_inscricoes
  for delete using (
    app_pode_escrever_modulo_evento(evento_id, 'inscritos')
    or app_sou_dono_inscricao(id)
  );
