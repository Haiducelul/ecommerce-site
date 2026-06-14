"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/store/useAuth";

import type { CategoryId } from "@/lib/products";

type WishlistButtonProps = {
  productId: string;
  productName: string;
  productPrice: number;
  productStock?: number;
  productCategory?: CategoryId;
  productImageUrl?: string | null;
};

export default function WishlistButton({
  productId,
  productName,
  productPrice,
  productStock = 0,
  productCategory = "accessories",
  productImageUrl,
}: WishlistButtonProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { toggleItem, isInWishlist } = useWishlist();
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setMounted(true), []);

  // Defer reading persisted state until after hydration to keep server/client
  // HTML identical on the first render.
  const wishlisted = mounted && isInWishlist(productId);

  const handleToggle = async () => {
    if (busy) return;

    if (!user) {
      toast("Trebuie să fii autentificat pentru a salva favorite.");
      router.push("/sign-in");
      return;
    }

    setBusy(true);
    const wasWishlisted = wishlisted;
    const ok = await toggleItem({
      id: productId,
      name: productName,
      price: productPrice,
      stock: productStock,
      category: productCategory,
      imageUrl: productImageUrl,
    });
    setBusy(false);

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

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={busy}
      aria-label={wishlisted ? `Elimină ${productName} din favorite` : `Adaugă ${productName} la favorite`}
      aria-pressed={wishlisted}
      className={`
        flex w-full items-center justify-center gap-2.5 rounded-xl border py-3.5
        text-base font-semibold shadow-sm transition-all duration-200
        focus-visible:outline focus-visible:ring-2 focus-visible:ring-offset-2
        active:scale-[0.98]
        ${
          wishlisted
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 focus-visible:ring-rose-400"
            : "border-neutral-200 bg-white text-neutral-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:ring-rose-400"
        }
      `}
    >
      <Heart
        className="size-5 shrink-0 transition-all duration-200"
        fill={wishlisted ? "currentColor" : "none"}
        strokeWidth={wishlisted ? 0 : 2}
        aria-hidden
      />
      {wishlisted ? "Salvat la favorite" : "Adaugă la favorite"}
    </button>
  );
}
