"use client";

/**
 * Panoul coșului de cumpărături — Dialog modal (shadcn/ui).
 *
 * Structură vizuală:
 *   - Header fix: titlu + badge verde cu număr articole
 *   - Body scrollabil: listă produse sau empty state centrat
 *   - Footer fix: total + CTA verde „Finalizează” + buton „Golește”
 * Deschis din Navbar; fundal semi-transparent cu backdrop-blur.
 */

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useCloseOnRouteChange } from "@/hooks/use-overlay-guards";
import { toast } from "sonner";
import { Trash2, Plus, Minus, ShoppingCart } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/products";

type CartProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function Cart({ open, onOpenChange }: CartProps) {
  const router = useRouter();

  // Închide modalul automat la schimbarea paginii
  const handleClose = useCallback(() => onOpenChange(false), [onOpenChange]);
  useCloseOnRouteChange(handleClose);
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const isEmpty = items.length === 0;

  const handleCheckout = () => {
    onOpenChange(false);
    router.push("/checkout");
  };

  const handleUpdateQuantity = async (id: string, quantity: number) => {
    const ok = await updateQuantity(id, quantity);
    if (!ok) toast("Nu s-a putut actualiza cantitatea.");
  };

  const handleRemove = async (id: string) => {
    const ok = await removeItem(id);
    if (!ok) toast("Nu s-a putut elimina produsul din coș.");
  };

  const handleClear = async () => {
    const ok = await clearCart();
    if (!ok) toast("Nu s-a putut goli coșul.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex w-full max-w-lg max-h-[80vh] flex-col overflow-hidden rounded-xl border border-gray-200/50 bg-white/85 p-0 shadow-2xl backdrop-blur-md"
      >
        {/* Antet fix — titlu + badge numeric verde brand */}
        <DialogHeader className="shrink-0 space-y-0 border-b border-neutral-200/60 px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2 text-xl">
            Coșul tău
            {!isEmpty && (
              <span className="ml-1 rounded-full bg-[#22624a] px-2 py-0.5 text-xs font-bold text-white">
                {items.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Conținut scrollabil — empty state sau listă produse */}
        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {isEmpty ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 px-6 text-center">
              {/* Stare goală: icon coș în cerc gri + mesaj centrat */}
              <div className="rounded-full bg-neutral-100/80 p-6">
                <ShoppingCart className="size-10 text-neutral-400" strokeWidth={1.5} />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">Coșul tău este gol</p>
                <p className="mt-1 text-sm text-neutral-500">
                  Adaugă produse pentru a le vedea aici.
                </p>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col divide-y divide-neutral-200/60 px-6">
              {items.map((item) => (
                <li key={item.id} className="flex items-start gap-4 py-4">
                  {/* Miniatură produs — 64×64, fundal întunecat */}
                  <div className="size-16 shrink-0 overflow-hidden rounded-lg bg-neutral-950">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-contain"
                      />
                    ) : null}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {item.name}
                    </p>
                    <p className="text-sm font-bold text-neutral-900">
                      {formatPrice(item.price)}
                    </p>

                    {/* Controale cantitate — butoane +/- mici, border subtil */}
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        aria-label="Scade cantitatea"
                        className="flex size-6 items-center justify-center rounded-md border border-neutral-200/80 bg-white/50 text-neutral-600 transition-colors hover:bg-white/80 disabled:opacity-40"
                      >
                        <Minus className="size-3" strokeWidth={2.5} />
                      </button>
                      <span className="w-5 text-center text-sm font-semibold text-neutral-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.stock != null && item.quantity >= item.stock}
                        aria-label="Crește cantitatea"
                        className="flex size-6 items-center justify-center rounded-md border border-neutral-200/80 bg-white/50 text-neutral-600 transition-colors hover:bg-white/80 disabled:opacity-40"
                      >
                        <Plus className="size-3" strokeWidth={2.5} />
                      </button>
                    </div>
                  </div>

                  {/* Subtotal rând + buton ștergere (hover roz) */}
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-bold text-neutral-900">
                      {formatPrice(item.price * item.quantity)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleRemove(item.id)}
                      aria-label={`Elimină ${item.name} din coș`}
                      className="text-neutral-400 transition-colors hover:text-rose-500"
                    >
                      <Trash2 className="size-4" strokeWidth={2} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Subsol fix — total + acțiuni (vizibil doar dacă coșul nu e gol) */}
        {!isEmpty && (
          <div className="shrink-0 border-t border-neutral-200/60 px-6 py-4">
            <div className="flex w-full items-center justify-between">
              <span className="text-base font-semibold text-neutral-700">Total</span>
              <span className="text-xl font-extrabold tracking-tight text-neutral-900 tabular-nums">
                {formatPrice(totalPrice())}
              </span>
            </div>

            <div className="mt-3 flex w-full flex-row gap-2">
              {/* CTA principal verde + buton secundar outline */}
              <button
                type="button"
                onClick={handleCheckout}
                className="flex-1 rounded-lg bg-[#22624a] py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#1a4d3a] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#22624a] focus-visible:ring-offset-2"
              >
                Finalizează comanda
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg border border-neutral-200/80 bg-white/50 px-3 py-2.5 text-sm font-medium text-neutral-500 transition-colors hover:bg-white/80 hover:text-neutral-700 focus-visible:outline focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:ring-offset-2"
              >
                Golește
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
