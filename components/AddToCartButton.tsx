"use client";

import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";

type AddToCartButtonProps = {
  productId: string;
  productName: string;
  productPrice: number;
  productStock?: number;
  productImageUrl?: string | null;
};

export default function AddToCartButton({
  productId,
  productName,
  productPrice,
  productStock,
  productImageUrl,
}: AddToCartButtonProps) {
  const { addItem } = useCart();
  const [status, setStatus] = useState<"idle" | "added">("idle");
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (status === "added" || busy) return;

    setBusy(true);
    const ok = await addItem({
      id:       productId,
      name:     productName,
      price:    productPrice,
      stock:    productStock,
      imageUrl: productImageUrl,
    });
    setBusy(false);

    if (!ok) {
      toast("Nu s-a putut adăuga produsul în coș.");
      return;
    }

    setStatus("added");
    setTimeout(() => setStatus("idle"), 2500);
  };

  const isAdded = status === "added";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={isAdded ? "Produs adăugat în coș" : `Adaugă ${productName} în coș`}
      className={`
        flex w-full items-center justify-center gap-2.5 rounded-xl py-3.5 text-base font-semibold
        shadow-sm transition-all duration-200 focus-visible:outline focus-visible:ring-2
        focus-visible:ring-offset-2
        ${
          isAdded
            ? "bg-green-600 text-white focus-visible:ring-green-500"
            : "bg-[#22624a] text-white hover:bg-[#1a4d3a] focus-visible:ring-[#22624a] active:scale-[0.98]"
        }
      `}
    >
      {isAdded ? (
        <>
          <Check className="size-5 shrink-0" strokeWidth={2.5} aria-hidden />
          Adăugat în coș!
        </>
      ) : (
        <>
          <ShoppingCart className="size-5 shrink-0" strokeWidth={2} aria-hidden />
          Adaugă în coș
        </>
      )}
    </button>
  );
}
