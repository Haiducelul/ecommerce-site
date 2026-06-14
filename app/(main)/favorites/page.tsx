"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import { Loader2 } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/store/useAuth";
import ProductCard from "@/components/ProductCard";
import { formatPrice } from "@/lib/products";
import type { CategoryId } from "@/lib/products";

export default function FavoritesPage() {
  const { user } = useAuth();
  const { items, loaded, hydrating } = useWishlist();

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const loading = mounted && !!user && (hydrating || !loaded);
  const visibleItems = mounted && loaded ? items : [];

  return (
    <div className="mx-auto w-[90%] max-w-[1400px] flex-1 px-4 py-8 sm:px-6">

      {/* Page header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-neutral-900 sm:text-3xl">

          Produse favorite
        </h1>
        {mounted && items.length > 0 && (
          <p className="mt-1 text-sm text-neutral-500">
            {items.length} {items.length === 1 ? "produs salvat" : "produse salvate"}
          </p>
        )}
      </div>

      {mounted && !user ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center">
          <p className="text-lg font-semibold text-neutral-800">
            Autentifică-te pentru a vedea favoritele tale.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center rounded-xl bg-[#22624a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a]"
          >
            Conectează-te
          </Link>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center gap-2 rounded-2xl border border-neutral-200 bg-white py-20 text-sm text-neutral-500">
          <Loader2 className="size-5 animate-spin text-[#379b72]" aria-hidden />
          Se încarcă favoritele…
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-5 rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-20 text-center">
          <div className="rounded-full bg-rose-50 p-6 ring-1 ring-rose-100">
            <Heart className="size-12 text-rose-300" strokeWidth={1.5} aria-hidden />
          </div>
          <div>
            <p className="text-lg font-semibold text-neutral-800">
              Nu ai niciun produs la favorite.
            </p>
            <p className="mt-1 text-sm text-neutral-500">
              Apasă inima de pe orice produs pentru a-l salva aici.
            </p>
          </div>
          <Link
            href="/products"
            className="mt-2 inline-flex items-center justify-center rounded-xl bg-[#22624a] px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
          >
            Descoperă produsele
          </Link>
        </div>
      ) : (
        /* Product grid — mirrors the layout from the products listing page */
        <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visibleItems.map((item) => (
            <div key={item.id} className="flex h-full min-h-0 w-full">
              <ProductCard
                id={item.id}
                title={item.name}
                price={formatPrice(item.price)}
                priceRaw={item.price}
                oldPrice={item.oldPrice}
                detailHref={`/product/${item.id}`}
                imageUrl={item.imageUrl}
                stock={item.stock}
                category={item.category as CategoryId}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
