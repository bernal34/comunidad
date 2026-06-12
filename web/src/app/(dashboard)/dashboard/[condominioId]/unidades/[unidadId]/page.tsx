import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCondominio } from "@/lib/auth";
import {
  money,
  fecha,
  etiquetaEstado,
  colorEstado,
} from "@/lib/format";
import { registrarPago } from "./actions";

const METODOS = ["transferencia", "tarjeta", "efectivo", "oxxo", "stp"];

export default async function EstadoCuentaPage({
  params,
}: {
  params: Promise<{ condominioId: string; unidadId: string }>;
}) {
  const { condominioId, unidadId } = await params;
  const { supabase, esAdmin } = await requireCondominio(condominioId);

  const { data: unidad } = await supabase
    .from("unidad")
    .select("id, identificador, tipo, alicuota")
    .eq("id", unidadId)
    .eq("condominio_id", condominioId)
    .maybeSingle();

  if (!unidad) notFound();

  const [{ data: cuotas }, { data: pagos }] = await Promise.all([
    supabase
      .from("cuota")
      .select("id, concepto, monto, saldo, estado, vence_el, creado_en")
      .eq("unidad_id", unidadId)
      .order("vence_el", { ascending: true, nullsFirst: false }),
    supabase
      .from("pago")
      .select("id, monto, metodo, referencia, pagado_en")
      .eq("unidad_id", unidadId)
      .order("pagado_en", { ascending: false }),
  ]);

  const saldoTotal = (cuotas ?? []).reduce(
    (s, c) => s + Number(c.saldo || 0),
    0,
  );

  const registrar = registrarPago.bind(null, condominioId, unidadId);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Unidad {unidad.identificador}
          </h2>
          <p className="text-sm capitalize text-gray-500">{unidad.tipo}</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs uppercase text-gray-500">Saldo</p>
            <p
              className={`text-2xl font-semibold ${
                saldoTotal > 0 ? "text-red-600" : "text-emerald-600"
              }`}
            >
              {money(saldoTotal)}
            </p>
          </div>
          <Link
            href={`/estado-cuenta/${condominioId}/${unidadId}`}
            className="rounded-lg border border-emerald-600 px-3 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
          >
            Estado de cuenta
          </Link>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
            Cuotas
          </h3>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Concepto</th>
                  <th className="px-4 py-2">Vence</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                  <th className="px-4 py-2 text-right">Saldo</th>
                  <th className="px-4 py-2">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cuotas && cuotas.length > 0 ? (
                  cuotas.map((c) => (
                    <tr key={c.id}>
                      <td className="px-4 py-2 text-gray-900">{c.concepto}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {fecha(c.vence_el)}
                      </td>
                      <td className="px-4 py-2 text-right text-gray-600">
                        {money(c.monto)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">
                        {money(c.saldo)}
                      </td>
                      <td className="px-4 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorEstado(
                            c.estado,
                          )}`}
                        >
                          {etiquetaEstado(c.estado)}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      Sin cuotas emitidas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <h3 className="mt-8 text-sm font-medium uppercase tracking-wide text-gray-500">
            Pagos
          </h3>
          <div className="mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2">Fecha</th>
                  <th className="px-4 py-2">Método</th>
                  <th className="px-4 py-2">Referencia</th>
                  <th className="px-4 py-2 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagos && pagos.length > 0 ? (
                  pagos.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-2 text-gray-600">
                        {fecha(p.pagado_en)}
                      </td>
                      <td className="px-4 py-2 capitalize text-gray-600">
                        {p.metodo ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {p.referencia ?? "—"}
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-emerald-700">
                        {money(p.monto)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-500">
                      Sin pagos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {esAdmin && (
          <div>
            <h3 className="text-sm font-medium uppercase tracking-wide text-gray-500">
              Registrar pago
            </h3>
            <form
              action={registrar}
              className="mt-2 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
            >
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
                name="metodo"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {METODOS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                name="referencia"
                placeholder="Referencia (opcional)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <button className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700">
                Registrar pago
              </button>
              <p className="text-xs text-gray-400">
                El pago se aplica automáticamente a las cuotas más antiguas.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
