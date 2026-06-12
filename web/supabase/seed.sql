-- =====================================================================
-- Datos de ejemplo para desarrollo local.
-- Ejecutar DESPUÉS de las migraciones. Crea una organización, un
-- condominio, un edificio y algunas unidades de prueba.
-- Las personas/membresías se crean al registrar usuarios reales (trigger),
-- por lo que aquí solo sembramos la estructura del inmueble.
-- =====================================================================

with org as (
  insert into organizacion (nombre, rfc)
  values ('Administradora Demo', 'XAXX010101000')
  returning id
), cond as (
  insert into condominio (organizacion_id, nombre, direccion, ciudad, estado)
  select id, 'Residencial Las Palmas', 'Av. Reforma 100', 'CDMX', 'Ciudad de México'
  from org
  returning id
), edif as (
  insert into edificio (condominio_id, nombre)
  select id, 'Torre A' from cond
  returning id, condominio_id
)
insert into unidad (condominio_id, edificio_id, identificador, tipo, alicuota)
select e.condominio_id, e.id, u.ident, 'departamento', u.alic
from edif e
cross join (values
  ('101', 8.500),
  ('102', 8.500),
  ('201', 8.500),
  ('202', 8.500)
) as u(ident, alic);
