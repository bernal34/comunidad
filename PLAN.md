# Plataforma de Administración de Condominios — Plan de Desarrollo

> SaaS multi-tenant para administración de condominios/edificios, inspirado en plataformas como ComunidadFeliz.
> **Stack:** Next.js (App Router) + Supabase (Postgres, Auth, Storage, RLS) + Vercel.
> **App residentes:** React Native (Expo) reutilizando la misma API/Supabase.

---

## 1. Objetivo del producto

Plataforma donde un **administrador** gestiona uno o varios condominios, emite y cobra cuotas de
mantenimiento, lleva contabilidad básica, y los **residentes** pagan, reservan amenidades, se comunican,
votan y controlan accesos (visitantes/proveedores/paquetería) desde web y app móvil.

### Roles del sistema
- **Super admin (plataforma):** gestiona cuentas/clientes del SaaS.
- **Administrador:** gestiona condominios, finanzas, residentes, configuración.
- **Comité / Consejo:** vista de lectura financiera + aprobaciones y votaciones.
- **Conserje / Seguridad:** registro de visitantes, proveedores y paquetería.
- **Residente / Propietario:** paga, reserva, se comunica, vota.

---

## 2. Alcance por fases

### Fase 0 — Cimientos (semana 1–2)
Infra, auth y multi-tenancy. **Sin esto nada lo demás funciona de forma segura.**
- Proyecto Supabase + Next.js + deploy en Vercel.
- Modelo multi-tenant con **Row Level Security (RLS)** por `condominio_id` / `org_id`.
- Auth (email/OTP + magic link), invitaciones, roles y permisos.
- Estructura de datos base: organización, condominio, torre/edificio, unidad, persona, membresía.
- Layout web (dashboard admin) + scaffolding app móvil.

### Fase 1 — Núcleo financiero (semana 3–6)  → *Plan Básico*
- **Emisión automática de cuotas de mantenimiento** (recurrencia mensual, prorrateo por alícuota/coeficiente).
- **Resumen de cobranza** (estado de cuenta por unidad, morosidad, antigüedad de saldos).
- **Recordatorios de deuda automáticos** (email + push + WhatsApp opcional).
- **Registro de ingresos y egresos** (catálogo de cuentas simple, categorías).
- **Reportería y balances automatizados** (estado de resultados, flujo de caja, deudores).
- **Gestión de medidores** (lecturas agua/luz/gas, consumo y cobro por consumo).
- **Pagos en línea**: tarjetas (Stripe / Mercado Pago / Conekta) + registro de pagos manuales.
  - *Pagos domiciliados*: suscripción/cargo recurrente con el PSP.

### Fase 2 — Comunidad (semana 7–10)  → *completa el alcance MVP*
- **Módulo de amenidades**: catálogo de espacios, calendario de reservas, reglas (cupos, horarios, costo, anticipación), aprobación.
- **Publicaciones y mensajería**: muro/avisos del condominio, notificaciones segmentadas, chat/mensajería con administración.
- **Registro de visitantes y proveedores**: invitaciones con QR, bitácora de accesos, foto opcional.
- **Registro de paquetería**: ingreso/entrega con aviso al residente y firma/QR de retiro.
- **Votaciones en línea**: asambleas, quórum, padrón con peso por alícuota, resultados y acta.

### Fase 3 — Add-ons México (post-MVP)  → *Plan +STP / +Facturación*
- **Reconocimiento automático de pagos (STP/SPEI)**: CLABEs individuales por unidad, webhook de abonos, conciliación automática.
- **Facturación CFDI 4.0**: integración con un **PAC** para timbrado SAT, complemento de pago, cancelaciones.

> Estos dos requieren contratos externos (institución financiera para STP, PAC autorizado para CFDI),
> por eso se separan del MVP.

---

## 3. Arquitectura

```
┌──────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Web Admin        │     │  App Residentes   │     │  Conserjería        │
│  Next.js (Vercel) │     │  Expo / RN        │     │  (web/tablet)       │
└─────────┬────────┘     └─────────┬────────┘     └─────────┬──────────┘
          │                        │                        │
          └────────────┬───────────┴────────────┬───────────┘
                       │   Supabase JS / API     │
              ┌────────▼─────────────────────────▼────────┐
              │   Supabase                                  │
              │   - Postgres + RLS (multi-tenant)           │
              │   - Auth (roles, invitaciones)              │
              │   - Storage (comprobantes, fotos, actas)    │
              │   - Edge Functions (cron cuotas, webhooks)  │
              └────────┬───────────────────────────┬───────┘
                       │                            │
              ┌────────▼─────────┐        ┌─────────▼──────────┐
              │ PSP pagos        │        │ Notificaciones      │
              │ (Stripe/Conekta) │        │ Email/Push/WhatsApp │
              └──────────────────┘        └─────────────────────┘
                       (Fase 3) STP/SPEI · PAC CFDI 4.0
```

### Decisiones clave
- **Multi-tenant por RLS**: cada fila lleva `condominio_id`; políticas RLS garantizan aislamiento. Más simple y barato que DB-por-tenant para empezar.
- **Trabajos programados**: Edge Functions + cron de Supabase para emisión mensual de cuotas y recordatorios.
- **Webhooks**: pagos del PSP y (Fase 3) abonos STP llegan a Edge Functions que concilian.
- **Auditoría**: tabla `audit_log` para acciones financieras sensibles.

---

## 4. Modelo de datos (núcleo, borrador)

```
organizacion (cliente SaaS)
  └─ condominio
       ├─ edificio/torre
       │    └─ unidad (depto/casa)  ── alicuota/coeficiente, estado
       ├─ persona ── usuario auth
       ├─ membresia (persona × unidad × rol: propietario/residente/comité)
       │
       ├─ periodo (mes contable)
       ├─ cuota (cargo por unidad/periodo: mantenimiento, extraordinaria, consumo)
       ├─ pago (abono) ── conciliacion → cuota(s)
       ├─ movimiento (ingreso/egreso, categoria)
       ├─ medidor ── lectura (periodo, valor) → cargo por consumo
       │
       ├─ amenidad ── reserva (unidad, fecha, estado)
       ├─ publicacion / mensaje
       ├─ visitante / proveedor / paquete (bitácora de acceso)
       └─ votacion ── opcion ── voto (con peso por alicuota)
audit_log
```

---

## 5. Stack técnico detallado

| Capa | Tecnología |
|---|---|
| Frontend web | Next.js 14+ (App Router), TypeScript, Tailwind, shadcn/ui |
| Estado/datos | TanStack Query + Supabase JS |
| App móvil | Expo (React Native), mismo backend Supabase |
| Backend | Supabase: Postgres, Auth, Storage, Edge Functions (Deno) |
| Pagos | Stripe o Conekta/Mercado Pago (México) |
| Notificaciones | Resend (email), Expo Push, WhatsApp Cloud API (opcional) |
| Reportes/PDF | Generación server-side (estado de cuenta, actas) |
| Infra/CI | Vercel (web), EAS (móvil), GitHub Actions |
| Observabilidad | Supabase logs + Sentry |

---

## 6. Próximos pasos inmediatos

1. Inicializar monorepo (`apps/web`, `apps/mobile`, `packages/shared`) o repo web primero.
2. Crear proyecto Supabase y definir esquema + políticas RLS de la Fase 0.
3. Implementar auth, organización/condominio/unidad y panel admin base.
4. Construir el ciclo financiero mínimo: emitir cuota → ver estado de cuenta → registrar pago → reporte.

---

## 7. Notas de cumplimiento (México)
- **CFDI 4.0**: requiere PAC autorizado por el SAT; manejar RFC, régimen fiscal y uso del CFDI.
- **STP/SPEI**: alta como participante o vía agregador; CLABEs individuales por unidad para auto-conciliación.
- **Protección de datos**: avisos de privacidad (LFPDPPP); resguardo de fotos de visitantes y datos personales.
