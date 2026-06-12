import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCondominio } from "@/lib/auth";
import { money, fecha } from "@/lib/format";
import { PrintButton } from "@/components/print-button";

export default async function EstadoCuentaImprimible({
  params,
}: {
  params: Promise<{ condominioId: string; unidadId: string }>;
}) {
  const { condominioId, unidadId } = await params;
  const { supabase, condominio } = await requireCondominio(condominioId);

  const { data: cond } = await supabase
    .from("condominio")
    .select(
      "nombre, direccion, ciudad, estado, rfc, telefono, banco, cuenta, titular_cuenta, rfc_cuenta, correo_pago, observaciones",
    )
    .eq("id", condominioId)
    .maybeSingle();

  const { data: unidad } = await supabase
    .from("unidad")
    .select("id, identificador, cuota_mensual")
    .eq("id", unidadId)
    .eq("condominio_id", condominioId)
    .maybeSingle();

  if (!unidad) notFound();

  const [{ data: residente }, { data: deudas }, { data: ultimoPago }] =
    await Promise.all([
      supabase
        .from("membresia")
        .select("persona:persona_id (nombre)")
        .eq("condominio_id", condominioId)
        .eq("unidad_id", unidadId)
        .eq("rol", "residente")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("cuota")
        .select("concepto, saldo, vence_el, creado_en")
        .eq("unidad_id", unidadId)
        .gt("saldo", 0)
        .order("vence_el", { ascending: true, nullsFirst: false }),
      supabase
        .from("pago")
        .select("monto, pagado_en, referencia")
        .eq("unidad_id", unidadId)
        .order("pagado_en", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const nombreResidente =
    (residente?.persona as unknown as { nombre: string } | null)?.nombre ?? "—";
  const total = (deudas ?? []).reduce((s, d) => s + Number(d.saldo || 0), 0);

  const ubicacion = [cond?.direccion, cond?.ciudad, cond?.estado]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-[13px] text-gray-800 print:p-0">
      {/* Barra de acciones (no se imprime) */}
      <div className="mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/dashboard/${condominioId}/unidades/${unidadId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver
        </Link>
        <PrintButton />
      </div>

      {/* Encabezado */}
      <div className="flex items-start justify-between border-b-2 border-emerald-600 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          ESTADO DE CUENTA
        </h1>
        <span className="text-lg font-semibold text-emerald-600">
          {condominio.nombre}
        </span>
      </div>

      <div className="mt-4">
        <p className="font-bold uppercase text-gray-900">{cond?.nombre}</p>
        {ubicacion && <p className="text-gray-600">{ubicacion}</p>}
        {cond?.rfc && <p className="text-gray-600">RFC: {cond.rfc}</p>}
        {cond?.telefono && <p className="text-gray-600">Tel: {cond.telefono}</p>}
      </div>

      {/* Datos de la unidad */}
      <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-1 rounded-lg bg-gray-50 p-4">
        <Dato label="Unidad" valor={unidad.identificador} />
        <Dato
          label="Folio último pago"
          valor={ultimoPago?.referencia ?? "—"}
        />
        <Dato label="Residente" valor={nombreResidente} />
        <Dato label="Último pago" valor={fecha(ultimoPago?.pagado_en)} />
        <Dato label="Prorrateo" valor={money(unidad.cuota_mensual)} />
        <Dato
          label="Monto último pago"
          valor={ultimoPago ? money(ultimoPago.monto) : "—"}
        />
      </div>

      {/* Detalle de deudas */}
      <h2 className="mt-6 rounded-t bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white">
        Detalle de deudas
      </h2>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-gray-300 text-xs uppercase text-gray-500">
            <th className="py-1.5">Concepto</th>
            <th className="py-1.5">Fecha</th>
            <th className="py-1.5 text-right">Monto</th>
          </tr>
        </thead>
        <tbody>
          {deudas && deudas.length > 0 ? (
            deudas.map((d, i) => (
              <tr key={i} className="border-b border-dashed border-gray-200">
                <td className="py-1.5">{d.concepto}</td>
                <td className="py-1.5 text-gray-600">
                  {fecha(d.vence_el ?? d.creado_en)}
                </td>
                <td className="py-1.5 text-right font-medium">
                  {money(d.saldo)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="py-4 text-center text-gray-500">
                Sin adeudos. ¡Al corriente!
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Total a pagar */}
      <div className="mt-4 flex items-stretch justify-end">
        <div className="flex items-center gap-6 rounded bg-emerald-500 px-5 py-3 text-white">
          <span className="text-sm font-medium">Total a pagar</span>
          <span className="text-xl font-bold">{money(total)}</span>
        </div>
      </div>

      {/* Observaciones / datos de pago */}
      {(cond?.banco ||
        cond?.cuenta ||
        cond?.observaciones ||
        cond?.titular_cuenta) && (
        <div className="mt-8 border-t border-emerald-600 pt-3">
          <p className="text-sm font-semibold text-gray-900">
            Observaciones de la administración
          </p>
          <p className="mt-2 text-gray-700">
            Para pagar por transferencia electrónica los datos son:
          </p>
          <div className="mt-1 text-gray-700">
            {cond?.banco && <p>Banco: {cond.banco}</p>}
            {cond?.cuenta && <p>Cuenta / CLABE: {cond.cuenta}</p>}
            {cond?.titular_cuenta && <p>Nombre: {cond.titular_cuenta}</p>}
            {cond?.rfc_cuenta && <p>RFC: {cond.rfc_cuenta}</p>}
            {cond?.correo_pago && <p>Correo: {cond.correo_pago}</p>}
          </div>
          {cond?.observaciones && (
            <p className="mt-2 text-gray-700">{cond.observaciones}</p>
          )}
        </div>
      )}
    </div>
  );
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="font-semibold text-emerald-700">{label}</span>
      <span className="text-right text-gray-800">{valor}</span>
    </div>
  );
}
