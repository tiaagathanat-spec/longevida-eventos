-- ============================================================
-- Longevida Eventos — Schema inicial completo
-- Rode este arquivo inteiro no Supabase: SQL Editor → New query → Run
-- ============================================================

-- ---------- Extensões ----------
create extension if not exists "pgcrypto";

-- ---------- Tipos enumerados ----------
create type perfil_usuario as enum ('administrador', 'organizacao', 'atleta');
create type evento_status as enum ('rascunho', 'publicado', 'encerrado');
create type inscricao_status as enum ('pendente', 'confirmada', 'cancelada');
create type forma_pagamento as enum ('pix', 'dinheiro', 'cartao', 'cortesia');
create type status_pagamento as enum ('pago', 'pendente', 'cancelado');
create type categoria_imagem as enum ('logo', 'banner', 'kit', 'medalha', 'evento', 'premiacao', 'percurso');
create type visibilidade_imagem as enum ('publica', 'privada');
create type cor_faixa as enum ('azul', 'verde', 'laranja', 'roxo', 'vermelho', 'amarelo');
create type estilo_modalidade as enum ('livre', 'costas', 'peito', 'borboleta', 'medley');

-- ---------- profiles (perfil de acesso, 1:1 com auth.users) ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null,
  perfil perfil_usuario not null default 'atleta',
  telefone text,
  created_at timestamptz not null default now()
);

-- ---------- categorias (globais, reutilizáveis entre eventos) ----------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idade_minima int,
  idade_maxima int,
  descricao text default '',
  created_at timestamptz not null default now()
);

-- ---------- modalidades (globais, reutilizáveis entre eventos) ----------
create table modalidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  estilo estilo_modalidade not null default 'livre',
  distancia_metros int,
  descricao text default '',
  created_at timestamptz not null default now()
);

-- ---------- tipos_prova (globais, reutilizáveis entre eventos) ----------
create table tipos_prova (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  permite_equipe boolean not null default false,
  descricao text default '',
  created_at timestamptz not null default now()
);

-- ---------- eventos ----------
create table eventos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  data date not null,
  local text not null,
  status evento_status not null default 'rascunho',
  criado_por uuid references profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- provas (evento + modalidade + categoria + tipo de prova) ----------
create table provas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  modalidade_id uuid not null references modalidades (id),
  categoria_id uuid not null references categorias (id),
  tipo_prova_id uuid not null references tipos_prova (id),
  horario time,
  observacoes text default '',
  created_at timestamptz not null default now()
);

-- ---------- atletas (perfil restrito, vinculado a um responsável) ----------
create table atletas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento date,
  categoria_id uuid references categorias (id),
  responsavel_id uuid references profiles (id) on delete set null,
  email text,
  telefone text,
  created_at timestamptz not null default now()
);

-- ---------- inscricoes ----------
create table inscricoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references atletas (id) on delete cascade,
  prova_id uuid not null references provas (id) on delete cascade,
  status inscricao_status not null default 'pendente',
  numero_peito text,
  data_inscricao timestamptz not null default now(),
  unique (atleta_id, prova_id)
);

-- ---------- pagamentos (1:1 com inscrição) ----------
create table pagamentos (
  inscricao_id uuid primary key references inscricoes (id) on delete cascade,
  valor numeric(10, 2) not null default 60.00,
  forma_pagamento forma_pagamento,
  status status_pagamento not null default 'pendente',
  data_pagamento date,
  updated_at timestamptz not null default now()
);

-- ---------- resultados (1:1 com inscrição) ----------
create table resultados (
  inscricao_id uuid primary key references inscricoes (id) on delete cascade,
  tempo text not null,
  observacao text,
  registrado_por uuid references profiles (id),
  updated_at timestamptz not null default now()
);

-- ---------- publicacoes de resultado (1:1 com prova) ----------
create table resultados_publicacoes (
  prova_id uuid primary key references provas (id) on delete cascade,
  publicado_em timestamptz not null default now(),
  publicado_por uuid references profiles (id)
);

-- ---------- faixas de numeração (dorsais) por evento + categoria ----------
create table faixas_numeracao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  categoria_id uuid not null references categorias (id),
  numero_inicial int not null,
  numero_final int not null,
  cor cor_faixa not null default 'azul',
  unique (evento_id, categoria_id)
);

-- ---------- dorsais atribuídos (1:1 com inscrição) ----------
create table dorsais (
  inscricao_id uuid primary key references inscricoes (id) on delete cascade,
  numero int not null,
  medalha_entregue boolean not null default false,
  alimentacao_entregue boolean not null default false,
  atribuido_em timestamptz not null default now()
);

-- ---------- galeria de imagens por evento ----------
create table galeria_imagens (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  categoria categoria_imagem not null,
  nome text not null,
  storage_path text not null, -- caminho no bucket "galeria": {evento_id}/{categoria}/{arquivo}
  visibilidade visibilidade_imagem not null default 'privada',
  enviado_por uuid references profiles (id),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Funções auxiliares para as políticas de RLS
-- ============================================================
create or replace function meu_perfil()
returns perfil_usuario
language sql stable security definer
as $$
  select perfil from profiles where id = auth.uid();
$$;

create or replace function sou_admin()
returns boolean language sql stable security definer as $$
  select meu_perfil() = 'administrador';
$$;

create or replace function sou_organizacao()
returns boolean language sql stable security definer as $$
  select meu_perfil() in ('administrador', 'organizacao');
$$;

-- ============================================================
-- RLS — habilitar em todas as tabelas
-- ============================================================
alter table profiles enable row level security;
alter table categorias enable row level security;
alter table modalidades enable row level security;
alter table tipos_prova enable row level security;
alter table eventos enable row level security;
alter table provas enable row level security;
alter table atletas enable row level security;
alter table inscricoes enable row level security;
alter table pagamentos enable row level security;
alter table resultados enable row level security;
alter table resultados_publicacoes enable row level security;
alter table faixas_numeracao enable row level security;
alter table dorsais enable row level security;
alter table galeria_imagens enable row level security;

-- profiles: cada um vê/edita o próprio; admin vê todos
create policy "profiles_select_own_or_admin" on profiles for select
  using (id = auth.uid() or sou_admin());
create policy "profiles_update_own" on profiles for update
  using (id = auth.uid());
create policy "profiles_insert_own" on profiles for insert
  with check (id = auth.uid());

-- categorias / modalidades / tipos_prova: leitura pública, escrita só admin
create policy "categorias_select_all" on categorias for select using (true);
create policy "categorias_admin_write" on categorias for all using (sou_admin()) with check (sou_admin());
create policy "modalidades_select_all" on modalidades for select using (true);
create policy "modalidades_admin_write" on modalidades for all using (sou_admin()) with check (sou_admin());
create policy "tipos_prova_select_all" on tipos_prova for select using (true);
create policy "tipos_prova_admin_write" on tipos_prova for all using (sou_admin()) with check (sou_admin());

-- eventos: público vê só publicados; admin/organização veem tudo; só admin escreve
create policy "eventos_select_publicos" on eventos for select
  using (status = 'publicado' or sou_organizacao());
create policy "eventos_admin_write" on eventos for all using (sou_admin()) with check (sou_admin());

-- provas: segue a visibilidade do evento
create policy "provas_select" on provas for select
  using (exists (select 1 from eventos e where e.id = evento_id and (e.status = 'publicado' or sou_organizacao())));
create policy "provas_admin_write" on provas for all using (sou_admin()) with check (sou_admin());

-- atletas: responsável vê/edita os próprios; admin/organização veem todos
create policy "atletas_select" on atletas for select
  using (responsavel_id = auth.uid() or sou_organizacao());
create policy "atletas_insert_own" on atletas for insert
  with check (responsavel_id = auth.uid() or sou_admin());
create policy "atletas_update_own_or_admin" on atletas for update
  using (responsavel_id = auth.uid() or sou_admin());
create policy "atletas_delete_admin" on atletas for delete using (sou_admin());

-- inscricoes: responsável do atleta vê/gerencia as próprias; admin/organização veem todas
create policy "inscricoes_select" on inscricoes for select
  using (
    sou_organizacao()
    or exists (select 1 from atletas a where a.id = atleta_id and a.responsavel_id = auth.uid())
  );
create policy "inscricoes_insert" on inscricoes for insert
  with check (
    sou_admin()
    or exists (select 1 from atletas a where a.id = atleta_id and a.responsavel_id = auth.uid())
  );
create policy "inscricoes_update" on inscricoes for update
  using (
    sou_organizacao()
    or exists (select 1 from atletas a where a.id = atleta_id and a.responsavel_id = auth.uid())
  );
create policy "inscricoes_delete_admin" on inscricoes for delete using (sou_admin());

-- pagamentos: só admin/organização (financeiro não é exposto ao atleta diretamente)
create policy "pagamentos_admin_org" on pagamentos for all
  using (sou_organizacao()) with check (sou_admin());

-- resultados: admin/organização sempre; atleta só lê resultado de prova PUBLICADA
create policy "resultados_select" on resultados for select
  using (
    sou_organizacao()
    or exists (
      select 1 from inscricoes i
      join atletas a on a.id = i.atleta_id
      join resultados_publicacoes p on p.prova_id = i.prova_id
      where i.id = inscricao_id and a.responsavel_id = auth.uid()
    )
  );
create policy "resultados_write_org" on resultados for all
  using (sou_organizacao()) with check (sou_organizacao());

-- resultados_publicacoes: leitura pública (é o que controla o que o atleta vê); escrita admin
create policy "publicacoes_select_all" on resultados_publicacoes for select using (true);
create policy "publicacoes_admin_write" on resultados_publicacoes for all
  using (sou_admin()) with check (sou_admin());

-- faixas_numeracao / dorsais: admin/organização
create policy "faixas_admin" on faixas_numeracao for all using (sou_admin()) with check (sou_admin());
create policy "dorsais_org" on dorsais for all using (sou_organizacao()) with check (sou_organizacao());

-- galeria: pública só o que está marcado como pública; admin vê e escreve tudo
create policy "galeria_select" on galeria_imagens for select
  using (visibilidade = 'publica' or sou_admin());
create policy "galeria_admin_write" on galeria_imagens for all using (sou_admin()) with check (sou_admin());

-- ============================================================
-- Trigger: cria a linha em profiles automaticamente no cadastro (auth.users)
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, nome, email, perfil)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', new.email), new.email, 'atleta');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- Storage: bucket da Galeria (privado por padrão; leitura via signed URL
-- ou política pública para arquivos marcados como públicos na aplicação)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;
