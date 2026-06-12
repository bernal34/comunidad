"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function registrarPago(
  condominioId: string,
  unidadId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const monto = Number(formData.get("monto") ?? 0);
  if (!monto || monto <= 0) return;

  const { error } = await supabase.rpc("registrar_pago", {
    p_condominio_id: condominioId,
    p_unidad_id: unidadId,
    p_monto: monto,
    p_metodo: String(formData.get("metodo") ?? "").trim() || null,
    p_referencia: String(formData.get("referencia") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/${condominioId}/unidades/${unidadId}`);
}
