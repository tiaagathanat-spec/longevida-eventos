-- ============================================================
-- Longevida Eventos — Schema de produção completo
-- Execute do início ao fim no SQL Editor do Supabase, em um
-- projeto novo. Não depende de nenhuma tabela pré-existente.
-- ============================================================


-- ============================================================
-- 1. EXTENSÕES
-- ============================================================
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "btree_gist"; -- necessária para o EXCLUDE de faixas_numeracao


-- ============================================================
-- 2. TIPOS ENUMERADOS
-- ============================================================
create type tipo_conta_usuario   as enum ('staff', 'responsavel', 'atleta');
create type papel_organizacao    as enum ('administrador', 'organizador', 'cronometragem', 'financeiro', 'leitura');
create type evento_status        as enum ('rascunho', 'publicado', 'encerrado');
create type genero_atleta        as enum ('masculino', 'feminino', 'outro');
create type genero_categoria     as enum ('masculino', 'feminino', 'livre');
create type sexo_classificacao   as enum ('masculino', 'feminino');
create type tipo_segmento_parcial as enum ('natacao', 'ciclismo', 'corrida', 'transicao', 'outro');
create type inscricao_status     as enum ('pendente', 'confirmada', 'cancelada');
create type forma_pagamento      as enum ('pix', 'dinheiro', 'cartao', 'cortesia');
create type pagamento_status     as enum ('pago', 'pendente', 'cancelado');
create type categoria_imagem     as enum ('logo', 'banner', 'kit', 'medalha', 'evento', 'premiacao', 'percurso');
create type visibilidade_imagem  as enum ('publica', 'privada');
create type origem_importacao    as enum ('manual', 'csv', 'chip', 'api');
create type status_importacao    as enum ('pendente', 'processada', 'erro_parcial', 'erro');
create type status_item_importacao as enum ('pendente', 'vinculado', 'ignorado', 'erro');
create type resultado_status     as enum ('finalizado', 'dnf', 'dns', 'dsq');
create type classificacao_escopo as enum ('geral', 'categoria', 'sexo', 'faixa_etaria', 'equipe');
create type criterio_ordenacao   as enum ('menor_tempo_ms', 'maior_pontuacao', 'menor_pontuacao');
create type certificado_tipo     as enum ('participacao', 'colocacao');
create type cota_patrocinio      as enum ('ouro', 'prata', 'bronze', 'apoio');


-- ============================================================
-- 3. TABELAS
-- ============================================================

-- ---------- Organizações (multi-tenant) ----------
create table organizacoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  documento text,
  contato_email text,
  contato_telefone text,
  created_at timestamptz not null default now()
);

-- ---------- Usuários (perfil de aplicação; auth fica no Supabase Auth) ----------
create table usuarios (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  email text not null unique,
  tipo_conta tipo_conta_usuario not null default 'atleta',
  telefone text,
  criado_em timestamptz not null default now()
);

-- ---------- Vínculo usuário <-> organização (N:N, com papel por vínculo) ----------
create table organizacao_usuarios (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes (id) on delete cascade,
  usuario_id uuid not null references usuarios (id) on delete cascade,
  papel papel_organizacao not null default 'leitura',
  vinculado_em timestamptz not null default now(),
  unique (organizacao_id, usuario_id)
);

-- ---------- Catálogos globais reutilizáveis ----------
create table categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idade_minima int,
  idade_maxima int,
  genero genero_categoria not null default 'livre',
  descricao text default '',
  created_at timestamptz not null default now()
);

create table faixas_etarias (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  idade_minima int not null,
  idade_maxima int not null,
  check (idade_minima <= idade_maxima)
);

create table modalidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default '',
  created_at timestamptz not null default now()
);

create table tipos_prova (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  permite_equipe boolean not null default false,
  descricao text default '',
  created_at timestamptz not null default now()
);

create table tipos_entrega (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text default ''
);

create table patrocinadores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  logo_url text,
  site_url text,
  descricao text default ''
);

-- ---------- Equipes ----------
create table equipes (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid references organizacoes (id) on delete set null,
  nome text not null,
  sigla text
);

-- ---------- Séries de evento / Edições ----------
create table eventos_serie (
  id uuid primary key default gen_random_uuid(),
  organizacao_id uuid not null references organizacoes (id) on delete restrict,
  nome text not null,
  descricao text default '',
  logo_padrao_url text
);

create table eventos (
  id uuid primary key default gen_random_uuid(),
  serie_id uuid not null references eventos_serie (id) on delete cascade,
  criado_por uuid references usuarios (id) on delete set null,
  edicao text not null,
  data_inicio date not null,
  data_fim date,
  local text not null,
  status evento_status not null default 'rascunho',
  versao_atual int not null default 0,
  criado_em timestamptz not null default now(),
  unique (serie_id, edicao)
);

create table configuracoes_evento (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique references eventos (id) on delete cascade,
  permite_inscricao_ultima_hora boolean not null default false,
  exige_atestado_medico boolean not null default false,
  exige_termo_responsabilidade boolean not null default true,
  idade_minima_padrao int,
  regulamento_url text,
  politica_cancelamento text default ''
);

-- ---------- Versionamento de eventos/configurações ----------
create table eventos_versoes (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  versao int not null,
  snapshot_evento jsonb not null,
  regulamento_url text,
  motivo_alteracao text,
  alterado_por uuid references usuarios (id) on delete set null,
  alterado_em timestamptz not null default now(),
  unique (evento_id, versao)
);

create table lotes_inscricao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  nome text not null,
  preco numeric(10, 2) not null default 0,
  data_inicio date,
  data_fim date,
  vagas_maximas int
);

-- ---------- Provas e parciais ----------
create table provas (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  modalidade_id uuid not null references modalidades (id) on delete restrict,
  categoria_id uuid not null references categorias (id) on delete restrict,
  tipo_prova_id uuid not null references tipos_prova (id) on delete restrict,
  nome text not null,
  distancia numeric(10, 3),
  unidade_distancia text,
  horario time,
  observacoes text default '',
  check (distancia is null or distancia >= 0)
);

create table prova_parciais (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references provas (id) on delete cascade,
  nome text not null,
  tipo_segmento tipo_segmento_parcial not null default 'outro',
  ordem int not null,
  distancia numeric(10, 3),
  unidade_distancia text,
  unique (prova_id, ordem),
  check (ordem > 0),
  check (distancia is null or distancia >= 0)
);

-- ---------- Pessoas: atletas e responsáveis ----------
create table atletas (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid unique references usuarios (id) on delete set null,
  categoria_padrao_id uuid references categorias (id) on delete set null,
  nome text not null,
  data_nascimento date,
  genero genero_atleta,
  documento text,
  telefone text,
  email text,
  criado_em timestamptz not null default now()
);

create table responsavel_atleta (
  id uuid primary key default gen_random_uuid(),
  responsavel_usuario_id uuid not null references usuarios (id) on delete cascade,
  atleta_id uuid not null references atletas (id) on delete cascade,
  parentesco text,
  unique (responsavel_usuario_id, atleta_id)
);

-- ---------- Inscrições / Financeiro ----------
create table inscricoes (
  id uuid primary key default gen_random_uuid(),
  atleta_id uuid not null references atletas (id) on delete restrict,
  prova_id uuid not null references provas (id) on delete cascade,
  lote_inscricao_id uuid references lotes_inscricao (id) on delete set null,
  equipe_id uuid references equipes (id) on delete set null,
  status inscricao_status not null default 'pendente',
  numero_peito text,
  data_inscricao timestamptz not null default now(),
  unique (atleta_id, prova_id)
);

create table pagamentos (
  id uuid primary key default gen_random_uuid(),
  pago_por uuid references usuarios (id) on delete set null,
  valor_total numeric(10, 2) not null default 0,
  forma_pagamento forma_pagamento,
  status pagamento_status not null default 'pendente',
  data_pagamento date,
  check (valor_total >= 0)
);

create table itens_pagamento (
  id uuid primary key default gen_random_uuid(),
  pagamento_id uuid not null references pagamentos (id) on delete cascade,
  inscricao_id uuid not null references inscricoes (id) on delete cascade,
  valor numeric(10, 2) not null,
  check (valor >= 0)
);

-- ---------- Dorsais / Check-in / Entregas ----------
create table faixas_numeracao (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  categoria_id uuid not null references categorias (id) on delete restrict,
  numero_inicial int not null,
  numero_final int not null,
  cor text not null default 'azul',
  unique (evento_id, categoria_id),
  check (numero_inicial <= numero_final),
  -- Impede sobreposição de intervalos numéricos dentro do mesmo evento
  -- (ex: não permite 001–100 e 080–150 simultaneamente).
  exclude using gist (
    evento_id with =,
    int4range(numero_inicial, numero_final, '[]') with &&
  )
);

create table dorsais (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null unique references inscricoes (id) on delete cascade,
  evento_id uuid not null references eventos (id) on delete cascade,
  numero int not null,
  atribuido_em timestamptz not null default now(),
  unique (evento_id, numero)
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null unique references inscricoes (id) on delete cascade,
  confirmado_em timestamptz not null default now(),
  confirmado_por uuid references usuarios (id) on delete set null
);

create table entregas (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references inscricoes (id) on delete cascade,
  tipo_entrega_id uuid not null references tipos_entrega (id) on delete restrict,
  entregue boolean not null default false,
  entregue_em timestamptz,
  registrado_por uuid references usuarios (id) on delete set null,
  unique (inscricao_id, tipo_entrega_id)
);

-- ---------- Cronometragem / Importação ----------
create table importacoes_cronometragem (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  prova_id uuid references provas (id) on delete set null,
  origem origem_importacao not null default 'manual',
  status status_importacao not null default 'pendente',
  arquivo_url text,
  importado_por uuid references usuarios (id) on delete set null,
  importado_em timestamptz not null default now(),
  processado_em timestamptz
);

create table importacoes_cronometragem_itens (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references importacoes_cronometragem (id) on delete cascade,
  prova_parcial_id uuid references prova_parciais (id) on delete set null,
  inscricao_id uuid references inscricoes (id) on delete set null,
  numero_peito_bruto text,
  tempo_ms_bruto bigint,
  status status_item_importacao not null default 'pendente',
  mensagem_erro text,
  check (tempo_ms_bruto is null or tempo_ms_bruto >= 0)
);

-- ---------- Resultados ----------
-- Representa o resultado final oficial de uma inscrição. Pode existir
-- independentemente de a prova possuir parciais configuradas. Quando
-- houver resultado registrado, tempo_ms representa o tempo final
-- oficial e nunca é calculado automaticamente pela soma das parciais.
create table resultados (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null unique references inscricoes (id) on delete cascade,
  tempo_ms bigint,
  pontuacao numeric(10, 2),
  status resultado_status not null default 'finalizado',
  observacao text,
  registrado_por uuid references usuarios (id) on delete set null,
  origem_importacao_id uuid references importacoes_cronometragem (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  check (tempo_ms is null or tempo_ms >= 0),
  check (status <> 'finalizado' or tempo_ms is not null or pontuacao is not null)
);

-- tempo_ms aqui é o tempo decorrido EXCLUSIVAMENTE naquela parcial
-- (ex: só a natação, só a T1) — nunca um valor acumulado.
create table resultados_parciais (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references inscricoes (id) on delete cascade,
  prova_parcial_id uuid not null references prova_parciais (id) on delete cascade,
  tempo_ms bigint,
  status resultado_status not null default 'finalizado',
  registrado_por uuid references usuarios (id) on delete set null,
  origem_importacao_id uuid references importacoes_cronometragem (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  unique (inscricao_id, prova_parcial_id),
  check (tempo_ms is null or tempo_ms >= 0)
);

create table resultados_publicacoes (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null unique references provas (id) on delete cascade,
  publicado_em timestamptz not null default now(),
  publicado_por uuid references usuarios (id) on delete set null
);

-- ---------- Classificações (ranking derivado, nunca fonte primária) ----------
create table classificacoes (
  id uuid primary key default gen_random_uuid(),
  prova_id uuid not null references provas (id) on delete cascade,
  escopo classificacao_escopo not null,
  categoria_id uuid references categorias (id) on delete cascade,
  faixa_etaria_id uuid references faixas_etarias (id) on delete cascade,
  equipe_id uuid references equipes (id) on delete cascade,
  sexo sexo_classificacao,
  criterio_ordenacao criterio_ordenacao not null default 'menor_tempo_ms',
  gerada_em timestamptz not null default now(),
  -- Coerência dos filtros com o escopo: só o campo correspondente ao
  -- escopo pode estar preenchido; os demais precisam ser nulos.
  check (
    (escopo = 'geral'        and categoria_id is null     and faixa_etaria_id is null and equipe_id is null and sexo is null) or
    (escopo = 'categoria'    and categoria_id is not null and faixa_etaria_id is null and equipe_id is null and sexo is null) or
    (escopo = 'sexo'         and categoria_id is null     and faixa_etaria_id is null and equipe_id is null and sexo is not null) or
    (escopo = 'faixa_etaria' and categoria_id is null     and faixa_etaria_id is not null and equipe_id is null and sexo is null) or
    (escopo = 'equipe'       and categoria_id is null     and faixa_etaria_id is null and equipe_id is not null and sexo is null)
  )
);

-- Impede duas classificações para a mesma prova + mesmo escopo + mesmos
-- filtros. NULL é tratado como valor comparável via coalesce, porque a
-- maioria dos escopos deixa os outros filtros nulos.
create unique index classificacoes_unica
  on classificacoes (
    prova_id,
    escopo,
    coalesce(categoria_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(faixa_etaria_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(equipe_id, '00000000-0000-0000-0000-000000000000'),
    coalesce(sexo::text, '')
  );

create table classificacao_itens (
  id uuid primary key default gen_random_uuid(),
  classificacao_id uuid not null references classificacoes (id) on delete cascade,
  inscricao_id uuid not null references inscricoes (id) on delete cascade,
  resultado_id uuid not null references resultados (id) on delete cascade,
  colocacao int not null,
  tempo_ms_snapshot bigint,
  pontuacao_snapshot numeric(10, 2),
  status_snapshot resultado_status not null,
  unique (classificacao_id, inscricao_id), -- sem unicidade sobre colocacao: empates são permitidos
  check (colocacao > 0),
  check (tempo_ms_snapshot is null or tempo_ms_snapshot >= 0)
);

-- ---------- Certificados ----------
create table certificados (
  id uuid primary key default gen_random_uuid(),
  inscricao_id uuid not null references inscricoes (id) on delete cascade,
  tipo certificado_tipo not null default 'participacao',
  url_arquivo text,
  codigo_validacao text not null unique,
  emitido_em timestamptz not null default now()
);

-- ---------- Galeria ----------
create table galeria_imagens (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  categoria categoria_imagem not null,
  nome text not null,
  storage_path text not null,
  visibilidade visibilidade_imagem not null default 'privada',
  enviado_por uuid references usuarios (id) on delete set null,
  criado_em timestamptz not null default now()
);

-- ---------- Patrocinadores por evento ----------
create table evento_patrocinadores (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null references eventos (id) on delete cascade,
  patrocinador_id uuid not null references patrocinadores (id) on delete cascade,
  cota cota_patrocinio not null default 'apoio',
  ordem_exibicao int not null default 0,
  unique (evento_id, patrocinador_id)
);

-- ---------- Logs / Auditoria ----------
create table logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios (id) on delete set null,
  acao text not null,
  entidade text not null,
  entidade_id uuid,
  dados_anteriores jsonb,
  dados_novos jsonb,
  criado_em timestamptz not null default now()
);


-- ============================================================
-- 4. FUNÇÕES AUXILIARES DE AUTORIZAÇÃO (multi-organização)
-- ============================================================

-- Organização à qual uma série pertence.
create or replace function fn_serie_organizacao(p_serie_id uuid)
returns uuid language sql stable as $$
  select organizacao_id from eventos_serie where id = p_serie_id;
$$;

-- Organização à qual um evento pertence (via sua série).
create or replace function fn_evento_organizacao(p_evento_id uuid)
returns uuid language sql stable as $$
  select es.organizacao_id
  from eventos e
  join eventos_serie es on es.id = e.serie_id
  where e.id = p_evento_id;
$$;

-- Organização à qual uma prova pertence (via seu evento).
create or replace function fn_prova_organizacao(p_prova_id uuid)
returns uuid language sql stable as $$
  select fn_evento_organizacao(evento_id) from provas where id = p_prova_id;
$$;

-- Organização à qual uma inscrição pertence (via sua prova).
create or replace function fn_inscricao_organizacao(p_inscricao_id uuid)
returns uuid language sql stable as $$
  select fn_prova_organizacao(prova_id) from inscricoes where id = p_inscricao_id;
$$;

-- O usuário autenticado pertence à organização informada, opcionalmente
-- restrito a uma lista de papéis?
create or replace function sou_da_organizacao(p_organizacao_id uuid, p_papeis papel_organizacao[] default null)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from organizacao_usuarios ou
    where ou.usuario_id = auth.uid()
      and ou.organizacao_id = p_organizacao_id
      and (p_papeis is null or ou.papel = any(p_papeis))
  );
$$;

-- Atalho: staff com poder de escrita (admin ou organizador) da organização.
create or replace function sou_staff_escrita(p_organizacao_id uuid)
returns boolean language sql stable as $$
  select sou_da_organizacao(p_organizacao_id, array['administrador', 'organizador']::papel_organizacao[]);
$$;

-- Atalho: qualquer papel vinculado à organização (leitura inclusive).
create or replace function sou_staff_leitura(p_organizacao_id uuid)
returns boolean language sql stable as $$
  select sou_da_organizacao(p_organizacao_id, null);
$$;

-- O usuário autenticado é responsável pelo atleta informado?
create or replace function sou_responsavel_de(p_atleta_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from responsavel_atleta ra
    where ra.atleta_id = p_atleta_id and ra.responsavel_usuario_id = auth.uid()
  );
$$;


-- ============================================================
-- 5. TRIGGERS E FUNÇÕES DE NEGÓCIO
-- ============================================================

-- ---------- 5.1 Derivação automática de DORSAIS.evento_id ----------
-- evento_id nunca é definido pela aplicação: é sempre recalculado a
-- partir de inscricao -> prova -> evento, garantindo que jamais destoe
-- da inscrição vinculada.
create or replace function fn_dorsais_definir_evento()
returns trigger language plpgsql as $$
begin
  select p.evento_id into new.evento_id
  from inscricoes i
  join provas p on p.id = i.prova_id
  where i.id = new.inscricao_id;

  if new.evento_id is null then
    raise exception 'Não foi possível derivar evento_id a partir da inscrição %', new.inscricao_id;
  end if;

  return new;
end;
$$;

create trigger trg_dorsais_definir_evento
  before insert or update on dorsais
  for each row execute function fn_dorsais_definir_evento();


-- ---------- 5.2 Versionamento de eventos/configurações ----------
-- Cria um snapshot em eventos_versoes e incrementa eventos.versao_atual
-- sempre que `eventos` ou `configuracoes_evento` mudam. O guard
-- pg_trigger_depth() = 1 evita que a própria atualização de
-- versao_atual (feita de dentro desta função) dispare uma nova rodada
-- de versionamento recursivamente.
create or replace function fn_versionar_evento()
returns trigger language plpgsql security definer as $$
declare
  v_evento_id uuid;
  v_nova_versao int;
  v_snapshot jsonb;
  v_regulamento text;
begin
  if TG_TABLE_NAME = 'eventos' then
    v_evento_id := coalesce(new.id, old.id);
  else
    v_evento_id := coalesce(new.evento_id, old.evento_id);
  end if;

  select coalesce(max(versao), 0) + 1 into v_nova_versao
  from eventos_versoes where evento_id = v_evento_id;

  select jsonb_build_object('evento', to_jsonb(e.*), 'configuracao', to_jsonb(c.*))
    into v_snapshot
  from eventos e
  left join configuracoes_evento c on c.evento_id = e.id
  where e.id = v_evento_id;

  select regulamento_url into v_regulamento
  from configuracoes_evento where evento_id = v_evento_id;

  insert into eventos_versoes (evento_id, versao, snapshot_evento, regulamento_url, alterado_por, alterado_em)
  values (v_evento_id, v_nova_versao, v_snapshot, v_regulamento, auth.uid(), now());

  update eventos set versao_atual = v_nova_versao where id = v_evento_id;

  return new;
end;
$$;

create trigger trg_versionar_evento
  after insert or update on eventos
  for each row when (pg_trigger_depth() = 1)
  execute function fn_versionar_evento();

create trigger trg_versionar_configuracao_evento
  after insert or update on configuracoes_evento
  for each row execute function fn_versionar_evento();


-- ---------- 5.3 Criação automática de profile a partir de auth.users ----------
-- O tipo de conta vem de raw_user_meta_data->>'tipo_conta' (enviado no
-- signUp em options.data), com fallback para 'atleta'.
create or replace function fn_criar_usuario_apos_signup()
returns trigger language plpgsql security definer as $$
begin
  insert into usuarios (id, nome, email, tipo_conta)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', new.email),
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'tipo_conta', '')::tipo_conta_usuario,
      'atleta'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger trg_criar_usuario_apos_signup
  after insert on auth.users
  for each row execute function fn_criar_usuario_apos_signup();


-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================

alter table organizacoes enable row level security;
alter table usuarios enable row level security;
alter table organizacao_usuarios enable row level security;
alter table categorias enable row level security;
alter table faixas_etarias enable row level security;
alter table modalidades enable row level security;
alter table tipos_prova enable row level security;
alter table tipos_entrega enable row level security;
alter table patrocinadores enable row level security;
alter table equipes enable row level security;
alter table eventos_serie enable row level security;
alter table eventos enable row level security;
alter table configuracoes_evento enable row level security;
alter table eventos_versoes enable row level security;
alter table lotes_inscricao enable row level security;
alter table provas enable row level security;
alter table prova_parciais enable row level security;
alter table atletas enable row level security;
alter table responsavel_atleta enable row level security;
alter table inscricoes enable row level security;
alter table pagamentos enable row level security;
alter table itens_pagamento enable row level security;
alter table faixas_numeracao enable row level security;
alter table dorsais enable row level security;
alter table check_ins enable row level security;
alter table entregas enable row level security;
alter table importacoes_cronometragem enable row level security;
alter table importacoes_cronometragem_itens enable row level security;
alter table resultados enable row level security;
alter table resultados_parciais enable row level security;
alter table resultados_publicacoes enable row level security;
alter table classificacoes enable row level security;
alter table classificacao_itens enable row level security;
alter table certificados enable row level security;
alter table galeria_imagens enable row level security;
alter table evento_patrocinadores enable row level security;
alter table logs_auditoria enable row level security;

-- ---------- usuarios / organizacoes / organizacao_usuarios ----------
create policy usuarios_select on usuarios for select
  using (id = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid()));
create policy usuarios_update_own on usuarios for update using (id = auth.uid());
create policy usuarios_insert_own on usuarios for insert with check (id = auth.uid());

create policy organizacoes_select on organizacoes for select
  using (sou_staff_leitura(id) or exists (select 1 from eventos_serie es join eventos e on e.serie_id = es.id where es.organizacao_id = organizacoes.id and e.status = 'publicado'));
create policy organizacoes_write on organizacoes for all
  using (sou_staff_escrita(id)) with check (sou_staff_escrita(id));

create policy organizacao_usuarios_select on organizacao_usuarios for select
  using (usuario_id = auth.uid() or sou_staff_leitura(organizacao_id));
create policy organizacao_usuarios_write on organizacao_usuarios for all
  using (sou_da_organizacao(organizacao_id, array['administrador']::papel_organizacao[]))
  with check (sou_da_organizacao(organizacao_id, array['administrador']::papel_organizacao[]));

-- ---------- catálogos globais: leitura pública, escrita por qualquer staff ----------
create policy categorias_select on categorias for select using (true);
create policy categorias_write on categorias for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy faixas_etarias_select on faixas_etarias for select using (true);
create policy faixas_etarias_write on faixas_etarias for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy modalidades_select on modalidades for select using (true);
create policy modalidades_write on modalidades for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy tipos_prova_select on tipos_prova for select using (true);
create policy tipos_prova_write on tipos_prova for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy tipos_entrega_select on tipos_entrega for select using (true);
create policy tipos_entrega_write on tipos_entrega for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy patrocinadores_select on patrocinadores for select using (true);
create policy patrocinadores_write on patrocinadores for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')))
  with check (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));

create policy equipes_select on equipes for select using (true);
create policy equipes_write on equipes for all
  using (organizacao_id is null or sou_staff_escrita(organizacao_id))
  with check (organizacao_id is null or sou_staff_escrita(organizacao_id));

-- ---------- eventos_serie / eventos / configuracoes_evento / eventos_versoes ----------
create policy eventos_serie_select on eventos_serie for select
  using (sou_staff_leitura(organizacao_id) or exists (select 1 from eventos where serie_id = eventos_serie.id and status = 'publicado'));
create policy eventos_serie_write on eventos_serie for all
  using (sou_staff_escrita(organizacao_id)) with check (sou_staff_escrita(organizacao_id));

create policy eventos_select on eventos for select
  using (status = 'publicado' or sou_staff_leitura(fn_serie_organizacao(serie_id)));
create policy eventos_write on eventos for all
  using (sou_staff_escrita(fn_serie_organizacao(serie_id)))
  with check (sou_staff_escrita(fn_serie_organizacao(serie_id)));

create policy configuracoes_evento_select on configuracoes_evento for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)) or exists (select 1 from eventos where id = evento_id and status = 'publicado'));
create policy configuracoes_evento_write on configuracoes_evento for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

create policy eventos_versoes_select on eventos_versoes for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)));
-- eventos_versoes só é escrita pelos triggers (security definer); sem policy de INSERT/UPDATE direto para o app.

create policy lotes_inscricao_select on lotes_inscricao for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)) or exists (select 1 from eventos where id = evento_id and status = 'publicado'));
create policy lotes_inscricao_write on lotes_inscricao for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

-- ---------- provas / prova_parciais ----------
create policy provas_select on provas for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)) or exists (select 1 from eventos where id = evento_id and status = 'publicado'));
create policy provas_write on provas for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

create policy prova_parciais_select on prova_parciais for select
  using (sou_staff_leitura(fn_prova_organizacao(prova_id)) or exists (select 1 from provas p join eventos e on e.id = p.evento_id where p.id = prova_id and e.status = 'publicado'));
create policy prova_parciais_write on prova_parciais for all
  using (sou_staff_escrita(fn_prova_organizacao(prova_id)))
  with check (sou_staff_escrita(fn_prova_organizacao(prova_id)));

-- ---------- atletas / responsavel_atleta ----------
create policy atletas_select on atletas for select
  using (
    usuario_id = auth.uid()
    or sou_responsavel_de(id)
    or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid())
  );
create policy atletas_insert on atletas for insert
  with check (
    usuario_id = auth.uid()
    or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid())
    or usuario_id is null
  );
create policy atletas_update on atletas for update
  using (usuario_id = auth.uid() or sou_responsavel_de(id) or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'organizador')));
create policy atletas_delete on atletas for delete
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel = 'administrador'));

create policy responsavel_atleta_select on responsavel_atleta for select
  using (responsavel_usuario_id = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid()));
create policy responsavel_atleta_write on responsavel_atleta for all
  using (responsavel_usuario_id = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel = 'administrador'))
  with check (responsavel_usuario_id = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel = 'administrador'));

-- ---------- inscricoes ----------
create policy inscricoes_select on inscricoes for select
  using (
    sou_staff_leitura(fn_prova_organizacao(prova_id))
    or exists (select 1 from atletas a where a.id = atleta_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id)))
  );
create policy inscricoes_insert on inscricoes for insert
  with check (
    exists (select 1 from atletas a where a.id = atleta_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id)))
    or sou_staff_escrita(fn_prova_organizacao(prova_id))
  );
create policy inscricoes_update on inscricoes for update
  using (
    sou_staff_escrita(fn_prova_organizacao(prova_id))
    or exists (select 1 from atletas a where a.id = atleta_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id)))
  );
create policy inscricoes_delete on inscricoes for delete
  using (sou_staff_escrita(fn_prova_organizacao(prova_id)));

-- ---------- pagamentos / itens_pagamento (financeiro: só staff) ----------
create policy pagamentos_select on pagamentos for select
  using (pago_por = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'financeiro')));
create policy pagamentos_write on pagamentos for all
  using (exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'financeiro')))
  with check (pago_por = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel in ('administrador', 'financeiro')));

create policy itens_pagamento_select on itens_pagamento for select
  using (
    exists (select 1 from pagamentos pg where pg.id = pagamento_id and pg.pago_por = auth.uid())
    or sou_staff_leitura(fn_inscricao_organizacao(inscricao_id))
  );
create policy itens_pagamento_write on itens_pagamento for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

-- ---------- faixas_numeracao / dorsais / check_ins / entregas ----------
create policy faixas_numeracao_select on faixas_numeracao for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)));
create policy faixas_numeracao_write on faixas_numeracao for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

create policy dorsais_select on dorsais for select
  using (
    sou_staff_leitura(fn_inscricao_organizacao(inscricao_id))
    or exists (select 1 from inscricoes i join atletas a on a.id = i.atleta_id where i.id = inscricao_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id)))
  );
create policy dorsais_write on dorsais for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

create policy check_ins_select on check_ins for select
  using (sou_staff_leitura(fn_inscricao_organizacao(inscricao_id)));
create policy check_ins_write on check_ins for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

create policy entregas_select on entregas for select
  using (sou_staff_leitura(fn_inscricao_organizacao(inscricao_id)));
create policy entregas_write on entregas for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

-- ---------- importações de cronometragem (staff apenas) ----------
create policy importacoes_select on importacoes_cronometragem for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)));
create policy importacoes_write on importacoes_cronometragem for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

create policy importacoes_itens_select on importacoes_cronometragem_itens for select
  using (exists (select 1 from importacoes_cronometragem ic where ic.id = importacao_id and sou_staff_leitura(fn_evento_organizacao(ic.evento_id))));
create policy importacoes_itens_write on importacoes_cronometragem_itens for all
  using (exists (select 1 from importacoes_cronometragem ic where ic.id = importacao_id and sou_staff_escrita(fn_evento_organizacao(ic.evento_id))))
  with check (exists (select 1 from importacoes_cronometragem ic where ic.id = importacao_id and sou_staff_escrita(fn_evento_organizacao(ic.evento_id))));

-- ---------- resultados / resultados_parciais / resultados_publicacoes ----------
create policy resultados_select on resultados for select
  using (
    sou_staff_leitura(fn_inscricao_organizacao(inscricao_id))
    or exists (
      select 1 from inscricoes i
      join atletas a on a.id = i.atleta_id
      join resultados_publicacoes rp on rp.prova_id = i.prova_id
      where i.id = inscricao_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id))
    )
  );
create policy resultados_write on resultados for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

create policy resultados_parciais_select on resultados_parciais for select
  using (sou_staff_leitura(fn_inscricao_organizacao(inscricao_id)));
create policy resultados_parciais_write on resultados_parciais for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

create policy resultados_publicacoes_select on resultados_publicacoes for select using (true);
create policy resultados_publicacoes_write on resultados_publicacoes for all
  using (sou_staff_escrita(fn_prova_organizacao(prova_id)))
  with check (sou_staff_escrita(fn_prova_organizacao(prova_id)));

-- ---------- classificacoes / classificacao_itens ----------
create policy classificacoes_select on classificacoes for select
  using (
    sou_staff_leitura(fn_prova_organizacao(prova_id))
    or exists (select 1 from resultados_publicacoes rp where rp.prova_id = classificacoes.prova_id)
  );
create policy classificacoes_write on classificacoes for all
  using (sou_staff_escrita(fn_prova_organizacao(prova_id)))
  with check (sou_staff_escrita(fn_prova_organizacao(prova_id)));

create policy classificacao_itens_select on classificacao_itens for select
  using (
    exists (
      select 1 from classificacoes c
      where c.id = classificacao_id
        and (sou_staff_leitura(fn_prova_organizacao(c.prova_id)) or exists (select 1 from resultados_publicacoes rp where rp.prova_id = c.prova_id))
    )
  );
create policy classificacao_itens_write on classificacao_itens for all
  using (exists (select 1 from classificacoes c where c.id = classificacao_id and sou_staff_escrita(fn_prova_organizacao(c.prova_id))))
  with check (exists (select 1 from classificacoes c where c.id = classificacao_id and sou_staff_escrita(fn_prova_organizacao(c.prova_id))));

-- ---------- certificados ----------
create policy certificados_select on certificados for select
  using (
    sou_staff_leitura(fn_inscricao_organizacao(inscricao_id))
    or exists (select 1 from inscricoes i join atletas a on a.id = i.atleta_id where i.id = inscricao_id and (a.usuario_id = auth.uid() or sou_responsavel_de(a.id)))
  );
create policy certificados_write on certificados for all
  using (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)))
  with check (sou_staff_escrita(fn_inscricao_organizacao(inscricao_id)));

-- ---------- galeria ----------
create policy galeria_select on galeria_imagens for select
  using (visibilidade = 'publica' or sou_staff_leitura(fn_evento_organizacao(evento_id)));
create policy galeria_write on galeria_imagens for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

-- ---------- patrocinadores por evento ----------
create policy evento_patrocinadores_select on evento_patrocinadores for select
  using (sou_staff_leitura(fn_evento_organizacao(evento_id)) or exists (select 1 from eventos where id = evento_id and status = 'publicado'));
create policy evento_patrocinadores_write on evento_patrocinadores for all
  using (sou_staff_escrita(fn_evento_organizacao(evento_id)))
  with check (sou_staff_escrita(fn_evento_organizacao(evento_id)));

-- ---------- logs de auditoria (leitura só para admin da própria organização; nenhuma escrita direta do app) ----------
create policy logs_auditoria_select on logs_auditoria for select
  using (usuario_id = auth.uid() or exists (select 1 from organizacao_usuarios where usuario_id = auth.uid() and papel = 'administrador'));


-- ============================================================
-- 7. STORAGE — bucket da Galeria
-- ============================================================
insert into storage.buckets (id, name, public)
values ('galeria', 'galeria', true)
on conflict (id) do nothing;

-- Leitura pública de arquivos (o controle fino de público/privado é
-- feito pela linha correspondente em galeria_imagens.visibilidade;
-- o app só deve gerar/expor a URL de um arquivo depois de checar isso).
create policy storage_galeria_select on storage.objects for select
  using (bucket_id = 'galeria');

-- Upload/edição/remoção só por staff com permissão de escrita na
-- organização dona do evento. O caminho do arquivo é esperado no
-- formato "{evento_id}/{categoria}/{arquivo}", então extraímos o
-- evento_id do primeiro segmento do path.
create policy storage_galeria_insert on storage.objects for insert
  with check (
    bucket_id = 'galeria'
    and sou_staff_escrita(fn_evento_organizacao((storage.foldername(name))[1]::uuid))
  );

create policy storage_galeria_update on storage.objects for update
  using (
    bucket_id = 'galeria'
    and sou_staff_escrita(fn_evento_organizacao((storage.foldername(name))[1]::uuid))
  );

create policy storage_galeria_delete on storage.objects for delete
  using (
    bucket_id = 'galeria'
    and sou_staff_escrita(fn_evento_organizacao((storage.foldername(name))[1]::uuid))
  );
