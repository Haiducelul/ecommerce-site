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
  bestseller: "Bestseller",
  ai:         "Recomandări AI",
  reduceri:   "Reduceri",
};

export const STATUS_COLORS: Record<StatusId, string> = {
  bestseller: "bg-amber-50 text-amber-700 ring-amber-200",
  ai:         "bg-[#edf5f1]  text-[#1a4d3a]  ring-[#a8d7c5]",
  reduceri:   "bg-green-50 text-green-700 ring-green-200",
};

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

/*
 * Reference: one complete product record as it should look in the DB.
 * Seed real products via the admin panel at /admin/products/new.
 *
 * {
 *   id: "uuid",
 *   name: "Laptop ASUS Vivobook 15 OLED",
 *   description: "Ecran OLED 15.6 inch Full HD…",
 *   price: 3299,
 *   stock: 12,
 *   category: "laptop",
 *   status: "bestseller",
 *   image_url: "https://example.com/images/asus-vivobook.jpg",
 *   image_gallery: ["https://…/img1.jpg", "https://…/img2.jpg"],
 *   specifications: [
 *     { label: "Procesor", value: "Intel Core i5-13500H" },
 *     { label: "RAM",      value: "16 GB DDR4" },
 *   ],
 * }
 */

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatPrice(price: number): string {
  return `${price.toLocaleString("ro-RO")} lei`;
}
