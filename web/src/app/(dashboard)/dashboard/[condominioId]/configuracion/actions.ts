"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

function v(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim() || null;
}

export async function guardarConfiguracion(
  condominioId: string,
  formData: FormData,
) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("condominio")
    .update({
      nombre: String(formData.get("nombre") ?? "").trim(),
      direccion: v(formData, "direccion"),
      ciudad: v(formData, "ciudad"),
      estado: v(formData, "estado"),
      rfc: v(formData, "rfc"),
      telefono: v(formData, "telefono"),
      banco: v(formData, "banco"),
      cuenta: v(formData, "cuenta"),
      titular_cuenta: v(formData, "titular_cuenta"),
      rfc_cuenta: v(formData, "rfc_cuenta"),
      correo_pago: v(formData, "correo_pago"),
      observaciones: v(formData, "observaciones"),
    })
    .eq("id", condominioId);

  if (error) throw new Error(error.message);
  revalidatePath(`/dashboard/${condominioId}/configuracion`);
}
