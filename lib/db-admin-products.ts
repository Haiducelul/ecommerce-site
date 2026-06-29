/**
 * Admin-only product queries — server components / API routes only.
 */
import pool from "@/db";
import type { CategoryId } from "@/lib/products";

export type AdminEditProduct = {
  id:            string;
  name:          string;
  description:   string | null;
  price:         number;
  old_price:     number | null;
  stock:         number;
  category:      CategoryId;
  subcategory:   string | null;
  image_gallery: string[];
  /** Raw specifications from DB — plain text or JSONB array. */
  specs:         string | { label: string; value: string }[] | null;
};

type AdminEditProductRow = {
  id:             string;
  name:           string;
  description:    string | null;
  price:          string;
  old_price:      string | null;
  stock:          number;
  category:       CategoryId;
  subcategory:    string | null;
  image_gallery:  string[] | null;
  specifications: string | { label: string; value: string }[] | null;
};

/** Load a product for the admin edit form (no review/order JOINs). */
export async function getAdminProductForEdit(
  id: string
): Promise<AdminEditProduct | null> {
  const { rows } = await pool.query<AdminEditProductRow>(
    `SELECT id, name, description, price, old_price, stock, category, subcategory,
            image_gallery, specifications
     FROM products
     WHERE id = $1
     LIMIT 1`,
    [id]
  );

  const row = rows[0];
  if (!row) return null;

  return {
    id:            row.id,
    name:          row.name,
    description:   row.description,
    price:         Number(row.price),
    old_price:     row.old_price != null ? Number(row.old_price) : null,
    stock:         row.stock,
    category:      row.category,
    subcategory:   row.subcategory,
    image_gallery: Array.isArray(row.image_gallery) ? row.image_gallery : [],
    specs:         row.specifications ?? null,
  };
}
