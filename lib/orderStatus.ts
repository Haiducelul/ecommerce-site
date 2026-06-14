export const ORDER_STATUS_VALUES = [
  "Plasată",
  "În procesare",
  "Expediată",
  "Livrată",
  "Anulată",
  "Retur",
] as const;

export type OrderStatus = (typeof ORDER_STATUS_VALUES)[number];

const STATUS_BADGE: Record<OrderStatus, string> = {
  "Plasată": "bg-slate-50 text-slate-700 ring-slate-200",
  "În procesare": "bg-amber-50 text-amber-700 ring-amber-200",
  "Expediată": "bg-violet-50 text-violet-700 ring-violet-200",
  "Livrată": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "Anulată": "bg-rose-50 text-rose-700 ring-rose-200",
  "Retur": "bg-orange-50 text-orange-700 ring-orange-200",
};

const STATUS_DOT: Record<OrderStatus, string> = {
  "Plasată": "bg-slate-500",
  "În procesare": "bg-amber-500",
  "Expediată": "bg-violet-500",
  "Livrată": "bg-emerald-500",
  "Anulată": "bg-rose-500",
  "Retur": "bg-orange-500",
};

/** e.g. "în procesare" → "În procesare" */
export function formatOrderStatus(status: string): string {
  const trimmed = status.trim();
  if (!trimmed) return trimmed;
  const lower = trimmed.toLocaleLowerCase("ro-RO");
  return lower.charAt(0).toLocaleUpperCase("ro-RO") + lower.slice(1);
}

export function getStatusBadgeClass(status: string): string {
  return (
    STATUS_BADGE[status as OrderStatus] ??
    "bg-slate-50 text-slate-600 ring-slate-200"
  );
}

export function getStatusDotClass(status: string): string {
  return STATUS_DOT[status as OrderStatus] ?? "bg-slate-400";
}
