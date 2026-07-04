-- ============================================================
-- PROJECT SYNC — SCHEMA SUPABASE
-- Rode isso inteiro no SQL Editor do seu projeto Supabase
-- (https://app.supabase.com/project/_/sql/new)
-- ============================================================

-- Extensão pra gerar UUID
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------
-- PERFIS (um registro por usuário autenticado)
-- ------------------------------------------------------------
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  avatar_emoji text default '🙂',
  xp integer not null default 0,
  sequencia_dias integer not null default 0,
  ultimo_dia_ativo date,
  created_at timestamptz not null default now()
);

alter table perfis enable row level security;

create policy "Qualquer autenticado ve todos os perfis"
  on perfis for select
  using ( auth.role() = 'authenticated' );

create policy "Usuario edita so o proprio perfil"
  on perfis for update
  using ( auth.uid() = id );

create policy "Usuario insere so o proprio perfil"
  on perfis for insert
  with check ( auth.uid() = id );

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.criar_perfil_automatico()
returns trigger as $$
begin
  insert into public.perfis (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.criar_perfil_automatico();

-- ------------------------------------------------------------
-- IDEIAS
-- ------------------------------------------------------------
create table if not exists ideias (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descricao text,
  categoria text not null default 'negocios'
    check (categoria in ('negocios','marketing','sistema','ia','investimento','pessoal')),
  importancia text not null default 'media'
    check (importancia in ('baixa','media','alta')),
  status text not null default 'nova'
    check (status in ('nova','em_analise','aprovada','descartada')),
  responsavel_id uuid references perfis(id),
  criado_por uuid not null references perfis(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table ideias enable row level security;

create policy "Autenticados veem todas as ideias"
  on ideias for select using ( auth.role() = 'authenticated' );
create policy "Autenticados criam ideias"
  on ideias for insert with check ( auth.role() = 'authenticated' );
create policy "Autenticados atualizam ideias"
  on ideias for update using ( auth.role() = 'authenticated' );
create policy "Autenticados deletam ideias"
  on ideias for delete using ( auth.role() = 'authenticated' );

-- ------------------------------------------------------------
-- METAS
-- ------------------------------------------------------------
create table if not exists metas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  tipo text not null default 'diaria'
    check (tipo in ('diaria','semanal','mensal','anual')),
  valor_alvo numeric not null default 1,
  valor_atual numeric not null default 0,
  unidade text default 'horas',
  responsavel_id uuid not null references perfis(id),
  data_referencia date not null default current_date,
  concluida boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table metas enable row level security;

create policy "Autenticados veem todas as metas"
  on metas for select using ( auth.role() = 'authenticated' );
create policy "Autenticados criam metas"
  on metas for insert with check ( auth.role() = 'authenticated' );
create policy "Dono ou qualquer autenticado atualiza metas"
  on metas for update using ( auth.role() = 'authenticated' );
create policy "Autenticados deletam metas"
  on metas for delete using ( auth.role() = 'authenticated' );

create table if not exists meta_itens (
  id uuid primary key default uuid_generate_v4(),
  meta_id uuid not null references metas(id) on delete cascade,
  texto text not null,
  concluido boolean not null default false,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

alter table meta_itens enable row level security;

create policy "Autenticados veem todos os itens de metas"
  on meta_itens for select using ( auth.role() = 'authenticated' );
create policy "Autenticados criam itens de metas"
  on meta_itens for insert with check ( auth.role() = 'authenticated' );
create policy "Autenticados atualizam itens de metas"
  on meta_itens for update using ( auth.role() = 'authenticated' );
create policy "Autenticados deletam itens de metas"
  on meta_itens for delete using ( auth.role() = 'authenticated' );

-- ------------------------------------------------------------
-- TAREFAS
-- ------------------------------------------------------------
create table if not exists tarefas (
  id uuid primary key default uuid_generate_v4(),
  titulo text not null,
  descricao text,
  prazo date,
  prioridade text not null default 'media'
    check (prioridade in ('baixa','media','alta')),
  categoria text,
  status text not null default 'a_fazer'
    check (status in ('a_fazer','em_andamento','em_revisao','concluido')),
  responsavel_id uuid references perfis(id),
  criado_por uuid not null references perfis(id),
  tempo_gasto_minutos integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tarefas enable row level security;

create policy "Autenticados veem todas as tarefas"
  on tarefas for select using ( auth.role() = 'authenticated' );
create policy "Autenticados criam tarefas"
  on tarefas for insert with check ( auth.role() = 'authenticated' );
create policy "Autenticados atualizam tarefas"
  on tarefas for update using ( auth.role() = 'authenticated' );
create policy "Autenticados deletam tarefas"
  on tarefas for delete using ( auth.role() = 'authenticated' );

-- ------------------------------------------------------------
-- Função utilitária: dar XP e atualizar sequência do perfil
-- ------------------------------------------------------------
create or replace function public.dar_xp(usuario_id uuid, quantidade integer)
returns void as $$
begin
  update perfis
  set
    xp = xp + quantidade,
    sequencia_dias = case
      when ultimo_dia_ativo = current_date then sequencia_dias
      when ultimo_dia_ativo = current_date - interval '1 day' then sequencia_dias + 1
      else 1
    end,
    ultimo_dia_ativo = current_date
  where id = usuario_id;
end;
$$ language plpgsql security definer;
