-- =====================================================================
-- Migración 0001 — Núcleo multi-tenant: organización, condominio, unidad,
-- persona, membresía, roles + helpers de RLS.
-- Plataforma de administración de condominios.
-- =====================================================================

-- Extensiones ---------------------------------------------------------
create extension if not exists "pgcrypto";

-- =====================================================================
-- ENUMS
-- =====================================================================
create type rol_usuario as enum (
  'super_admin',   -- staff de la plataforma
  'administrador', -- administra el/los condominio(s)
  'comite',        -- consejo/comité: lectura financiera + aprobaciones
  'conserje',      -- seguridad/recepción: accesos y paquetería
  'residente'      -- propietario o residente de una unidad
);

create type tipo_unidad as enum ('departamento', 'casa', 'local', 'estacionamiento', 'bodega');
create type estado_unidad as enum ('activa', 'inactiva');

-- =====================================================================
-- TABLAS
-- =====================================================================

-- Organización = cliente del SaaS (puede tener varios condominios)
create table organizacion (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  rfc         text,
  creado_en   timestamptz not null default now()
);

create table condominio (
  id              uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references organizacion(id) on delete cascade,
  nombre          text not null,
  direccion       text,
  ciudad          text,
  estado          text,
  zona_horaria    text not null default 'America/Mexico_City',
  moneda          text not null default 'MXN',
  creado_en       timestamptz not null default now()
);
create index on condominio (organizacion_id);

-- Edificio / torre dentro de un condominio
create table edificio (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  nombre        text not null,
  creado_en     timestamptz not null default now()
);
create index on edificio (condominio_id);

-- Unidad (depto/casa/local). La alícuota define el peso para prorrateo y votos.
create table unidad (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  edificio_id   uuid references edificio(id) on delete set null,
  identificador text not null,                 -- "101", "A-3", etc.
  tipo          tipo_unidad not null default 'departamento',
  alicuota      numeric(10,6) not null default 0,  -- coeficiente de copropiedad (%)
  estado        estado_unidad not null default 'activa',
  creado_en     timestamptz not null default now(),
  unique (condominio_id, identificador)
);
create index on unidad (condominio_id);

-- Persona = perfil ligado a un usuario de auth.users
create table persona (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid unique references auth.users(id) on delete cascade,
  nombre      text not null,
  email       text,
  telefono    text,
  creado_en   timestamptz not null default now()
);

-- Membresía: vincula una persona a un condominio con un rol.
-- Para residentes, opcionalmente a una unidad específica.
create table membresia (
  id            uuid primary key default gen_random_uuid(),
  persona_id    uuid not null references persona(id) on delete cascade,
  condominio_id uuid not null references condominio(id) on delete cascade,
  unidad_id     uuid references unidad(id) on delete set null,
  rol           rol_usuario not null,
  es_propietario boolean not null default false,
  creado_en     timestamptz not null default now(),
  unique (persona_id, condominio_id, unidad_id, rol)
);
create index on membresia (condominio_id);
create index on membresia (persona_id);

-- Bitácora de auditoría para acciones sensibles (sobre todo financieras)
create table audit_log (
  id            bigserial primary key,
  condominio_id uuid references condominio(id) on delete set null,
  actor_id      uuid references auth.users(id) on delete set null,
  accion        text not null,
  entidad       text,
  entidad_id    text,
  datos         jsonb,
  creado_en     timestamptz not null default now()
);
create index on audit_log (condominio_id);

-- =====================================================================
-- HELPERS DE RLS
-- =====================================================================

-- persona_id del usuario actual
create or replace function current_persona_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select id from persona where user_id = auth.uid();
$$;

-- ¿El usuario actual es miembro del condominio dado?
create or replace function es_miembro(cond_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from membresia m
    join persona p on p.id = m.persona_id
    where p.user_id = auth.uid() and m.condominio_id = cond_id
  );
$$;

-- ¿El usuario actual tiene alguno de los roles dados en el condominio?
create or replace function tiene_rol(cond_id uuid, roles rol_usuario[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from membresia m
    join persona p on p.id = m.persona_id
    where p.user_id = auth.uid()
      and m.condominio_id = cond_id
      and m.rol = any(roles)
  );
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table organizacion enable row level security;
alter table condominio   enable row level security;
alter table edificio     enable row level security;
alter table unidad       enable row level security;
alter table persona      enable row level security;
alter table membresia    enable row level security;
alter table audit_log    enable row level security;

-- persona: cada quien ve/edita su propio perfil
create policy persona_propia on persona
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- condominio: visible para sus miembros; administrable por administradores
create policy condominio_select on condominio
  for select using (es_miembro(id));
create policy condominio_admin on condominio
  for all using (tiene_rol(id, array['administrador']::rol_usuario[]))
  with check (tiene_rol(id, array['administrador']::rol_usuario[]));

-- edificio / unidad: lectura para miembros, escritura para administradores
create policy edificio_select on edificio
  for select using (es_miembro(condominio_id));
create policy edificio_admin on edificio
  for all using (tiene_rol(condominio_id, array['administrador']::rol_usuario[]))
  with check (tiene_rol(condominio_id, array['administrador']::rol_usuario[]));

create policy unidad_select on unidad
  for select using (es_miembro(condominio_id));
create policy unidad_admin on unidad
  for all using (tiene_rol(condominio_id, array['administrador']::rol_usuario[]))
  with check (tiene_rol(condominio_id, array['administrador']::rol_usuario[]));

-- membresía: el usuario ve las membresías de los condominios donde es miembro;
-- los administradores las gestionan
create policy membresia_select on membresia
  for select using (es_miembro(condominio_id));
create policy membresia_admin on membresia
  for all using (tiene_rol(condominio_id, array['administrador']::rol_usuario[]))
  with check (tiene_rol(condominio_id, array['administrador']::rol_usuario[]));

-- audit_log: lectura para administradores/comité del condominio
create policy audit_select on audit_log
  for select using (tiene_rol(condominio_id, array['administrador','comite']::rol_usuario[]));

-- =====================================================================
-- TRIGGER: crear persona automáticamente al registrarse un usuario
-- =====================================================================
create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.persona (user_id, nombre, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'nombre', new.email), new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
