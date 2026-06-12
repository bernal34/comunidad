import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-50 p-8 text-center">
      <h1 className="text-3xl font-bold text-gray-900">
        Administración de Condominios
      </h1>
      <p className="mt-3 max-w-md text-gray-500">
        Cuotas, cobranza, amenidades, comunicación y votaciones en una sola
        plataforma.
      </p>
      <Link
        href="/login"
        className="mt-6 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        Entrar
      </Link>
    </main>
  );
}
