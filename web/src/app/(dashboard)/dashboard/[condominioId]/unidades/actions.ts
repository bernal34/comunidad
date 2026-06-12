"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function crearUnidad(condominioId: string, formData: FormData) {
  const supabase = await createClient();

  const identificador = String(formData.get("identificador") ?? "").trim();
  if (!identificador) return;

  const { error } = await supabase.from("unidad").insert({
    condominio_id: condominioId,
    identificador,
    tipo: String(formData.get("tipo") ?? "departamento"),
    alicuota: Number(formData.get("alicuota") ?? 0) || 0,
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/${condominioId}/unidades`);
}
