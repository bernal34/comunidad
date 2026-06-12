import { requireCondominio } from "@/lib/auth";
import { agregarResidente } from "./actions";

export default async function ResidentesPage({
  params,
}: {
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { supabase, esAdmin } = await requireCondominio(condominioId);

  const [{ data: residentes }, { data: unidades }] = await Promise.all([
    supabase
      .from("membresia")
      .select(
        "id, es_propietario, unidad:unidad_id (identificador), persona:persona_id (nombre, email, telefono)",
      )
      .eq("condominio_id", condominioId)
      .eq("rol", "residente")
      .order("creado_en", { ascending: false }),
    supabase
      .from("unidad")
      .select("id, identificador")
      .eq("condominio_id", condominioId)
      .order("identificador"),
  ]);

  const agregar = agregarResidente.bind(null, condominioId);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-gray-900">Residentes</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">Unidad</th>
                <th className="px-4 py-2">Contacto</th>
                <th className="px-4 py-2">Rol</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {residentes && residentes.length > 0 ? (
                residentes.map((m) => {
                  const persona = m.persona as unknown as {
                    nombre: string;
                    email: string | null;
                    telefono: string | null;
                  };
                  const unidad = m.unidad as unknown as {
                    identificador: string;
                  } | null;
                  return (
                    <tr key={m.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {persona?.nombre}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {unidad?.identificador ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {persona?.email ?? persona?.telefono ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {m.es_propietario ? "Propietario" : "Residente"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Aún no hay residentes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {esAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Agregar residente
          </h2>
          <form
            action={agregar}
            className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <input
              name="nombre"
              required
              placeholder="Nombre completo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              name="unidad_id"
              required
              defaultValue=""
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="" disabled>
                Unidad…
              </option>
              {(unidades ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.identificador}
                </option>
              ))}
            </select>
            <input
              name="email"
              type="email"
              placeholder="Correo (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              name="telefono"
              placeholder="Teléfono (opcional)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <input type="checkbox" name="es_propietario" />
              Es propietario
            </label>
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Agregar residente
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
