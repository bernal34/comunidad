// Utilidades de formato (es-MX).

export function money(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? parseFloat(n) : (n ?? 0);
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  }).format(v || 0);
}

export function fecha(d: string | Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(d));
}

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function nombreMes(mes: number): string {
  return MESES[mes - 1] ?? String(mes);
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  pagada: "Pagada",
  vencida: "Vencida",
  anulada: "Anulada",
};

export function etiquetaEstado(estado: string): string {
  return ETIQUETA_ESTADO[estado] ?? estado;
}

export function colorEstado(estado: string): string {
  switch (estado) {
    case "pagada":
      return "bg-emerald-50 text-emerald-700";
    case "parcial":
      return "bg-amber-50 text-amber-700";
    case "vencida":
      return "bg-red-50 text-red-700";
    case "anulada":
      return "bg-gray-100 text-gray-500";
    default:
      return "bg-gray-50 text-gray-600";
  }
}
