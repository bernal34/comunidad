import { redirect } from "next/navigation";
import { requireCondominio } from "@/lib/auth";
import { guardarConfiguracion } from "./actions";

const input =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500";

export default async function ConfiguracionPage({
  params,
}: {
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { supabase, esAdmin } = await requireCondominio(condominioId);
  if (!esAdmin) redirect(`/dashboard/${condominioId}`);

  const { data: c } = await supabase
    .from("condominio")
    .select(
      "nombre, direccion, ciudad, estado, rfc, telefono, banco, cuenta, titular_cuenta, rfc_cuenta, correo_pago, observaciones",
    )
    .eq("id", condominioId)
    .maybeSingle();

  const guardar = guardarConfiguracion.bind(null, condominioId);

  return (
    <form action={guardar} className="max-w-2xl space-y-8">
      <section>
        <h2 className="text-lg font-semibold text-gray-900">Datos del condominio</h2>
        <p className="text-sm text-gray-500">
          Aparecen en el encabezado del estado de cuenta.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <label className="block text-xs text-gray-500">
            Nombre
            <input name="nombre" required defaultValue={c?.nombre ?? ""} className={`mt-1 ${input}`} />
          </label>
          <label className="block text-xs text-gray-500">
            Dirección
            <input name="direccion" defaultValue={c?.direccion ?? ""} className={`mt-1 ${input}`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-gray-500">
              Ciudad
              <input name="ciudad" defaultValue={c?.ciudad ?? ""} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs text-gray-500">
              Estado
              <input name="estado" defaultValue={c?.estado ?? ""} className={`mt-1 ${input}`} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-gray-500">
              RFC
              <input name="rfc" defaultValue={c?.rfc ?? ""} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs text-gray-500">
              Teléfono
              <input name="telefono" defaultValue={c?.telefono ?? ""} className={`mt-1 ${input}`} />
            </label>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-900">Datos para pago</h2>
        <p className="text-sm text-gray-500">
          Se muestran en las observaciones del estado de cuenta.
        </p>
        <div className="mt-3 space-y-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-gray-500">
              Banco
              <input name="banco" defaultValue={c?.banco ?? ""} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs text-gray-500">
              Cuenta / CLABE
              <input name="cuenta" defaultValue={c?.cuenta ?? ""} className={`mt-1 ${input}`} />
            </label>
          </div>
          <label className="block text-xs text-gray-500">
            Titular de la cuenta
            <input name="titular_cuenta" defaultValue={c?.titular_cuenta ?? ""} className={`mt-1 ${input}`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs text-gray-500">
              RFC del titular
              <input name="rfc_cuenta" defaultValue={c?.rfc_cuenta ?? ""} className={`mt-1 ${input}`} />
            </label>
            <label className="block text-xs text-gray-500">
              Correo para comprobantes
              <input name="correo_pago" type="email" defaultValue={c?.correo_pago ?? ""} className={`mt-1 ${input}`} />
            </label>
          </div>
          <label className="block text-xs text-gray-500">
            Observaciones
            <textarea
              name="observaciones"
              rows={3}
              defaultValue={c?.observaciones ?? ""}
              placeholder="Ej. Enviar el comprobante indicando el no. de la unidad. Muchas gracias."
              className={`mt-1 ${input}`}
            />
          </label>
        </div>
      </section>

      <button className="rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700">
        Guardar cambios
      </button>
    </form>
  );
}
