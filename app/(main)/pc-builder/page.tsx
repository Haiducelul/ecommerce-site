import PcBuilderClient from "./PcBuilderClient";
import pool from "@/db";
import type { SubcategoryId } from "@/lib/products";

export const revalidate = 0;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ComponentProduct = {
  id:          string;
  name:        string;
  price:       number;
  subcategory: SubcategoryId;
  image_url:   string | null;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchComponents(): Promise<ComponentProduct[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<{
      id: string; name: string; price: string; subcategory: string; image_url: string | null;
    }>(
      `SELECT id, name, price, subcategory, image_url
       FROM products
       WHERE category = 'components' AND subcategory IS NOT NULL AND stock > 0
       ORDER BY subcategory, name`
    );
    return rows.map((r: { id: string; name: string; price: string; subcategory: string; image_url: string | null; }) => ({
      id:          r.id,
      name:        r.name,
      price:       Number(r.price),
      subcategory: r.subcategory as SubcategoryId,
      image_url:   r.image_url,
    }));
  } catch (err) {
    console.error("[pc-builder] fetchComponents:", err);
    return [];
  } finally {
    client?.release();
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function PcBuilderPage() {
  const components = await fetchComponents();
  return <PcBuilderClient components={components} />;
}
