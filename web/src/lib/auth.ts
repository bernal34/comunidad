import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

// Garantiza que haya un usuario autenticado; si no, redirige a /login.
export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// Carga un condominio al que el usuario tiene acceso (vía RLS) junto con su
// rol. Redirige al dashboard si no existe o no tiene acceso.
export async function requireCondominio(condominioId: string) {
  const { supabase, user } = await requireUser();

  const { data: condominio } = await supabase
    .from("condominio")
    .select("id, nombre, ciudad, estado, direccion")
    .eq("id", condominioId)
    .maybeSingle();

  if (!condominio) redirect("/dashboard");

  const { data: membresia } = await supabase
    .from("membresia")
    .select("rol")
    .eq("condominio_id", condominioId)
    .order("rol")
    .limit(1)
    .maybeSingle();

  return {
    supabase,
    user,
    condominio,
    rol: membresia?.rol as string | undefined,
    esAdmin: membresia?.rol === "administrador",
  };
}
