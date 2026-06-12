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
- [ ] Fase 1 — Núcleo financiero (esquema listo; UI pendiente)
- [ ] Fase 2 — Comunidad (amenidades, mensajería, accesos, votaciones)
- [ ] Fase 3 — Add-ons MX (STP/SPEI, CFDI 4.0)
