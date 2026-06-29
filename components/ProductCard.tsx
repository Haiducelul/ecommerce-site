"use client";

/**
 * Card de produs — layout vertical reutilizabil (catalog, homepage, comparație).
 *
 * Structură vizuală:
 *   - Container: rounded-xl, border slate, shadow la hover
 *   - Overlay: butoane rotunde absolute (Compară stânga, Favorite dreapta)
 *   - Conținut: imagine → titlu → stele → stoc → preț → CTA full-width
 *   - Prop `compact`: variantă redusă pentru pagina /compare (font + spacing mai mici)
 */

import Link from "next/link";
import { Heart, ShoppingCart, Check, GitCompare } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useWishlist } from "@/hooks/use-wishlist";
import { useCompare } from "@/hooks/use-compare";
import { useAuth } from "@/store/useAuth";
import { useCart } from "@/hooks/use-cart";
import type { CategoryId } from "@/lib/products";
import ProductPriceDisplay from "@/components/ProductPriceDisplay";
import StarRating from "@/components/StarRating";

export type ProductCardProps = {
  id?: string;
  title: string;
  price: string;
  priceRaw?: number;
  oldPrice?: number | null;
  detailHref?: string;
  imageUrl?: string | null;
  stock?: number;
  category?: CategoryId;
  compact?: boolean;
};

export default function ProductCard({
  id,
  title,
  price,
  priceRaw,
  oldPrice,
  detailHref = "#",
  imageUrl,
  stock: stockProp,
  category,
  compact = false,
}: ProductCardProps) {
  const stock = stockProp ?? 0;
  const router = useRouter();
  const { user } = useAuth();
  const { toggleItem, isInWishlist } = useWishlist();
  const { toggleItem: toggleCompare, isInCompare, isFull } = useCompare();
  const { addItem } = useCart();
  const [wishlistBusy, setWishlistBusy] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartStatus, setCartStatus] = useState<"idle" | "added">("idle");
  const [reviewCount, setReviewCount] = useState(0);
  const [avgRating, setAvgRating] = useState(0);

  // Badge-urile (favorite/compară) se colorează doar după randare client
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !id) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/reviews?product_id=${id}`);
        const data = await res.json();
        if (cancelled || !res.ok) return;
        const list = data.reviews ?? [];
        setReviewCount(list.length);
        setAvgRating(
          list.length > 0
            ? list.reduce((s: number, r: { rating: number }) => s + r.rating, 0) / list.length
            : 0
        );
      } catch {
        if (!cancelled) {
          setReviewCount(0);
          setAvgRating(0);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mounted, id]);

  // Stări vizuale butoane overlay — verde brand (#22624a) când e activ
  const wishlisted = mounted && !!id && isInWishlist(id);
  const compared   = mounted && !!id && isInCompare(id);
  const compareDisabled = mounted && !!id && !compared && isFull();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id || cartStatus === "added") return;

    const ok = await addItem({
      id,
      name: title,
      price: priceRaw ?? 0,
      imageUrl,
      stock,
    });
    if (!ok) {
      toast("Nu s-a putut adăuga produsul în coș.");
      return;
    }

    setCartStatus("added");
    setTimeout(() => setCartStatus("idle"), 2500); // feedback verde 2.5s, apoi revine la CTA normal
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id || wishlistBusy) return;

    if (!user) {
      toast("Trebuie să fii autentificat pentru a salva favorite.");
      router.push("/sign-in");
      return;
    }

    setWishlistBusy(true);
    const wasWishlisted = wishlisted;
    const ok = await toggleItem({
      id,
      name: title,
      price: priceRaw ?? 0,
      stock,
      category: category ?? "",
      imageUrl,
    });
    setWishlistBusy(false);

    if (!ok) {
      toast("Nu s-a putut actualiza lista de favorite.");
      return;
    }

    if (wasWishlisted) {
      toast("Eliminat din favorite");
    } else {
      toast("Adăugat la favorite!");
    }
  };

  const handleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!id) return;

    if (compareDisabled) {
      toast("Poți compara maximum 3 produse.");
      return;
    }

    if (!category) {
      toast("Categoria produsului nu este disponibilă pentru comparație.");
      return;
    }

    const result = toggleCompare({
      id,
      name:       title,
      price:      priceRaw ?? 0,
      priceLabel: price,
      category,
      stock,
      imageUrl,
      detailHref,
    });

    if (result === "category_mismatch") {
      toast("Nu poți compara produse din categorii diferite.");
    }
  };

  return (
    // Card flex-col — înălțime egală în grid-uri de catalog
    <article className={`relative flex h-full w-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md ${compact ? "text-[13px]" : ""}`}>
      {id && (
        <>
          {/* Pill „Compară” — stânga sus, backdrop-blur, verde când e selectat */}
          <button
            type="button"
            onClick={handleCompare}
            disabled={compareDisabled}
            aria-label={
              compared
                ? `Elimină ${title} din comparație`
                : compareDisabled
                ? "Compararea este limitată la 2 produse"
                : `Adaugă ${title} la comparație`
            }
            aria-pressed={compared}
            className={`
              absolute z-20 flex items-center gap-1 rounded-full border font-semibold shadow-sm backdrop-blur-sm transition-all duration-200
              focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-1
              active:scale-95 disabled:cursor-not-allowed disabled:opacity-50
              ${compact ? "top-1.5 left-1.5 px-1.5 py-0.5 text-[9px]" : "top-2.5 left-2.5 px-2 py-1 text-[11px]"}
              ${
                compared
                  ? "border-[#22624a] bg-[#22624a] text-white"
                  : "border-neutral-200/80 bg-white/90 text-neutral-600 hover:border-[#22624a]/40 hover:text-[#22624a]"
              }
            `}
          >
            <GitCompare className={`shrink-0 ${compact ? "size-2.5" : "size-3"}`} strokeWidth={2} aria-hidden />
            Compară
          </button>

          {/* Buton inimă — dreapta sus, roz (rose) când e favorit */}
          <button
            type="button"
            onClick={handleWishlist}
            disabled={wishlistBusy}
            aria-label={wishlisted ? `Elimină ${title} din favorite` : `Adaugă ${title} la favorite`}
            aria-pressed={wishlisted}
            className={`
              absolute z-20 flex items-center justify-center rounded-full border shadow-sm backdrop-blur-sm transition-all duration-200
              focus-visible:outline focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-1
              active:scale-90
              ${compact ? "top-1.5 right-1.5 size-6" : "top-2.5 right-2.5 size-8"}
              ${
                wishlisted
                  ? "border-rose-200 bg-white/90 text-rose-500"
                  : "border-neutral-200/80 bg-white/80 text-neutral-400 hover:border-rose-300 hover:bg-white hover:text-rose-500"
              }
            `}
          >
            <Heart
              className={`transition-all duration-200 ${compact ? "size-3" : "size-4"}`}
              fill={wishlisted ? "currentColor" : "none"}
              strokeWidth={wishlisted ? 0 : 2}
              aria-hidden
            />
          </button>
        </>
      )}

      {/* Zona clickabilă — imagine + detalii; hover subtil pe fundal */}
      <Link
        href={detailHref}
        className="flex flex-1 cursor-pointer flex-col transition-colors duration-200 hover:bg-neutral-50/50"
      >
        {/* Imagine: aspect-square (normal) sau h-48 fix (compact); object-contain */}
        <div className={`relative overflow-hidden rounded-t-xl bg-white ${compact ? "h-48 p-2" : "aspect-square p-4"}`}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-neutral-950">
              <span className="text-xs font-medium uppercase tracking-widest text-neutral-600 select-none">
                {title.slice(0, 1)}
              </span>
            </div>
          )}
        </div>

        <div className={`flex flex-1 flex-col ${compact ? "gap-1 px-2 py-1.5" : "gap-2.5 px-4 py-2"}`}>
          <div className={compact ? "min-h-8" : "min-h-[2.5rem]"}>
            <h3 className={`truncate font-medium leading-snug text-neutral-900 ${compact ? "text-xs" : "text-base"}`}>{title}</h3>
          </div>

          {/* Stele galbene + număr recenzii în paranteză */}
          <div className="flex items-center gap-1.5">
            <StarRating
              rating={avgRating}
              sizeClass={compact ? "size-2.5" : "size-3.5"}
              filledClass="text-yellow-400"
              emptyClass="text-neutral-300"
            />
            <span className={`text-neutral-400 ${compact ? "text-[10px]" : "text-xs"}`}>({reviewCount})</span>
          </div>

          {/* Indicator stoc — gri normal / roșu dacă epuizat */}
          {stock > 0 ? (
            <p className={`font-medium text-gray-900 ${compact ? "text-[10px]" : "text-xs"}`}>
              {stock} produse disponibile
            </p>
          ) : (
            <p className={`font-semibold text-red-500 ${compact ? "text-[10px]" : "text-xs"}`}>Stoc epuizat</p>
          )}

          {priceRaw != null ? (
            <ProductPriceDisplay
              price={priceRaw}
              oldPrice={oldPrice}
              size={compact ? "sm" : "md"}
            />
          ) : (
            <p className={`font-bold tracking-tight text-neutral-900 ${compact ? "text-sm" : "text-lg sm:text-xl"}`}>{price}</p>
          )}
        </div>
      </Link>

      {/* CTA „Adaugă în coș” — verde brand, devine verde deschis cu bifă la succes */}
      <div className={compact ? "px-2 pb-2" : "px-4 pb-2"}>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={!id || stock === 0}
          aria-label={
            stock === 0
              ? "Produs indisponibil"
              : cartStatus === "added"
              ? "Produs adăugat în coș"
              : `Adaugă ${title} în coș`
          }
          className={`flex w-full items-center justify-center gap-2 rounded-lg font-semibold shadow-sm transition-all duration-200 focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
            compact ? "py-1.5 text-xs" : "py-2.5 text-sm"
          } ${
            stock === 0
              ? "bg-neutral-200 text-neutral-500 focus-visible:ring-neutral-400"
              : cartStatus === "added"
              ? "bg-green-600 text-white focus-visible:ring-green-500"
              : "bg-[#22624a] text-white hover:bg-[#1a4d3a] focus-visible:ring-[#22624a] active:scale-[0.98]"
          }`}
        >
          {stock === 0 ? (
            "Stoc epuizat"
          ) : cartStatus === "added" ? (
            <>
              <Check className="size-4 shrink-0" strokeWidth={2.5} aria-hidden />
              Adăugat!
            </>
          ) : (
            <>
              <ShoppingCart className="size-4 shrink-0" strokeWidth={2} aria-hidden />
              Adaugă în coș
            </>
          )}
        </button>
      </div>
    </article>
  );
}
