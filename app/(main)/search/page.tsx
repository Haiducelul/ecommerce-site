import Link from "next/link";
import { headers } from "next/headers";
import { Search, Sparkles } from "lucide-react";
import ProductCard from "@/components/ProductCard";
import { getProductsByIds, searchProducts } from "@/lib/db-products";
import { formatPrice } from "@/lib/products";
import type { Product } from "@/lib/products";

type SearchPageProps = {
  searchParams: Promise<{ q?: string; mode?: string }>;
};

type AiSearchResponse = {
  recommendedIds: string[];
  explanation: string;
  error?: string;
};

async function fetchAiSearch(query: string): Promise<AiSearchResponse | null> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const protocol = h.get("x-forwarded-proto") ?? "http";

  try {
    const res = await fetch(`${protocol}://${host}/api/search/ai`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ query }),
      cache:   "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        recommendedIds: [],
        explanation:    data.error ?? "Căutarea AI a eșuat.",
      };
    }

    return data as AiSearchResponse;
  } catch {
    return {
      recommendedIds: [],
      explanation:    "Nu s-a putut contacta serviciul de căutare AI.",
    };
  }
}

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <div key={product.id} className="flex h-full min-h-0 w-full">
          <ProductCard
            id={product.id}
            title={product.name}
            price={formatPrice(product.price)}
            priceRaw={product.price}
            oldPrice={product.old_price}
            detailHref={`/product/${product.id}`}
            imageUrl={product.image_url}
            stock={product.stock}
            category={product.category}
          />
        </div>
      ))}
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, mode } = await searchParams;
  const query = q?.trim() ?? "";
  const isAiMode = mode === "ai";

  let products: Product[] = [];
  let aiExplanation: string | null = null;

  if (query) {
    if (isAiMode) {
      const aiResult = await fetchAiSearch(query);
      aiExplanation = aiResult?.explanation ?? null;
      const ids = aiResult?.recommendedIds ?? [];
      products = await getProductsByIds(ids);
    } else {
      products = await searchProducts(query);
    }
  }

  return (
    <div className="mx-auto w-[90%] max-w-[1400px] flex-1 px-4 py-8 sm:px-6">
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">
          {isAiMode ? (
            <Sparkles className="size-7 text-violet-600" strokeWidth={2} aria-hidden />
          ) : (
            <Search className="size-7 text-[#22624a]" strokeWidth={2} aria-hidden />
          )}
          {isAiMode ? "Recomandări AI" : "Rezultate căutare"}
        </h1>
        {query ? (
          <p className="mt-1 text-sm text-neutral-500">
            {products.length === 0
              ? `Niciun rezultat pentru „${query}"`
              : `${products.length} ${
                  products.length === 1 ? "produs găsit" : "produse găsite"
                } pentru „${query}"`}
          </p>
        ) : (
          <p className="mt-1 text-sm text-neutral-500">
            Introdu un termen în bara de căutare pentru a găsi produse.
          </p>
        )}
      </div>

      {isAiMode && query && aiExplanation && (
        <div className="mb-6 rounded-xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm leading-relaxed text-violet-900">
          <p className="mb-1 flex items-center gap-2 font-semibold">
            <Sparkles className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            Recomandarea asistentului AI
          </p>
          <p>{aiExplanation}</p>
        </div>
      )}

      {!query ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center">
          <p className="text-lg font-semibold text-neutral-800">
            Caută produse după nume sau descriere
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-[#22624a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
          >
            Vezi toate produsele
          </Link>
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center">
          <p className="text-lg font-semibold text-neutral-800">
            Nu am găsit produse care să corespundă căutării tale.
          </p>
          <Link
            href="/products"
            className="inline-flex items-center justify-center rounded-xl bg-[#22624a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
          >
            Explorează catalogul
          </Link>
        </div>
      ) : (
        <ProductGrid products={products} />
      )}
    </div>
  );
}
