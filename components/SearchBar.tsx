"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingCart, Loader2 } from "lucide-react";
import {
  useCloseOnDesktop,
  useCloseOnRouteChange,
} from "@/hooks/use-overlay-guards";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  const [aiOpen, setAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [results, setResults] = useState<SuggestedProduct[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const closeAi = useCallback(() => setAiOpen(false), []);
  const closeSearchDropdown = useCallback(() => setIsDropdownOpen(false), []);

  useCloseOnRouteChange(closeAi);
  useCloseOnDesktop(aiOpen, closeAi);

  const navigateToSearch = (q: string, mode: "classic" | "ai") => {
    const trimmed = q.trim();
    if (!trimmed) return;

    const params = new URLSearchParams({ q: trimmed, mode });
    router.push(`/search?${params.toString()}`);
  };

  const handleClassicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsDropdownOpen(false);
    navigateToSearch(query, "classic");
  };

  const handleAiOpen = () => {
    setAiOpen((prev) => !prev);
  };

  const handleAiSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = aiQuery.trim();
    if (!trimmed) return;

    navigateToSearch(trimmed, "ai");
    closeAi();
    setAiQuery("");
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

  useEffect(() => {
    if (!aiOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node)
      ) {
        setAiOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAiOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [aiOpen]);

  return (
    <div ref={popoverRef} className="relative w-full max-w-3xl">
      <div ref={searchDropdownRef} className="relative">
        <form
          onSubmit={handleClassicSubmit}
          className="flex w-full overflow-hidden rounded-lg border border-neutral-300 shadow-sm"
          role="search"
        >
          <div className="relative flex-1 w-full">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Caută produse..."
              className="w-full border-0 bg-white px-4 py-2.5 pr-10 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#22624a] focus:ring-inset [&::-webkit-search-cancel-button]:hidden"
              aria-label="Căutare produse"
            />
            {isLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="h-4 w-4 animate-spin text-neutral-400" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={handleAiOpen}
            aria-expanded={aiOpen}
            aria-haspopup="dialog"
            className="shrink-0 bg-[#22624a] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#1a4d3a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
          >
            Întreabă AI
          </button>
        </form>

        {isDropdownOpen && results.length > 0 && (
          <div className="bg-white rounded-lg shadow-xl absolute top-full mt-2 w-full z-50 max-h-96 overflow-y-auto">
            {results.map((product) => (
              <div
                key={product.id}
                className="flex justify-between items-center gap-3 p-3 hover:bg-neutral-50 border-b border-neutral-100 last:border-0"
              >
                {/* Left Section: Image, Title & Button */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {/* Product image thumbnail */}
                  <div className="shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="h-12 w-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-neutral-200 rounded-md flex items-center justify-center">
                        <span className="text-xs text-neutral-400">Fără imagine</span>
                      </div>
                    )}
                  </div>

                  {/* Vertical container: Title and Button */}
                  <div className="flex flex-col gap-1 flex-1 min-w-0">
                    {/* Product title */}
                    <p className="text-sm font-medium text-neutral-900 line-clamp-1">
                      {product.name}
                    </p>
                    {/* Add to cart button */}
                    <button
                      type="button"
                      onClick={(e) => handleAddToCart(product, e)}
                      className="shrink-0 bg-[#22624a] hover:bg-[#1a4d3a] text-white px-3 py-1 rounded-md text-xs font-medium transition-colors self-start"
                    >
                      Adaugă în coș
                    </button>
                  </div>
                </div>

                {/* Right Section: Price */}
                <div className="text-right shrink-0">
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

      {aiOpen && (
        <div
          role="dialog"
          aria-label="Căutare asistată de AI"
          className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl"
        >
          <form onSubmit={handleAiSubmit} className="flex flex-col gap-3">
            <Textarea
              value={aiQuery}
              onChange={(e) => setAiQuery(e.target.value)}
              placeholder="Ex: Caut un laptop bun pentru editare video, buget 4000 lei..."
              rows={4}
              className="min-h-[100px] resize-none"
              aria-label="Descrie ce cauți"
              autoFocus
            />
            <Button type="submit" className="w-full">
              Caută cu AI
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
