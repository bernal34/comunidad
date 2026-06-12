import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
                  <div
                    key={i}
                    className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                  >
                    <p className="font-medium text-gray-900">{c?.nombre}</p>
                    <p className="text-sm text-gray-500">{c?.ciudad}</p>
                    <span className="mt-2 inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {m.rol}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-gray-500">
                Aún no perteneces a ningún condominio.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
