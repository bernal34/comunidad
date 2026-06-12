import { requireCondominio } from "@/lib/auth";
import { money, nombreMes } from "@/lib/format";
import { emitirCuotas } from "./actions";

const TIPOS = ["mantenimiento", "extraordinaria", "consumo", "multa", "otro"];

export default async function CuotasPage({
  params,
}: {
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { supabase, esAdmin } = await requireCondominio(condominioId);

  // Resumen por periodo: total emitido y total cobrado.
  const { data: periodos } = await supabase
    .from("periodo")
    .select("id, anio, mes, cerrado")
    .eq("condominio_id", condominioId)
    .order("anio", { ascending: false })
    .order("mes", { ascending: false });

  const { data: cuotas } = await supabase
    .from("cuota")
    .select("periodo_id, monto, saldo")
    .eq("condominio_id", condominioId);

  const resumen = new Map<string, { emitido: number; saldo: number; n: number }>();
  for (const c of cuotas ?? []) {
    if (!c.periodo_id) continue;
    const r = resumen.get(c.periodo_id) ?? { emitido: 0, saldo: 0, n: 0 };
    r.emitido += Number(c.monto || 0);
    r.saldo += Number(c.saldo || 0);
    r.n += 1;
    resumen.set(c.periodo_id, r);
  }

  const ahora = new Date();
  const emitir = emitirCuotas.bind(null, condominioId);

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-gray-900">
          Cuotas por periodo
        </h2>
        <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Periodo</th>
                <th className="px-4 py-2 text-right">Cuotas</th>
                <th className="px-4 py-2 text-right">Emitido</th>
                <th className="px-4 py-2 text-right">Cobrado</th>
                <th className="px-4 py-2 text-right">Pendiente</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {periodos && periodos.length > 0 ? (
                periodos.map((p) => {
                  const r = resumen.get(p.id) ?? { emitido: 0, saldo: 0, n: 0 };
                  return (
                    <tr key={p.id}>
                      <td className="px-4 py-2 font-medium text-gray-900">
                        {nombreMes(p.mes)} {p.anio}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {r.n}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {money(r.emitido)}
                      </td>
                      <td className="px-4 py-2 text-right text-emerald-700">
                        {money(r.emitido - r.saldo)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {money(r.saldo)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    Aún no se han emitido cuotas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {esAdmin && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Emitir cuotas</h2>
          <form
            action={emitir}
            className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <div className="grid grid-cols-2 gap-3">
              <select
                name="mes"
                defaultValue={ahora.getMonth() + 1}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {nombreMes(m)}
                  </option>
                ))}
              </select>
              <input
                name="anio"
                type="number"
                defaultValue={ahora.getFullYear()}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <input
              name="concepto"
              required
              defaultValue="Cuota de mantenimiento"
              placeholder="Concepto"
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
              name="monto"
              type="number"
              step="0.01"
              min="0.01"
              required
              placeholder="Monto"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <select
              name="modo"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="fijo">Monto fijo por unidad</option>
              <option value="alicuota">Proporcional a la alícuota</option>
            </select>
            <label className="block text-xs text-gray-500">
              Vencimiento
              <input
                name="vence_el"
                type="date"
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </label>
            <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              Emitir a todas las unidades
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
