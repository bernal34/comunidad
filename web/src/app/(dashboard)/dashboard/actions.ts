"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function crearCondominio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const nombre = String(formData.get("nombre") ?? "").trim();
  if (!nombre) return;

  const { data, error } = await supabase.rpc("crear_condominio", {
    p_nombre_condominio: nombre,
    p_ciudad: String(formData.get("ciudad") ?? "").trim() || null,
    p_estado: String(formData.get("estado") ?? "").trim() || null,
    p_direccion: String(formData.get("direccion") ?? "").trim() || null,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  redirect(`/dashboard/${data}`);
}
