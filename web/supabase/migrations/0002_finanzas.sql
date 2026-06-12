-- =====================================================================
-- Migración 0002 — Núcleo financiero (Fase 1):
-- periodos, cuotas, pagos, movimientos (ingresos/egresos), medidores.
-- =====================================================================

create type estado_cuota as enum ('pendiente', 'parcial', 'pagada', 'vencida', 'anulada');
create type tipo_cuota   as enum ('mantenimiento', 'extraordinaria', 'consumo', 'multa', 'otro');
create type tipo_movimiento as enum ('ingreso', 'egreso');
create type tipo_medidor as enum ('agua', 'luz', 'gas');

-- Periodo contable (normalmente mensual) por condominio
create table periodo (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  anio          int  not null,
  mes           int  not null check (mes between 1 and 12),
  cerrado       boolean not null default false,
  creado_en     timestamptz not null default now(),
  unique (condominio_id, anio, mes)
);
create index on periodo (condominio_id);

-- Cuota = cargo a una unidad en un periodo
create table cuota (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  unidad_id     uuid not null references unidad(id) on delete cascade,
  periodo_id    uuid references periodo(id) on delete set null,
  tipo          tipo_cuota not null default 'mantenimiento',
  concepto      text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  saldo         numeric(12,2) not null,            -- pendiente por cobrar
  vence_el      date,
  estado        estado_cuota not null default 'pendiente',
  creado_en     timestamptz not null default now()
);
create index on cuota (condominio_id);
create index on cuota (unidad_id);
create index on cuota (estado);

-- Pago / abono registrado a una unidad
create table pago (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  unidad_id     uuid not null references unidad(id) on delete cascade,
  monto         numeric(12,2) not null check (monto > 0),
  metodo        text,                              -- tarjeta, transferencia, oxxo, efectivo, stp
  referencia    text,
  pagado_en     timestamptz not null default now(),
  registrado_por uuid references auth.users(id) on delete set null,
  creado_en     timestamptz not null default now()
);
create index on pago (condominio_id);
create index on pago (unidad_id);

-- Conciliación: aplica un pago (parcial o total) a una cuota
create table aplicacion_pago (
  id        uuid primary key default gen_random_uuid(),
  pago_id   uuid not null references pago(id) on delete cascade,
  cuota_id  uuid not null references cuota(id) on delete cascade,
  monto     numeric(12,2) not null check (monto > 0),
  unique (pago_id, cuota_id)
);

-- Movimiento contable libre (ingreso/egreso) del condominio
create table movimiento (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  periodo_id    uuid references periodo(id) on delete set null,
  tipo          tipo_movimiento not null,
  categoria     text,
  concepto      text not null,
  monto         numeric(12,2) not null check (monto >= 0),
  fecha         date not null default current_date,
  creado_en     timestamptz not null default now()
);
create index on movimiento (condominio_id);

-- Medidores y lecturas (cobro por consumo)
create table medidor (
  id            uuid primary key default gen_random_uuid(),
  condominio_id uuid not null references condominio(id) on delete cascade,
  unidad_id     uuid not null references unidad(id) on delete cascade,
  tipo          tipo_medidor not null,
  identificador text,
  tarifa        numeric(12,4) not null default 0,  -- precio por unidad de consumo
  creado_en     timestamptz not null default now()
);
create index on medidor (condominio_id);

create table lectura (
  id          uuid primary key default gen_random_uuid(),
  medidor_id  uuid not null references medidor(id) on delete cascade,
  periodo_id  uuid references periodo(id) on delete set null,
  valor       numeric(14,3) not null,             -- lectura acumulada
  consumo     numeric(14,3),                       -- diferencia vs lectura previa
  leido_el    date not null default current_date,
  creado_en   timestamptz not null default now()
);
create index on lectura (medidor_id);

-- =====================================================================
-- RLS — finanzas
-- Lectura: miembros del condominio (residente ve lo suyo en la app vía filtros).
-- Escritura: administradores. Comité con lectura.
-- =====================================================================
alter table periodo         enable row level security;
alter table cuota           enable row level security;
alter table pago            enable row level security;
alter table aplicacion_pago enable row level security;
alter table movimiento      enable row level security;
alter table medidor         enable row level security;
alter table lectura         enable row level security;

-- Helper para tablas que cuelgan de condominio_id directo
do $$
declare t text;
begin
  foreach t in array array['periodo','cuota','pago','movimiento','medidor'] loop
    execute format($f$
      create policy %1$s_select on %1$s
        for select using (es_miembro(condominio_id));
      create policy %1$s_admin on %1$s
        for all using (tiene_rol(condominio_id, array['administrador']::rol_usuario[]))
        with check (tiene_rol(condominio_id, array['administrador']::rol_usuario[]));
    $f$, t);
  end loop;
end $$;

-- aplicacion_pago y lectura: vía join a su condominio
create policy aplicacion_select on aplicacion_pago
  for select using (exists (
    select 1 from pago p where p.id = pago_id and es_miembro(p.condominio_id)));
create policy aplicacion_admin on aplicacion_pago
  for all using (exists (
    select 1 from pago p where p.id = pago_id
      and tiene_rol(p.condominio_id, array['administrador']::rol_usuario[])))
  with check (exists (
    select 1 from pago p where p.id = pago_id
      and tiene_rol(p.condominio_id, array['administrador']::rol_usuario[])));

create policy lectura_select on lectura
  for select using (exists (
    select 1 from medidor md where md.id = medidor_id and es_miembro(md.condominio_id)));
create policy lectura_admin on lectura
  for all using (exists (
    select 1 from medidor md where md.id = medidor_id
      and tiene_rol(md.condominio_id, array['administrador']::rol_usuario[])))
  with check (exists (
    select 1 from medidor md where md.id = medidor_id
      and tiene_rol(md.condominio_id, array['administrador']::rol_usuario[])));

-- =====================================================================
-- TRIGGER: mantener saldo/estado de la cuota al aplicar pagos
-- =====================================================================
create or replace function recalcular_cuota(p_cuota_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  v_monto numeric(12,2);
  v_aplicado numeric(12,2);
  v_vence date;
begin
  select monto, vence_el into v_monto, v_vence from cuota where id = p_cuota_id;
  select coalesce(sum(monto),0) into v_aplicado from aplicacion_pago where cuota_id = p_cuota_id;

  update cuota set
    saldo = greatest(v_monto - v_aplicado, 0),
    estado = case
      when v_aplicado >= v_monto then 'pagada'
      when v_aplicado > 0 then 'parcial'
      when v_vence is not null and v_vence < current_date then 'vencida'
      else 'pendiente'
    end
  where id = p_cuota_id;
end;
$$;

create or replace function trg_aplicacion_pago()
returns trigger language plpgsql as $$
begin
  perform recalcular_cuota(coalesce(new.cuota_id, old.cuota_id));
  return null;
end;
$$;

create trigger aplicacion_pago_recalc
  after insert or update or delete on aplicacion_pago
  for each row execute function trg_aplicacion_pago();
