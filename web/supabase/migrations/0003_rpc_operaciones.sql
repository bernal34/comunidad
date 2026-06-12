-- =====================================================================
-- Migración 0003 — RPCs de operación (security definer).
-- Encapsulan lógica multi-paso/autorización: onboarding, alta de
-- residentes, emisión masiva de cuotas y registro de pagos con
-- conciliación. Cada función verifica permisos internamente.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Lectura de personas para administradores de su condominio
-- (complementa la política persona_propia para poder listar residentes)
-- ---------------------------------------------------------------------
create policy persona_admin_lectura on persona
  for select using (
    exists (
      select 1 from membresia m
      where m.persona_id = persona.id
        and tiene_rol(m.condominio_id, array['administrador']::rol_usuario[])
    )
  );

-- ---------------------------------------------------------------------
-- Onboarding: crea organización + condominio y deja al usuario actual
-- como administrador. Cualquier usuario autenticado puede llamarla.
-- ---------------------------------------------------------------------
create or replace function crear_condominio(
  p_nombre_condominio text,
  p_ciudad text default null,
  p_estado text default null,
  p_direccion text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_persona_id uuid;
  v_org_id uuid;
  v_cond_id uuid;
begin
  v_persona_id := current_persona_id();
  if v_persona_id is null then
    raise exception 'No hay persona asociada al usuario actual';
  end if;

  -- Reutiliza una organización donde ya sea administrador, si existe.
  select m.condominio_id into v_cond_id from membresia m limit 0; -- noop tipado
  select c.organizacion_id into v_org_id
  from membresia m
  join condominio c on c.id = m.condominio_id
  where m.persona_id = v_persona_id and m.rol = 'administrador'
  limit 1;

  if v_org_id is null then
    insert into organizacion (nombre)
    values (coalesce(p_nombre_condominio, 'Mi administración'))
    returning id into v_org_id;
  end if;

  insert into condominio (organizacion_id, nombre, ciudad, estado, direccion)
  values (v_org_id, p_nombre_condominio, p_ciudad, p_estado, p_direccion)
  returning id into v_cond_id;

  insert into membresia (persona_id, condominio_id, rol)
  values (v_persona_id, v_cond_id, 'administrador');

  return v_cond_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Alta de residente: crea (o reutiliza por email) una persona-contacto
-- y la vincula a una unidad con rol residente.
-- ---------------------------------------------------------------------
create or replace function agregar_residente(
  p_condominio_id uuid,
  p_unidad_id uuid,
  p_nombre text,
  p_email text default null,
  p_telefono text default null,
  p_es_propietario boolean default false
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_persona_id uuid;
begin
  if not tiene_rol(p_condominio_id, array['administrador']::rol_usuario[]) then
    raise exception 'No autorizado';
  end if;

  -- Reutiliza persona existente por email (si se dio uno).
  if p_email is not null then
    select id into v_persona_id from persona where lower(email) = lower(p_email) limit 1;
  end if;

  if v_persona_id is null then
    insert into persona (nombre, email, telefono)
    values (p_nombre, p_email, p_telefono)
    returning id into v_persona_id;
  end if;

  insert into membresia (persona_id, condominio_id, unidad_id, rol, es_propietario)
  values (v_persona_id, p_condominio_id, p_unidad_id, 'residente', p_es_propietario)
  on conflict (persona_id, condominio_id, unidad_id, rol) do nothing;

  return v_persona_id;
end;
$$;

-- ---------------------------------------------------------------------
-- Emisión masiva de cuotas a todas las unidades activas de un periodo.
--   p_modo = 'fijo'     -> cada unidad paga p_monto
--   p_modo = 'alicuota' -> cada unidad paga p_monto * (alicuota/100)
-- Crea el periodo si no existe. Idempotente por (unidad, periodo, concepto).
-- Devuelve la cantidad de cuotas emitidas.
-- ---------------------------------------------------------------------
create or replace function emitir_cuotas(
  p_condominio_id uuid,
  p_anio int,
  p_mes int,
  p_tipo tipo_cuota,
  p_concepto text,
  p_monto numeric,
  p_modo text default 'fijo',
  p_vence_el date default null
)
returns int
language plpgsql security definer set search_path = public
as $$
declare
  v_periodo_id uuid;
  v_count int := 0;
  r record;
  v_monto numeric(12,2);
begin
  if not tiene_rol(p_condominio_id, array['administrador']::rol_usuario[]) then
    raise exception 'No autorizado';
  end if;

  insert into periodo (condominio_id, anio, mes)
  values (p_condominio_id, p_anio, p_mes)
  on conflict (condominio_id, anio, mes) do update set anio = excluded.anio
  returning id into v_periodo_id;

  for r in
    select id, alicuota from unidad
    where condominio_id = p_condominio_id and estado = 'activa'
  loop
    v_monto := case
      when p_modo = 'alicuota' then round(p_monto * (r.alicuota / 100.0), 2)
      else p_monto
    end;

    -- Evita duplicar la misma cuota en el periodo.
    if not exists (
      select 1 from cuota
      where unidad_id = r.id and periodo_id = v_periodo_id and concepto = p_concepto
    ) then
      insert into cuota (condominio_id, unidad_id, periodo_id, tipo, concepto, monto, saldo, vence_el, estado)
      values (p_condominio_id, r.id, v_periodo_id, p_tipo, p_concepto, v_monto, v_monto, p_vence_el,
              case when p_vence_el is not null and p_vence_el < current_date then 'vencida' else 'pendiente' end);
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Registra un pago y lo concilia FIFO contra las cuotas pendientes
-- de la unidad (las más antiguas/vencidas primero).
-- Devuelve el id del pago.
-- ---------------------------------------------------------------------
create or replace function registrar_pago(
  p_condominio_id uuid,
  p_unidad_id uuid,
  p_monto numeric,
  p_metodo text default null,
  p_referencia text default null
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare
  v_pago_id uuid;
  v_restante numeric(12,2);
  v_aplicar numeric(12,2);
  r record;
begin
  if not tiene_rol(p_condominio_id, array['administrador']::rol_usuario[]) then
    raise exception 'No autorizado';
  end if;
  if p_monto <= 0 then
    raise exception 'El monto debe ser mayor a cero';
  end if;

  insert into pago (condominio_id, unidad_id, monto, metodo, referencia, registrado_por)
  values (p_condominio_id, p_unidad_id, p_monto, p_metodo, p_referencia, auth.uid())
  returning id into v_pago_id;

  v_restante := p_monto;

  for r in
    select id, saldo from cuota
    where unidad_id = p_unidad_id
      and estado in ('pendiente','parcial','vencida')
      and saldo > 0
    order by coalesce(vence_el, '9999-12-31'::date) asc, creado_en asc
  loop
    exit when v_restante <= 0;
    v_aplicar := least(v_restante, r.saldo);
    insert into aplicacion_pago (pago_id, cuota_id, monto)
    values (v_pago_id, r.id, v_aplicar);   -- el trigger recalcula la cuota
    v_restante := v_restante - v_aplicar;
  end loop;

  return v_pago_id;
end;
$$;
