import Link from "next/link";
import { requireCondominio } from "@/lib/auth";
import { crearUnidad } from "./actions";

const TIPOS = ["departamento", "casa", "local", "estacionamiento", "bodega"];

export default async function UnidadesPage({
  params,
}: {
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { supabase, esAdmin } = await requireCondominio(condominioId);

  const { data: unidades } = await supabase
    .from("unidad")
    .select("id, identificador, tipo, alicuota, estado")
    .eq("condominio_id", condominioId)
    .order("identificador");

  const crear = crearUnidad.bind(null, condominioId);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-gray-900">Unidades</h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Identificador</th>
                <th className="px-4 py-2">Tipo</th>
                <th className="px-4 py-2 text-right">Alícuota %</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {unidades && unidades.length > 0 ? (
                unidades.map((u) => (
                  <tr key={u.id}>
                    <td className="px-4 py-2 font-medium text-gray-900">
                      {u.identificador}
                    </td>
                    <td className="px-4 py-2 capitalize text-gray-600">
                      {u.tipo}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {Number(u.alicuota).toFixed(2)}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <Link
                        href={`/dashboard/${condominioId}/unidades/${u.id}`}
                        className="text-emerald-600 hover:underline"
                      >
                        Estado de cuenta
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                    Aún no hay unidades.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {esAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Nueva unidad</h2>
          <form
            action={crear}
            className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <input
              name="identificador"
              required
              placeholder="Identificador (101, A-3…)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              name="tipo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              name="alicuota"
              type="number"
              step="0.000001"
              min="0"
              placeholder="Alícuota % (ej. 8.5)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <input
              name="cuota_mensual"
              type="number"
              step="0.01"
              min="0"
              placeholder="Cuota mensual / prorrateo (ej. 4125)"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Agregar unidad
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
