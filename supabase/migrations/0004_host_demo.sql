-- Longevida Eventos — Host de demonstração
-- ------------------------------------------------------------------
-- Garante que o usuário de teste (tiaagathanat@gmail.com) tenha acesso
-- a todas as áreas após cadastrar/entrar:
--   * usuarios.tipo_conta = 'staff'      -> login cai na área interna
--   * organizacao_usuarios papel 'administrador' na organização
--     "Espaço Longevida"                 -> rota /admin/dashboard
-- O Portal do Atleta continua acessível pelo trocador de perfil dentro
-- do próprio sistema (componente TrocadorDePerfil).
--
-- Substitui a função original do 0002 adicionando o vínculo do host; o
-- comportamento dos demais usuários é preservado (tipo_conta vem de
-- raw_user_meta_data->>'tipo_conta', com fallback para 'atleta').
-- ------------------------------------------------------------------

create or replace function public.fn_criar_usuario_apos_signup()
returns trigger
language plpgsql
security definer
as $$
declare
  v_org_id uuid;
begin
  insert into public.usuarios (id, nome, email, tipo_conta)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    new.email,
    case
      when new.email = 'tiaagathanat@gmail.com' then 'staff'::public.tipo_conta_usuario
      else coalesce(
        nullif(new.raw_user_meta_data ->> 'tipo_conta', '')::public.tipo_conta_usuario,
        'atleta'
      )
    end
  )
  on conflict (id) do nothing;

  -- Host: garante a organização demo e vincula como administrador.
  if new.email = 'tiaagathanat@gmail.com' then
    if not exists (select 1 from public.organizacoes where nome = 'Espaço Longevida') then
      insert into public.organizacoes (nome, descricao)
      values ('Espaço Longevida', 'Organização principal dos eventos esportivos.');
    end if;

    select id into v_org_id
    from public.organizacoes
    where nome = 'Espaço Longevida'
    limit 1;

    insert into public.organizacao_usuarios (organizacao_id, usuario_id, papel)
    values (v_org_id, new.id, 'administrador')
    on conflict (organizacao_id, usuario_id) do nothing;
  end if;

  return new;
end;
$$;
