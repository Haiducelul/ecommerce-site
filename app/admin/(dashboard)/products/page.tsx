import Link from "next/link";
import { Plus, Package, Pencil } from "lucide-react";
import pool from "@/db";
import DeleteProductButton from "./DeleteProductButton";
import ProductsClient from "./ProductsClient";

// ─── Types ────────────────────────────────────────────────────────────────────

type Product = {
  id:         string;
  name:       string;
  category:   string;
  price:      string;   // NUMERIC comes back as string from pg
  stock:      number;
  image_url:  string | null;
  created_at: Date;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  laptop:      "Laptop",
  phone:       "Telefon",
  tablet:      "Tabletă",
  accessories: "Accesorii",
  desktop:     "Calculatoare",
  components:  "Componente",
};

const STOCK_BADGE = (stock: number) => {
  if (stock === 0)  return { label: "Epuizat",    cls: "bg-red-50    text-red-700    ring-red-200"    };
  if (stock <= 5)   return { label: "Stoc mic",   cls: "bg-amber-50  text-amber-700  ring-amber-200"  };
  return              { label: "În stoc",    cls: "bg-emerald-50 text-emerald-700 ring-emerald-200" };
};

function formatPrice(raw: string): string {
  return `${Number(raw).toLocaleString("ro-RO")} lei`;
}

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchProducts(): Promise<Product[]> {
  let client;
  try {
    client = await pool.connect();
    const result = await client.query<Product>(
      `SELECT id, name, category, price, stock, image_url, created_at
       FROM products
       ORDER BY created_at DESC`
    );
    return result.rows;
  } catch (err) {
    console.error("[admin/products] fetchProducts error:", err);
    return [];
  } finally {
    client?.release();
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function AdminProductsPage() {
  const products = await fetchProducts();

  return <ProductsClient products={products} />;
}
