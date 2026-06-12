import Link from "next/link";
import { requireCondominio } from "@/lib/auth";
import { money } from "@/lib/format";

export default async function ResumenPage({
  params,
}: {
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { supabase } = await requireCondominio(condominioId);

  const [{ count: unidades }, { count: residentes }, { data: cuotas }] =
    await Promise.all([
      supabase
        .from("unidad")
        .select("id", { count: "exact", head: true })
        .eq("condominio_id", condominioId),
      supabase
        .from("membresia")
        .select("id", { count: "exact", head: true })
        .eq("condominio_id", condominioId)
        .eq("rol", "residente"),
      supabase
        .from("cuota")
        .select("saldo, estado")
        .eq("condominio_id", condominioId),
    ]);

  const porCobrar = (cuotas ?? []).reduce(
    (s, c) => s + Number(c.saldo || 0),
    0,
  );
  const morosas = (cuotas ?? []).filter(
    (c) => c.estado === "vencida" || c.estado === "parcial",
  ).length;

  const tarjetas = [
    { label: "Unidades", valor: unidades ?? 0 },
    { label: "Residentes", valor: residentes ?? 0 },
    { label: "Por cobrar", valor: money(porCobrar) },
    { label: "Cuotas morosas", valor: morosas },
  ];

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tarjetas.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
          >
            <p className="text-xs uppercase tracking-wide text-gray-500">
              {t.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {t.valor}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Link
          href={`/dashboard/${condominioId}/unidades`}
          className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-800 shadow-sm hover:border-emerald-300"
        >
          → Gestionar unidades
        </Link>
        <Link
          href={`/dashboard/${condominioId}/residentes`}
          className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-800 shadow-sm hover:border-emerald-300"
        >
          → Gestionar residentes
        </Link>
        <Link
          href={`/dashboard/${condominioId}/cuotas`}
          className="rounded-xl border border-gray-200 bg-white p-5 text-sm font-medium text-gray-800 shadow-sm hover:border-emerald-300"
        >
          → Emitir cuotas
        </Link>
      </div>
    </div>
  );
}
