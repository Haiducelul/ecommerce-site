import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAdminProductForEdit } from "@/lib/db-admin-products";
import { dbPricesToFormValues } from "@/lib/admin-product-prices";
import { parseSpecificationsForForm } from "@/lib/admin-product-specs";
import type { ProductFormValues } from "@/lib/admin-product-form";
import ProductForm from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;

  if (!id?.trim()) notFound();

  let product;
  try {
    product = await getAdminProductForEdit(id.trim());
  } catch (err) {
    console.error("[admin/products/edit] load failed:", err);
    throw err;
  }

  if (!product) notFound();

  const priceFields = dbPricesToFormValues(
    String(product.price),
    product.old_price != null ? String(product.old_price) : null
  );

  const defaultValues: Partial<ProductFormValues> = {
    name:           product.name,
    description:    product.description ?? "",
    ...priceFields,
    stock:          String(product.stock),
    category:       product.category,
    subcategory:    product.subcategory ?? "",
    image_gallery:  product.image_gallery.map((url) => ({ url })),
    specifications: parseSpecificationsForForm(product.specs),
  };

  return (
    <div className="space-y-6">
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
