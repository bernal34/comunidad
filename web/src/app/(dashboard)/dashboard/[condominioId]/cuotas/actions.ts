"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function emitirCuotas(condominioId: string, formData: FormData) {
  const supabase = await createClient();

  const concepto = String(formData.get("concepto") ?? "").trim();
  const monto = Number(formData.get("monto") ?? 0);
  if (!concepto || !monto || monto <= 0) return;

  const { error } = await supabase.rpc("emitir_cuotas", {
    p_condominio_id: condominioId,
    p_anio: Number(formData.get("anio")),
    p_mes: Number(formData.get("mes")),
    p_tipo: String(formData.get("tipo") ?? "mantenimiento"),
    p_concepto: concepto,
    p_monto: monto,
    p_modo: String(formData.get("modo") ?? "fijo"),
    p_vence_el: String(formData.get("vence_el") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/${condominioId}/cuotas`);
}
