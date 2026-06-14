import ProductsPageClient, {
  type ProductSearchParams,
  type CatalogProduct,
} from "./ProductsPageClient";
import { resolveCatalogStatusSort } from "@/lib/catalog-filters";
import { getAllCatalogProducts } from "@/lib/db-products";
import type { SubcategoryId } from "@/lib/products";

// Always fetch fresh data — bypasses Next.js full-route cache.
export const revalidate = 0;

type ProductsPageProps = {
  searchParams: Promise<ProductSearchParams>;
};

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const statusSort = resolveCatalogStatusSort(params.status, params.sort);
  const allProducts = await getAllCatalogProducts({ statusSort });

  // Debug: log raw stock values from DB so they appear in the server terminal.
  console.log(
    "[ProductsPage] stock from DB:",
    allProducts.map((p) => ({ name: p.name, stock: p.stock }))
  );

  const products: CatalogProduct[] = allProducts.map((p) => ({
    id:           p.id,
    name:         p.name,
    price:        p.price,
    old_price:    p.old_price,
    stock:        p.stock,
    category:     p.category,
    subcategory:  (p.subcategory as SubcategoryId | null) ?? undefined,
    status:       p.status,
    image_url:    p.image_url,
    review_count: p.review_count,
    units_sold:   p.units_sold,
    created_at:   p.created_at,
  }));

  return <ProductsPageClient initialParams={params} products={products} />;
}
