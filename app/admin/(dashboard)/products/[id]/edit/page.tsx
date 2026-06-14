import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import pool from "@/db";
import { dbPricesToFormValues } from "@/lib/admin-product-prices";
import type { ProductFormValues } from "@/lib/admin-product-form";
import ProductForm from "@/components/admin/ProductForm";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProductRow = {
  id:             string;
  name:           string;
  description:    string | null;
  price:          string;   // NUMERIC → string from pg
  old_price:      string | null;
  stock:          number;
  category:       "laptop" | "phone" | "tablet" | "accessories" | "desktop" | "components";
  subcategory:    string | null;
  image_url:      string | null;
  image_gallery:  string[];
  specifications: string | null;
};

// ─── Data fetching ────────────────────────────────────────────────────────────

async function fetchProduct(id: string): Promise<ProductRow | null> {
  let client;
  try {
    client = await pool.connect();
    const { rows } = await client.query<ProductRow>(
      `SELECT id, name, description, price, old_price, stock, category, subcategory, status,
              image_url, image_gallery, specifications
       FROM products WHERE id = $1 LIMIT 1`,
      [id]
    );
    return rows[0] ?? null;
  } catch (err) {
    console.error("[admin/products/edit] fetchProduct:", err);
    return null;
  } finally {
    client?.release();
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id }    = await params;
  const product   = await fetchProduct(id);

  if (!product) notFound();

  // Map DB row → decoupled form fields
  const priceFields = dbPricesToFormValues(product.price, product.old_price);

  // Parse specifications string into array of {label, value} objects
  const specsArray = (product.specifications ?? "")
    .split("\n")
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const parts = line.split(":");
      if (parts.length >= 2) {
        const label = parts[0].trim();
        const value = parts.slice(1).join(":").trim();
        return { label, value };
      }
      return { label: line.trim(), value: "" };
    });

  const defaultValues: Partial<ProductFormValues> = {
    name:           product.name,
    description:    product.description ?? "",
    ...priceFields,
    stock:          String(product.stock),
    category:       product.category,
    subcategory:    product.subcategory ?? "",
    image_gallery:  product.image_gallery.map((url) => ({ url })),
    specifications: specsArray,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/products"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-900"
          aria-label="Înapoi la produse"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Editează produs
          </h1>
          <p className="mt-0.5 truncate text-sm text-slate-500">{product.name}</p>
        </div>
      </div>

      <ProductForm productId={id} defaultValues={defaultValues} />
    </div>
  );
}
