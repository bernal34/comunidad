import Link from "next/link";
import { requireCondominio } from "@/lib/auth";

export default async function CondominioLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ condominioId: string }>;
}) {
  const { condominioId } = await params;
  const { condominio, rol, esAdmin } = await requireCondominio(condominioId);

  const base = `/dashboard/${condominioId}`;
  const nav = [
    { href: base, label: "Resumen" },
    { href: `${base}/unidades`, label: "Unidades" },
    { href: `${base}/residentes`, label: "Residentes" },
    { href: `${base}/cuotas`, label: "Cuotas" },
    ...(esAdmin ? [{ href: `${base}/configuracion`, label: "Configuración" }] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <Link href="/dashboard" className="text-xs text-gray-400 hover:text-gray-600">
              ← Mis condominios
            </Link>
            <h1 className="text-lg font-semibold text-gray-900">
              {condominio.nombre}
            </h1>
          </div>
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            {rol}
          </span>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-1 px-4">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="border-b-2 border-transparent px-3 py-2 text-sm text-gray-600 hover:border-emerald-500 hover:text-emerald-700"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">{children}</main>
    </div>
  );
}
