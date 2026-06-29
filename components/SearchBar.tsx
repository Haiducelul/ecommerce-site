"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/products";

type SuggestedProduct = {
  id: string;
  name: string;
  price: number;
  old_price: number | null;
  stock: number;
  image_url: string | null;
};

export default function SearchBar() {
  const router = useRouter();
  const { addItem } = useCart();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SuggestedProduct[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

  const navigateToSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ q: trimmed, mode: "classic" });
    router.push(`/search?${params.toString()}`);
  };

  const handleClassicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    navigateToSearch(query);
  };

  // Debounced search for product suggestions
  useEffect(() => {
    const timer = setTimeout(async () => {
      const trimmed = query.trim();
      if (trimmed.length > 2) {
        setIsLoading(true);
        try {
          const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(trimmed)}`);
          const data = await res.json();
          if (res.ok && data.products) {
            setResults(data.products);
            setIsDropdownOpen(true);
          } else {
            setResults([]);
            setIsDropdownOpen(false);
          }
        } catch (err) {
          console.error("[SearchBar suggestions]", err);
          setResults([]);
          setIsDropdownOpen(false);
        } finally {
          setIsLoading(false);
        }
      } else {
        setResults([]);
        setIsDropdownOpen(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside to close search dropdown
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsDropdownOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDropdownOpen]);

  const handleAddToCart = async (product: SuggestedProduct, e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      imageUrl: product.image_url,
    });
    if (!ok) {
      // Could add toast notification here
      console.error("Failed to add to cart");
    }
  };

  return (
    <div ref={searchDropdownRef} className="relative w-full">
      <form
        onSubmit={handleClassicSubmit}
        className="flex w-full overflow-hidden rounded-lg border border-neutral-300 shadow-sm"
        role="search"
      >
        <div className="relative w-full flex-1">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Caută produse..."
            className="w-full rounded-lg border-0 bg-white px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#22624a] focus:ring-inset [&::-webkit-search-cancel-button]:hidden"
            aria-label="Căutare produse"
          />
          {isLoading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
            </div>
          )}
        </div>
      </form>

      {isDropdownOpen && results.length > 0 && (
        <div className="absolute top-full z-50 mt-2 max-h-96 w-full overflow-y-auto rounded-lg bg-white shadow-xl">
          {results.map((product) => (
            <div
              key={product.id}
              className="flex items-center justify-between gap-3 border-b border-neutral-100 p-3 last:border-0 hover:bg-neutral-50"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="shrink-0">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-md bg-neutral-200">
                      <span className="text-xs text-neutral-400">Fără imagine</span>
                    </div>
                  )}
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="line-clamp-1 text-sm font-medium text-neutral-900">
                    {product.name}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => handleAddToCart(product, e)}
                    className="shrink-0 self-start rounded-md bg-[#22624a] px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-[#1a4d3a]"
                  >
                    Adaugă în coș
                  </button>
                </div>
              </div>

              <div className="shrink-0 text-right">
                <p className="text-sm font-bold text-neutral-900">
                  {formatPrice(product.price)}
                </p>
                {product.old_price && (
                  <p className="text-xs text-neutral-500 line-through">
                    {formatPrice(product.old_price)}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
