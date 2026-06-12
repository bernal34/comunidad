"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function agregarResidente(
  condominioId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const unidadId = String(formData.get("unidad_id") ?? "").trim();
  if (!nombre || !unidadId) return;

  const { error } = await supabase.rpc("agregar_residente", {
    p_condominio_id: condominioId,
    p_unidad_id: unidadId,
    p_nombre: nombre,
    p_email: String(formData.get("email") ?? "").trim() || null,
    p_telefono: String(formData.get("telefono") ?? "").trim() || null,
    p_es_propietario: formData.get("es_propietario") === "on",
  });

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/${condominioId}/residentes`);
}
