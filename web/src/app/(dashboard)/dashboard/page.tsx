import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { crearCondominio } from "./actions";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  // Condominios donde el usuario tiene membresía (sujeto a RLS).
  const { data: membresias } = await supabase
    .from("membresia")
    .select("rol, condominio:condominio_id (id, nombre, ciudad)");

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Panel</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100">
              Cerrar sesión
            </button>
          </form>
        </header>

        <section className="mt-8">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Tus condominios
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {membresias && membresias.length > 0 ? (
              membresias.map((m, i) => {
                const c = m.condominio as unknown as {
                  id: string;
                  nombre: string;
                  ciudad: string | null;
                };
                return (
                  <Link
                    key={i}
                    href={`/dashboard/${c?.id}`}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-emerald-300 hover:shadow"
                  >
                    <p className="font-medium text-gray-900">{c?.nombre}</p>
                    <p className="text-sm text-gray-500">{c?.ciudad}</p>
                    <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {m.rol}
                    </span>
                  </Link>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                Aún no administras ningún condominio. Crea el primero abajo.
              </p>
            )}
          </div>
        </section>

        <section className="mt-10 max-w-md">
          <h2 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Nuevo condominio
          </h2>
          <form
            action={crearCondominio}
            className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <input
              name="nombre"
              required
              placeholder="Nombre del condominio"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                name="ciudad"
                placeholder="Ciudad"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                name="estado"
                placeholder="Estado"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <input
              name="direccion"
              placeholder="Dirección (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Crear condominio
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
