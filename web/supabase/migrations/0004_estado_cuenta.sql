-- =====================================================================
-- Migración 0004 — Campos para el Estado de Cuenta imprimible:
-- datos fiscales/contacto y bancarios del condominio + cuota mensual
-- de referencia ("prorrateo") por unidad.
-- =====================================================================

alter table condominio
  add column if not exists rfc            text,
  add column if not exists telefono       text,
  add column if not exists banco          text,
  add column if not exists cuenta         text,   -- no. de cuenta / CLABE
  add column if not exists titular_cuenta text,
  add column if not exists rfc_cuenta     text,
  add column if not exists correo_pago    text,
  add column if not exists observaciones  text;    -- nota al pie del estado de cuenta

-- Cuota mensual de referencia de la unidad (el "Prorrateo" del ejemplo).
alter table unidad
  add column if not exists cuota_mensual numeric(12,2) not null default 0;
