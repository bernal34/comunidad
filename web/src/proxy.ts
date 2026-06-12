import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy-session";

// En Next.js 16 el "middleware" se llama Proxy. Refresca la sesión de Supabase
// y protege las rutas del dashboard en cada request.
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Todas las rutas excepto estáticos e imágenes.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
