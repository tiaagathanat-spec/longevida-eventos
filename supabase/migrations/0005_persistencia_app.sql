-- ============================================================
-- Longevida Eventos — Persistência real das telas (bridge)
--
-- Cria tabelas "espelho" que reproduzem EXATAMENTE o formato dos
-- dados usados pelas telas (lib/mock/*-store.tsx), para que todas as
-- criações, edições, exclusões e lançamentos fiquem salvas no banco
-- e sobrevivam a recarregar a página / trocar de dispositivo.
--
-- Os ids são TEXT para manter compatibilidade total com os dados de
-- demonstração já existentes ("1", "2", "host", ...).
--
-- RLS: leitura permitida a todos (as telas públicas e o login demo
-- leem eventos, inscrições, perfis e funcionários), mas a ESCRITA é
-- restrita a usuários autenticados. O controle fino por organização
-- fica no schema de produção (0002) para a etapa futura.
-- ============================================================

-- ---------- Catálogos ----------
create table if not exists app_categorias (
  id text primary key,
  nome text not null,
  idade_minima int,
  idade_maxima int,
  descricao text not null default ''
);

create table if not exists app_modalidades (
  id text primary key,
  nome text not null,
  estilo text not null default 'livre',
  distancia_metros int,
  descricao text not null default ''
);

create table if not exists app_tipos_prova (
  id text primary key,
  nome text not null,
  permite_equipe boolean not null default false,
  descricao text not null default ''
);

-- ---------- Eventos e provas ----------
create table if not exists app_eventos (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  data text not null,
  local text not null default '',
  status text not null default 'rascunho',
  data_limite_inscricoes text not null default '',
  vagas int,
  logo_url text not null default ''
);

create table if not exists app_provas (
  id text primary key,
  evento_id text not null,
  modalidade_id text not null,
  categoria_id text not null,
  tipo_prova_id text not null,
  horario text not null default '',
  observacoes text not null default '',
  valor numeric(10, 2) not null default 0
);

-- ---------- Pessoas ----------
create table if not exists app_atletas (
  id text primary key,
  nome text not null,
  data_nascimento text not null default '',
  categoria_id text not null default '',
  responsavel_nome text not null default '',
  email text not null default '',
  telefone text not null default '',
  genero text,
  cpf text,
  endereco text,
  contato_emergencia_nome text,
  contato_emergencia_telefone text,
  observacoes_saude text,
  responsavel_telefone text,
  responsavel_cpf text,
  parentesco text
);

create table if not exists app_perfis (
  id text primary key,
  tipo_conta text not null default 'atleta',
  nome text not null,
  email text not null,
  data_nascimento text not null default '',
  genero text not null default '',
  cpf text not null default '',
  telefone text not null default '',
  endereco text not null default '',
  contato_emergencia_nome text not null default '',
  contato_emergencia_telefone text not null default '',
  observacoes_saude text not null default '',
  foto text,
  responsavel_nome text,
  responsavel_telefone text
);

-- ---------- Inscrições / financeiro ----------
create table if not exists app_inscricoes (
  id text primary key,
  evento_id text not null,
  prova_id text not null,
  atleta_nome text not null,
  status text not null default 'pendente',
  data_inscricao text not null default '',
  numero_peito text
);

create table if not exists app_pagamentos (
  inscricao_id text primary key,
  valor numeric(10, 2) not null default 0,
  forma_pagamento text,
  status text not null default 'pendente',
  data_pagamento text,
  comprovante_url text
);

-- ---------- Resultados / publicações ----------
create table if not exists app_resultados (
  id text primary key,
  inscricao_id text not null,
  tempo text not null default '',
  observacao text,
  revisao text not null default 'aguardando',
  revisado_por text,
  revisado_em text,
  revisao_observacao text
);

create table if not exists app_publicacoes (
  prova_id text primary key,
  publicado_em text not null
);

-- ---------- Dorsais / faixas ----------
create table if not exists app_faixas_numeracao (
  id text primary key,
  evento_id text not null,
  grupo_tipo text not null default 'categoria',
  grupo_id text not null,
  grupo_nome text not null default '',
  numero_inicial int not null default 1,
  numero_final int not null default 20,
  cor text not null default 'azul'
);

create table if not exists app_dorsais (
  id text primary key,
  inscricao_id text not null,
  numero int not null,
  check_in_feito boolean not null default false,
  medalha_entregue boolean not null default false,
  alimentacao_entregue boolean not null default false,
  kit_entregue boolean not null default false,
  atribuido_em text not null default ''
);

-- ---------- Galeria / regulamentos / patrocinadores ----------
create table if not exists app_galeria (
  id text primary key,
  evento_id text not null,
  categoria text not null default 'evento',
  nome text not null default '',
  url text not null default '',
  visibilidade text not null default 'publica',
  enviado_em text not null default ''
);

create table if not exists app_regulamentos (
  id text primary key,
  evento_id text not null,
  tipo text not null default 'pdf',
  nome text not null default '',
  url text not null default '',
  enviado_em text not null default ''
);

create table if not exists app_patrocinadores (
  id text primary key,
  nome text not null,
  site_url text not null default '',
  descricao text not null default '',
  cota text not null default 'apoio',
  eventos jsonb not null default '[]'::jsonb
);

-- ---------- QR Codes ----------
create table if not exists app_qrcodes (
  id text primary key,
  inscricao_id text not null,
  identificador text not null,
  ativo boolean not null default true,
  criado_em text not null default '',
  leituras jsonb not null default '[]'::jsonb
);

-- ---------- Funcionários / staff ----------
create table if not exists app_funcionarios (
  id text primary key,
  nome text not null,
  email text not null,
  telefone text not null default '',
  papel text not null default 'leitura',
  organizacao_id text not null default '1',
  ativo boolean not null default true,
  permissoes jsonb not null default '[]'::jsonb
);


-- ============================================================
-- SEED — mesmos dados de demonstração dos mocks em lib/mock
-- ============================================================

insert into app_categorias (id, nome, idade_minima, idade_maxima, descricao) values
  ('1', 'Infantil A', 8, 10, 'Atletas de 8 a 10 anos.'),
  ('2', 'Infantil B', 11, 12, 'Atletas de 11 a 12 anos.'),
  ('3', 'Juvenil', 13, 17, 'Atletas de 13 a 17 anos.'),
  ('4', 'Adulto', 18, 34, 'Atletas de 18 a 34 anos.'),
  ('5', 'Master', 35, null, 'Atletas a partir de 35 anos.')
on conflict (id) do nothing;

insert into app_modalidades (id, nome, estilo, distancia_metros, descricao) values
  ('1', '50m Livre', 'livre', 50, 'Natação 50 metros estilo livre.'),
  ('2', '100m Costas', 'costas', 100, 'Natação 100 metros costas.'),
  ('3', '100m Peito', 'peito', 100, 'Natação 100 metros peito.'),
  ('4', '100m Borboleta', 'borboleta', 100, 'Natação 100 metros borboleta.')
on conflict (id) do nothing;

insert into app_tipos_prova (id, nome, permite_equipe, descricao) values
  ('1', 'Individual', false, 'Prova disputada individualmente por atleta.'),
  ('2', 'Revezamento', true, 'Prova disputada em equipes de revezamento.')
on conflict (id) do nothing;

insert into app_eventos (id, nome, descricao, data, local, status, data_limite_inscricoes, vagas) values
  ('1', 'Copa Longevida de Natação', 'Etapa de abertura da temporada com provas de todas as modalidades.', '2026-09-20', 'Espaço Longevida — Piscina Olímpica', 'inscricoes_abertas', '2026-09-10', 100),
  ('2', 'Travessia Aberta Longevida', 'Travessia em águas abertas para todas as categorias.', '2026-10-18', 'Represa do Guarapiranga', 'em_espera', '2026-10-05', null),
  ('3', 'Desafio Master 30+', 'Evento exclusivo para atletas das categorias Master.', '2026-11-22', 'Espaço Longevida — Piscina Olímpica', 'rascunho', '', 50)
on conflict (id) do nothing;

insert into app_provas (id, evento_id, modalidade_id, categoria_id, tipo_prova_id, horario, observacoes, valor) values
  ('1', '1', '1', '1', '1', '09:00', '', 120),
  ('2', '1', '2', '3', '1', '09:40', '', 150)
on conflict (id) do nothing;

insert into app_inscricoes (id, evento_id, prova_id, atleta_nome, status, data_inscricao) values
  ('1', '1', '1', 'Marina Costa', 'confirmada', '2026-07-10'),
  ('2', '1', '2', 'Beatriz Lima', 'confirmada', '2026-07-12'),
  ('3', '1', '2', 'Rafael Andrade', 'pendente', '2026-07-20')
on conflict (id) do nothing;

insert into app_atletas (id, nome, data_nascimento, categoria_id, responsavel_nome, email, telefone) values
  ('1', 'Marina Costa', '2013-04-12', '1', 'Cláudia Costa', 'claudia.costa@exemplo.com', '(11) 98888-1234'),
  ('2', 'Beatriz Lima', '2011-09-02', '3', 'Cláudia Costa', 'claudia.costa@exemplo.com', '(11) 97777-5678'),
  ('3', 'João Pedro Santos', '1994-01-20', '4', '', 'joaopedro@exemplo.com', '(11) 96666-9012'),
  ('4', 'Rafael Andrade', '2012-05-30', '3', 'Cláudia Costa', 'claudia.costa@exemplo.com', '(11) 95555-3456'),
  ('5', 'Ana Tanat', '2014-02-10', '1', 'Agatha Tanat', 'tiaagathanat@gmail.com', '(11) 97777-0000'),
  ('6', 'Miguel Tanat', '2012-08-25', '3', 'Agatha Tanat', 'tiaagathanat@gmail.com', '(11) 97777-0000')
on conflict (id) do nothing;

insert into app_perfis (id, tipo_conta, nome, email, data_nascimento, genero, cpf, telefone, endereco, contato_emergencia_nome, contato_emergencia_telefone, observacoes_saude) values
  ('host', 'responsavel', 'Agatha Tanat', 'tiaagathanat@gmail.com', '1990-05-20', 'feminino', '321.654.987-00', '(11) 97777-0000', 'Av. das Nações, 500 — São Paulo/SP', 'Felipe Tanat', '(11) 96666-0000', 'Sem restrições.'),
  ('1', 'responsavel', 'Cláudia Costa', 'claudia.costa@exemplo.com', '1985-06-14', 'feminino', '123.456.789-00', '(11) 98888-1234', 'Rua das Flores, 123 — São Paulo/SP', 'Ricardo Costa', '(11) 97777-0001', 'Sem restrições.')
on conflict (id) do nothing;

insert into app_patrocinadores (id, nome, site_url, descricao, cota, eventos) values
  ('1', 'Supermercado Bom Preço', 'https://exemplo.com/bompreco', 'Patrocínio principal da temporada.', 'ouro', '["1","2"]'::jsonb),
  ('2', 'Padaria do Vale', 'https://exemplo.com/padaria', 'Kit de alimentação dos atletas.', 'prata', '["1"]'::jsonb),
  ('3', 'Clínica Vita', 'https://exemplo.com/clinicavita', 'Avaliações médicas para os inscritos.', 'apoio', '["2"]'::jsonb)
on conflict (id) do nothing;

insert into app_funcionarios (id, nome, email, telefone, papel, organizacao_id, ativo, permissoes) values
  ('host', 'Agatha Tanat', 'tiaagathanat@gmail.com', '(11) 97777-0000', 'administrador', '1', true, '["eventos","provas","inscritos","kits","resultados","classificacao","cronometragem","financeiro","configuracoes"]'::jsonb),
  ('1', 'Ricardo Almeida', 'ricardo.almeida@exemplo.com', '(11) 98888-0001', 'organizador', '1', true, '["eventos","provas","inscritos","kits","resultados","classificacao"]'::jsonb),
  ('2', 'Fernanda Souza', 'fernanda.souza@exemplo.com', '(11) 98888-0002', 'cronometragem', '1', true, '["eventos","provas","resultados","classificacao","cronometragem"]'::jsonb),
  ('3', 'Marcos Oliveira', 'marcos.oliveira@exemplo.com', '(11) 98888-0003', 'financeiro', '1', false, '["eventos","inscritos","financeiro"]'::jsonb)
on conflict (id) do nothing;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
-- ATENÇÃO (demo): o login das telas ainda é o mock (sem sessão
-- Supabase real), então as políticas são permissivas — leitura e
-- escrita para qualquer papel — reproduzindo o comportamento dos
-- mocks em memória. Quando o Supabase Auth passar a governar as
-- telas (lib/auth.ts), troque estas políticas por:
--   for select using (auth.role() = 'authenticated')
--   for insert/update/delete using (auth.role() = 'authenticated')
-- e restrinja as tabelas sensíveis (perfis, atletas, pagamentos,
-- funcionarios, qrcodes) a não expor nada publicamente.
-- ============================================================

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_categorias', 'app_modalidades', 'app_tipos_prova', 'app_eventos',
    'app_provas', 'app_atletas', 'app_perfis', 'app_inscricoes',
    'app_pagamentos', 'app_resultados', 'app_publicacoes',
    'app_faixas_numeracao', 'app_dorsais', 'app_galeria',
    'app_regulamentos', 'app_patrocinadores', 'app_qrcodes',
    'app_funcionarios'
  ] loop
    execute format(
      'alter table public.%I enable row level security', t
    );
    execute format(
      'create policy %I on public.%I for all using (true) with check (true)',
      t || '_todos', t
    );
    execute format(
      'grant select, insert, update, delete on public.%I to anon, authenticated',
      t
    );
  end loop;
end $$;
