# Plataforma de Administración de Condominios — App Web

Next.js 16 (App Router) + Supabase + Tailwind. Ver el [plan de desarrollo](../PLAN.md) en la raíz del repo.

## Requisitos
- Node 20+ y pnpm
- Un proyecto de [Supabase](https://supabase.com)

## Configuración

1. Instala dependencias:
   ```bash
   pnpm install
   ```

2. Copia las variables de entorno y complétalas:
   ```bash
   cp .env.example .env.local
   ```
   Obtén `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` en
   *Project Settings → API* de tu proyecto Supabase.

3. Aplica el esquema. Con la [CLI de Supabase](https://supabase.com/docs/guides/cli):
   ```bash
   supabase db push          # aplica supabase/migrations/*.sql
   psql "$DATABASE_URL" -f supabase/seed.sql   # datos demo (opcional)
   ```
   O pega el contenido de `supabase/migrations/*.sql` (en orden) en el
   *SQL Editor* del panel de Supabase.

4. Configura el redirect de auth en Supabase: *Authentication → URL
   Configuration* agrega `http://localhost:3000/auth/callback`.

5. Arranca el dev server:
   ```bash
   pnpm dev
   ```

## Estructura

```
src/
  app/
    page.tsx                 # landing
    (auth)/login/            # inicio de sesión (magic link)
    auth/callback/           # intercambio de código OAuth/OTP
    auth/signout/            # cierre de sesión
    (dashboard)/dashboard/   # panel protegido
  lib/supabase/
    client.ts                # cliente para el navegador
    server.ts                # cliente para Server Components / Actions
    proxy-session.ts         # refresco de sesión + guardas de ruta
  proxy.ts                   # "middleware" de Next 16 (Proxy)
supabase/
  migrations/                # esquema versionado (RLS multi-tenant)
  seed.sql                   # datos de ejemplo
```

## Modelo de datos (resumen)
`organizacion → condominio → edificio → unidad`, con `persona` (ligada a
`auth.users`) y `membresia` que asigna rol por condominio. Núcleo financiero:
`periodo`, `cuota`, `pago`, `aplicacion_pago`, `movimiento`, `medidor`,
`lectura`. Todo aislado por condominio vía **Row Level Security**.

## Estado actual
- [x] Fase 0 — Multi-tenancy, auth, RLS, panel base
- [x] Fase 1a — CRUD de condominios, unidades y residentes
- [x] Fase 1b — Emisión de cuotas, estado de cuenta y registro de pagos (conciliación FIFO)
- [ ] Fase 1c — Movimientos (ingresos/egresos), medidores y reportes/balances
- [ ] Fase 2 — Comunidad (amenidades, mensajería, accesos, votaciones)
- [ ] Fase 3 — Add-ons MX (STP/SPEI, CFDI 4.0)

### Operaciones disponibles (RPCs SQL, security definer)
- `crear_condominio` — onboarding: crea organización + condominio y deja al usuario como administrador.
- `agregar_residente` — crea/reutiliza persona-contacto y la vincula a una unidad.
- `emitir_cuotas` — emisión masiva por periodo (monto fijo o proporcional a la alícuota).
- `registrar_pago` — registra el abono y lo concilia FIFO contra las cuotas más antiguas.
