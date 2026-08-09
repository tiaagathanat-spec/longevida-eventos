-- ============================================================
-- Longevida Eventos — Dados completos do cadastro de primeiro acesso
-- Execute no SQL Editor do Supabase (projeto atual).
-- Complementa a migration 0002 com colunas para endereço, contato de
-- emergência e observações de saúde/restrições.
-- ============================================================

-- Perfil de usuário (atleta ou responsável): dados completos
-- coletados na tela de Cadastro (primeiro acesso).
alter table public.usuarios
  add column if not exists data_nascimento date,
  add column if not exists genero genero_atleta,
  add column if not exists cpf text,
  add column if not exists endereco text,
  add column if not exists contato_emergencia_nome text,
  add column if not exists contato_emergencia_telefone text,
  add column if not exists observacoes_saude text;

-- Atleta: dados do cadastro + responsável (se menor de idade) e
-- observações de saúde por atleta.
alter table public.atletas
  add column if not exists cpf text,
  add column if not exists endereco text,
  add column if not exists contato_emergencia_nome text,
  add column if not exists contato_emergencia_telefone text,
  add column if not exists observacoes_saude text,
  add column if not exists responsavel_nome text,
  add column if not exists responsavel_telefone text;

-- Atualiza o trigger de perfil para preencher dados básicos do signUp
-- (opcional — o app também salva em memória no demo).
create or replace function fn_criar_usuario_apos_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into usuarios (id, nome, email, tipo_conta, data_nascimento, genero, cpf, telefone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'tipo_conta', '')::tipo_conta_usuario,
      'atleta'
    ),
    nullif(new.raw_user_meta_data ->> 'data_nascimento', '')::date,
    nullif(new.raw_user_meta_data ->> 'genero', '')::genero_atleta,
    nullif(new.raw_user_meta_data ->> 'cpf', ''),
    nullif(new.raw_user_meta_data ->> 'telefone', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

grant execute on function public.fn_criar_usuario_apos_signup() to authenticated, service_role;
