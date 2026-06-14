/**
 * lib/db-products.ts — SERVER ONLY
 *
 * All PostgreSQL access for the products table lives here.
 * Import ONLY from Server Components, API routes, and server actions.
 * Never import this file from a Client Component — it pulls in `db.js`
 * and the `pg` package, which require Node.js-only modules (dns, net, etc.).
 */

import pool from "@/db";
import type { CatalogStatusSort } from "@/lib/catalog-filters";
import type { Product, StatusId } from "@/lib/products";

// ─── Internal row type ────────────────────────────────────────────────────────

/** Raw row shape returned by pg — NUMERIC arrives as string, specs aliased. */
type ProductRow = Omit<Product, "price" | "old_price" | "specs"> & {
  price:          string;
  old_price:      string | null;
  specifications: string | null;
};

type ProductRowWithReviewCount = ProductRow & {
  review_count: string;
};

export type CatalogProductRow = {
  id:            string;
  name:          string;
  price:         number;
  old_price:     number | null;
  stock:         number;
  category:      Product["category"];
  subcategory:   string | null;
  status:        Product["status"];
  image_url:     string | null;
  review_count:  number;
  units_sold:    number;
  created_at:    string;
};

function rowToProduct(row: ProductRow): Product {
  return {
    ...row,
    price:     Number(row.price),
    old_price: row.old_price != null ? Number(row.old_price) : null,
    specs:     row.specifications ?? null,
  };
}

const SELECT_COLS = `
  id, name, description, price, old_price, stock,
  category, status, image_url, image_gallery, specifications`;

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch a single product by its UUID.
 * Returns null when not found — callers should trigger notFound().
 */
export async function getProductById(id: string): Promise<Product | null> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS} FROM products WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows.length ? rowToProduct(rows[0]) : null;
  } catch (err) {
    console.error("[getProductById]", err);
    return null;
  } finally {
    client?.release();
  }
}

/**
 * Fetch the most recently created products (newest first).
 * Used by the home page "Produse noi" section.
 */
export async function getNewestProducts(limit = 4): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS}
       FROM products
       ORDER BY created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[getNewestProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Fetch products with the most reviews (descending).
 * Used by the home page "Recomandări" section.
 */
export async function getMostReviewedProducts(limit = 4): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT p.id, p.name, p.description, p.price, p.old_price, p.stock,
              p.category, p.status, p.image_url, p.image_gallery, p.specifications
       FROM products p
       LEFT JOIN reviews r ON r.product_id = p.id
       GROUP BY p.id
       ORDER BY COUNT(r.id) DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[getMostReviewedProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Fetch products with the highest total quantity sold (descending).
 * Used by the home page "Cele mai vândute" section.
 */
export async function getTopSellingProducts(limit = 4): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT p.id, p.name, p.description, p.price, p.old_price, p.stock,
              p.category, p.status, p.image_url, p.image_gallery, p.specifications
       FROM products p
       LEFT JOIN order_items oi ON oi.product_id = p.id
       GROUP BY p.id
       ORDER BY COALESCE(SUM(oi.quantity), 0) DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[getTopSellingProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Fetch up to `limit` products with the given status, newest-first.
 * Used by the home page sections (bestsellers, AI recommendations).
 */
export async function getProductsByStatus(
  status: StatusId,
  limit = 4
): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS}
       FROM products
       WHERE status = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [status, limit]
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[getProductsByStatus]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Fetch all products with live review counts (LEFT JOIN reviews).
 * Used by the catalog page server component.
 */
export async function getAllProducts(): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS} FROM products ORDER BY created_at DESC`
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[getAllProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}

type GetAllCatalogProductsOptions = {
  /** Sidebar "status special" sort mode from URL ?status=… */
  statusSort?: CatalogStatusSort;
};

function catalogOrderClause(statusSort?: CatalogStatusSort): string {
  switch (statusSort) {
    case "cele_mai_vandute":
      return "ORDER BY COALESCE(us.units_sold, 0) DESC, p.created_at DESC";
    case "recomandari":
      return "ORDER BY COALESCE(rc.review_count, 0) DESC, p.created_at DESC";
    case "noi":
      return "ORDER BY p.created_at DESC";
    default:
      return "ORDER BY p.created_at DESC";
  }
}

/**
 * Catalog listing: all products + review_count, units_sold (sales), created_at.
 * Optional statusSort applies ORDER BY for sidebar filters (noi / recomandari / cele_mai_vandute).
 */
export async function getAllCatalogProducts(
  options: GetAllCatalogProductsOptions = {}
): Promise<CatalogProductRow[]> {
  const orderClause = catalogOrderClause(options.statusSort);

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<
      ProductRowWithReviewCount & { units_sold: string; created_at: Date }
    >(
      `SELECT p.id, p.name, p.description, p.price, p.old_price, p.stock,
              p.category, p.subcategory, p.status, p.image_url, p.image_gallery, p.specifications,
              p.created_at,
              COALESCE(rc.review_count, 0) AS review_count,
              COALESCE(us.units_sold, 0) AS units_sold
       FROM products p
       LEFT JOIN (
         SELECT product_id, COUNT(*)::int AS review_count
         FROM reviews
         GROUP BY product_id
       ) rc ON rc.product_id = p.id
       LEFT JOIN (
         SELECT product_id, COALESCE(SUM(quantity), 0)::int AS units_sold
         FROM order_items
         GROUP BY product_id
       ) us ON us.product_id = p.id
       ${orderClause}`
    );
    return rows.map((row) => ({
      id:           String(row.id),
      name:         row.name,
      price:        Number(row.price),
      old_price:    row.old_price != null ? Number(row.old_price) : null,
      stock:        Number(row.stock ?? 0),
      category:     row.category,
      subcategory:  row.subcategory ?? null,
      status:       row.status,
      image_url:    row.image_url,
      review_count: Number(row.review_count),
      units_sold:   Number(row.units_sold),
      created_at:   new Date(row.created_at).toISOString(),
    }));
  } catch (err) {
    console.error("[getAllCatalogProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}

export type ProductCatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
};

/**
 * Lightweight catalog for AI product matching (id, name, description, price only).
 */
export async function getProductCatalogForAi(): Promise<ProductCatalogItem[]> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<{
      id: string;
      name: string;
      description: string | null;
      price: string;
    }>(
      `SELECT id, name, description, price
       FROM products
       ORDER BY created_at DESC`
    );

    return rows.map(
      (row: {
        id: string;
        name: string;
        description: string | null;
        price: string;
      }) => ({
        id:          String(row.id),
        name:        row.name,
        description: row.description,
        price:       Number(row.price),
      })
    );
  } catch (err) {
    console.error("[getProductCatalogForAi]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Fetch products by id list. Results follow the order of `ids` (unknown ids are skipped).
 */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS} FROM products WHERE id = ANY($1::uuid[])`,
      [ids]
    );

    const byId = new Map(
      rows.map((row: ProductRow) => [String(row.id), rowToProduct(row)])
    );
    return ids
      .map((id) => byId.get(id))
      .filter((product): product is Product => product != null);
  } catch (err) {
    console.error("[getProductsByIds]", err);
    return [];
  } finally {
    client?.release();
  }
}

/**
 * Search products by name or description (case-insensitive).
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const pattern = `%${trimmed.replace(/[%_\\]/g, "\\$&")}%`;

  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT ${SELECT_COLS}
       FROM products
       WHERE name ILIKE $1 OR description ILIKE $1
       ORDER BY created_at DESC`,
      [pattern]
    );
    return rows.map(rowToProduct);
  } catch (err) {
    console.error("[searchProducts]", err);
    return [];
  } finally {
    client?.release();
  }
}
