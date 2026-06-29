/**
 * lib/products.ts — browser-safe
 *
 * Only types, constants, and pure utility functions live here.
 * This file is imported by Client Components (Cart, Navbar, etc.) so it must
 * NEVER import `db.js`, `pg`, or any other Node.js-only module.
 *
 * DB-access functions live in lib/db-products.ts (Server Components only).
 */

// ─── Enums & labels ───────────────────────────────────────────────────────────

export type CategoryId = "laptop" | "phone" | "tablet" | "accessories" | "desktop" | "components";
export type StatusId   = "bestseller" | "ai" | "reduceri";

export type SubcategoryId =
  | "cpu"
  | "placa_baza"
  | "gpu"
  | "ram"
  | "sursa"
  | "carcasa"
  | "stocare";

export const SUBCATEGORY_LABELS: Record<SubcategoryId, string> = {
  cpu:        "CPU",
  placa_baza: "Placă de bază",
  gpu:        "GPU",
  ram:        "RAM",
  sursa:      "Sursă",
  carcasa:    "Carcasă",
  stocare:    "Stocare",
};

export const CATEGORY_LABELS: Record<CategoryId, string> = {
  laptop:      "Laptopuri",
  phone:       "Telefoane",
  tablet:      "Tablete",
  accessories: "Accesorii",
  desktop:     "Calculatoare",
  components:  "Componente",
};

export const STATUS_LABELS: Record<StatusId, string> = {
  bestseller: "Cel mai vândut",
  ai:         "Recomandări AI",
  reduceri:   "Reduceri",
};

export const STATUS_COLORS: Record<StatusId, string> = {
  bestseller: "bg-amber-50 text-amber-700 ring-amber-200",
  ai:         "bg-[#edf5f1]  text-[#1a4d3a]  ring-[#a8d7c5]",
  reduceri:   "bg-green-50 text-green-700 ring-green-200",
};

export type ProductBadge = {
  label: string;
  color: string;
};

export type ProductBadgeMetrics = {
  salesCount: number;
  reviewCount: number;
  createdAt: string | Date;
};

export function getProductBadges(metrics: ProductBadgeMetrics): ProductBadge[] {
  const badges: ProductBadge[] = [];

  if (metrics.salesCount >= 5) {
    badges.push({
      label: "Cel mai vândut",
      color: "bg-orange-100 text-orange-700 border-orange-200",
    });
  }

  if (metrics.reviewCount >= 4) {
    badges.push({
      label: "Cel mai apreciat",
      color: "bg-blue-100 text-blue-700 border-blue-200",
    });
  }

  const createdAt = new Date(metrics.createdAt);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  if (createdAt >= thirtyDaysAgo) {
    badges.push({
      label: "Nou",
      color: "bg-green-100 text-green-700 border-green-200",
    });
  }

  return badges;
}

// ─── Product type (mirrors the DB schema) ────────────────────────────────────

export type Product = {
  id:            string;
  name:          string;
  description:   string | null;
  price:         number;
  old_price:     number | null;
  stock:         number;
  category:      CategoryId;
  status:        StatusId;
  image_url:     string | null;
  image_gallery:  string[];
  /** Free-form specification text (one spec per line recommended). */
  specs:          string | null;
};

export type ProductWithMetrics = Product & {
  salesCount: number;
  reviewCount: number;
  created_at: string;
};

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return `${price.toLocaleString("ro-RO")} lei`;
}
